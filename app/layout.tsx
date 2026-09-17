import './globals.css';

export const metadata={
  title:{default:'Mini group Control Center',template:'%s | Mini group'},
  description:'Secure operations console for the Mini group marketplace',
};

export default function Layout({children}:{children:React.ReactNode}){
  return <html lang="en"><body>{children}</body></html>;
}
