import { useState, useEffect, useRef } from "react";
import { X, Save } from "lucide-react";
import { apiClient, ApiError } from "../../api/client";
import {
  MemberMeasurementDetail,
  MemberMeasurementPayload,
  isMemberMeasurementCreateResponse,
  isMemberProgressSuccessResponse
} from "../member-progress/types";

interface TrainerMeasurementFormModalProps {
  memberId: number;
  initialData?: MemberMeasurementDetail | null;
  onClose: () => void;
  onSuccess: () => void;
}

type NumericValidationResult = { value?: number | null; error?: string };

const parseAndValidateNumeric = (
  val: string,
  max: number = 9999.99,
  allowZero: boolean = false
): NumericValidationResult => {
  const trimmed = val.trim();
  if (trimmed === "") return { value: null };
  const normalized = trimmed.replace(",", ".");

  if (!/^\d+(\.\d{1,2})?$/.test(normalized)) {
    return { error: "Geçerli bir sayı giriniz (en fazla 2 ondalık)." };
  }

  const num = Number(normalized);
  if (!Number.isFinite(num)) {
    return { error: "Geçersiz sayı." };
  }

  if (allowZero) {
    if (num < 0 || num > max) {
      return { error: `0 ile ${max} arasında bir değer giriniz.` };
    }
  } else {
    if (num <= 0 || num > max) {
      return { error: `0'dan büyük ve en fazla ${max} olan bir değer giriniz.` };
    }
  }

  return { value: num };
};

const formatForInput = (val: number | null): string => {
  if (val === null) return "";
  return val.toString();
};

const formatDateForInput = (sqlDate: string): string => {
  if (!sqlDate) return "";
  return sqlDate.replace(" ", "T");
};

export function TrainerMeasurementFormModal({
  memberId,
  initialData,
  onClose,
  onSuccess
}: TrainerMeasurementFormModalProps) {
  const isSubmitting = useRef(false);
  const isMounted = useRef(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [measuredAt, setMeasuredAt] = useState("");
  const [weight, setWeight] = useState("");
  const [bodyFat, setBodyFat] = useState("");
  const [chest, setChest] = useState("");
  const [waist, setWaist] = useState("");
  const [hip, setHip] = useState("");
  const [arm, setArm] = useState("");
  const [thigh, setThigh] = useState("");
  const [notes, setNotes] = useState("");

  const [isDirty, setIsDirty] = useState(false);

  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
    };
  }, []);

  useEffect(() => {
    if (initialData) {
      setMeasuredAt(formatDateForInput(initialData.measured_at));
      setWeight(formatForInput(initialData.weight_kg));
      setBodyFat(formatForInput(initialData.body_fat_percent));
      setChest(formatForInput(initialData.chest_cm));
      setWaist(formatForInput(initialData.waist_cm));
      setHip(formatForInput(initialData.hip_cm));
      setArm(formatForInput(initialData.arm_cm));
      setThigh(formatForInput(initialData.thigh_cm));
      setNotes(initialData.notes || "");
    } else {
      const now = new Date();
      const pad = (n: number) => n.toString().padStart(2, "0");
      const localStr = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(
        now.getDate()
      )}T${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(
        now.getSeconds()
      )}`;
      setMeasuredAt(localStr);
    }
  }, [initialData]);

  const validateAndGetPayload = (): MemberMeasurementPayload | null => {
    setError(null);

    if (!measuredAt) {
      setError("Ölçüm tarihi zorunludur.");
      return null;
    }

    const sqlDate =
      measuredAt.length === 16
        ? measuredAt.replace("T", " ") + ":00"
        : measuredAt.replace("T", " ");
    const regex = /^(\d{4})-(\d{2})-(\d{2}) (\d{2}):(\d{2}):(\d{2})$/;
    const match = sqlDate.match(regex);
    if (!match) {
      setError("Geçersiz tarih formatı.");
      return null;
    }
    const [, yStr, mStr, dStr, hStr, iStr, sStr] = match;
    const year = parseInt(yStr, 10);
    const month = parseInt(mStr, 10);
    const day = parseInt(dStr, 10);
    const hour = parseInt(hStr, 10);
    const minute = parseInt(iStr, 10);
    const second = parseInt(sStr, 10);
    const dObj = new Date(year, month - 1, day, hour, minute, second);
    if (
      dObj.getFullYear() !== year ||
      dObj.getMonth() !== month - 1 ||
      dObj.getDate() !== day ||
      dObj.getHours() !== hour ||
      dObj.getMinutes() !== minute ||
      dObj.getSeconds() !== second
    ) {
      setError("Geçersiz bir takvim tarihi girdiniz.");
      return null;
    }

    const wRes = parseAndValidateNumeric(weight, 9999.99, false);
    const fRes = parseAndValidateNumeric(bodyFat, 100, true);
    const cRes = parseAndValidateNumeric(chest, 9999.99, false);
    const waRes = parseAndValidateNumeric(waist, 9999.99, false);
    const hRes = parseAndValidateNumeric(hip, 9999.99, false);
    const aRes = parseAndValidateNumeric(arm, 9999.99, false);
    const tRes = parseAndValidateNumeric(thigh, 9999.99, false);

    if (wRes.error) { setError(wRes.error); return null; }
    if (fRes.error) { setError(fRes.error); return null; }
    if (cRes.error) { setError(cRes.error); return null; }
    if (waRes.error) { setError(waRes.error); return null; }
    if (hRes.error) { setError(hRes.error); return null; }
    if (aRes.error) { setError(aRes.error); return null; }
    if (tRes.error) { setError(tRes.error); return null; }

    const w = wRes.value ?? null;
    const bf = fRes.value ?? null;
    const c = cRes.value ?? null;
    const wa = waRes.value ?? null;
    const h = hRes.value ?? null;
    const a = aRes.value ?? null;
    const t = tRes.value ?? null;

    if (w === null && bf === null && c === null && wa === null && h === null && a === null && t === null) {
      setError("En az bir ölçüm değeri girmelisiniz.");
      return null;
    }

    const isWhitespaceOnly = notes.trim() === "";
    const finalNotes = isWhitespaceOnly ? null : notes;

    if (finalNotes && Array.from(finalNotes).length > 1000) {
      setError("Notlar en fazla 1000 karakter olabilir.");
      return null;
    }

    return {
      measured_at: sqlDate,
      weight_kg: w,
      body_fat_percent: bf,
      chest_cm: c,
      waist_cm: wa,
      hip_cm: h,
      arm_cm: a,
      thigh_cm: t,
      notes: finalNotes
    };
  };

  const handleApiError = (err: unknown) => {
    if (!isMounted.current) return;
    if (err instanceof ApiError) {
      if (err.code === "TRAINER_PROFILE_NOT_LINKED") {
        setError("Aktif eğitmen profiliniz hesabınıza bağlanmamış.");
      } else if (err.status === 403 || err.code === "FORBIDDEN") {
        setError("Bu işlem için yetkiniz yok.");
      } else if (err.status === 404 || err.code === "NOT_FOUND") {
        setError("Üye veya ölçüm kaydı bulunamadı.");
      } else if (err.status === 409 || err.code === "CONFLICT") {
        setError("İşlem çakışması: Kaydın durumu değişmiş olabilir.");
      } else if (err.status === 413 || err.code === "PAYLOAD_TOO_LARGE") {
        setError("Veri boyutu sınırı aşıldı.");
      } else if (err.status === 415 || err.code === "UNSUPPORTED_MEDIA_TYPE") {
        setError("Desteklenmeyen istek formatı.");
      } else if (err.status === 422 || err.code === "VALIDATION_ERROR") {
        setError(err.message || "Form doğrulama hatası.");
      } else {
        setError(err.message || "Kayıt sırasında bir hata oluştu.");
      }
    } else if (err instanceof Error) {
      setError(err.message);
    } else {
      setError("Kayıt sırasında bir hata oluştu.");
    }
  };

  const handleSave = async () => {
    if (isSubmitting.current) return;

    const payload = validateAndGetPayload();
    if (!payload) return;

    if (initialData) {
      const patchPayload: Partial<MemberMeasurementPayload> = {};
      let hasChanges = false;

      if (payload.measured_at !== initialData.measured_at) {
        patchPayload.measured_at = payload.measured_at;
        hasChanges = true;
      }
      if (payload.weight_kg !== initialData.weight_kg) {
        patchPayload.weight_kg = payload.weight_kg;
        hasChanges = true;
      }
      if (payload.body_fat_percent !== initialData.body_fat_percent) {
        patchPayload.body_fat_percent = payload.body_fat_percent;
        hasChanges = true;
      }
      if (payload.chest_cm !== initialData.chest_cm) {
        patchPayload.chest_cm = payload.chest_cm;
        hasChanges = true;
      }
      if (payload.waist_cm !== initialData.waist_cm) {
        patchPayload.waist_cm = payload.waist_cm;
        hasChanges = true;
      }
      if (payload.hip_cm !== initialData.hip_cm) {
        patchPayload.hip_cm = payload.hip_cm;
        hasChanges = true;
      }
      if (payload.arm_cm !== initialData.arm_cm) {
        patchPayload.arm_cm = payload.arm_cm;
        hasChanges = true;
      }
      if (payload.thigh_cm !== initialData.thigh_cm) {
        patchPayload.thigh_cm = payload.thigh_cm;
        hasChanges = true;
      }
      if (payload.notes !== initialData.notes) {
        patchPayload.notes = payload.notes;
        hasChanges = true;
      }

      if (!hasChanges) {
        onClose();
        return;
      }

      isSubmitting.current = true;
      setSaving(true);
      setError(null);

      try {
        const res = await apiClient.patch(
          `/api/trainer/member-measurements/${initialData.id}`,
          patchPayload
        );
        if (!isMemberProgressSuccessResponse(res)) {
          throw new Error("Sunucudan geçersiz yanıt döndü.");
        }
        if (!isMounted.current) return;
        setIsDirty(false);
        onSuccess();
      } catch (err: unknown) {
        handleApiError(err);
      } finally {
        isSubmitting.current = false;
        if (isMounted.current) setSaving(false);
      }
    } else {
      isSubmitting.current = true;
      setSaving(true);
      setError(null);

      try {
        const res = await apiClient.post(
          `/api/trainer/members/${memberId}/measurements`,
          payload
        );
        if (!isMemberMeasurementCreateResponse(res)) {
          throw new Error("Sunucudan geçersiz yanıt döndü.");
        }
        if (!isMounted.current) return;
        setIsDirty(false);
        onSuccess();
      } catch (err: unknown) {
        handleApiError(err);
      } finally {
        isSubmitting.current = false;
        if (isMounted.current) setSaving(false);
      }
    }
  };

  const handleClose = () => {
    if (saving) return;
    if (isDirty) {
      if (
        window.confirm("Kaydedilmemiş değişiklikler var. Çıkmak istiyor musunuz?")
      ) {
        onClose();
      }
    } else {
      onClose();
    }
  };

  const handleChange =
    (setter: (v: string) => void) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      setter(e.target.value);
      setIsDirty(true);
    };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
    >
      <div className="bg-[#121212] border border-white/10 rounded-2xl w-full max-w-2xl flex flex-col max-h-[90vh] shadow-2xl overflow-hidden">
        {/* Modal Header */}
        <div className="flex items-center justify-between p-5 sm:p-6 border-b border-white/10 bg-[#18181b]/50">
          <div>
            <h2 className="text-lg sm:text-xl font-bold text-white">
              {initialData ? "Ölçümü Düzenle" : "Yeni Ölçüm Kaydı"}
            </h2>
            <p className="text-xs text-white/50 mt-0.5">
              {initialData
                ? "Mevcut fiziksel ölçüm ve vücut kompozisyonu verilerini güncelleyin."
                : "Üyenin güncel fiziksel ölçüm ve kompozisyon değerlerini girin."}
            </p>
          </div>
          <button
            type="button"
            onClick={handleClose}
            disabled={saving}
            className="text-white/50 hover:text-white transition disabled:opacity-40 p-1.5 rounded-lg hover:bg-white/5"
            title="Kapat"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 sm:p-6 overflow-y-auto flex-1 custom-scrollbar space-y-6">
          {error && (
            <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-xs sm:text-sm leading-relaxed">
              {error}
            </div>
          )}

          <div className="space-y-5">
            {/* Measured At */}
            <div>
              <label className="block text-xs font-semibold text-white/80 mb-1.5">
                Ölçüm Tarihi ve Saati <span className="text-[#851C35]">*</span>
              </label>
              <input
                type="datetime-local"
                step="1"
                value={measuredAt}
                onChange={handleChange(setMeasuredAt)}
                disabled={saving}
                className="w-full bg-white/5 border border-white/10 text-white rounded-lg px-3.5 py-2.5 text-sm focus:outline-none focus:border-[#851C35] transition disabled:opacity-50"
              />
            </div>

            {/* Metrics 2-column Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-white/80 mb-1.5">
                  Kilo (kg)
                </label>
                <input
                  type="text"
                  value={weight}
                  onChange={handleChange(setWeight)}
                  disabled={saving}
                  placeholder="örn. 75.5"
                  className="w-full bg-white/5 border border-white/10 text-white rounded-lg px-3.5 py-2 text-sm focus:outline-none focus:border-[#851C35] transition disabled:opacity-50"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-white/80 mb-1.5">
                  Vücut Yağ Oranı (%)
                </label>
                <input
                  type="text"
                  value={bodyFat}
                  onChange={handleChange(setBodyFat)}
                  disabled={saving}
                  placeholder="örn. 14.2"
                  className="w-full bg-white/5 border border-white/10 text-white rounded-lg px-3.5 py-2 text-sm focus:outline-none focus:border-[#851C35] transition disabled:opacity-50"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-white/80 mb-1.5">
                  Göğüs Çevresi (cm)
                </label>
                <input
                  type="text"
                  value={chest}
                  onChange={handleChange(setChest)}
                  disabled={saving}
                  placeholder="örn. 102.0"
                  className="w-full bg-white/5 border border-white/10 text-white rounded-lg px-3.5 py-2 text-sm focus:outline-none focus:border-[#851C35] transition disabled:opacity-50"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-white/80 mb-1.5">
                  Bel Çevresi (cm)
                </label>
                <input
                  type="text"
                  value={waist}
                  onChange={handleChange(setWaist)}
                  disabled={saving}
                  placeholder="örn. 82.5"
                  className="w-full bg-white/5 border border-white/10 text-white rounded-lg px-3.5 py-2 text-sm focus:outline-none focus:border-[#851C35] transition disabled:opacity-50"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-white/80 mb-1.5">
                  Kalça Çevresi (cm)
                </label>
                <input
                  type="text"
                  value={hip}
                  onChange={handleChange(setHip)}
                  disabled={saving}
                  placeholder="örn. 98.0"
                  className="w-full bg-white/5 border border-white/10 text-white rounded-lg px-3.5 py-2 text-sm focus:outline-none focus:border-[#851C35] transition disabled:opacity-50"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-white/80 mb-1.5">
                  Kol Çevresi (cm)
                </label>
                <input
                  type="text"
                  value={arm}
                  onChange={handleChange(setArm)}
                  disabled={saving}
                  placeholder="örn. 36.5"
                  className="w-full bg-white/5 border border-white/10 text-white rounded-lg px-3.5 py-2 text-sm focus:outline-none focus:border-[#851C35] transition disabled:opacity-50"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-white/80 mb-1.5">
                  Bacak / Uyluk Çevresi (cm)
                </label>
                <input
                  type="text"
                  value={thigh}
                  onChange={handleChange(setThigh)}
                  disabled={saving}
                  placeholder="örn. 58.0"
                  className="w-full bg-white/5 border border-white/10 text-white rounded-lg px-3.5 py-2 text-sm focus:outline-none focus:border-[#851C35] transition disabled:opacity-50"
                />
              </div>
            </div>

            {/* Notes */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-semibold text-white/80">
                  Antrenör Notları
                </label>
                <span className="text-[11px] text-white/40">
                  {notes.length} / 1000
                </span>
              </div>
              <textarea
                value={notes}
                onChange={handleChange(setNotes)}
                disabled={saving}
                rows={3}
                placeholder="Ölçümle ilgili gözlemler, değerlendirmeler veya antrenör notu..."
                className="w-full bg-white/5 border border-white/10 text-white rounded-lg p-3 text-sm focus:outline-none focus:border-[#851C35] transition disabled:opacity-50 custom-scrollbar resize-none"
              />
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-4 sm:p-5 border-t border-white/10 flex items-center justify-end gap-3 bg-[#18181b]/50">
          <button
            type="button"
            onClick={handleClose}
            disabled={saving}
            className="px-4 py-2 bg-white/5 hover:bg-white/10 text-white/70 hover:text-white rounded-lg transition disabled:opacity-40 text-xs sm:text-sm font-medium"
          >
            İptal
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 px-5 py-2 bg-[#851C35] hover:bg-[#6b162b] text-white rounded-lg transition disabled:opacity-40 text-xs sm:text-sm font-semibold shadow-lg shadow-[#851C35]/20"
          >
            <Save className="w-4 h-4" />
            {saving ? "Kaydediliyor..." : "Kaydet"}
          </button>
        </div>
      </div>
    </div>
  );
}
