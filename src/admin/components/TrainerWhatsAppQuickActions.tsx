import React from 'react';
import { WhatsAppContactLink } from './WhatsAppContactLink';
import { normalizeWhatsAppPhone, buildTrainerWhatsAppQuickMessage } from '../utils/whatsapp';

export interface TrainerWhatsAppQuickActionsProps {
  phone: string | null | undefined;
  firstName: string;
  fullName?: string;
  className?: string;
}

export function TrainerWhatsAppQuickActions({
  phone,
  firstName,
  fullName,
  className = ''
}: TrainerWhatsAppQuickActionsProps) {
  const isAvailable = Boolean(normalizeWhatsAppPhone(phone));

  if (!isAvailable) {
    return (
      <div className={`bg-[#121212] border border-white/10 rounded-lg p-4 lg:p-6 ${className}`}>
        <h3 className="text-xs lg:text-sm font-semibold uppercase tracking-wider text-white/40 mb-2">
          WhatsApp Hızlı Mesaj
        </h3>
        <p className="text-xs text-white/50">
          WhatsApp hızlı mesajları için geçerli bir cep telefonu numarası gerekli.
        </p>
      </div>
    );
  }

  const targetName = fullName || firstName;

  return (
    <div className={`bg-[#121212] border border-white/10 rounded-lg p-4 lg:p-6 ${className}`}>
      <div className="flex items-center justify-between mb-3 lg:mb-4">
        <h3 className="text-xs lg:text-sm font-semibold uppercase tracking-wider text-white/40">
          WhatsApp Hızlı Mesaj
        </h3>
        <span className="text-[11px] text-white/40 hidden sm:inline">
          Tek tıkla hazır mesajla sohbet başlatın
        </span>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
        <WhatsAppContactLink
          phone={phone}
          name={targetName}
          label="Genel İletişim"
          message={buildTrainerWhatsAppQuickMessage({ kind: 'general', firstName })}
          className="w-full"
        />
        <WhatsAppContactLink
          phone={phone}
          name={targetName}
          label="Randevu Hatırlatma"
          message={buildTrainerWhatsAppQuickMessage({ kind: 'appointment_reminder', firstName })}
          className="w-full"
        />
        <WhatsAppContactLink
          phone={phone}
          name={targetName}
          label="Takip Mesajı"
          message={buildTrainerWhatsAppQuickMessage({ kind: 'follow_up', firstName })}
          className="w-full"
        />
      </div>
    </div>
  );
}
