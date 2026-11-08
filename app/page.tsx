import {SiteHeader,SiteFooter} from '@/components/SiteChrome';
import {homeMarkup} from '@/lib/home-markup';
import { HOME_DESCRIPTION, HOME_TITLE, homeStructuredData, pageMetadata } from '@/lib/seo';

export const metadata = pageMetadata(HOME_TITLE, HOME_DESCRIPTION, '/');

export default function Home(){return <><SiteHeader/><main className="marketing-main" id="main-content" dangerouslySetInnerHTML={{__html:homeMarkup}}/><script type="application/ld+json" dangerouslySetInnerHTML={{__html:JSON.stringify(homeStructuredData).replace(/</g, '\\u003c')}}/><SiteFooter/></>}
