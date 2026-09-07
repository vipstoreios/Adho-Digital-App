import {browserSupabase} from '../supabase/browser'; import type {AdminSection,OrderStatus} from '../domain/types';
const table=(section:AdminSection)=>section==='customers'?'users':section;
export const adminRepository={
  async list(section:AdminSection){const s=browserSupabase();if(section==='inventory')section='products';const {data,error}=await s.from(table(section)).select('*').order('created_at',{ascending:false}).limit(100);if(error)throw error;return data??[]},
  async save(section:AdminSection,values:Record<string,unknown>,id?:string){const s=browserSupabase();const q=id?s.from(table(section)).update(values).eq('id',id):s.from(table(section)).insert(values);const {error}=await q;if(error)throw error},
  async remove(section:AdminSection,id:string){const {error}=await browserSupabase().from(table(section)).delete().eq('id',id);if(error)throw error},
  async setOrderStatus(id:string,status:OrderStatus){const {error}=await browserSupabase().rpc('admin_set_order_status',{p_order_id:id,p_status:status});if(error)throw error},
  async upload(file:File){const path=`${crypto.randomUUID()}-${file.name}`;const s=browserSupabase();const {error}=await s.storage.from('product-images').upload(path,file,{contentType:file.type,upsert:false});if(error)throw error;return s.storage.from('product-images').getPublicUrl(path).data.publicUrl},
  async overview(){const {data,error}=await browserSupabase().rpc('admin_overview');if(error)throw error;return data as Record<string,number>}
};
