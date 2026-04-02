export const REGIONS = [
  'Canada',
  'Ontario',
  'Quebec',
  'British Columbia',
  'Alberta',
  'Manitoba',
  'Saskatchewan',
  'Nova Scotia',
  'New Brunswick',
  'Newfoundland and Labrador',
  'Prince Edward Island',
  'Northwest Territories',
  'Nunavut',
  'Yukon',
] as const;

export type Region = (typeof REGIONS)[number];
