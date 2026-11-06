import type {MetadataRoute} from 'next';
export default function sitemap():MetadataRoute.Sitemap{const origin='https://www.urbanlogistikk.no';return ['','/tjenester/kjoletransport','/tjenester/faste-ruter','/tjenester/hjemlevering','/tjenester/lastebil','/tilbud','/personvern'].map(path=>({url:origin+path,changeFrequency:'monthly' as const,priority:path?0.7:1}));}
