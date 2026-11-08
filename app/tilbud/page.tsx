import type { Metadata } from 'next';
import { SiteHeader, SiteFooter } from '@/components/SiteChrome';
import QuoteWizard from '@/components/QuoteWizard';
import { pageMetadata } from '@/lib/seo';
import './quote.css';

export const metadata: Metadata = pageMetadata(
  'Få tilbud på kjøletransport og distribusjon',
  'Be om tilbud på kjøletransport, lastebil eller faste ruter i Oslo og Akershus. Beskriv hentested, levering og last, så vurderer vi oppdraget.',
  '/tilbud',
);

export default function QuotePage() {
  return <><SiteHeader /><QuoteWizard /><SiteFooter /></>;
}
