import { useState, useEffect } from 'react';
import { X, Save } from 'lucide-react';
import { apiClient, ApiError } from '../../api/client';
import { 
  MemberMeasurementDetail, 
  MemberMeasurementPayload,
  isMemberMeasurementCreateResponse,
  isMemberProgressSuccessResponse
} from './types';

interface MemberMeasurementFormModalProps {
  memberId: number;
  initialData?: MemberMeasurementDetail;
  onClose: () => void;
  onSuccess: () => void;
}

const parseNumeric = (val: string): number | null => {
  const trimmed = val.trim();
  if (trimmed === '') return null;
  const num = Number(trimmed);
  if (isNaN(num) || !Number.isFinite(num)) return null;
  return num;
};

const validateNumeric = (val: string, max: number = 9999.99): string | null => {
  const trimmed = val.trim();
  if (trimmed === '') return null; // ok
  
  if (!/^\d+(\.\d{1,2})?$/.test(trimmed)) {
    return 'Geçerli bir sayı giriniz (en fazla 2 ondalık).';
  }
  
  const num = Number(trimmed);
  if (num < 0 || num > max) {
    return `0 ile \${max} arasında bir değer giriniz.`;
  }
  return null;
};

const formatForInput = (val: number | null): string => {
  if (val === null) return '';
  return val.toString();
};

const formatDateForInput = (sqlDate: string): string => {
  // Convert "Y-m-d H:i:s" to "Y-m-dTHH:mm:ss"
  if (!sqlDate) return '';
  return sqlDate.replace(' ', 'T');
};

const formatForSql = (inputDate: string): string => {
  if (!inputDate) return '';
  return inputDate.replace('T', ' ') + ':00'; // datetime-local might not have seconds depending on step, but assuming we format it well
};

export function MemberMeasurementFormModal({ memberId, initialData, onClose, onSuccess }: MemberMeasurementFormModalProps) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // State holds strings to avoid silent float conversion / rounding
  const [measuredAt, setMeasuredAt] = useState('');
  const [weight, setWeight] = useState('');
  const [bodyFat, setBodyFat] = useState('');
  const [chest, setChest] = useState('');
  const [waist, setWaist] = useState('');
  const [hip, setHip] = useState('');
  const [arm, setArm] = useState('');
  const [thigh, setThigh] = useState('');
  const [notes, setNotes] = useState('');

  const [isDirty, setIsDirty] = useState(false);

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
      setNotes(initialData.notes || '');
    } else {
      // Create - set default to now
      const now = new Date();
      now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
      setMeasuredAt(now.toISOString().slice(0, 16));
    }
  }, [initialData]);

  const validate = (): MemberMeasurementPayload | null => {
    setError(null);
    
    if (!measuredAt) {
      setError("Ölçüm tarihi zorunludur.");
      return null;
    }
    
    // Check real date roundtrip
    const sqlDate = measuredAt.length === 16 ? measuredAt.replace('T', ' ') + ':00' : measuredAt.replace('T', ' ');
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

    const errWeight = validateNumeric(weight);
    const errFat = validateNumeric(bodyFat, 100);
    const errChest = validateNumeric(chest);
    const errWaist = validateNumeric(waist);
    const errHip = validateNumeric(hip);
    const errArm = validateNumeric(arm);
    const errThigh = validateNumeric(thigh);

    if (errWeight || errFat || errChest || errWaist || errHip || errArm || errThigh) {
      setError("Lütfen sayısal alanları doğru formatta (örn. 70.12) doldurunuz.");
      return null;
    }

    const w = parseNumeric(weight);
    const bf = parseNumeric(bodyFat);
    const c = parseNumeric(chest);
    const wa = parseNumeric(waist);
    const h = parseNumeric(hip);
    const a = parseNumeric(arm);
    const t = parseNumeric(thigh);

    if (w === null && bf === null && c === null && wa === null && h === null && a === null && t === null) {
      setError("En az bir ölçüm değeri girmelisiniz.");
      return null;
    }

    let parsedNotes = notes.trim();
    if (parsedNotes.length > 1000) {
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
      notes: parsedNotes === '' ? null : parsedNotes
    };
  };

  const handleSave = async () => {
    const payload = validate();
    if (!payload) return;

    setSaving(true);
    setError(null);

    try {
      if (initialData) {
        const res: unknown = await apiClient.patch(`/api/admin/member-measurements/\${initialData.id}`, payload);
        if (!isMemberProgressSuccessResponse(res)) {
          throw new Error("Sunucudan geçersiz yanıt döndü.");
        }
      } else {
        const res: unknown = await apiClient.post(`/api/admin/members/\${memberId}/measurements`, payload);
        if (!isMemberMeasurementCreateResponse(res)) {
          throw new Error("Sunucudan geçersiz yanıt döndü.");
        }
      }
      setIsDirty(false);
      onSuccess();
    } catch (err: unknown) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("Kayıt sırasında bir hata oluştu.");
      }
    } finally {
      if (saving) setSaving(false); // only needed if unmounted, but we handle that
    }
  };

  const handleClose = () => {
    if (saving) return;
    if (isDirty) {
      if (window.confirm("Kaydedilmemiş değişiklikler var. Çıkmak istiyor musunuz?")) {
        onClose();
      }
    } else {
      onClose();
    }
  };

  const handleChange = (setter: (v: string) => void) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setter(e.target.value);
    setIsDirty(true);
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
    >
      <div className="bg-gray-900 border border-gray-800 rounded-2xl w-full max-w-2xl flex flex-col max-h-[90vh] shadow-2xl">
        <div className="flex items-center justify-between p-6 border-b border-gray-800">
          <h2 className="text-xl font-semibold text-white">
            {initialData ? "Ölçümü Düzenle" : "Yeni Ölçüm"}
          </h2>
          <button
            onClick={handleClose}
            disabled={saving}
            className="text-gray-400 hover:text-white transition disabled:opacity-50"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto flex-1 custom-scrollbar">
          {error && (
            <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-500 text-sm">
              {error}
            </div>
          )}

          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                Ölçüm Tarihi <span className="text-red-500">*</span>
              </label>
              <input
                type="datetime-local"
                step="1"
                value={measuredAt}
                onChange={handleChange(setMeasuredAt)}
                className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-4 py-2 focus:outline-none focus:border-blue-500 transition"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Kilo (kg)
                </label>
                <input
                  type="text"
                  value={weight}
                  onChange={handleChange(setWeight)}
                  placeholder="örn. 70.5"
                  className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-4 py-2 focus:outline-none focus:border-blue-500 transition"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Yağ Oranı (%)
                </label>
                <input
                  type="text"
                  value={bodyFat}
                  onChange={handleChange(setBodyFat)}
                  placeholder="örn. 15.2"
                  className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-4 py-2 focus:outline-none focus:border-blue-500 transition"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Göğüs (cm)
                </label>
                <input
                  type="text"
                  value={chest}
                  onChange={handleChange(setChest)}
                  className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-4 py-2 focus:outline-none focus:border-blue-500 transition"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Bel (cm)
                </label>
                <input
                  type="text"
                  value={waist}
                  onChange={handleChange(setWaist)}
                  className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-4 py-2 focus:outline-none focus:border-blue-500 transition"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Kalça (cm)
                </label>
                <input
                  type="text"
                  value={hip}
                  onChange={handleChange(setHip)}
                  className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-4 py-2 focus:outline-none focus:border-blue-500 transition"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Kol (cm)
                </label>
                <input
                  type="text"
                  value={arm}
                  onChange={handleChange(setArm)}
                  className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-4 py-2 focus:outline-none focus:border-blue-500 transition"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Bacak (cm)
                </label>
                <input
                  type="text"
                  value={thigh}
                  onChange={handleChange(setThigh)}
                  className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-4 py-2 focus:outline-none focus:border-blue-500 transition"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                Notlar
              </label>
              <textarea
                value={notes}
                onChange={handleChange(setNotes)}
                rows={3}
                placeholder="Ölçümle ilgili notlar..."
                className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-4 py-2 focus:outline-none focus:border-blue-500 transition custom-scrollbar"
              />
            </div>
          </div>
        </div>

        <div className="p-6 border-t border-gray-800 flex justify-end gap-3 bg-gray-900/50">
          <button
            type="button"
            onClick={handleClose}
            disabled={saving}
            className="px-6 py-2 bg-gray-800 hover:bg-gray-700 text-white rounded-lg transition disabled:opacity-50 font-medium"
          >
            İptal
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition disabled:opacity-50 font-medium shadow-lg shadow-blue-500/20"
          >
            <Save className="w-5 h-5" />
            {saving ? "Kaydediliyor..." : "Kaydet"}
          </button>
        </div>
      </div>
    </div>
  );
}
