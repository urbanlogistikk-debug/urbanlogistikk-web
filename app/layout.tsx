import type { Metadata } from 'next';
import './globals.css';
import PageTracking from '@/components/PageTracking';
export const metadata: Metadata = {title:{default:'Urban Logistikk | Kjøletransport og faste ruter i Oslo',template:'%s | Urban Logistikk'},description:'Kjøletransport, faste distribusjonsruter og hjemlevering for bedrifter i Oslo og omegn. Be om et tilbud tilpasset rute, volum og temperaturkrav.'};
export default function RootLayout({children}:{children:React.ReactNode}) {return <html lang="nb"><head><link rel="preconnect" href="https://fonts.googleapis.com"/><link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous"/><link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=Manrope:wght@400;500;600;700;800&display=swap" rel="stylesheet"/><meta name="theme-color" content="#101c25"/></head><body><a className="skip-link" href="#main-content">Hopp til innhold</a><PageTracking/>{children}</body></html>}
