import type { CostingInput } from './contracts';

export const COST_MAX: Record<keyof CostingInput, number> = {drivingHours:500,handlingHours:500,waitingHours:500,laborPerHour:10000,distanceKm:20000,litersPer100Km:100,dieselPerLiter:1000,tolls:100000,vehicleCost:100000,otherCost:1000000,targetMarginPct:90,offeredPrice:10000000,tripsPerWeek:100,operatingWeeks:53};

export function defaultCosting(tripsPerWeek = 1): CostingInput {
  return { drivingHours: 0, handlingHours: 0, waitingHours: 0, laborPerHour: 0,
    distanceKm: 0, litersPer100Km: 10, dieselPerLiter: 0, tolls: 0, vehicleCost: 0,
    otherCost: 0, targetMarginPct: 20, offeredPrice: null,
    tripsPerWeek: Math.max(1, tripsPerWeek), operatingWeeks: 52 };
}

export function pricingInputErrors(input: CostingInput): string[] {
  const errors: string[] = [];
  const fields: (keyof CostingInput)[] = ['drivingHours','handlingHours','waitingHours','laborPerHour','distanceKm','litersPer100Km','dieselPerLiter','tolls','vehicleCost','otherCost'];
  if (fields.some(key => typeof input[key] !== 'number' || !Number.isFinite(input[key]) || (input[key] as number) < 0 || (input[key] as number) > COST_MAX[key])) errors.push('En kostnad, avstand eller timeverdi er utenfor tillatt område. Kontroller tallene i feltene.');
  if (!Number.isFinite(input.targetMarginPct) || input.targetMarginPct < 0 || input.targetMarginPct > 90) errors.push('Ønsket margin må være mellom 0 og 90 %.');
  if (input.offeredPrice !== null && (!Number.isFinite(input.offeredPrice) || input.offeredPrice <= 0 || input.offeredPrice > 10_000_000)) errors.push('Tilbudsprisen må være større enn 0 og maksimalt 10 000 000 kr.');
  if (!Number.isFinite(input.tripsPerWeek) || input.tripsPerWeek <= 0 || input.tripsPerWeek > 100) errors.push('Antall turer per uke må være større enn 0 og maksimalt 100.');
  if (!Number.isFinite(input.operatingWeeks) || input.operatingWeeks < 1 || input.operatingWeeks > 53) errors.push('Driftsuker per år må være mellom 1 og 53.');
  return errors;
}

export function calculatePricing(input: CostingInput) {
  const errors = pricingInputErrors(input);
  if (errors.length) throw new RangeError(errors.join(' '));
  const hours = input.drivingHours + input.handlingHours + input.waitingHours;
  const labor = hours * input.laborPerHour;
  const fuel = input.distanceKm * input.litersPer100Km / 100 * input.dieselPerLiter;
  const total = labor + fuel + input.tolls + input.vehicleCost + input.otherCost;
  const missing: string[] = [];
  if (hours <= 0) missing.push('arbeidstimer');
  if (input.laborPerHour <= 0) missing.push('samlet sjåførkostnad per time');
  if (input.distanceKm <= 0) missing.push('kjørelengde inkludert tomkjøring');
  if (input.litersPer100Km <= 0) missing.push('drivstofforbruk');
  if (input.dieselPerLiter <= 0) missing.push('dieselpris');
  const ready = missing.length === 0;
  const targetPrice = ready ? total / (1 - input.targetMarginPct / 100) : null;
  const offeredContribution = ready && input.offeredPrice !== null ? input.offeredPrice - total : null;
  const offeredMarginPct = offeredContribution !== null && input.offeredPrice ? offeredContribution / input.offeredPrice * 100 : null;
  const revenueBasis = input.offeredPrice !== null ? 'offered' : targetPrice !== null ? 'target' : null;
  const revenue = input.offeredPrice ?? targetPrice;
  const weeklyRevenue = ready && revenue !== null ? revenue * input.tripsPerWeek : null;
  const monthlyRevenue = weeklyRevenue !== null ? weeklyRevenue * input.operatingWeeks / 12 : null;
  const weeklyCost = ready ? total * input.tripsPerWeek : null;
  const monthlyCost = weeklyCost !== null ? weeklyCost * input.operatingWeeks / 12 : null;
  return {hours,labor,fuel,total,breakEven:ready?total:null,targetPrice,offeredContribution,offeredMarginPct,
    weeklyRevenue,monthlyRevenue,weeklyCost,monthlyCost,
    weeklyContribution:weeklyRevenue!==null&&weeklyCost!==null?weeklyRevenue-weeklyCost:null,
    monthlyContribution:monthlyRevenue!==null&&monthlyCost!==null?monthlyRevenue-monthlyCost:null,
    revenueBasis,ready,missing};
}
