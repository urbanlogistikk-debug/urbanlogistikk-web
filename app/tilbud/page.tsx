import type { Metadata } from 'next';
import { SiteHeader, SiteFooter } from '@/components/SiteChrome';
import QuoteWizard from '@/components/QuoteWizard';
import './quote.css';

export const metadata: Metadata = {
  title: 'Få tilbud på transport',
  description: 'Beskriv din faste distribusjonsrute eller et enkelt transportoppdrag. Send en forespørsel til Urban Logistikk og få en referanse med en gang.',
};

export default function QuotePage() {
  return <><SiteHeader /><QuoteWizard /><SiteFooter /></>;
}
