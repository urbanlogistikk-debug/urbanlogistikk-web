'use client';
import { useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';
const TRACKED=['/','/tilbud','/tjenester/kjoletransport','/tjenester/faste-ruter','/tjenester/hjemlevering','/tjenester/lastebil'];
export default function PageTracking(){const path=usePathname();const previous=useRef('');useEffect(()=>{if(!path||previous.current===path||!TRACKED.includes(path))return;previous.current=path;void fetch('/api/events',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({path}),keepalive:true}).catch(()=>{});},[path]);return null;}
