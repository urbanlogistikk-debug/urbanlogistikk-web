import Link from 'next/link';
import {SiteHeader,SiteFooter} from '@/components/SiteChrome';
export default function NotFound(){return <><SiteHeader/><main id="main-content" className="container privacy-main"><span className="eyebrow">Urban Logistikk</span><h1>Siden er ikke tilgjengelig.</h1><p>Adressen finnes ikke, eller du har ikke tilgang til innholdet.</p><Link href="/" className="button">Til forsiden</Link></main><SiteFooter/></>}
