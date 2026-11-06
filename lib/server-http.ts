import { z } from 'zod';

export class ApiError extends Error {
  constructor(public status:number, message:string, public fieldErrors?:Record<string,string[]|undefined>) {super(message);this.name='ApiError';}
}
export function apiJson(data:unknown, status=200, extraHeaders?:Record<string,string>) {
  return Response.json(data,{status,headers:{'Cache-Control':'no-store','X-Content-Type-Options':'nosniff',...extraHeaders}});
}
export function apiFailure(error:unknown) {
  if (error instanceof ApiError) return apiJson({error:error.message,...(error.fieldErrors?{fieldErrors:error.fieldErrors}:{})},error.status);
  if (error instanceof z.ZodError) return apiJson({error:'Kontroller feltene og prøv igjen.',fieldErrors:error.flatten().fieldErrors},400);
  console.error('urban_api_failure',error instanceof Error ? error.name : 'unknown');
  return apiJson({error:'Vi kunne ikke behandle forespørselen akkurat nå. Prøv igjen eller ring +47 968 40 395.'},500);
}
export function checkSameOrigin(request:Request) {
  const origin=request.headers.get('origin');
  const accepted = process.env.RENDER === 'true'
    ? [process.env.SITE_URL || 'https://www.urbanlogistikk.no', 'https://urbanlogistikk.no', process.env.RENDER_EXTERNAL_URL].filter(Boolean)
    : [new URL(request.url).origin];
  if (!origin || !accepted.includes(origin) || request.headers.get('sec-fetch-site')==='cross-site') throw new ApiError(403,'Forespørselen må sendes fra denne nettsiden.');
}
export async function readJsonBody(request:Request, maxBytes=32768):Promise<unknown> {
  if (!(request.headers.get('content-type')||'').toLowerCase().startsWith('application/json')) throw new ApiError(415,'Forespørselen må sendes som JSON.');
  const length=request.headers.get('content-length');
  if (length && Number(length)>maxBytes) throw new ApiError(413,'Forespørselen er for stor.');
  if (!request.body) throw new ApiError(400,'Forespørselen mangler innhold.');
  const reader=request.body.getReader(); const chunks:Uint8Array[]=[];let total=0;
  try {while(true){const {done,value}=await reader.read();if(done)break;total+=value.length;if(total>maxBytes){await reader.cancel();throw new ApiError(413,'Forespørselen er for stor.');}chunks.push(value);}}
  finally {reader.releaseLock();}
  const bytes=new Uint8Array(total);let offset=0;for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.length;}
  try{return JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(bytes));}catch{throw new ApiError(400,'Ugyldig forespørsel. Last siden på nytt og prøv igjen.');}
}
