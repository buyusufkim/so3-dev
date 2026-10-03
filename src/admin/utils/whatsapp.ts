/**
 * SO3 PT - WhatsApp Communication Utility
 * Normalizes Turkish mobile phone numbers and constructs canonical wa.me click-to-chat links.
 */

/**
 * Normalizes a phone string to the canonical Turkish international mobile format: 905XXXXXXXXX.
 * 
 * Rules:
 * 1. Must be a string.
 * 2. Trim whitespace, reject empty.
 * 3. Strip visual separators only: spaces, parentheses, dashes, dots.
 * 4. Leading '+' allowed only as country prefix notation.
 * 5. Convert supported prefixes:
 *    - '0090XXXXXXXXXX' -> remove '00'
 *    - '90XXXXXXXXXX'   -> keep
 *    - '0XXXXXXXXXX'    -> remove trunk '0', prepend '90'
 *    - '5XXXXXXXXX'     -> prepend '90'
 * 6. Final value must strictly match /^905\d{9}$/ (12 digits, Turkish mobile subscriber).
 * 7. Returns null if invalid or unsupported.
 */
export function normalizeWhatsAppPhone(phone: string | null | undefined): string | null {
  if (typeof phone !== 'string') return null;

  const trimmed = phone.trim();
  if (!trimmed) return null;

  // If input starts with '+', it must start with exactly '+90' and have no second '+'
  let cleaned = trimmed;
  if (trimmed.startsWith('+')) {
    if (!trimmed.startsWith('+90') || trimmed.indexOf('+', 1) !== -1) {
      return null;
    }
    cleaned = trimmed.slice(1);
  }

  // Remove visual separators only
  cleaned = cleaned.replace(/[\s().-]/g, '');

  // Reject if any non-digit character remains (e.g. letters, multiple '+', symbols)
  if (!/^\d+$/.test(cleaned)) return null;

  // Convert supported prefixes
  if (cleaned.startsWith('0090')) {
    cleaned = cleaned.slice(2);
  } else if (cleaned.startsWith('0')) {
    cleaned = '90' + cleaned.slice(1);
  } else if (cleaned.startsWith('5')) {
    cleaned = '90' + cleaned;
  }

  // Must match exactly: country code 90 + mobile subscriber code 5 + 9 digits = 12 digits
  if (/^905\d{9}$/.test(cleaned)) {
    return cleaned;
  }

  return null;
}

/**
 * Constructs a canonical HTTPS wa.me click-to-chat URL.
 * 
 * Output: https://wa.me/905XXXXXXXXX or https://wa.me/905XXXXXXXXX?text=...
 * Returns null if the phone number is invalid.
 */
export function buildWhatsAppUrl(phone: string | null | undefined, message?: string): string | null {
  const normalized = normalizeWhatsAppPhone(phone);
  if (!normalized) return null;

  if (message && typeof message === 'string' && message.trim()) {
    return `https://wa.me/${normalized}?text=${encodeURIComponent(message.trim())}`;
  }

  return `https://wa.me/${normalized}`;
}

export interface TrainerAppointmentWhatsAppMessageInput {
  firstName: string;
  startTime: string;
}

/**
 * Builds a deterministic neutral WhatsApp contact message for scheduled trainer appointments.
 * Format: Merhaba {firstName}, bugün saat {HH:mm} için planlanan SO3 PT seansınla ilgili yazıyorum.
 */
export function buildTrainerAppointmentWhatsAppMessage(
  input: TrainerAppointmentWhatsAppMessageInput
): string {
  const name = typeof input?.firstName === 'string' ? input.firstName.trim() : '';
  const time = typeof input?.startTime === 'string' ? input.startTime.trim() : '';
  return `Merhaba ${name}, bugün saat ${time} için planlanan SO3 PT seansınla ilgili yazıyorum.`;
}

export type TrainerWhatsAppQuickMessageKind =
  | 'general'
  | 'appointment_reminder'
  | 'follow_up';

export interface TrainerWhatsAppQuickMessageInput {
  kind: TrainerWhatsAppQuickMessageKind;
  firstName: string;
}

/**
 * Builds deterministic neutral WhatsApp quick messages for trainer-member communication.
 * Strictly supports 3 intents: 'general', 'appointment_reminder', 'follow_up'.
 * Uses first name with whitespace trim; provides neutral 'Merhaba, ...' fallback when empty.
 */
export function buildTrainerWhatsAppQuickMessage(
  input: TrainerWhatsAppQuickMessageInput
): string {
  const name = typeof input?.firstName === 'string' ? input.firstName.trim() : '';
  const greeting = name ? `Merhaba ${name},` : 'Merhaba,';

  switch (input.kind) {
    case 'general':
      return `${greeting} SO3 PT'den seninle iletişime geçiyorum.`;
    case 'appointment_reminder':
      return `${greeting} yaklaşan SO3 PT seansını hatırlatmak için yazıyorum.`;
    case 'follow_up':
      return `${greeting} antrenman sürecinin nasıl gittiğini öğrenmek için yazıyorum.`;
    default:
      return `${greeting} SO3 PT'den seninle iletişime geçiyorum.`;
  }
}

export type RenewalRetentionState =
  | 'expired'
  | 'today'
  | 'upcoming';

export interface RenewalRetentionWhatsAppMessageInput {
  state: RenewalRetentionState;
  firstName: string;
}

/**
 * Builds deterministic neutral WhatsApp quick messages for membership renewal retention outreach.
 * Uses member first name with whitespace trim; provides neutral 'Merhaba, ...' fallback when empty.
 * Server renewal_state is authoritative: 'upcoming', 'today', 'expired'.
 */
export function buildRenewalRetentionWhatsAppMessage(
  input: RenewalRetentionWhatsAppMessageInput
): string {
  const name = typeof input?.firstName === 'string' ? input.firstName.trim() : '';
  const greeting = name ? `Merhaba ${name},` : 'Merhaba,';

  switch (input.state) {
    case 'upcoming':
      return `${greeting} SO3 PT üyeliğinin bitiş tarihi yaklaşıyor. Yenileme konusunda yardımcı olmak için yazıyorum.`;
    case 'today':
      return `${greeting} SO3 PT üyeliğin bugün sona eriyor. Yenileme konusunda yardımcı olmak için yazıyorum.`;
    case 'expired':
      return `${greeting} SO3 PT üyeliğinin süresi doldu. Devam etmek istersen yenileme konusunda yardımcı olmak için yazıyorum.`;
    default:
      return `${greeting} SO3 PT üyeliğinin bitiş tarihi yaklaşıyor. Yenileme konusunda yardımcı olmak için yazıyorum.`;
  }
}

