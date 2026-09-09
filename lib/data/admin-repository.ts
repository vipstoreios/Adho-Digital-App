import { browserSupabase } from '../supabase/browser';
import type { AdminSection, OrderStatus } from '../domain/types';

type TableName =
  | 'products'
  | 'categories'
  | 'orders'
  | 'users'
  | 'promotional_banners';

function resolveTable(section: AdminSection): TableName {
  switch (section) {
    case 'customers':
      return 'users';
    case 'inventory':
    case 'featured':
      return 'products';
    case 'banners':
      return 'promotional_banners';
    case 'products':
    case 'categories':
    case 'orders':
      return section;
    case 'settings':
      throw new Error('Settings are configuration-only and are not stored in a database table.');
  }
}

const allowedImageTypes = new Set(['image/jpeg', 'image/png', 'image/webp']);
const maxImageBytes = 5 * 1024 * 1024;

export const adminRepository = {
  async list(section: AdminSection) {
    if (section === 'settings') return [];

    const supabase = browserSupabase();
    const table = resolveTable(section);
    let query = supabase.from(table).select('*');

    if (section === 'featured') {
      query = query.eq('featured', true);
    }

    const { data, error } = await query
      .order('created_at', { ascending: false })
      .limit(100);

    if (error) throw error;
    return data ?? [];
  },

  async save(
    section: AdminSection,
    values: Record<string, unknown>,
    id?: string,
  ) {
    if (section === 'settings' || section === 'inventory' || section === 'featured') {
      throw new Error(`Direct save is not supported for ${section}.`);
    }

    const supabase = browserSupabase();
    const table = resolveTable(section);
    const query = id
      ? supabase.from(table).update(values).eq('id', id)
      : supabase.from(table).insert(values);
    const { error } = await query;
    if (error) throw error;
  },

  async remove(section: AdminSection, id: string) {
    if (section === 'settings') {
      throw new Error('Settings cannot be deleted.');
    }

    const table = resolveTable(section);
    const { error } = await browserSupabase().from(table).delete().eq('id', id);
    if (error) throw error;
  },

  async setProductFeatured(id: string, featured: boolean) {
    const { error } = await browserSupabase()
      .from('products')
      .update({ featured })
      .eq('id', id);
    if (error) throw error;
  },

  async setProductStock(id: string, stock: number) {
    const { error } = await browserSupabase()
      .from('products')
      .update({ stock })
      .eq('id', id);
    if (error) throw error;
  },

  async setOrderStatus(id: string, status: OrderStatus) {
    const { error } = await browserSupabase().rpc('admin_set_order_status', {
      p_order_id: id,
      p_status: status,
    });
    if (error) throw error;
  },

  async upload(file: File) {
    if (!allowedImageTypes.has(file.type)) {
      throw new Error('Upload a JPEG, PNG, or WebP image.');
    }
    if (file.size > maxImageBytes) {
      throw new Error('Image size must be 5 MB or less.');
    }

    const supabase = browserSupabase();
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      throw new Error('Your admin session has expired. Please sign in again.');
    }

    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '-');
    const path = `${user.id}/${crypto.randomUUID()}-${safeName}`;
    const { error } = await supabase.storage
      .from('product-images')
      .upload(path, file, { contentType: file.type, upsert: false });
    if (error) throw error;

    return supabase.storage.from('product-images').getPublicUrl(path).data.publicUrl;
  },

  async overview() {
    const { data, error } = await browserSupabase().rpc('admin_overview');
    if (error) throw error;
    return data as Record<string, number>;
  },
};
