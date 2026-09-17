'use client';

import Link from 'next/link';
import {usePathname} from 'next/navigation';
import {BarChart3,Box,Boxes,ChevronRight,ClipboardList,FileText,Image,Languages,LayoutDashboard,LogOut,Menu,Settings,ShieldCheck,ShoppingBag,Star,Store,Tags,Truck,Users,X} from 'lucide-react';
import {useState} from 'react';
import {adminSections} from '../lib/admin-config';
import {browserSupabase} from '../lib/supabase/browser';

const icons:Record<string,React.ComponentType<{className?:string}>>={Package:Box,Tags,Warehouse:Boxes,ShoppingBag,Users,Store,Truck,Image,Star,Languages,Settings,ShieldCheck};

export function AdminShell({children}:{children:React.ReactNode}){
  const path=usePathname();
  const [open,setOpen]=useState(false);
  async function logout(){await browserSupabase().auth.signOut();location.href='/login'}
  const nav=<>
    <Link href="/dashboard" onClick={()=>setOpen(false)} className={`flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-bold transition ${path==='/dashboard'?'bg-leaf-700 text-white shadow-lg':'text-slate-600 hover:bg-leaf-50 hover:text-leaf-800'}`}><LayoutDashboard className="h-5 w-5"/>Overview</Link>
    <p className="mb-2 mt-6 px-4 text-[11px] font-black uppercase tracking-[.18em] text-slate-400">Management</p>
    {adminSections.map(([key,item])=>{const Icon=icons[item.icon]??FileText;const active=path===`/dashboard/${key}`;return <Link key={key} href={`/dashboard/${key}`} onClick={()=>setOpen(false)} className={`group flex items-center gap-3 rounded-2xl px-4 py-2.5 text-sm font-semibold transition ${active?'bg-leaf-700 text-white shadow-lg':'text-slate-600 hover:bg-leaf-50 hover:text-leaf-800'}`}><Icon className="h-[18px] w-[18px]"/><span className="flex-1">{item.title}</span><ChevronRight className={`h-4 w-4 transition ${active?'opacity-100':'opacity-0 group-hover:opacity-100'}`}/></Link>})}
  </>;
  return <div className="min-h-screen">
    <button aria-label="Open navigation" onClick={()=>setOpen(true)} className="fixed left-4 top-4 z-40 rounded-xl bg-leaf-700 p-3 text-white shadow-lg lg:hidden"><Menu className="h-5 w-5"/></button>
    {open&&<button aria-label="Close navigation backdrop" className="fixed inset-0 z-40 bg-slate-950/40 lg:hidden" onClick={()=>setOpen(false)}/>} 
    <aside className={`fixed inset-y-0 left-0 z-50 flex w-[286px] flex-col border-r border-white/80 bg-white/90 p-5 shadow-2xl backdrop-blur-2xl transition-transform lg:translate-x-0 ${open?'translate-x-0':'-translate-x-full'}`}>
      <div className="mb-6 flex items-center gap-3 px-2"><div className="grid h-12 w-12 place-items-center rounded-2xl bg-leaf-700 text-white"><BarChart3/></div><div><strong className="block text-xl text-leaf-800">Mini group</strong><span className="text-xs text-slate-500">Control Center</span></div><button aria-label="Close navigation" onClick={()=>setOpen(false)} className="ml-auto lg:hidden"><X/></button></div>
      <nav className="scrollbar flex-1 overflow-y-auto pr-1">{nav}</nav>
      <button onClick={logout} className="mt-4 flex items-center gap-3 rounded-2xl border border-red-100 px-4 py-3 text-sm font-bold text-red-600 hover:bg-red-50"><LogOut className="h-5 w-5"/>Secure sign out</button>
    </aside>
    <main className="min-h-screen px-4 pb-12 pt-20 sm:px-7 lg:ml-[286px] lg:px-10 lg:pt-9">{children}</main>
  </div>;
}
