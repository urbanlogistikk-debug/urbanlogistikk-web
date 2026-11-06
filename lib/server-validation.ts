import { z } from 'zod';

const optionalText = (max: number) => z.string().trim().max(max, `Maksimalt ${max} tegn.`).default('');
const requiredText = (max: number) => z.string().trim().min(1, 'Dette feltet må fylles ut.').max(max, `Maksimalt ${max} tegn.`);
const boundedNumber = (max: number) => z.number().finite().min(0, 'Kan ikke være negativt.').max(max, `Maksimalt ${max}.`);
export function isCalendarDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00Z`);
  return Number.isFinite(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}
const optionalDate = optionalText(10).refine(value => value === '' || isCalendarDate(value), 'Bruk en gyldig dato.');
export const statusSchema = z.enum(['ny', 'vurderes', 'tilbud_sendt', 'vunnet', 'tapt']);
export const inquirySchema = z.object({
  requestKey: z.string().uuid('Ugyldig forespørselsnøkkel. Last siden på nytt.'),
  vehicleType: z.enum(['avklares', 'varebil', 'lastebil']).optional(),
  kind: z.enum(['fast', 'enkelt']),
  name: requiredText(120), company: requiredText(160),
  email: requiredText(254).email('Skriv inn en gyldig e-postadresse.').transform(value => value.toLowerCase()),
  phone: requiredText(40).min(5, 'Skriv inn et telefonnummer.').refine(value => /^[+\d\s().-]+$/.test(value) && value.replace(/\D/g, '').length >= 5, 'Skriv inn et gyldig telefonnummer.'),
  pickup: requiredText(160), deliveryArea: requiredText(500),
  stops: z.number().int().min(1).max(1000),
  frequencyPerWeek: z.number().finite().min(1).max(100).nullable().default(null),
  weekdays: z.array(requiredText(20)).max(7).default([]).transform(value => [...new Set(value)]),
  timeWindow: optionalText(160), startDate: optionalDate,
  temperature: z.enum(['kjol', 'torr', 'annet']), temperatureDetails: optionalText(160),
  loadType: z.enum(['kasser', 'paller', 'annet']), quantity: z.number().int().min(1).max(10000),
  weightKg: z.number().finite().positive().max(50000).nullable().default(null),
  lift: z.boolean(), details: optionalText(3000), source: optionalText(80),
  landingPath: optionalText(200).refine(value => !value || /^\/(?!\/)[a-zA-Z0-9/_-]*$/.test(value), 'Ugyldig kilde.'),
  referrerDomain: optionalText(200).refine(value => !value || /^(?:[a-zA-Z0-9-]+\.)+[a-zA-Z]{2,63}$/.test(value), 'Ugyldig henvisningskilde.'),
  campaign: optionalText(120), website: optionalText(200),
}).strict().superRefine((data, ctx) => {
  if (data.kind === 'fast' && !data.frequencyPerWeek) ctx.addIssue({code:'custom',path:['frequencyPerWeek'],message:'Oppgi antall turer per uke.'});
  if (data.temperature === 'annet' && !data.temperatureDetails) ctx.addIssue({code:'custom',path:['temperatureDetails'],message:'Beskriv temperaturkravet.'});
}).transform(data => ({...data, frequencyPerWeek: data.kind === 'fast' ? data.frequencyPerWeek : null, weekdays: data.kind === 'fast' ? data.weekdays : []}));

export const costingSchema = z.object({
  drivingHours: boundedNumber(500), handlingHours: boundedNumber(500), waitingHours: boundedNumber(500),
  laborPerHour: boundedNumber(10000), distanceKm: boundedNumber(20000), litersPer100Km: boundedNumber(100),
  dieselPerLiter: boundedNumber(1000), tolls: boundedNumber(100000), vehicleCost: boundedNumber(100000),
  otherCost: boundedNumber(1000000), targetMarginPct: boundedNumber(95),
  offeredPrice: boundedNumber(10000000).nullable(), tripsPerWeek: boundedNumber(100), operatingWeeks: boundedNumber(53),
}).strict();

export const inquiryPatchSchema = z.object({
  status: statusSchema.optional(), notes: optionalText(10000).optional(), followUpDate: optionalDate.optional(),
  costing: costingSchema.nullable().optional(),
}).strict().refine(value => Object.keys(value).length > 0, 'Ingen endringer å lagre.');

export const eventSchema = z.object({path:z.enum(['/', '/tjenester/kjoletransport', '/tjenester/faste-ruter', '/tjenester/hjemlevering', '/tjenester/lastebil', '/tilbud'])}).strict();
export const inquiryListSchema = z.object({
  status: z.union([statusSchema, z.literal('')]).default(''),
  kind: z.enum(['fast','enkelt','']).default(''), search: optionalText(160),
  page: z.coerce.number().int().min(1).max(100000).default(1),
});
