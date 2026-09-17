export type AdminSection='products'|'categories'|'inventory'|'orders'|'customers'|'stores'|'drivers'|'banners'|'featured'|'content'|'settings'|'audit';
export type UserRole='customer'|'store_owner'|'driver'|'admin';
export type Product={id:string;store_id?:string;category_id?:string;name_ku:string;name_ar:string;name_en:string;description?:string;price_iqd:number;stock:number;unit_type:string;image_url?:string;is_active:boolean;discount_type?:string;discount_value?:number;has_discount?:boolean;final_price?:number};
export type OrderStatus='pending'|'confirmed'|'preparing'|'ready_for_pickup'|'out_for_delivery'|'delivered'|'cancelled';
export type FieldKind='text'|'textarea'|'number'|'boolean'|'select'|'image'|'json'|'datetime';
export type FieldOption={label:string;value:string};
export type AdminField={key:string;label:string;kind:FieldKind;required?:boolean;options?:FieldOption[];min?:number;max?:number;step?:number;placeholder?:string;readOnly?:boolean};
export type SectionConfig={title:string;description:string;icon:string;table:string;primaryKey?:string;canCreate?:boolean;canEdit?:boolean;canDelete?:boolean;searchKeys:string[];columns:{key:string;label:string}[];fields:AdminField[]};
