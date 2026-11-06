'use client';

import { useEffect, useRef, useState, type FormEvent } from 'react';
import { ArrowLeft, ArrowRight, Check, CheckCircle2, ChevronDown, Copy, FileCheck2, LoaderCircle, MapPin, Package, Phone, Printer, Repeat2, Send, ShieldCheck, Snowflake, Truck, X } from 'lucide-react';
import type { InquiryInput, InquiryKind } from '@/lib/contracts';
import { createRequestKey } from '@/lib/client-request-key';

type FormValues = {
  kind: InquiryKind; name: string; company: string; email: string; phone: string;
  pickup: string; deliveryArea: string; stops: string; frequencyPerWeek: string;
  weekdays: string[]; timeWindow: string; startDate: string;
  vehicleType: NonNullable<InquiryInput['vehicleType']>;
  temperature: InquiryInput['temperature']; temperatureDetails: string;
  loadType: InquiryInput['loadType']; quantity: string; weightKg: string; lift: boolean;
  details: string; source: string; website: string;
};
type Errors = Record<string, string>;
type Receipt = { reference: string; receivedAt: string; input: InquiryInput };
const initial: FormValues = {
  vehicleType:'avklares', kind:'fast', name:'', company:'', email:'', phone:'', pickup:'', deliveryArea:'', stops:'1',
  frequencyPerWeek:'', weekdays:[], timeWindow:'', startDate:'', temperature:'kjol', temperatureDetails:'',
  loadType:'kasser', quantity:'', weightKg:'', lift:false, details:'', source:'', website:'',
};
const steps = ['Oppdrag', 'Rute', 'Last', 'Kontakt og send'];
const days = [{key:'man', label:'Man'},{key:'tir',label:'Tir'},{key:'ons',label:'Ons'},{key:'tor',label:'Tor'},{key:'fre',label:'Fre'},{key:'lor',label:'Lør'},{key:'son',label:'Søn'}];
const typeLabels = { kjol:'Kjøletransport', torr:'Varer uten kjølebehov', annet:'Annet temperaturbehov' };
const loadLabels = { kasser:'kasser / kolli', paller:'paller', annet:'enheter' };

function numberValid(value: string, min: number, max: number, integer=false) {
  const n=Number(value.replace(',','.'));
  return value.trim()!=='' && Number.isFinite(n) && n>=min && n<=max && (!integer || Number.isInteger(n));
}
function toNumber(value: string) { return Number(value.replace(',','.')); }
function validate(values: FormValues, step: number): Errors {
  const e: Errors={};
  if(step===1) {
    if(!values.pickup.trim()) e.pickup='Skriv inn hentested.';
    if(!values.deliveryArea.trim()) e.deliveryArea='Skriv inn leveringsadresse eller område.';
    if(!numberValid(values.stops,1,1000,true)) e.stops='Oppgi mellom 1 og 1 000 stopp.';
    if(values.kind==='fast' && !numberValid(values.frequencyPerWeek,1,100)) e.frequencyPerWeek='Oppgi mellom 1 og 100 turer per uke.';
  }
  if(step===2) {
    if(values.temperature==='annet' && !values.temperatureDetails.trim()) e.temperatureDetails='Beskriv temperaturkravet.';
    if(!numberValid(values.quantity,1,10000,true)) e.quantity='Oppgi mellom 1 og 10 000 enheter.';
    if(values.weightKg && !numberValid(values.weightKg,0.01,50000)) e.weightKg='Oppgi en vekt over 0 og opptil 50 000 kg, eller la feltet stå tomt.';
  }
  if(step===3) {
    if(values.name.trim().length<2) e.name='Skriv inn navnet ditt.';
    if(!values.company.trim()) e.company='Skriv inn bedriftens navn.';
    if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email.trim())) e.email='Skriv inn en gyldig e-postadresse.';
    if(values.phone.trim().length<5) e.phone='Skriv inn et telefonnummer vi kan nå deg på.';
  }
  return e;
}
function FieldError({name, errors}: {name:string;errors:Errors}) {
  return errors[name] ? <span className="qw-field-error" id={`error-${name}`}><X size={13} aria-hidden="true" />{errors[name]}</span> : null;
}
function Summary({input}: {input: InquiryInput}) {
  const date=input.startDate ? new Date(`${input.startDate}T12:00:00`).toLocaleDateString('nb-NO',{day:'numeric',month:'long',year:'numeric'}) : 'Avklares';
  const selectedDays=days.filter(d=>input.weekdays.includes(d.key)).map(d=>d.label).join(', ');
  return <dl className="qw-summary-grid">
    <div><dt>Oppdrag</dt><dd>{input.kind==='fast'?'Fast transportavtale':'Enkeltoppdrag'}</dd></div>
    <div><dt>{input.kind==='fast'?'Ønsket oppstart':'Ønsket dato'}</dt><dd>{date}</dd></div>
    <div><dt>Henting</dt><dd>{input.pickup}</dd></div>
    <div><dt>Levering</dt><dd>{input.deliveryArea}</dd></div>
    <div><dt>Omfang</dt><dd>{input.stops} leveringsstopp{input.kind==='fast' && input.frequencyPerWeek ? ` · ${input.frequencyPerWeek} turer/uke`:''}{selectedDays ? ` · ${selectedDays}`:''}</dd></div>
    <div><dt>Tidspunkt</dt><dd>{input.timeWindow || 'Avklares'}</dd></div>
    <div><dt>Last</dt><dd>{input.quantity} {loadLabels[input.loadType]}{input.weightKg ? ` · ca. ${input.weightKg} kg`:''}{input.lift ? ' · Løftelem ønskes':''}</dd></div>
    <div><dt>Kjøretøy</dt><dd>{input.vehicleType==='lastebil'?'Lastebil':input.vehicleType==='varebil'?'Varebil':'Avklares med oss'}</dd></div>
    <div><dt>Temperatur</dt><dd>{typeLabels[input.temperature]}{input.temperatureDetails ? ` · ${input.temperatureDetails}`:''}</dd></div>
    {input.details && <div className="qw-summary-full"><dt>Tilleggsinformasjon</dt><dd>{input.details}</dd></div>}
  </dl>;
}
function attribution() {
  let referrerDomain='';
  try {
    const referrer=document.referrer ? new URL(document.referrer) : null;
    if(referrer && referrer.hostname!==window.location.hostname) referrerDomain=referrer.hostname;
  } catch { /* Ignore malformed referrers. */ }
  const params=new URLSearchParams(window.location.search);
  return {
    landingPath:window.location.pathname.slice(0,200),
    referrerDomain:referrerDomain.slice(0,200),
    campaign:(params.get('utm_campaign')||params.get('campaign')||'').slice(0,120),
  };
}

export default function QuoteWizard() {
  const [values,setValues]=useState<FormValues>(initial);
  const [step,setStep]=useState(0);
  const [errors,setErrors]=useState<Errors>({});
  const [pending,setPending]=useState(false);
  const [serverError,setServerError]=useState('');
  const [uncertain,setUncertain]=useState(false);
  const [receipt,setReceipt]=useState<Receipt|null>(null);
  const [copied,setCopied]=useState(false);
  const [showReview,setShowReview]=useState(true);
  const requestKey=useRef('');
  const attemptedInput=useRef<InquiryInput|null>(null);
  const titleRef=useRef<HTMLHeadingElement>(null);
  useEffect(()=>{
    const type=new URLSearchParams(window.location.search).get('type');
    if(type==='fast'||type==='enkelt') setValues(v=>({...v,kind:type}));
    if(new URLSearchParams(window.location.search).get('vehicle')==='lastebil') setValues(v=>({...v,vehicleType:'lastebil'}));
    requestKey.current=createRequestKey();
  },[]);
  function set<K extends keyof FormValues>(key:K,value:FormValues[K]) {
    setValues(v=>({...v,[key]:value}));
    setErrors(e=>{const next={...e};delete next[key];return next;});
    if(!uncertain) setServerError('');
  }
  function focusErrors(e:Errors) {
    setErrors(e);
    requestAnimationFrame(()=>document.getElementById(`qw-${Object.keys(e)[0]}`)?.focus());
  }
  function move(next:number) {
    setStep(next);setErrors({});setServerError('');
    requestAnimationFrame(()=>{titleRef.current?.focus({preventScroll:true});titleRef.current?.scrollIntoView({block:'start',behavior:'smooth'});});
  }
  function payload(): InquiryInput {
    return {
      ...values, requestKey:requestKey.current || (requestKey.current=createRequestKey()),
      stops:toNumber(values.stops), frequencyPerWeek:values.kind==='fast'?toNumber(values.frequencyPerWeek):null,
      weekdays:values.kind==='fast'?values.weekdays:[],quantity:toNumber(values.quantity),
      weightKg:values.weightKg ? toNumber(values.weightKg):null,
      name:values.name.trim(),company:values.company.trim(),email:values.email.trim(),phone:values.phone.trim(),
      pickup:values.pickup.trim(),deliveryArea:values.deliveryArea.trim(),...attribution(),
    };
  }
  async function submit(event:FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if(pending) return;
    if(step<3) { const e=validate(values,step); if(Object.keys(e).length) return focusErrors(e); move(step+1);return; }
    if(!uncertain) {
      for(let s=1;s<=3;s++){const e=validate(values,s);if(Object.keys(e).length){setStep(s);focusErrors(e);return;}}
    }
    const input=uncertain && attemptedInput.current ? attemptedInput.current : payload();
    attemptedInput.current=input;
    setPending(true);setServerError('');
    const abort=new AbortController();
    const timeout=window.setTimeout(()=>abort.abort(),25000);
    try {
      const response=await fetch('/api/inquiries',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(input),signal:abort.signal});
      const responseBody:unknown=await response.json().catch(()=>null);
      const result=responseBody && typeof responseBody==='object' && !Array.isArray(responseBody) ? responseBody as Record<string,unknown> : null;
      if(!response.ok) {
        setUncertain(response.status>=500);
        setServerError(typeof result?.error==='string' ? result.error : 'Forespørselen kunne ikke bekreftes. Prøv igjen om litt, eller ring oss.');
        if(result?.fieldErrors && typeof result.fieldErrors==='object' && !Array.isArray(result.fieldErrors) && response.status<500) {
          const mapped:Errors={};
          for(const [field,message] of Object.entries(result.fieldErrors)) mapped[field]=Array.isArray(message)?String(message[0]):String(message);
          setErrors(mapped);
          const keys=Object.keys(mapped);
          if(keys.some(k=>['pickup','deliveryArea','stops','frequencyPerWeek','weekdays','timeWindow','startDate'].includes(k)))setStep(1);
          else if(keys.some(k=>['temperature','temperatureDetails','loadType','quantity','weightKg','lift','details'].includes(k)))setStep(2);
        }
        return;
      }
      if(typeof result?.reference!=='string'||typeof result?.receivedAt!=='string')throw new Error('Ufullstendig kvittering');
      setReceipt({reference:result.reference,receivedAt:result.receivedAt,input});setUncertain(false);
      requestAnimationFrame(()=>window.scrollTo({top:0,behavior:'smooth'}));
    } catch {
      setUncertain(true);
      setServerError('Vi fikk ikke bekreftet om forespørselen ble mottatt. Prøv igjen med samme forespørsel. Den får samme referanse hvis den allerede er registrert.');
    } finally { window.clearTimeout(timeout);setPending(false); }
  }
  async function copyReference() {
    if(!receipt) return;
    try { await navigator.clipboard.writeText(receipt.reference);setCopied(true);window.setTimeout(()=>setCopied(false),2500); }
    catch { setCopied(false); }
  }
  if(receipt) return <main id="main-content" className="quote-page quote-receipt">
    <div className="qw-shell qw-receipt-shell">
      <div className="qw-received-icon"><CheckCircle2 size={35}/></div>
      <span className="qw-eyebrow">Forespørselen er registrert</span>
      <h1>Takk, {receipt.input.name.split(' ')[0]}.</h1>
      <p className="qw-receipt-intro">Vi har mottatt transportbehovet til {receipt.input.company}. Vi tar kontakt for å avklare kapasitet og pris.</p>
      <section className="qw-receipt-paper" aria-label="Kvittering for forespørsel">
        <div className="qw-receipt-top"><div><span className="qw-tiny-label">Din referanse</span><strong className="qw-reference">{receipt.reference}</strong></div><span className="qw-receipt-date">Mottatt {new Date(receipt.receivedAt).toLocaleString('nb-NO',{dateStyle:'medium',timeStyle:'short',timeZone:'Europe/Oslo'})}</span></div>
        <div className="qw-receipt-contact"><strong>{receipt.input.company}</strong><span>{receipt.input.name} · {receipt.input.email} · {receipt.input.phone}</span></div>
        <Summary input={receipt.input}/>
        <div className="qw-receipt-notice"><ShieldCheck size={19}/><p>Dette er en kvittering for en forespørsel. Transporten er først avtalt når vi har bekreftet oppdraget med deg.</p></div>
      </section>
      <div className="qw-receipt-actions qw-no-print"><button className="qw-primary" type="button" onClick={()=>window.print()}><Printer size={17}/>Skriv ut / lagre som PDF</button><button className="qw-secondary" type="button" onClick={copyReference}>{copied?<Check size={17}/>:<Copy size={17}/>} {copied?'Referanse kopiert':'Kopier referansen'}</button><a className="qw-text-link" href="/">Tilbake til forsiden <ArrowRight size={16}/></a></div>
      <p className="qw-receipt-phone qw-no-print">Behov for å snakke med oss? <a href="tel:+4796840395">Ring +47 968 40 395</a> og oppgi referansen.</p>
    </div>
  </main>;
  const invalid=(name:string)=>({ 'aria-invalid': !!errors[name], 'aria-describedby':errors[name]?`error-${name}`:undefined });
  return <main id="main-content" className="quote-page">
    <div className="qw-shell">
      <a className="qw-back-home" href="/"><ArrowLeft size={15}/>Til forsiden</a>
      <div className="qw-intro"><span className="qw-eyebrow">La oss finne riktig opplegg</span><h1>Få et transporttilbud.</h1><p>Faste ruter eller én tur. Vi avklarer kapasitet og pris før oppstart.</p></div>
      <div className="qw-layout">
        <section className="qw-workspace" aria-label="Transportforespørsel">
          <ol className="qw-progress" aria-label="Fremdrift">
            {steps.map((label,i)=><li key={label} className={`${i===step?'active':''} ${i<step?'done':''}`} aria-current={i===step?'step':undefined}><span>{i<step?<Check size={15}/>:i+1}</span><em>{label}</em></li>)}
          </ol>
          <form noValidate onSubmit={submit}>
            <fieldset className="qw-fields" disabled={pending || uncertain}>
              {step===0 && <div className="qw-step-content">
                <span className="qw-step-count">Steg 1 av 4</span><h2 ref={titleRef} tabIndex={-1}>Hva slags transport trenger dere?</h2><p className="qw-step-description">Velg det som passer best. Vi tilpasser resten av spørsmålene.</p>
                <div className="qw-kind-options">
                  <label className={`qw-kind-card ${values.kind==='fast'?'selected':''}`}><input type="radio" name="kind" value="fast" checked={values.kind==='fast'} onChange={()=>set('kind','fast')}/><span className="qw-option-icon"><Repeat2 size={25}/></span><span className="qw-kind-copy"><strong>Fast transportavtale</strong><span>Gjenta ruten hver uke eller reserver kapasitet til den daglige driften.</span><em>Faste ruter · Hjemlevering · Distribusjon</em></span><span className="qw-radio-check">{values.kind==='fast'&&<Check size={14}/>}</span></label>
                  <label className={`qw-kind-card ${values.kind==='enkelt'?'selected':''}`}><input type="radio" name="kind" value="enkelt" checked={values.kind==='enkelt'} onChange={()=>set('kind','enkelt')}/><span className="qw-option-icon"><Truck size={25}/></span><span className="qw-kind-copy"><strong>Et enkeltoppdrag</strong><span>En levering, en ekstra tur eller hjelp når behovet oppstår.</span><em>Kjøletransport · Paller · Ekstra kapasitet</em></span><span className="qw-radio-check">{values.kind==='enkelt'&&<Check size={14}/>}</span></label>
                </div>
                <p className="qw-small-note"><ShieldCheck size={16}/>Forespørselen er uforpliktende. Vi bekrefter pris og kapasitet med deg.</p>
              </div>}
              {step===1 && <div className="qw-step-content">
                <span className="qw-step-count">Steg 2 av 4</span><h2 ref={titleRef} tabIndex={-1}>Hvor skal varene kjøres?</h2><p className="qw-step-description">Oppgi det dere vet. Områder og omtrentlige tider er nok til en første vurdering.</p>
                <div className="qw-form-grid">
                  <div className="qw-field qw-full"><label htmlFor="qw-pickup">Hentested <span>*</span></label><input id="qw-pickup" value={values.pickup} onChange={e=>set('pickup',e.target.value)} placeholder="Adresse eller område, f.eks. Lørenskog" maxLength={160} autoComplete="off" {...invalid('pickup')}/><FieldError name="pickup" errors={errors}/></div>
                  <div className="qw-field qw-full"><label htmlFor="qw-deliveryArea">Leveringsadresse eller område <span>*</span></label><textarea id="qw-deliveryArea" rows={2} value={values.deliveryArea} onChange={e=>set('deliveryArea',e.target.value)} placeholder="F.eks. én adresse i Oslo eller flere stopp på Romerike" maxLength={500} {...invalid('deliveryArea')}/><FieldError name="deliveryArea" errors={errors}/></div>
                  <div className="qw-field"><label htmlFor="qw-stops">Leveringsstopp per tur <span>*</span></label><input id="qw-stops" type="number" inputMode="numeric" min="1" max="1000" step="1" value={values.stops} onChange={e=>set('stops',e.target.value)} {...invalid('stops')}/><FieldError name="stops" errors={errors}/></div>
                  {values.kind==='fast' ? <div className="qw-field"><label htmlFor="qw-frequencyPerWeek">Turer per uke <span>*</span></label><input id="qw-frequencyPerWeek" type="number" inputMode="decimal" min="1" max="100" step="0.5" value={values.frequencyPerWeek} onChange={e=>set('frequencyPerWeek',e.target.value)} placeholder="F.eks. 5" {...invalid('frequencyPerWeek')}/><FieldError name="frequencyPerWeek" errors={errors}/></div> : <div className="qw-field"><label htmlFor="qw-startDate">Ønsket dato <em>valgfritt</em></label><input id="qw-startDate" type="date" value={values.startDate} onChange={e=>set('startDate',e.target.value)} {...invalid('startDate')}/><FieldError name="startDate" errors={errors}/></div>}
                  {values.kind==='fast' && <div className="qw-field qw-full"><label>Aktuelle ukedager <em>valgfritt</em></label><div className="qw-weekdays">{days.map(d=><label key={d.key} className={values.weekdays.includes(d.key)?'selected':''}><input type="checkbox" checked={values.weekdays.includes(d.key)} onChange={()=>set('weekdays',values.weekdays.includes(d.key)?values.weekdays.filter(day=>day!==d.key):[...values.weekdays,d.key])}/>{d.label}</label>)}</div></div>}
                  <div className={`qw-field ${values.kind==='enkelt'?'qw-full':''}`}><label htmlFor="qw-timeWindow">Tidsvindu <em>valgfritt</em></label><input id="qw-timeWindow" value={values.timeWindow} onChange={e=>set('timeWindow',e.target.value)} placeholder="F.eks. henting 08, levering før 12" maxLength={160} {...invalid('timeWindow')}/><FieldError name="timeWindow" errors={errors}/></div>
                  {values.kind==='fast' && <div className="qw-field"><label htmlFor="qw-startDate">Ønsket oppstart <em>valgfritt</em></label><input id="qw-startDate" type="date" value={values.startDate} onChange={e=>set('startDate',e.target.value)} {...invalid('startDate')}/><FieldError name="startDate" errors={errors}/></div>}
                </div>
              </div>}
              {step===2 && <div className="qw-step-content">
                <span className="qw-step-count">Steg 3 av 4</span><h2 ref={titleRef} tabIndex={-1}>Hva skal vi frakte?</h2><p className="qw-step-description">Last og temperaturbehov hjelper oss å velge riktig kjøretøy.</p>
                <div className="qw-field"><label htmlFor="qw-vehicleType">Ønsket kjøretøy</label><select id="qw-vehicleType" value={values.vehicleType} onChange={e=>set('vehicleType',e.target.value as FormValues['vehicleType'])}><option value="avklares">Usikker – hjelp meg å velge</option><option value="varebil">Varebil</option><option value="lastebil">Lastebil</option></select></div>
                <div className="qw-field"><label htmlFor="qw-temperature">Temperaturbehov <span>*</span></label><select id="qw-temperature" value={values.temperature} onChange={e=>{set('temperature',e.target.value as FormValues['temperature']);if(e.target.value==='torr')set('temperatureDetails','')}}><option value="kjol">Kjøletransport</option><option value="torr">Varer uten kjølebehov</option><option value="annet">Annet temperaturbehov</option></select></div>
                {values.temperature!=='torr' && <div className="qw-field qw-temp-details"><label htmlFor="qw-temperatureDetails">Temperaturkrav {values.temperature==='annet'?<span>*</span>:<em>hvis kjent</em>}</label><input id="qw-temperatureDetails" value={values.temperatureDetails} onChange={e=>set('temperatureDetails',e.target.value)} maxLength={160} placeholder="F.eks. +2 til +4 °C" {...invalid('temperatureDetails')}/><FieldError name="temperatureDetails" errors={errors}/></div>}
                <div className="qw-form-grid qw-cargo-grid">
                  <div className="qw-field"><label htmlFor="qw-loadType">Type last <span>*</span></label><select id="qw-loadType" value={values.loadType} onChange={e=>set('loadType',e.target.value as FormValues['loadType'])}><option value="kasser">Kasser / kolli</option><option value="paller">Paller</option><option value="annet">Annet</option></select></div>
                  <div className="qw-field"><label htmlFor="qw-quantity">Antall {loadLabels[values.loadType]} <span>*</span></label><input id="qw-quantity" type="number" inputMode="numeric" min="1" max="10000" step="1" value={values.quantity} onChange={e=>set('quantity',e.target.value)} placeholder="Omtrentlig antall" {...invalid('quantity')}/><FieldError name="quantity" errors={errors}/></div>
                  <div className="qw-field"><label htmlFor="qw-weightKg">Samlet vekt i kg <em>valgfritt</em></label><input id="qw-weightKg" type="number" inputMode="decimal" min="0.01" max="50000" step="any" value={values.weightKg} onChange={e=>set('weightKg',e.target.value)} placeholder="Hvis kjent" {...invalid('weightKg')}/><FieldError name="weightKg" errors={errors}/></div>
                  <div className="qw-field qw-lift-field"><label className={`qw-check-card ${values.lift?'selected':''}`}><input type="checkbox" checked={values.lift} onChange={e=>set('lift',e.target.checked)}/><span><strong>Behov for løftelem</strong><small>Til lasting eller lossing</small></span></label></div>
                  <div className="qw-field qw-full"><label htmlFor="qw-details">Annet vi bør vite <em>valgfritt</em></label><textarea id="qw-details" rows={3} value={values.details} onChange={e=>set('details',e.target.value)} placeholder="F.eks. mål på lasten, adkomst, bærehjelp eller særlige leveringskrav" maxLength={3000} {...invalid('details')}/><FieldError name="details" errors={errors}/></div>
                </div>
                <p className="qw-small-note"><Snowflake size={16}/>Vi avklarer temperaturkrav og tilgjengelig kapasitet før oppdraget avtales.</p>
              </div>}
              {step===3 && <div className="qw-step-content">
                <span className="qw-step-count">Steg 4 av 4</span><h2 ref={titleRef} tabIndex={-1}>Hvem skal vi kontakte?</h2><p className="qw-step-description">Kontroller opplysningene og send forespørselen. Du får en referanse her på siden.</p>
                <div className="qw-form-grid">
                  <div className="qw-field"><label htmlFor="qw-name">Navn <span>*</span></label><input id="qw-name" autoComplete="name" maxLength={120} value={values.name} onChange={e=>set('name',e.target.value)} placeholder="Kontaktperson" {...invalid('name')}/><FieldError name="name" errors={errors}/></div>
                  <div className="qw-field"><label htmlFor="qw-company">Bedrift <span>*</span></label><input id="qw-company" autoComplete="organization" maxLength={160} value={values.company} onChange={e=>set('company',e.target.value)} placeholder="Firmanavn" {...invalid('company')}/><FieldError name="company" errors={errors}/></div>
                  <div className="qw-field"><label htmlFor="qw-email">E-post <span>*</span></label><input id="qw-email" type="email" autoComplete="email" maxLength={254} value={values.email} onChange={e=>set('email',e.target.value)} placeholder="navn@bedrift.no" {...invalid('email')}/><FieldError name="email" errors={errors}/></div>
                  <div className="qw-field"><label htmlFor="qw-phone">Telefon <span>*</span></label><input id="qw-phone" type="tel" autoComplete="tel" maxLength={40} value={values.phone} onChange={e=>set('phone',e.target.value)} placeholder="Telefonnummer" {...invalid('phone')}/><FieldError name="phone" errors={errors}/></div>
                  <div className="qw-field qw-full"><label htmlFor="qw-source">Hvordan fant du oss? <em>valgfritt</em></label><select id="qw-source" value={values.source} onChange={e=>set('source',e.target.value)}><option value="">Velg hvis du ønsker</option><option>Google</option><option>Anbefaling</option><option>Eksisterende kunde</option><option>Annet</option></select></div>
                </div>
                <div className="qw-review"><button type="button" className="qw-review-toggle" onClick={()=>setShowReview(v=>!v)} aria-expanded={showReview} aria-controls="qw-review-details"><span><FileCheck2 size={18}/>Oppsummering av transporten</span><ChevronDown size={18} className={showReview?'rotated':''}/></button>{showReview && <div id="qw-review-details"><Summary input={{...values,requestKey:'',stops:toNumber(values.stops),frequencyPerWeek:values.kind==='fast'?toNumber(values.frequencyPerWeek):null,quantity:toNumber(values.quantity),weightKg:values.weightKg?toNumber(values.weightKg):null,weekdays:values.kind==='fast'?values.weekdays:[],landingPath:'',referrerDomain:'',campaign:''}}/></div>}</div>
                <p className="qw-privacy">Vi bruker opplysningene til å behandle transportforespørselen og følge opp tilbudet. <a href="/personvern" target="_blank" rel="noopener noreferrer">Les om personvern</a>.</p>
              </div>}
            </fieldset>
            <div className="qw-trap" aria-hidden="true"><label htmlFor="qw-website">La dette feltet stå tomt</label><input id="qw-website" name="website" tabIndex={-1} autoComplete="off" value={values.website} onChange={e=>set('website',e.target.value)}/></div>
            {serverError && <div className="qw-server-error" role="alert"><strong>{uncertain?'Mottak er ikke bekreftet':'Forespørselen er ikke sendt'}</strong><p>{serverError}</p>{uncertain && <small>Opplysningene er låst mens vi prøver å bekrefte samme forespørsel, slik at du unngår dobbeltregistrering.</small>}</div>}
            <div className="qw-form-actions"><button type="button" className="qw-secondary" disabled={step===0 || pending || uncertain} onClick={()=>move(step-1)}><ArrowLeft size={16}/>Tilbake</button><span className="qw-action-step">{step+1} / 4</span><button className="qw-primary" type="submit" disabled={pending}>{pending?<><LoaderCircle size={17} className="qw-spin"/>Registrerer …</>:step===3?<>{uncertain?'Bekreft mottak på nytt':'Send forespørsel'}<Send size={16}/></>:<>Fortsett<ArrowRight size={17}/></>}</button></div>
          </form>
        </section>
        <aside className="qw-aside">
          <div className="qw-aside-card"><span className="qw-aside-icon"><MapPin size={22}/></span><span className="qw-eyebrow">Urban Logistikk</span><h2>Fra behov til en tydelig plan.</h2><p>Du beskriver transporten. Vi vurderer rute, bil og kapasitet, og tar kontakt om et tilbud.</p><ol><li><span>1</span>Send transportbehovet</li><li><span>2</span>Vi avklarer detaljene</li><li><span>3</span>Avtal pris og oppstart</li></ol><div className="qw-aside-divider"/><div className="qw-aside-contact"><Phone size={18}/><div><small>Vil du ta det på telefon?</small><a href="tel:+4796840395">+47 968 40 395</a></div></div></div>
          <div className="qw-mini-summary"><Package size={18}/><div><strong>{values.kind==='fast'?'Fast transportavtale':'Enkeltoppdrag'}</strong><span>{values.pickup && values.deliveryArea ? `${values.pickup} → ${values.deliveryArea}`:'Vi tilpasser bilen til lasten og ruten.'}</span></div></div>
        </aside>
      </div>
    </div>
  </main>;
}
