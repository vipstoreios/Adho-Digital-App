import {browserSupabase} from '../supabase/browser';
import type {AdminSection,OrderStatus,UserRole} from '../domain/types';

const table=(section:AdminSection)=>section==='customers'?'users':section==='inventory'?'products':section==='featured'?'featured_products':section;
const primaryKey=(section:AdminSection)=>section==='drivers'?'user_id':section==='content'?'key':'id';

export const adminRepository={
  async list(section:AdminSection){
    const s=browserSupabase();
    let query=s.from(table(section)).select('*').limit(500);
    if(!['drivers','content'].includes(section))query=query.order('created_at',{ascending:false});
    const {data,error}=await query;
    if(error)throw error;
    if(section==='customers'&&data?.length){
      const {data:roleRows}=await s.from('user_roles').select('user_id,role');
      return data.map((row:any)=>({...row,roles:(roleRows??[]).filter((item:any)=>item.user_id===row.id).map((item:any)=>item.role)}));
    }
    return data??[];
  },
  async save(section:AdminSection,values:Record<string,unknown>,id?:string){
    const query=id?browserSupabase().from(table(section)).update(values).eq(primaryKey(section),id):browserSupabase().from(table(section)).insert(values);
    const {error}=await query;if(error)throw error;
    await this.audit(id?'update':'create',section,id,values);
  },
  async remove(section:AdminSection,id:string){
    if(section==='customers'){const {error}=await browserSupabase().rpc('admin_delete_user',{p_user_id:id});if(error)throw error}
    else{const {error}=await browserSupabase().from(table(section)).delete().eq(primaryKey(section),id);if(error)throw error}
    await this.audit('delete',section,id,{});
  },
  async setOrderStatus(id:string,status:OrderStatus){const {error}=await browserSupabase().rpc('admin_set_order_status',{p_order_id:id,p_status:status});if(error)throw error;await this.audit('status_change','orders',id,{status})},
  async setUserRole(id:string,role:UserRole,enabled:boolean){const {error}=await browserSupabase().rpc('admin_set_user_role',{p_user_id:id,p_role:role,p_enabled:enabled});if(error)throw error},
  async options(){
    const s=browserSupabase();
    const [users,stores,categories,products]=await Promise.all([s.from('users').select('id,full_name,first_name,last_name,email').limit(500),s.from('stores').select('id,name').limit(500),s.from('categories').select('id,name_en,name_ku').limit(500),s.from('products').select('id,name_en,name_ku').limit(1000)]);
    return {users:(users.data??[]).map((x:any)=>({value:x.id,label:x.full_name||[x.first_name,x.last_name].filter(Boolean).join(' ')||x.email||x.id})),stores:(stores.data??[]).map((x:any)=>({value:x.id,label:x.name})),categories:(categories.data??[]).map((x:any)=>({value:x.id,label:x.name_en||x.name_ku||x.id})),products:(products.data??[]).map((x:any)=>({value:x.id,label:x.name_en||x.name_ku||x.id}))};
  },
  async upload(file:File,folder='admin'){
    if(!['image/jpeg','image/png','image/webp'].includes(file.type)||file.size>8*1024*1024)throw new Error('Use a JPG, PNG or WebP image smaller than 8 MB.');
    const s=browserSupabase();const {data:{user}}=await s.auth.getUser();if(!user)throw new Error('Admin login required.');
    const ext=file.name.split('.').pop()?.toLowerCase()||'jpg';const path=`${folder}/${user.id}/${crypto.randomUUID()}.${ext}`;
    const {error}=await s.storage.from('product-images').upload(path,file,{contentType:file.type});if(error)throw error;
    return s.storage.from('product-images').getPublicUrl(path).data.publicUrl;
  },
  async overview(){const {data,error}=await browserSupabase().rpc('admin_overview');if(error)throw error;return (data??{}) as Record<string,number>},
  async recentOrders(){const {data,error}=await browserSupabase().from('orders').select('id,status,total_price,created_at,user_id,store_id').order('created_at',{ascending:false}).limit(8);if(error)throw error;return data??[]},
  async audit(action:string,entity:string,entityId:string|undefined,details:Record<string,unknown>){const {error}=await browserSupabase().rpc('admin_record_audit',{p_action:action,p_entity:entity,p_entity_id:entityId??null,p_details:details});if(error&&error.code!=='PGRST202')console.warn('Audit log unavailable:',error.message)},
};
