import { useState } from "react";
import { cn } from "@/lib/utils";

interface ConsultationFormProps {
  submissionEnabled?: boolean;
}

export function ConsultationForm({ submissionEnabled = false }: ConsultationFormProps) {
  const [formData, setFormData] = useState({
    fullName: "",
    phone: "",
    email: "",
    interest: "",
    message: ""
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // API entegrasyonu aşamasında implement edilecek
  };

  return (
    <div className="bg-[#F4F1EB] p-8 md:p-12 rounded-lg border border-[#E5E3DB]">
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-[#0A0A0A] mb-2">Ön Görüşme Formu</h2>
        <p className="text-sm text-[#0A0A0A]/70 font-medium">Bize kendinden ve hedeflerinden kısaca bahset.</p>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-6">
        <div className="flex flex-col gap-2">
          <label htmlFor="fullName" className="text-sm font-semibold text-[#0A0A0A]">
            Ad Soyad <span className="text-[#851C35]">*</span>
          </label>
          <input
            type="text"
            id="fullName"
            name="fullName"
            autoComplete="name"
            required
            value={formData.fullName}
            onChange={handleChange}
            placeholder="Adın ve soyadın"
            className="w-full bg-white border border-[#E5E3DB] rounded px-4 py-3 text-sm focus:outline-none focus:border-[#0A0A0A] focus:ring-1 focus:ring-[#0A0A0A] transition-colors"
          />
        </div>

        <div className="flex flex-col md:flex-row gap-6">
          <div className="flex flex-col gap-2 flex-1">
            <label htmlFor="phone" className="text-sm font-semibold text-[#0A0A0A]">
              Telefon <span className="text-[#851C35]">*</span>
            </label>
            <input
              type="tel"
              id="phone"
              name="phone"
              autoComplete="tel"
              required
              value={formData.phone}
              onChange={handleChange}
              placeholder="05XX XXX XX XX"
              className="w-full bg-white border border-[#E5E3DB] rounded px-4 py-3 text-sm focus:outline-none focus:border-[#0A0A0A] focus:ring-1 focus:ring-[#0A0A0A] transition-colors"
            />
          </div>

          <div className="flex flex-col gap-2 flex-1">
            <label htmlFor="email" className="text-sm font-semibold text-[#0A0A0A]">
              E-posta
            </label>
            <input
              type="email"
              id="email"
              name="email"
              autoComplete="email"
              value={formData.email}
              onChange={handleChange}
              placeholder="E-posta adresin"
              className="w-full bg-white border border-[#E5E3DB] rounded px-4 py-3 text-sm focus:outline-none focus:border-[#0A0A0A] focus:ring-1 focus:ring-[#0A0A0A] transition-colors"
            />
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <label htmlFor="interest" className="text-sm font-semibold text-[#0A0A0A]">
            İlgilendiğin Alan <span className="text-[#851C35]">*</span>
          </label>
          <div className="relative">
            <select
              id="interest"
              name="interest"
              required
              value={formData.interest}
              onChange={handleChange}
              className="w-full appearance-none bg-white border border-[#E5E3DB] rounded px-4 py-3 text-sm focus:outline-none focus:border-[#0A0A0A] focus:ring-1 focus:ring-[#0A0A0A] transition-colors"
            >
              <option value="" disabled>Bir alan seç...</option>
              <option value="Fitness">Fitness</option>
              <option value="Yoga & Pilates">Yoga & Pilates</option>
              <option value="Boks">Boks</option>
              <option value="Emin değilim">Emin değilim</option>
            </select>
            <div className="absolute inset-y-0 right-0 flex items-center px-4 pointer-events-none text-[#0A0A0A]/50">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="6 9 12 15 18 9"></polyline>
              </svg>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <label htmlFor="message" className="text-sm font-semibold text-[#0A0A0A]">
            Mesajın
          </label>
          <textarea
            id="message"
            name="message"
            rows={4}
            value={formData.message}
            onChange={handleChange}
            placeholder="Bize kısaca nasıl yardımcı olabileceğimizi yazabilirsin."
            className="w-full bg-white border border-[#E5E3DB] rounded px-4 py-3 text-sm resize-none focus:outline-none focus:border-[#0A0A0A] focus:ring-1 focus:ring-[#0A0A0A] transition-colors"
          ></textarea>
        </div>

        <div className="mt-4 pt-6 border-t border-[#0A0A0A]/10">
          <button
            type="submit"
            disabled={!submissionEnabled}
            className={cn(
              "w-full py-4 rounded text-sm font-semibold transition-all flex items-center justify-center gap-2",
              submissionEnabled 
                ? "bg-[#0A0A0A] text-white hover:bg-[#851C35]" 
                : "bg-[#E5E3DB] text-[#0A0A0A]/50 cursor-not-allowed"
            )}
          >
            Ön Görüşme Talebi Gönder
          </button>
          
          {!submissionEnabled && (
            <p className="text-center text-xs text-[#0A0A0A]/50 mt-4 font-medium">
              Online ön görüşme talebi yakında aktif olacak.
            </p>
          )}
        </div>
      </form>
    </div>
  );
}
