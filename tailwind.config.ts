import type {Config} from 'tailwindcss';

export default {
  content:['./app/**/*.{ts,tsx}','./components/**/*.{ts,tsx}','./lib/**/*.{ts,tsx}'],
  theme:{extend:{
    colors:{leaf:{50:'#effaf2',100:'#d9f4df',500:'#2f9e57',600:'#1b8746',700:'#14743a',800:'#0d5a2d',950:'#082b19'}},
    boxShadow:{glass:'0 20px 60px rgba(20,116,58,.12)'},
  }},
  plugins:[],
} satisfies Config;
