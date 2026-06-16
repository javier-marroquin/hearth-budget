/** IANA timezones offered when creating or editing a household. */
export const HOUSEHOLD_TIMEZONES: ReadonlyArray<{ value: string; label: string }> = [
  { value: 'America/El_Salvador', label: 'El Salvador' },
  { value: 'America/Bogota', label: 'Colombia' },
  { value: 'America/Mexico_City', label: 'Mexico' },
  { value: 'America/Guatemala', label: 'Guatemala' },
  { value: 'America/Tegucigalpa', label: 'Honduras' },
  { value: 'America/Managua', label: 'Nicaragua' },
  { value: 'America/Costa_Rica', label: 'Costa Rica' },
  { value: 'America/Panama', label: 'Panama' },
  { value: 'America/Lima', label: 'Peru' },
  { value: 'America/Santiago', label: 'Chile' },
  { value: 'America/Buenos_Aires', label: 'Argentina' },
  { value: 'America/Sao_Paulo', label: 'Brasil' },
  { value: 'America/New_York', label: 'Este EE. UU.' },
  { value: 'America/Los_Angeles', label: 'US Pacific' },
  { value: 'Europe/Madrid', label: 'Spain' },
  { value: 'Europe/London', label: 'Reino Unido' },
];

export const DEFAULT_TIMEZONE = 'America/El_Salvador';
