import type { Config } from 'tailwindcss';
export default { content: ['./app/**/*.{ts,tsx}'], theme: { extend: { colors: { brand: { 50:'#effcf3', 500:'#16a34a', 700:'#15803d', 950:'#052e16' } }, boxShadow: { glow:'0 12px 40px rgba(22,163,74,.12)' } } }, plugins: [] } satisfies Config;
