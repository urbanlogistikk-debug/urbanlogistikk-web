import type { Metadata } from 'next';

export const SITE_URL = 'https://www.urbanlogistikk.no';
export const SITE_NAME = 'Urban Logistikk';
export const HOME_TITLE = 'Kjøletransport i Oslo og Akershus';
export const HOME_DESCRIPTION = 'Kjøletransport, faste ruter og palletransport for bedrifter i Oslo og Akershus. Fra kjølevarebil til 8 pallplasser. Be om tilbud fra Urban Logistikk.';

export function pageMetadata(title: string, description: string, path: string): Metadata {
  const fullTitle = `${title} | ${SITE_NAME}`;
  const url = new URL(path, SITE_URL).href;
  return {
    title: { absolute: fullTitle },
    description,
    alternates: { canonical: url },
    openGraph: { type: 'website', locale: 'nb_NO', siteName: SITE_NAME, title: fullTitle, description, url },
    twitter: { card: 'summary', title: fullTitle, description },
  };
}

// Public company information also displayed in the site's contact details.
export const homeStructuredData = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'Organization',
      '@id': `${SITE_URL}/#organization`,
      name: SITE_NAME,
      legalName: 'Urban Logistikk AS',
      url: `${SITE_URL}/`,
      telephone: '+4796840395',
      email: 'urbanlogistikk@outlook.com',
      identifier: '927027100',
      areaServed: ['Oslo', 'Akershus'],
    },
    {
      '@type': 'WebSite',
      '@id': `${SITE_URL}/#website`,
      url: `${SITE_URL}/`,
      name: SITE_NAME,
      inLanguage: 'nb-NO',
      publisher: { '@id': `${SITE_URL}/#organization` },
    },
  ],
};
