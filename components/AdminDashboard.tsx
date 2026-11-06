'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ArrowDownToLine, ArrowLeft, ArrowRight, ArrowUpRight, BarChart3, Calculator, Check, ChevronRight, ClipboardCheck, Copy, ExternalLink, FileText, Inbox, LoaderCircle, Mail, MapPin, Phone, RefreshCw, Save, Search, ShieldCheck, Snowflake, Trash2, Truck, X } from 'lucide-react';
import type { AdminStats, CostingInput, Inquiry, InquiryKind, InquiryPage, InquiryStatus } from '@/lib/contracts';
import { STATUS_LABELS } from '@/lib/contracts';
import { calculatePricing, COST_MAX, defaultCosting, pricingInputErrors } from '@/lib/pricing';

type View = 'inbox' | 'insights';
type DetailTab = 'details' | 'costing' | 'offer';
const money = (value: number | null | undefined) => value == null ? '—' : new Intl.NumberFormat('nb-NO', { style:'currency',currency:'NOK',maximumFractionDigits:0 }).format(value);
const offerMoney = (value: number) => new Intl.NumberFormat('nb-NO', { style:'currency',currency:'NOK',minimumFractionDigits:2,maximumFractionDigits:2 }).format(value);
const number = (value:number) => new Intl.NumberFormat('nb-NO',{maximumFractionDigits:2}).format(value);
const shortDate = (value:string) => value ? new Intl.DateTimeFormat('nb-NO',{day:'numeric',month:'short',year:'numeric',timeZone:'Europe/Oslo'}).format(new Date(value.includes('T')?value:`${value}T12:00:00Z`)) : 'Ikke avtalt';
const longDate = (value:string) => value ? new Intl.DateTimeFormat('nb-NO',{day:'numeric',month:'long',year:'numeric',hour:'2-digit',minute:'2-digit',timeZone:'Europe/Oslo'}).format(new Date(value)) : '—';
const kindLabel = (kind:InquiryKind) => kind==='fast'?'Fast transportavtale':'Enkeltoppdrag';
const tempLabel = (value:string) => value==='kjol'?'Kjøletransport':value==='torr'?'Tørrtransport':'Andre temperaturkrav';

async function jsonRequest<T>(url:string, init?:RequestInit):Promise<T> {
  const response=await fetch(url,{...init,credentials:'same-origin',cache:'no-store',headers:{...(init?.body?{'Content-Type':'application/json'}:{}),...init?.headers}});
  let body:any;
  try { body=await response.json(); } catch { throw new Error('Serveren ga et uventet svar. Prøv igjen.'); }
  if(!response.ok) throw new Error(body.error || (response.status===401?'Logg inn for å åpne arbeidsrommet.':response.status===403?'Denne kontoen har ikke tilgang.':'Kunne ikke hente data. Prøv igjen.'));
  return body;
}

function StatusBadge({status}:{status:InquiryStatus}) { return <span className={`adm-status adm-status-${status}`}><span/>{STATUS_LABELS[status]}</span>; }
function Empty({title,text,children}:{title:string;text:string;children?:React.ReactNode}) { return <div className="adm-empty"><span className="adm-empty-icon"><Inbox size={27}/></span><h3>{title}</h3><p>{text}</p>{children}</div>; }
function Loading(){return <div className="adm-loading" role="status"><LoaderCircle className="adm-spin" size={22}/> Henter oversikten …</div>;}
function ErrorBox({message,onRetry}:{message:string;onRetry?:()=>void}){return <div className="adm-error" role="alert"><p>{message}</p>{onRetry&&<button className="adm-btn adm-btn-secondary" onClick={onRetry}><RefreshCw size={15}/>Prøv igjen</button>}</div>;}

export default function AdminDashboard(){
  const [view,setView]=useState<View>('inbox');
  const [stats,setStats]=useState<AdminStats|null>(null);
  const [statsError,setStatsError]=useState('');
  const [list,setList]=useState<InquiryPage|null>(null);
  const [loading,setLoading]=useState(true);
  const [listError,setListError]=useState('');
  const [query,setQuery]=useState('');
  const [search,setSearch]=useState('');
  const [status,setStatus]=useState('');
  const [kind,setKind]=useState('');
  const [page,setPage]=useState(1);
  const [revision,setRevision]=useState(0);
  const [selected,setSelected]=useState<Inquiry|null>(null);
  const [detailTab,setDetailTab]=useState<DetailTab>('details');
  const [detailLoading,setDetailLoading]=useState(false);
  const [detailError,setDetailError]=useState('');
  const [draftStatus,setDraftStatus]=useState<InquiryStatus>('ny');
  const [notes,setNotes]=useState('');
  const [followUpDate,setFollowUpDate]=useState('');
  const [costing,setCosting]=useState<CostingInput>(defaultCosting());
  const [costTouched,setCostTouched]=useState(false);
  const [saving,setSaving]=useState(false);
  const [confirmDeleteId,setConfirmDeleteId]=useState<string|null>(null);
  const [deleting,setDeleting]=useState(false);
  const [deleteError,setDeleteError]=useState('');
  const [inboxNotice,setInboxNotice]=useState('');
  const deletingRef=useRef(false);
  const deleteTriggerRef=useRef<HTMLButtonElement>(null);
  const cancelDeleteRef=useRef<HTMLButtonElement>(null);
  const [savedMessage,setSavedMessage]=useState('');
  const [copied,setCopied]=useState(false);
  const drawerRef=useRef<HTMLElement>(null);
  const closeRef=useRef<()=>void>(()=>{});
  const detailRequestRef=useRef(0);
  const refresh=()=>setRevision(v=>v+1);

  useEffect(()=>{const timer=setTimeout(()=>{setSearch(query.trim());setPage(1);},300);return()=>clearTimeout(timer)},[query]);
  useEffect(()=>{let current=true;setStatsError('');jsonRequest<AdminStats>('/api/admin/stats').then(data=>{if(current)setStats(data)}).catch(error=>{if(current)setStatsError(error.message)});return()=>{current=false}},[revision]);
  useEffect(()=>{let current=true;setLoading(true);setListError('');const params=new URLSearchParams({page:String(page)});if(status)params.set('status',status);if(kind)params.set('kind',kind);if(search)params.set('search',search);jsonRequest<InquiryPage>(`/api/admin/inquiries?${params}`).then(data=>{if(!current)return;const lastPage=Math.max(1,Math.ceil(data.total/data.pageSize));if(page>lastPage){setPage(lastPage);return;}setList(data)}).catch(error=>{if(current)setListError(error.message)}).finally(()=>{if(current)setLoading(false)});return()=>{current=false}},[page,status,kind,search,revision]);

  const dirty=!!selected&&(draftStatus!==selected.status||notes!==selected.notes||followUpDate!==selected.followUpDate||(costTouched&&JSON.stringify(costing)!==JSON.stringify(selected.costing)));
  useEffect(()=>{if(!dirty)return;const handler=(event:BeforeUnloadEvent)=>{event.preventDefault();event.returnValue=''};window.addEventListener('beforeunload',handler);return()=>window.removeEventListener('beforeunload',handler)},[dirty]);
  const setInquiry=useCallback((inquiry:Inquiry)=>{setSelected(inquiry);setDraftStatus(inquiry.status);setNotes(inquiry.notes||'');setFollowUpDate(inquiry.followUpDate||'');setCosting(inquiry.costing??defaultCosting(inquiry.frequencyPerWeek||1));setCostTouched(false);setDetailError('');setSavedMessage('');setCopied(false)},[]);
  async function openInquiry(inquiry:Inquiry){
    if(saving||deletingRef.current||selected?.id===inquiry.id)return;
    if(dirty&&!window.confirm('Du har ulagrede endringer. Vil du forkaste dem og åpne en annen forespørsel?'))return;
    setConfirmDeleteId(null);setDeleteError('');setInboxNotice('');const requestId=++detailRequestRef.current;setInquiry(inquiry);setDetailTab('details');setDetailLoading(true);
    try {const data=await jsonRequest<Inquiry|{item:Inquiry}>(`/api/admin/inquiries/${inquiry.id}`);if(requestId===detailRequestRef.current)setInquiry('item'in data?data.item:data)}catch(error){if(requestId===detailRequestRef.current)setDetailError((error as Error).message)}finally{if(requestId===detailRequestRef.current)setDetailLoading(false)}
  }
  function closeInquiry(){if(saving||deletingRef.current)return;if(dirty&&!window.confirm('Forkaste ulagrede endringer?'))return;detailRequestRef.current++;setSelected(null);setConfirmDeleteId(null);setDetailError('');setDeleteError('')}
  function cancelDelete(){if(deletingRef.current)return;setConfirmDeleteId(null);setDeleteError('');requestAnimationFrame(()=>deleteTriggerRef.current?.focus())}
  closeRef.current=confirmDeleteId?cancelDelete:closeInquiry;
  useEffect(()=>{if(confirmDeleteId)cancelDeleteRef.current?.focus()},[confirmDeleteId]);
  useEffect(()=>{
    if(!selected)return;
    const previous=document.activeElement as HTMLElement|null;
    const overflow=document.body.style.overflow;document.body.style.overflow='hidden';
    drawerRef.current?.focus();
    const trap=(event:KeyboardEvent)=>{
      if(event.key==='Escape'){event.preventDefault();closeRef.current();return;}
      if(event.key!=='Tab'||!drawerRef.current)return;
      const controls=Array.from(drawerRef.current.querySelectorAll<HTMLElement>('a[href],button:not([disabled]),input:not([disabled]),textarea:not([disabled]),select:not([disabled]),[tabindex="0"]')).filter(node=>node.getClientRects().length>0);
      const first=controls[0],last=controls[controls.length-1];if(!first)return;
      if(event.shiftKey&&(document.activeElement===first||document.activeElement===drawerRef.current)){event.preventDefault();last.focus();}
      else if(!event.shiftKey&&(document.activeElement===last||document.activeElement===drawerRef.current)){event.preventDefault();first.focus();}
    };
    document.addEventListener('keydown',trap);
    return()=>{document.body.style.overflow=overflow;document.removeEventListener('keydown',trap);previous?.focus()};
  },[selected?.id]);
  async function save(){
    if(!selected||saving||deletingRef.current||confirmDeleteId)return;
    const issues=costTouched?pricingInputErrors(costing):[];
    if(issues.length){setDetailError(issues.join(' '));return;}
    setSaving(true);setDetailError('');setSavedMessage('');
    try {await jsonRequest(`/api/admin/inquiries/${selected.id}`,{method:'PATCH',body:JSON.stringify({status:draftStatus,notes,followUpDate,...(costTouched?{costing}:{})})});const data=await jsonRequest<Inquiry|{item:Inquiry}>(`/api/admin/inquiries/${selected.id}`);setInquiry('item'in data?data.item:data);setSavedMessage('Endringene er lagret.');refresh()}catch(error){setDetailError((error as Error).message)}finally{setSaving(false)}
  }
  async function deleteInquiry(){
    if(!selected||confirmDeleteId!==selected.id||saving||detailLoading||deletingRef.current)return;
    const target=selected;
    deletingRef.current=true;setDeleting(true);setDeleteError('');
    try{
      const response=await fetch(`/api/admin/inquiries/${encodeURIComponent(target.id)}`,{method:'DELETE',credentials:'same-origin',cache:'no-store'});
      if(!response.ok){
        const body=await response.json().catch(()=>null);
        throw new Error(typeof body?.error==='string'?body.error:response.status===401||response.status===403?'Du har ikke tilgang til å slette forespørselen.':'Slettingen ble ikke bekreftet. Prøv igjen.');
      }
      detailRequestRef.current++;setSelected(null);setConfirmDeleteId(null);setDetailError('');setSavedMessage('');
      setInboxNotice(`Forespørselen ${target.reference} er slettet.`);
      if(list){
        const remaining=list.items.some(item=>item.id===target.id)?Math.max(0,list.total-1):list.total;
        setPage(current=>Math.min(current,Math.max(1,Math.ceil(remaining/list.pageSize))));
      }
      refresh();
    }catch(error){setDeleteError(error instanceof TypeError?'Mistet kontakten med serveren. Prøv igjen for å bekrefte slettingen.':(error as Error).message);}
    finally{deletingRef.current=false;setDeleting(false);}
  }
  function editCost(key:keyof CostingInput,value:string){setCostTouched(true);setSavedMessage('');setCosting(current=>({...current,[key]:key==='offeredPrice'&&value===''?null:value===''?0:Number(value)}))}
  const pricing=useMemo(()=>{try{return calculatePricing(costing)}catch{return null}},[costing]);
  const inputIssues=useMemo(()=>pricingInputErrors(costing),[costing]);
  const offerText=useMemo(()=>{
    if(!selected||!costing.offeredPrice)return '';
    const frequency=selected.kind==='fast'?`${number(selected.frequencyPerWeek||costing.tripsPerWeek)} turer per uke${selected.weekdays.length?` (${selected.weekdays.join(', ')})`:''}`:'Enkeltoppdrag';
    return `Hei ${selected.name},\n\nTakk for forespørselen til Urban Logistikk.\n\nVårt tilbud gjelder:\n– Henting: ${selected.pickup}\n– Levering: ${selected.deliveryArea}\n– Omfang: ${frequency}, ${selected.stops} stopp per tur\n– Last: ${selected.quantity} ${selected.loadType}${selected.weightKg?`, totalt ${number(selected.weightKg)} kg`:''}\n– Transport: ${tempLabel(selected.temperature)}${selected.temperatureDetails?` – ${selected.temperatureDetails}`:''}${selected.lift?'\n– Behov for løftelem':''}\n${selected.timeWindow?`– Tidsvindu: ${selected.timeWindow}\n`:''}\nPris: ${offerMoney(costing.offeredPrice)} eks. mva. per tur.\n\nPrisen forutsetter omfanget ovenfor. Endringer i rute, volum eller ventetid avklares særskilt. Kapasitet, oppstart og endelige betingelser bekreftes før oppdraget starter.\n\nGi gjerne beskjed om dere ønsker å gå videre eller avklare noe.\n\nMed vennlig hilsen\nUrban Logistikk AS\n+47 968 40 395\nurbanlogistikk@outlook.com\n\nReferanse: ${selected.reference}`;
  },[selected,costing.offeredPrice,costing.tripsPerWeek]);
  async function copyOffer(){try{await navigator.clipboard.writeText(offerText);setCopied(true)}catch{setDetailError('Kunne ikke kopiere automatisk. Marker teksten i feltet og kopier den.')}}
  function downloadOffer(){if(!selected)return;const url=URL.createObjectURL(new Blob([offerText],{type:'text/plain;charset=utf-8'}));const anchor=document.createElement('a');anchor.href=url;anchor.download=`tilbud-${selected.reference}.txt`;anchor.click();setTimeout(()=>URL.revokeObjectURL(url),1000)}

  return <div className="adm-shell">
    <aside className="adm-sidebar"><a className="adm-brand" href="/"><span>UL</span><div>URBAN<small>LOGISTIKK</small></div></a><div className="adm-workspace-label">DITT ARBEIDSROM</div><nav aria-label="Administrasjon"><button className={view==='inbox'?'active':''} onClick={()=>setView('inbox')}><Inbox size={18}/>Forespørsler{stats&&stats.newCount>0&&<span className="adm-nav-count">{stats.newCount}</span>}</button><button className={view==='insights'?'active':''} onClick={()=>setView('insights')}><BarChart3 size={18}/>Innsikt</button></nav><div className="adm-sidebar-bottom"><div className="adm-private"><ShieldCheck size={16}/><span>Privat arbeidsrom<small>Kun for autorisert konto</small></span></div><a href="/" target="_blank" rel="noreferrer">Åpne nettsiden <ExternalLink size={14}/></a></div></aside>
    <main className="adm-main"><header className="adm-topbar"><div><div className="adm-overline">URBAN LOGISTIKK / SALG</div><h1>{view==='inbox'?'Tilbudsoversikt':'Innsikt i henvendelsene'}</h1><p>{view==='inbox'?'Vurder oppdrag, beregn pris og følg opp kundene.':'Følg hva nettsiden fører til, fra visning til avtale.'}</p></div><button className="adm-btn adm-btn-secondary" onClick={refresh} aria-label="Oppdater oversikten"><RefreshCw size={16}/><span>Oppdater</span></button></header>
      {view==='inbox'?<>
        <div className="adm-stats"><Stat label="Nye forespørsler" value={stats?.newCount} icon={<Inbox size={18}/>} note="Venter på første vurdering"/><Stat label="Åpne saker" value={stats?.awaitingCount} icon={<FileText size={18}/>} note="Til vurdering eller tilbud sendt"/><Stat label="Oppfølging forfalt" value={stats?.overdueCount} icon={<ClipboardCheck size={18}/>} note="Åpne saker med passert dato"/><Stat label="Mottatt denne måneden" value={stats?.monthInquiries} icon={<Truck size={18}/>} note="Registrerte forespørsler"/></div>
        {statsError&&<ErrorBox message={statsError} onRetry={refresh}/>}
        {inboxNotice&&<div className="adm-inbox-notice" role="status"><Check size={16}/>{inboxNotice}</div>}
        <section className="adm-inbox-card" aria-label="Mottatte forespørsler"><div className="adm-filters"><label className="adm-search"><Search size={17}/><input aria-label="Søk etter bedrift, kontakt eller referanse" placeholder="Søk etter bedrift, kontakt eller referanse" value={query} onChange={event=>setQuery(event.target.value)}/></label><label><span className="adm-sr-only">Filtrer på status</span><select value={status} onChange={event=>{setStatus(event.target.value);setPage(1)}}><option value="">Alle statuser</option>{Object.entries(STATUS_LABELS).map(([key,label])=><option value={key} key={key}>{label}</option>)}</select></label><label><span className="adm-sr-only">Filtrer på oppdragstype</span><select value={kind} onChange={event=>{setKind(event.target.value);setPage(1)}}><option value="">Alle oppdrag</option><option value="fast">Fast avtale</option><option value="enkelt">Enkeltoppdrag</option></select></label></div>
          {loading?<Loading/>:listError?<ErrorBox message={listError} onRetry={refresh}/>:!list?.items.length?<Empty title={search||status||kind?'Ingen treff':'Her kommer neste transportoppdrag'} text={search||status||kind?'Prøv et annet søk eller fjern et filter.':'Når en kunde sender inn tilbudsskjemaet, vises forespørselen her med kontaktinformasjon, rute og transportbehov.'}><a className="adm-btn adm-btn-primary" href="/tilbud" target="_blank" rel="noreferrer">Åpne tilbudsskjemaet <ArrowUpRight size={16}/></a></Empty>:<><div className="adm-table-wrap"><table className="adm-table"><thead><tr><th>Bedrift / kontakt</th><th>Oppdrag</th><th>Status</th><th>Oppfølging</th><th>Mottatt</th><th><span className="adm-sr-only">Åpne</span></th></tr></thead><tbody>{list.items.map(inquiry=><tr key={inquiry.id} className={selected?.id===inquiry.id?'adm-inquiry-row adm-row-selected':'adm-inquiry-row'} onClick={()=>openInquiry(inquiry)}><td><button type="button" className="adm-row-link" aria-haspopup="dialog"><strong>{inquiry.company||inquiry.name}</strong><span>{inquiry.name} · {inquiry.reference}</span></button></td><td><span className="adm-type">{inquiry.kind==='fast'?'Fast avtale':'Enkeltoppdrag'}</span><small>{inquiry.pickup} → {inquiry.deliveryArea}</small></td><td><StatusBadge status={inquiry.status}/></td><td>{inquiry.followUpDate?shortDate(inquiry.followUpDate):<span className="adm-muted">Ikke satt</span>}</td><td>{shortDate(inquiry.createdAt)}</td><td><button type="button" className="adm-icon-btn" aria-haspopup="dialog" aria-label={`Åpne ${inquiry.reference}`}><ChevronRight size={19}/></button></td></tr>)}</tbody></table></div><div className="adm-pagination"><span>{list.total} {list.total===1?'forespørsel':'forespørsler'} · Side {list.page} av {Math.max(1,Math.ceil(list.total/list.pageSize))}</span><div><button className="adm-icon-btn" disabled={page<=1} onClick={()=>setPage(p=>p-1)} aria-label="Forrige side"><ArrowLeft size={17}/></button><button className="adm-icon-btn" disabled={page*list.pageSize>=list.total} onClick={()=>setPage(p=>p+1)} aria-label="Neste side"><ArrowRight size={17}/></button></div></div></>}
        </section>
      </>:<Insights stats={stats} error={statsError} retry={refresh}/>}
    </main>
    {selected&&<div className="adm-drawer-backdrop"><section ref={drawerRef} tabIndex={-1} className="adm-drawer" role="dialog" aria-modal="true" aria-labelledby="inquiry-title"><div className="adm-drawer-top"><div><span className="adm-overline">{selected.reference} · {kindLabel(selected.kind)}</span><h2 id="inquiry-title">{selected.company||selected.name}</h2><span className="adm-muted">Mottatt {longDate(selected.createdAt)}</span></div><button className="adm-icon-btn" aria-label="Lukk forespørselen" disabled={saving||deleting} onClick={closeInquiry}><X size={20}/></button></div><div className="adm-detail-tabs" role="tablist" aria-label="Forespørsel"><button role="tab" disabled={saving||deleting} aria-selected={detailTab==='details'} className={detailTab==='details'?'active':''} onClick={()=>setDetailTab('details')}><FileText size={16}/>Detaljer</button><button role="tab" disabled={saving||deleting} aria-selected={detailTab==='costing'} className={detailTab==='costing'?'active':''} onClick={()=>setDetailTab('costing')}><Calculator size={16}/>Kalkyle</button><button role="tab" disabled={saving||deleting} aria-selected={detailTab==='offer'} className={detailTab==='offer'?'active':''} onClick={()=>setDetailTab('offer')}><Mail size={16}/>Tilbudsutkast</button></div><div className="adm-drawer-body"><fieldset className="adm-drawer-fields" disabled={saving||deleting} aria-label="Forespørsel og kalkyle">
      {detailLoading?<Loading/>:<>
      {detailError&&<ErrorBox message={detailError}/>}
      {detailTab==='details'?<>
        <div className="adm-detail-control"><label>Status<select value={draftStatus} onChange={event=>{setDraftStatus(event.target.value as InquiryStatus);setSavedMessage('')}}>{Object.entries(STATUS_LABELS).map(([key,label])=><option value={key} key={key}>{label}</option>)}</select></label><label>Følg opp innen<input type="date" value={followUpDate} onChange={event=>{setFollowUpDate(event.target.value);setSavedMessage('')}}/></label></div>
        <div className="adm-contact-card"><div className="adm-avatar">{selected.name.charAt(0).toUpperCase()}</div><div><strong>{selected.name}</strong><span>{selected.company}</span><div className="adm-contact-actions"><a href={`mailto:${selected.email}`}><Mail size={14}/>{selected.email}</a><a href={`tel:${selected.phone.replace(/\s/g,'')}`}><Phone size={14}/>{selected.phone}</a></div></div></div>
        <div className="adm-detail-block"><h3><MapPin size={17}/>Rute og tidspunkt</h3><dl><div><dt>Hentested</dt><dd>{selected.pickup}</dd></div><div><dt>Leveringsområde</dt><dd>{selected.deliveryArea}</dd></div><div><dt>Antall stopp</dt><dd>{selected.stops} per tur</dd></div>{selected.kind==='fast'&&<><div><dt>Frekvens</dt><dd>{selected.frequencyPerWeek} turer per uke</dd></div><div><dt>Ukedager</dt><dd>{selected.weekdays.join(', ')||'Avklares'}</dd></div></>}<div><dt>Ønsket dato / oppstart</dt><dd>{selected.startDate?shortDate(selected.startDate):'Avklares'}</dd></div><div><dt>Tidsvindu</dt><dd>{selected.timeWindow||'Avklares'}</dd></div></dl></div>
        <div className="adm-detail-block"><h3><Snowflake size={17}/>Last og håndtering</h3><dl><div><dt>Kjøretøy</dt><dd>{selected.vehicleType==='lastebil'?'Lastebil':selected.vehicleType==='varebil'?'Varebil':'Avklares'}</dd></div><div><dt>Transport</dt><dd>{tempLabel(selected.temperature)}</dd></div><div><dt>Temperaturkrav</dt><dd>{selected.temperatureDetails||'Ikke spesifisert'}</dd></div><div><dt>Volum</dt><dd>{selected.quantity} {selected.loadType}</dd></div><div><dt>Samlet vekt</dt><dd>{selected.weightKg===null?'Ikke oppgitt':`${number(selected.weightKg)} kg`}</dd></div><div><dt>Løftelem</dt><dd>{selected.lift?'Ønskes':'Ikke valgt'}</dd></div></dl>{selected.details&&<div className="adm-customer-note"><span>Kundens merknad</span><p>{selected.details}</p></div>}</div>
        <div className="adm-detail-block"><h3>Intern oppfølging</h3><label className="adm-field">Private notater<textarea value={notes} maxLength={10000} rows={5} placeholder="Vurdering av kapasitet, avklaringer med kunden og neste steg …" onChange={event=>{setNotes(event.target.value);setSavedMessage('')}}/></label><p className="adm-help">Notatene vises bare i arbeidsrommet.</p></div>
        <div className="adm-source"><span>Oppgitt kilde: <strong>{selected.source||'Ikke oppgitt'}</strong></span>{selected.referrerDomain&&<span>Henvisning: {selected.referrerDomain}</span>}{selected.landingPath&&<span>Inngang: {selected.landingPath}</span>}{selected.campaign&&<span>Kampanje: {selected.campaign}</span>}</div>
      </>:detailTab==='costing'?<>
        <div className="adm-note"><Calculator size={18}/><p>Regn på <strong>én tur</strong>, inkludert tomkjøring og all arbeidstid. Beløp er eks. mva. Samlet sjåførkostnad skal inkludere arbeidsgiverkostnader.</p></div>
        <div className="adm-calc-section"><h3>Arbeid og kjøring</h3><div className="adm-calc-grid"><CostField label="Kjøring" unit="timer" name="drivingHours" value={costing.drivingHours} onChange={editCost}/><CostField label="Lasting og lossing" unit="timer" name="handlingHours" value={costing.handlingHours} onChange={editCost}/><CostField label="Venting / annet arbeid" unit="timer" name="waitingHours" value={costing.waitingHours} onChange={editCost}/><CostField label="Samlet sjåførkostnad" unit="kr / time" name="laborPerHour" value={costing.laborPerHour} onChange={editCost}/><CostField label="Kjørelengde inkl. tomkjøring" unit="km" name="distanceKm" value={costing.distanceKm} onChange={editCost}/><CostField label="Drivstofforbruk" unit="l / 100 km" name="litersPer100Km" value={costing.litersPer100Km} onChange={editCost}/><CostField label="Dieselpris eks. mva." unit="kr / liter" name="dieselPerLiter" value={costing.dieselPerLiter} onChange={editCost}/><CostField label="Bom og parkering" unit="kr / tur" name="tolls" value={costing.tolls} onChange={editCost}/></div><p className="adm-help">Forbruket på 10 l / 100 km er en startantakelse. Tilpass det til bilen og oppdraget.</p></div>
        <div className="adm-calc-section"><h3>Bil og øvrige kostnader</h3><div className="adm-calc-grid"><CostField label="Bilkostnad fordelt på turen" unit="kr / tur" name="vehicleCost" value={costing.vehicleCost} onChange={editCost}/><CostField label="Andre kostnader" unit="kr / tur" name="otherCost" value={costing.otherCost} onChange={editCost}/></div><p className="adm-help">Bilkostnad bør dekke turens andel av blant annet forsikring, verditap, service og vedlikehold. Null betyr at kostnaden ikke er tatt med.</p></div>
        <div className="adm-calc-section"><h3>Pris og omfang</h3><div className="adm-calc-grid"><CostField label="Ønsket margin" unit="% av omsetning" name="targetMarginPct" value={costing.targetMarginPct} onChange={editCost} max={90}/><CostField label="Din tilbudspris" unit="kr / tur" name="offeredPrice" value={costing.offeredPrice} onChange={editCost}/>{selected.kind==='fast'&&<><CostField label="Turer per uke i kalkylen" unit="turer" name="tripsPerWeek" value={costing.tripsPerWeek} onChange={editCost} min={0.01}/><CostField label="Driftsuker per år" unit="uker" name="operatingWeeks" value={costing.operatingWeeks} onChange={editCost} min={1} max={53}/></>}</div><p className="adm-help">20 % margin og 52 driftsuker er redigerbare startantakelser. Margin beregnes som fortjeneste delt på pris.</p></div>
        {inputIssues.length>0&&<ErrorBox message={inputIssues.join(' ')}/>}
        {pricing&&<><div className="adm-cost-breakdown"><div><span>Arbeid · {number(pricing.hours)} timer</span><strong>{money(pricing.labor)}</strong></div><div><span>Drivstoff</span><strong>{money(pricing.fuel)}</strong></div><div><span>Bom, bil og øvrig</span><strong>{money(costing.tolls+costing.vehicleCost+costing.otherCost)}</strong></div><div className="adm-total-line"><span>{pricing.ready?'Beregnet kostnad per tur':'Kostnader lagt inn så langt'}</span><strong>{money(pricing.total)}</strong></div></div>{!pricing.ready?<div className="adm-incomplete">Fyll inn {pricing.missing.join(', ')} for å beregne målpris og margin.</div>:<><div className="adm-price-grid"><div><span>Nullpunkt per tur</span><strong>{money(pricing.breakEven)}</strong><small>Dekker kostnadene du har lagt inn</small></div><div className="adm-target-price"><span>Målpris ved {number(costing.targetMarginPct)} % margin</span><strong>{money(pricing.targetPrice)}</strong><button onClick={()=>{setCostTouched(true);setCosting(c=>({...c,offeredPrice:Math.ceil(pricing.targetPrice!)}));setSavedMessage('')}}>Bruk som tilbudspris <ArrowRight size={14}/></button></div></div>{pricing.offeredMarginPct!==null&&<div className={`adm-margin-strip ${pricing.offeredMarginPct<0?'adm-negative':''}`}><span>Ved din tilbudspris: <strong>{number(pricing.offeredMarginPct)} % margin</strong></span><span>{money(pricing.offeredContribution)} igjen per tur</span></div>}{selected.kind==='fast'&&<div className="adm-periods"><h4>Estimat ved {number(costing.tripsPerWeek)} turer i uken</h4><p>Basert på {pricing.revenueBasis==='offered'?'din tilbudspris':'beregnet målpris'} og {number(costing.operatingWeeks)} driftsuker per år.</p><table><thead><tr><th>Periode</th><th>Omsetning</th><th>Kostnad</th><th>Igjen</th></tr></thead><tbody><tr><th>Uke</th><td>{money(pricing.weeklyRevenue)}</td><td>{money(pricing.weeklyCost)}</td><td>{money(pricing.weeklyContribution)}</td></tr><tr><th>Måned, snitt</th><td>{money(pricing.monthlyRevenue)}</td><td>{money(pricing.monthlyCost)}</td><td>{money(pricing.monthlyContribution)}</td></tr></tbody></table></div>}<p className="adm-help">Kalkylen viser resultatet av dine forutsetninger. Kostnader som ikke er lagt inn, inngår ikke i marginen.</p></>}</>}
      </>:<>
        <div className="adm-note"><Mail size={18}/><p>Klargjør et tilbud med kundens opplysninger og din pris. Kontroller og rediger teksten før du sender den til kunden.</p></div>
        {!offerText?<Empty title="Legg inn en tilbudspris først" text="Velg din pris per tur under Kalkyle. Du kan bruke målprisen eller skrive inn en annen pris."><button className="adm-btn adm-btn-primary" onClick={()=>setDetailTab('costing')}>Åpne kalkylen <ArrowRight size={16}/></button></Empty>:<><div className="adm-offer-header"><div><span>Tilbud til {selected.company||selected.name}</span><strong>{offerMoney(costing.offeredPrice!)} <small>eks. mva. per tur</small></strong></div>{dirty&&<span className="adm-unsaved">Ulagrede endringer</span>}</div><textarea className="adm-offer-text" aria-label="Tilbudsutkast" value={offerText} readOnly rows={22}/><div className="adm-offer-actions"><button className="adm-btn adm-btn-secondary" onClick={copyOffer}>{copied?<Check size={16}/>:<Copy size={16}/>} {copied?'Kopiert':'Kopier tekst'}</button><button className="adm-btn adm-btn-secondary" onClick={downloadOffer}><ArrowDownToLine size={16}/>Last ned tekst</button><a className="adm-btn adm-btn-primary" href={`mailto:${selected.email}?subject=${encodeURIComponent(`Transporttilbud – ${selected.reference}`)}&body=${encodeURIComponent(offerText)}`}><Mail size={16}/>Åpne e-postutkast</a></div><p className="adm-help">E-postutkastet åpnes i e-postprogrammet ditt. Ingenting sendes herfra. Endre status til «Tilbud sendt» etter at du har sendt tilbudet.</p></>}
      </>}
      </>}
    </fieldset></div><footer className="adm-drawer-footer adm-footer-with-delete">
      {confirmDeleteId===selected.id?<div className="adm-delete-panel" role="group" aria-labelledby="adm-delete-heading">
        <strong id="adm-delete-heading">Slette {selected.reference} for {selected.company||selected.name}?</strong>
        <p>Forespørselen med notater og kalkyle slettes permanent.{dirty?' Ulagrede endringer blir også forkastet.':''}</p>
        {deleteError&&<p className="adm-delete-error" role="alert">{deleteError}</p>}
        <div className="adm-delete-actions"><button type="button" ref={cancelDeleteRef} className="adm-btn adm-btn-secondary" disabled={deleting} onClick={cancelDelete}>Avbryt</button><button type="button" className="adm-btn adm-btn-danger" disabled={saving||deleting||detailLoading} onClick={deleteInquiry}>{deleting?<LoaderCircle className="adm-spin" size={16}/>:<Trash2 size={16}/>} {deleting?'Sletter …':'Slett permanent'}</button></div>
      </div>:<div className="adm-footer-controls"><button ref={deleteTriggerRef} type="button" className="adm-btn adm-delete-trigger" disabled={saving||deleting||detailLoading} onClick={()=>{setDeleteError('');setConfirmDeleteId(selected.id)}}><Trash2 size={16}/>Slett forespørsel</button><div className="adm-footer-state" aria-live="polite">{dirty?<span className="adm-unsaved"><span/>Ulagrede endringer</span>:savedMessage?<span className="adm-saved"><Check size={15}/>{savedMessage}</span>:<span className="adm-muted">Sist lagret {longDate(selected.updatedAt)}</span>}</div><button className="adm-btn adm-btn-primary" disabled={!dirty||saving||detailLoading} onClick={save}>{saving?<LoaderCircle className="adm-spin" size={16}/>:<Save size={16}/>} {saving?'Lagrer …':'Lagre endringer'}</button></div>}</footer></section></div>}
  </div>;
}

function Stat({label,value,icon,note}:{label:string;value:number|undefined;icon:React.ReactNode;note:string}){return <div className="adm-stat"><div><span>{label}</span><i>{icon}</i></div><strong>{value===undefined?'—':number(value)}</strong><small>{note}</small></div>;}
function CostField({label,unit,name,value,onChange,min=0,max}:{label:string;unit:string;name:keyof CostingInput;value:number|null;onChange:(key:keyof CostingInput,value:string)=>void;min?:number;max?:number}){return <label className="adm-cost-field"><span>{label}</span><div><input type="number" inputMode="decimal" min={min} max={max??COST_MAX[name]} step="any" value={value===null||value===0?'':value} placeholder="0" onChange={event=>onChange(name,event.target.value)}/><small>{unit}</small></div></label>;}
function Insights({stats,error,retry}:{stats:AdminStats|null;error:string;retry:()=>void}){
  if(error)return <ErrorBox message={error} onRetry={retry}/>;
  if(!stats)return <Loading/>;
  const maxSource=Math.max(1,...stats.bySource.map(item=>item.count));
  const maxDay=Math.max(1,...stats.recentDays.map(item=>item.inquiries));
  return <><div className="adm-stats"><Stat label="Sidevisninger · denne måneden" value={stats.monthPageViews} icon={<BarChart3 size={18}/>} note="Visninger, ikke unike besøkende"/><Stat label="Forespørsler · denne måneden" value={stats.monthInquiries} icon={<Inbox size={18}/>} note="Mottatt gjennom skjemaet"/><Stat label="Forespørsler totalt" value={stats.total} icon={<FileText size={18}/>} note="Alle registrerte henvendelser"/><Stat label="Vunne saker totalt" value={stats.wonCount} icon={<ClipboardCheck size={18}/>} note="Saker du har markert som vunnet"/></div><div className="adm-insights-grid"><section className="adm-insight-card"><h2>Hvor kommer henvendelsene fra?</h2><p>Kilden kunden har oppgitt eller henvisningen som fulgte besøket.</p>{stats.bySource.length?<div className="adm-source-bars">{stats.bySource.map(item=><div key={item.source}><div><span>{item.source||'Ikke oppgitt'}</span><strong>{item.count}</strong></div><i><span style={{width:`${item.count/maxSource*100}%`}}/></i></div>)}</div>:<p className="adm-inline-empty">Ingen registrerte henvendelser ennå.</p>}</section><section className="adm-insight-card"><h2>Fra forespørsel til avtale</h2><p>Status på alle registrerte saker.</p><div className="adm-status-counts">{Object.entries(STATUS_LABELS).map(([key])=><div key={key}><StatusBadge status={key as InquiryStatus}/><strong>{stats.byStatus.find(item=>item.status===key)?.count||0}</strong></div>)}</div></section><section className="adm-insight-card adm-wide"><h2>Mottatte forespørsler per dag</h2><p>Siste 14 dager. Hold over en søyle for dato og antall.</p>{stats.recentDays.some(item=>item.inquiries>0)?<div className="adm-days" role="img" aria-label={`Forespørsler per dag: ${stats.recentDays.map(day=>`${shortDate(day.date)}: ${day.inquiries}`).join('; ')}`}>{stats.recentDays.map(day=><div key={day.date} title={`${shortDate(day.date)}: ${day.inquiries} forespørsler`}><i style={{height:`${Math.max(2,day.inquiries/maxDay*120)}px`}}/><span>{new Date(`${day.date}T12:00:00Z`).getUTCDate()}</span></div>)}</div>:<p className="adm-inline-empty">Grafen fylles når forespørsler kommer inn.</p>}</section><section className="adm-insight-card adm-wide"><h2>Hvilke oppdrag etterspørres?</h2><div className="adm-kind-counts"><div><span>Faste transportavtaler</span><strong>{stats.byKind.find(item=>item.kind==='fast')?.count||0}</strong></div><div><span>Enkeltoppdrag</span><strong>{stats.byKind.find(item=>item.kind==='enkelt')?.count||0}</strong></div></div><p>Fordelingen gjelder alle registrerte forespørsler. Oppdater status i tilbudsoversikten når en sak er vunnet eller tapt.</p></section></div></>;
}
