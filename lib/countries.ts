export const COUNTRIES = [
  { code: 'CR', label: 'Costa Rica', flag: '🇨🇷' },
  { code: 'GT', label: 'Guatemala', flag: '🇬🇹' },
  { code: 'SV', label: 'El Salvador', flag: '🇸🇻' },
  { code: 'HN', label: 'Honduras', flag: '🇭🇳' },
  { code: 'PA', label: 'Panamá', flag: '🇵🇦' },
  { code: 'CL', label: 'Chile', flag: '🇨🇱' },
  { code: 'MX', label: 'México', flag: '🇲🇽' },
  { code: 'AR', label: 'Argentina', flag: '🇦🇷' },
] as const;

export type CountryCode = (typeof COUNTRIES)[number]['code'];
