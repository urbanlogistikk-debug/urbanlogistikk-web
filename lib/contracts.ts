export type InquiryKind = 'fast' | 'enkelt';
export type InquiryStatus = 'ny' | 'vurderes' | 'tilbud_sendt' | 'vunnet' | 'tapt';
export const STATUS_LABELS: Record<InquiryStatus,string> = {ny:'Ny',vurderes:'Under vurdering',tilbud_sendt:'Tilbud sendt',vunnet:'Vunnet',tapt:'Tapt'};
export type InquiryInput = {
  vehicleType?: 'avklares' | 'varebil' | 'lastebil';
  requestKey: string; kind: InquiryKind; name: string; company: string; email: string; phone: string;
  pickup: string; deliveryArea: string; stops: number; frequencyPerWeek: number | null;
  weekdays: string[]; timeWindow: string; startDate: string;
  temperature: 'kjol' | 'torr' | 'annet'; temperatureDetails: string;
  loadType: 'kasser' | 'paller' | 'annet'; quantity: number; weightKg: number | null; lift: boolean;
  details: string; source: string; landingPath: string; referrerDomain: string; campaign: string;
  website: string; // honeypot; must be empty
};
export type CostingInput = {
  drivingHours: number; handlingHours: number; waitingHours: number; laborPerHour: number;
  distanceKm: number; litersPer100Km: number; dieselPerLiter: number; tolls: number;
  vehicleCost: number; otherCost: number; targetMarginPct: number; offeredPrice: number | null;
  tripsPerWeek: number; operatingWeeks: number;
};
export type Inquiry = Omit<InquiryInput,'website'> & {
  id: string; reference: string; status: InquiryStatus; notes: string; followUpDate: string;
  costing: CostingInput | null; createdAt: string; updatedAt: string;
};
export type InquiryPage = { items: Inquiry[]; total: number; page: number; pageSize: number };
export type AdminStats = {
  total: number; newCount: number; awaitingCount: number; overdueCount: number;
  monthInquiries: number; monthPageViews: number; wonCount: number;
  byStatus: {status: InquiryStatus; count:number}[];
  bySource: {source:string; count:number}[];
  byKind: {kind:InquiryKind; count:number}[];
  recentDays: {date:string; inquiries:number; pageViews:number}[];
};
