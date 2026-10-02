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
