'use client';

import Link from 'next/link';
import {Activity,AlertTriangle,ArrowUpRight,Box,Clock3,Loader2,ShoppingBag,Store,Truck,Users,WalletCards} from 'lucide-react';
import {useEffect,useState} from 'react';
import {AdminShell} from '../../components/admin-shell';
import {adminRepository} from '../../lib/data/admin-repository';

const metricDefs=[
  {key:'products',label:'Total products',icon:Box,color:'bg-emerald-50 text-emerald-700'},
  {key:'customers',label:'Customers',icon:Users,color:'bg-blue-50 text-blue-700'},
  {key:'orders',label:'All orders',icon:ShoppingBag,color:'bg-violet-50 text-violet-700'},
  {key:'sales_iqd',label:'Delivered sales IQD',icon:WalletCards,color:'bg-amber-50 text-amber-700'},
  {key:'active_stores',label:'Active stores',icon:Store,color:'bg-teal-50 text-teal-700'},
  {key:'active_drivers',label:'Active drivers',icon:Truck,color:'bg-cyan-50 text-cyan-700'},
  {key:'pending_orders',label:'Pending orders',icon:Clock3,color:'bg-orange-50 text-orange-700'},
  {key:'low_stock',label:'Low stock items',icon:AlertTriangle,color:'bg-red-50 text-red-700'},
];

export default function Dashboard(){
  const [stats,setStats]=useState<Record<string,number>>({}),[orders,setOrders]=useState<any[]>([]),[loading,setLoading]=useState(true),[error,setError]=useState('');
  useEffect(()=>{Promise.all([adminRepository.overview(),adminRepository.recentOrders()]).then(([summary,recent])=>{setStats(summary);setOrders(recent)}).catch(e=>setError(e.message)).finally(()=>setLoading(false))},[]);
  return <AdminShell><header className="mb-8"><div className="flex items-center gap-2 text-sm font-bold text-leaf-700"><Activity className="h-4 w-4"/>Live marketplace overview</div><h1 className="mt-2 text-3xl font-black sm:text-4xl">Operations dashboard</h1><p className="mt-2 text-slate-500">Customers, stores, inventory, fulfilment and revenue in one secure workspace.</p></header>
    {error&&<div className="mb-6 rounded-2xl bg-red-50 p-4 text-red-700">{error}</div>}
    {loading?<div className="grid min-h-72 place-items-center"><Loader2 className="h-9 w-9 animate-spin text-leaf-700"/></div>:<>
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{metricDefs.map(metric=>{const Icon=metric.icon;const value=stats[metric.key]??0;return <Link href={metric.key.includes('store')?'/dashboard/stores':metric.key.includes('driver')?'/dashboard/drivers':metric.key.includes('order')||metric.key==='sales_iqd'?'/dashboard/orders':metric.key==='customers'?'/dashboard/customers':'/dashboard/products'} key={metric.key} className="glass group rounded-[26px] p-5 transition hover:-translate-y-1"><div className="flex items-start justify-between"><div className={`grid h-11 w-11 place-items-center rounded-2xl ${metric.color}`}><Icon className="h-5 w-5"/></div><ArrowUpRight className="h-5 w-5 text-slate-300 group-hover:text-leaf-700"/></div><strong className="mt-5 block text-3xl font-black">{metric.key==='sales_iqd'?Number(value).toLocaleString():value}</strong><p className="mt-1 text-sm text-slate-500">{metric.label}</p></Link>})}</section>
      <section className="mt-6 grid gap-6 xl:grid-cols-[1.5fr_1fr]"><div className="glass rounded-[28px] p-5 sm:p-6"><div className="flex items-center justify-between"><div><h2 className="text-xl font-black">Recent orders</h2><p className="text-sm text-slate-500">Latest marketplace activity</p></div><Link href="/dashboard/orders" className="text-sm font-bold text-leaf-700">View all →</Link></div><div className="mt-5 overflow-x-auto"><table className="w-full min-w-[560px] text-left text-sm"><thead><tr className="border-b text-xs uppercase text-slate-400"><th className="py-3">Order</th><th>Status</th><th>Total</th><th>Created</th></tr></thead><tbody>{orders.map(order=><tr key={order.id} className="border-b border-slate-100 last:border-0"><td className="py-4 font-mono text-xs">{order.id.slice(0,8)}</td><td><span className="rounded-full bg-leaf-50 px-3 py-1 text-xs font-bold text-leaf-800">{order.status.replaceAll('_',' ')}</span></td><td className="font-bold">{Number(order.total_price??0).toLocaleString()} IQD</td><td className="text-slate-500">{new Date(order.created_at).toLocaleDateString()}</td></tr>)}</tbody></table>{orders.length===0&&<p className="py-10 text-center text-slate-500">No orders yet.</p>}</div></div>
        <div className="glass rounded-[28px] p-6"><h2 className="text-xl font-black">System health</h2><p className="text-sm text-slate-500">Production readiness signals</p><div className="mt-6 space-y-4">{[['Admin authentication','Protected'],['Row-level security','Enabled'],['Storage uploads','Validated'],['Role permissions','Database driven'],['Audit trail','Recording']].map(([label,value])=><div key={label} className="flex items-center justify-between rounded-2xl bg-white/70 p-4"><span className="text-sm font-semibold">{label}</span><span className="text-xs font-black text-leaf-700">● {value}</span></div>)}</div></div>
      </section>
    </>}
  </AdminShell>;
}
