import React from 'react';
import { MessageCircle } from 'lucide-react';
import { buildWhatsAppUrl } from '../utils/whatsapp';

export interface WhatsAppContactLinkProps {
  phone: string | null | undefined;
  name?: string;
  label?: string;
  message?: string;
  className?: string;
  showDisabledIfInvalid?: boolean;
}

export function WhatsAppContactLink({
  phone,
  name,
  label = 'WhatsApp',
  message,
  className = '',
  showDisabledIfInvalid = true
}: WhatsAppContactLinkProps) {
  const url = buildWhatsAppUrl(phone, message);

  if (!url) {
    if (!showDisabledIfInvalid) return null;
    return (
      <span
        className={`inline-flex items-center justify-center gap-2 px-3 py-2 bg-white/5 border border-white/10 text-white/40 text-xs rounded-lg min-h-[44px] select-none ${className}`}
        title="Geçerli bir cep telefonu numarası bulunmuyor"
      >
        <MessageCircle className="w-4 h-4 shrink-0 text-white/30" />
        <span>{label} (Geçerli telefon yok)</span>
      </span>
    );
  }

  const ariaLabel = name
    ? `${name} ile WhatsApp üzerinden iletişime geç`
    : `${label} ile iletişime geç`;

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={ariaLabel}
      className={`inline-flex items-center justify-center gap-2 px-3.5 py-2 bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-500/30 text-emerald-400 text-xs font-medium rounded-lg transition min-h-[44px] cursor-pointer ${className}`}
    >
      <MessageCircle className="w-4 h-4 shrink-0" />
      <span>{label}</span>
    </a>
  );
}
