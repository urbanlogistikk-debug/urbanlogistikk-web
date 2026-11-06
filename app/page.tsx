import {SiteHeader,SiteFooter} from '@/components/SiteChrome';
import {homeMarkup} from '@/lib/home-markup';
export default function Home(){return <><SiteHeader/><main className="marketing-main" id="main-content" dangerouslySetInnerHTML={{__html:homeMarkup}}/><SiteFooter/></>}
