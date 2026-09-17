'use client';

import {use} from 'react';
import {AdminShell} from '../../../components/admin-shell';
import {DataSection} from '../../../components/data-section';
import {sectionConfigs} from '../../../lib/admin-config';
import type {AdminSection} from '../../../lib/domain/types';

export default function SectionPage({params}:{params:Promise<{section:string}>}){
  const {section:raw}=use(params);
  const section=raw as AdminSection;
  const config=sectionConfigs[section];
  if(!config)return <AdminShell><div className="glass rounded-3xl p-10 text-center"><h1 className="text-2xl font-black">Section not found</h1><a href="/dashboard" className="mt-4 inline-block font-bold text-leaf-700">Return to dashboard</a></div></AdminShell>;
  return <AdminShell><DataSection section={section} config={config}/></AdminShell>;
}
