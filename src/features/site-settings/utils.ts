/**
 * Format a canonical Turkish phone number (e.g. 05539573738)
 * to a human-readable format (e.g. 0553 957 37 38).
 */
export function formatTurkishPhone(phone: string | null): string {
  if (!phone) return '';
  const cleaned = phone.replace(/\D/g, '');
  if (cleaned.length === 11 && cleaned.startsWith('0')) {
    return `${cleaned.slice(0, 4)} ${cleaned.slice(4, 7)} ${cleaned.slice(7, 9)} ${cleaned.slice(9, 11)}`;
  }
  return phone;
}

/**
 * Format a phone number to a valid tel: href (e.g. tel:+905539573738).
 */
export function toTelHref(phone: string | null): string {
  if (!phone) return '';
  const cleaned = phone.replace(/\D/g, '');
  if (cleaned.length === 11 && cleaned.startsWith('0')) {
    return `tel:+90${cleaned.slice(1)}`;
  }
  return `tel:${cleaned}`;
}

/**
 * Format a phone number to a WhatsApp direct link.
 * e.g. https://wa.me/905523790777
 */
export function toWhatsappUrl(phone: string | null): string {
  if (!phone) return '';
  const cleaned = phone.replace(/\D/g, '');
  if (cleaned.length === 11 && cleaned.startsWith('0')) {
    return `https://wa.me/90${cleaned.slice(1)}`;
  }
  return `https://wa.me/${cleaned}`;
}

/**
 * Map standard day keys to Turkish labels.
 */
export const dayTranslations: Record<string, string> = {
  'monday': 'Pazartesi',
  'tuesday': 'Salı',
  'wednesday': 'Çarşamba',
  'thursday': 'Perşembe',
  'friday': 'Cuma',
  'saturday': 'Cumartesi',
  'sunday': 'Pazar'
};
