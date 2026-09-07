export type AdminSection='products'|'categories'|'inventory'|'orders'|'customers'|'banners'|'featured'|'settings';
export type Product={id:string;name_ku:string;name_ar:string;name_en:string;description?:string;price_iqd:number;stock:number;unit_type:string;image_url?:string;is_active:boolean;has_discount?:boolean;final_price?:number};
export type OrderStatus='pending'|'confirmed'|'preparing'|'out_for_delivery'|'delivered'|'cancelled';
