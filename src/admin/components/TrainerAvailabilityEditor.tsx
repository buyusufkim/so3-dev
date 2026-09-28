import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { Plus, Trash2, RotateCcw, Save, AlertCircle, CheckCircle2, Clock } from "lucide-react";
import { apiClient, ApiError } from "../api/client";

export type TrainerAvailabilityEditorProps =
  | {
      mode: 'admin';
      trainerId: number;
    }
  | {
      mode: 'trainer';
    };

export interface AvailabilityTrainer {
  id: number;
  name: string;
}

export interface WeeklyWindow {
  day_of_week: number;
  start_time: string;
  end_time: string;
}

export interface UnavailabilityBlock {
  id: number;
  starts_at: string;
  ends_at: string;
  reason: string | null;
}

export interface TrainerAvailabilityResponse {
  trainer: AvailabilityTrainer;
  timezone: 'Europe/Istanbul';
  weekly_windows: WeeklyWindow[];
  unavailability_blocks: UnavailabilityBlock[];
}

export interface LocalWeeklyWindow {
  localId: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
}

export interface LocalUnavailabilityBlock {
  localId: string;
  starts_at_local: string;
  ends_at_local: string;
  reason: string;
}

const WEEKDAYS = [
  { day: 1, name: 'Pazartesi' },
  { day: 2, name: 'Salı' },
  { day: 3, name: 'Çarşamba' },
  { day: 4, name: 'Perşembe' },
  { day: 5, name: 'Cuma' },
  { day: 6, name: 'Cumartesi' },
  { day: 7, name: 'Pazar' },
] as const;

// Wall-time conversion helpers: PURE STRING OPERATIONS ONLY.
export function serverToInputDatetime(serverStr: string): string {
  if (!serverStr || serverStr.length < 16) return '';
  return `${serverStr.slice(0, 10)}T${serverStr.slice(11, 16)}`;
}

export function inputToServerDatetime(inputStr: string): string {
  if (!inputStr) return '';
  const clean = inputStr.replace('T', ' ');
  if (clean.length === 16) {
    return `${clean}:00`;
  }
  return clean;
}

export function isValidGregorianDatetime(dtStr: string): boolean {
  const match = /^(\d{4})-(\d{2})-(\d{2}) (\d{2}):(\d{2}):(\d{2})$/.exec(dtStr);
  if (!match) return false;
  const year = parseInt(match[1], 10);
  const month = parseInt(match[2], 10);
  const day = parseInt(match[3], 10);
  const hour = parseInt(match[4], 10);
  const minute = parseInt(match[5], 10);
  const second = parseInt(match[6], 10);

  if (month < 1 || month > 12) return false;
  if (hour < 0 || hour > 23) return false;
  if (minute < 0 || minute > 59) return false;
  if (second < 0 || second > 59) return false;

  const isLeapYear = (year % 4 === 0 && year % 100 !== 0) || (year % 400 === 0);
  const daysInMonth = [0, 31, isLeapYear ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];

  if (day < 1 || day > daysInMonth[month]) return false;
  return true;
}

const TIME_REGEX = /^(?:[01]\d|2[0-3]):[0-5]\d$/;

export function validateTrainerAvailabilityResponse(raw: unknown): TrainerAvailabilityResponse {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    throw new Error('Geçersiz sunucu yanıtı: Kök nesne bekleniyor.');
  }

  const obj = raw as Record<string, unknown>;

  // Validate trainer
  if (!obj.trainer || typeof obj.trainer !== 'object' || Array.isArray(obj.trainer)) {
    throw new Error('Geçersiz sunucu yanıtı: trainer nesnesi eksik.');
  }
  const t = obj.trainer as Record<string, unknown>;
  if (typeof t.id !== 'number' || !Number.isInteger(t.id) || t.id <= 0) {
    throw new Error('Geçersiz sunucu yanıtı: trainer.id pozitif tam sayı olmalıdır.');
  }
  if (typeof t.name !== 'string' || t.name.trim().length === 0) {
    throw new Error('Geçersiz sunucu yanıtı: trainer.name boş olamaz.');
  }

  // Validate timezone
  if (obj.timezone !== 'Europe/Istanbul') {
    throw new Error('Geçersiz sunucu yanıtı: timezone Europe/Istanbul olmalıdır.');
  }

  // Validate weekly_windows
  if (!Array.isArray(obj.weekly_windows)) {
    throw new Error('Geçersiz sunucu yanıtı: weekly_windows dizi olmalıdır.');
  }
  const validatedWindows: WeeklyWindow[] = [];
  for (let i = 0; i < obj.weekly_windows.length; i++) {
    const w = obj.weekly_windows[i];
    if (!w || typeof w !== 'object' || Array.isArray(w)) {
      throw new Error(`Geçersiz çalışma penceresi: ${i}. satır bir nesne değil.`);
    }
    const day = w.day_of_week;
    if (typeof day !== 'number' || !Number.isInteger(day) || day < 1 || day > 7) {
      throw new Error(`Geçersiz çalışma penceresi: day_of_week 1-7 arasında olmalıdır.`);
    }
    const start = w.start_time;
    const end = w.end_time;
    if (typeof start !== 'string' || !TIME_REGEX.test(start)) {
      throw new Error(`Geçersiz başlangıç saati: ${start} (HH:MM bekleniyor).`);
    }
    if (typeof end !== 'string' || !TIME_REGEX.test(end)) {
      throw new Error(`Geçersiz bitiş saati: ${end} (HH:MM bekleniyor).`);
    }
    if (start >= end) {
      throw new Error(`Çalışma penceresinde başlangıç saati bitişten önce olmalıdır: ${start} - ${end}`);
    }
    validatedWindows.push({
      day_of_week: day,
      start_time: start,
      end_time: end,
    });
  }

  // Enforce server ordering: day_of_week ASC, start_time ASC, end_time ASC
  for (let i = 1; i < validatedWindows.length; i++) {
    const prev = validatedWindows[i - 1];
    const curr = validatedWindows[i];
    if (prev.day_of_week > curr.day_of_week) {
      throw new Error('Sunucu sözleşmesi ihlali: weekly_windows gün sırasına uygun değil.');
    }
    if (prev.day_of_week === curr.day_of_week) {
      if (prev.start_time > curr.start_time) {
        throw new Error('Sunucu sözleşmesi ihlali: weekly_windows saat sırasına uygun değil.');
      }
      if (prev.start_time === curr.start_time && prev.end_time > curr.end_time) {
        throw new Error('Sunucu sözleşmesi ihlali: weekly_windows bitiş saati sırasına uygun değil.');
      }
    }
  }

  // Validate unavailability_blocks
  if (!Array.isArray(obj.unavailability_blocks)) {
    throw new Error('Geçersiz sunucu yanıtı: unavailability_blocks dizi olmalıdır.');
  }
  const validatedBlocks: UnavailabilityBlock[] = [];
  for (let i = 0; i < obj.unavailability_blocks.length; i++) {
    const b = obj.unavailability_blocks[i];
    if (!b || typeof b !== 'object' || Array.isArray(b)) {
      throw new Error(`Geçersiz müsait olmama bloku: ${i}. satır bir nesne değil.`);
    }
    if (typeof b.id !== 'number' || !Number.isInteger(b.id) || b.id <= 0) {
      throw new Error(`Geçersiz müsait olmama bloku: id pozitif tam sayı olmalıdır.`);
    }
    if (typeof b.starts_at !== 'string' || !isValidGregorianDatetime(b.starts_at)) {
      throw new Error(`Geçersiz başlangıç zamanı: ${b.starts_at}`);
    }
    if (typeof b.ends_at !== 'string' || !isValidGregorianDatetime(b.ends_at)) {
      throw new Error(`Geçersiz bitiş zamanı: ${b.ends_at}`);
    }
    if (b.starts_at >= b.ends_at) {
      throw new Error(`Müsait olmama blokunda başlangıç bitişten önce olmalıdır.`);
    }
    let reason: string | null = null;
    if (b.reason !== null && b.reason !== undefined) {
      if (typeof b.reason !== 'string') {
        throw new Error(`Geçersiz açıklama: string veya null bekleniyor.`);
      }
      reason = b.reason;
    }
    validatedBlocks.push({
      id: b.id,
      starts_at: b.starts_at,
      ends_at: b.ends_at,
      reason,
    });
  }

  // Enforce server ordering: starts_at ASC, ends_at ASC, id ASC
  for (let i = 1; i < validatedBlocks.length; i++) {
    const prev = validatedBlocks[i - 1];
    const curr = validatedBlocks[i];
    if (prev.starts_at > curr.starts_at) {
      throw new Error('Sunucu sözleşmesi ihlali: unavailability_blocks başlangıç zamanı sırasına uygun değil.');
    }
    if (prev.starts_at === curr.starts_at) {
      if (prev.ends_at > curr.ends_at) {
        throw new Error('Sunucu sözleşmesi ihlali: unavailability_blocks bitiş zamanı sırasına uygun değil.');
      }
      if (prev.ends_at === curr.ends_at && prev.id > curr.id) {
        throw new Error('Sunucu sözleşmesi ihlali: unavailability_blocks id sırasına uygun değil.');
      }
    }
  }

  return {
    trainer: {
      id: t.id,
      name: t.name.trim(),
    },
    timezone: 'Europe/Istanbul',
    weekly_windows: validatedWindows,
    unavailability_blocks: validatedBlocks,
  };
}

let uniqueIdCounter = 0;
function createLocalId(prefix: string): string {
  uniqueIdCounter++;
  return `${prefix}-${Date.now()}-${uniqueIdCounter}`;
}

export function TrainerAvailabilityEditor(props: TrainerAvailabilityEditorProps) {
  // Derive endpoint internally without accepting arbitrary endpoint string
  const endpoint = useMemo(() => {
    if (props.mode === 'admin') {
      return `/api/admin/trainers/${props.trainerId}/availability`;
    }
    return '/api/trainer/availability';
  }, [props]);

  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Stale request protection
  const requestGenRef = useRef(0);
  const submitLockRef = useRef(false);

  // Pristine canonical server state
  const [serverData, setServerData] = useState<TrainerAvailabilityResponse | null>(null);

  // Editable local state
  const [localWindows, setLocalWindows] = useState<LocalWeeklyWindow[]>([]);
  const [localBlocks, setLocalBlocks] = useState<LocalUnavailabilityBlock[]>([]);

  // Convert server response to local edit state
  const populateLocalState = useCallback((res: TrainerAvailabilityResponse) => {
    setServerData(res);
    setLocalWindows(
      res.weekly_windows.map((w) => ({
        localId: createLocalId('w'),
        day_of_week: w.day_of_week,
        start_time: w.start_time,
        end_time: w.end_time,
      }))
    );
    setLocalBlocks(
      res.unavailability_blocks.map((b) => ({
        localId: createLocalId('b'),
        starts_at_local: serverToInputDatetime(b.starts_at),
        ends_at_local: serverToInputDatetime(b.ends_at),
        reason: b.reason || '',
      }))
    );
  }, []);

  // Initial fetch with AbortController and generation protection
  const fetchAvailability = useCallback(async () => {
    const gen = ++requestGenRef.current;
    const controller = new AbortController();

    try {
      setLoading(true);
      setLoadError(null);

      const raw = await apiClient.get(endpoint, { signal: controller.signal });
      if (gen !== requestGenRef.current) return;

      const validated = validateTrainerAvailabilityResponse(raw);
      if (gen !== requestGenRef.current) return;

      populateLocalState(validated);
    } catch (err: unknown) {
      if (gen !== requestGenRef.current) return;
      if (err instanceof Error && err.name === 'AbortError') return;

      console.error('Müsaitlik bilgisi yüklenemedi:', err);
      const msg = err instanceof ApiError ? err.message : err instanceof Error ? err.message : 'Müsaitlik bilgisi yüklenemedi.';
      setLoadError(msg);
    } finally {
      if (gen === requestGenRef.current) {
        setLoading(false);
      }
    }

    return () => {
      controller.abort();
    };
  }, [endpoint, populateLocalState]);

  useEffect(() => {
    fetchAvailability();
  }, [fetchAvailability]);

  // Client-side local validation
  const validationState = useMemo(() => {
    const errors: string[] = [];

    // Max limits
    if (localWindows.length > 28) {
      errors.push('Haftalık çalışma saatleri toplamda en fazla 28 pencere olabilir.');
    }
    if (localBlocks.length > 100) {
      errors.push('Müsait olmama kayıtları en fazla 100 blok olabilir.');
    }

    // Windows validation
    const windowsByDay = new Map<number, LocalWeeklyWindow[]>();
    for (let d = 1; d <= 7; d++) {
      windowsByDay.set(d, []);
    }

    for (const w of localWindows) {
      if (!TIME_REGEX.test(w.start_time) || !TIME_REGEX.test(w.end_time)) {
        errors.push('Tüm çalışma saatleri geçerli HH:MM formatında olmalıdır.');
        break;
      }
      if (w.start_time >= w.end_time) {
        const dayName = WEEKDAYS.find((d) => d.day === w.day_of_week)?.name || `${w.day_of_week}. gün`;
        errors.push(`${dayName} günü için başlangıç saati bitiş saatinden önce olmalıdır.`);
        break;
      }
      windowsByDay.get(w.day_of_week)?.push(w);
    }

    // Check weekday overlaps
    for (const [day, dayWindows] of windowsByDay.entries()) {
      const dayName = WEEKDAYS.find((d) => d.day === day)?.name || `${day}. gün`;
      for (let i = 0; i < dayWindows.length; i++) {
        for (let j = i + 1; j < dayWindows.length; j++) {
          const a = dayWindows[i];
          const b = dayWindows[j];
          if (a.start_time < b.end_time && a.end_time > b.start_time) {
            errors.push(`${dayName} çalışma saatleri birbiriyle çakışıyor (${a.start_time}-${a.end_time} ile ${b.start_time}-${b.end_time}).`);
            break;
          }
        }
      }
    }

    // Blocks validation
    const convertedBlocks: { starts_at: string; ends_at: string; reason: string | null }[] = [];
    for (const b of localBlocks) {
      if (!b.starts_at_local || !b.ends_at_local) {
        errors.push('Tüm müsait olmama blokları için başlangıç ve bitiş tarihi girilmelidir.');
        break;
      }
      const starts_at = inputToServerDatetime(b.starts_at_local);
      const ends_at = inputToServerDatetime(b.ends_at_local);

      if (!isValidGregorianDatetime(starts_at) || !isValidGregorianDatetime(ends_at)) {
        errors.push('Müsait olmama zamanları geçerli bir takvim tarihi olmalıdır.');
        break;
      }
      if (starts_at >= ends_at) {
        errors.push('Müsait olmama blokunda başlangıç zamanı bitişten önce olmalıdır.');
        break;
      }
      if (b.reason && b.reason.length > 255) {
        errors.push('Açıklama 255 karakterden uzun olamaz.');
        break;
      }
      convertedBlocks.push({
        starts_at,
        ends_at,
        reason: b.reason.trim() === '' ? null : b.reason.trim(),
      });
    }

    // Check block overlaps
    for (let i = 0; i < convertedBlocks.length; i++) {
      for (let j = i + 1; j < convertedBlocks.length; j++) {
        const a = convertedBlocks[i];
        const b = convertedBlocks[j];
        if (a.starts_at < b.ends_at && a.ends_at > b.starts_at) {
          errors.push(`Müsait olmama zamanları birbiriyle çakışıyor (${a.starts_at} ile ${b.starts_at}).`);
          break;
        }
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      convertedBlocks,
    };
  }, [localWindows, localBlocks]);

  // Deterministic isDirty calculation
  const isDirty = useMemo(() => {
    if (!serverData) return false;

    // Compare windows
    if (localWindows.length !== serverData.weekly_windows.length) return true;

    // Sort copies for canonical structural comparison
    const sortedLocalWindows = [...localWindows].sort((a, b) => {
      if (a.day_of_week !== b.day_of_week) return a.day_of_week - b.day_of_week;
      if (a.start_time !== b.start_time) return a.start_time.localeCompare(b.start_time);
      return a.end_time.localeCompare(b.end_time);
    });

    for (let i = 0; i < sortedLocalWindows.length; i++) {
      const l = sortedLocalWindows[i];
      const s = serverData.weekly_windows[i];
      if (l.day_of_week !== s.day_of_week || l.start_time !== s.start_time || l.end_time !== s.end_time) {
        return true;
      }
    }

    // Compare blocks
    if (localBlocks.length !== serverData.unavailability_blocks.length) return true;

    const sortedLocalBlocks = [...localBlocks].map(b => ({
      starts_at: inputToServerDatetime(b.starts_at_local),
      ends_at: inputToServerDatetime(b.ends_at_local),
      reason: b.reason.trim() === '' ? null : b.reason.trim(),
    })).sort((a, b) => {
      if (a.starts_at !== b.starts_at) return a.starts_at.localeCompare(b.starts_at);
      return a.ends_at.localeCompare(b.ends_at);
    });

    const sortedServerBlocks = [...serverData.unavailability_blocks].sort((a, b) => {
      if (a.starts_at !== b.starts_at) return a.starts_at.localeCompare(b.starts_at);
      return a.ends_at.localeCompare(b.ends_at);
    });

    for (let i = 0; i < sortedLocalBlocks.length; i++) {
      const l = sortedLocalBlocks[i];
      const s = sortedServerBlocks[i];
      if (l.starts_at !== s.starts_at || l.ends_at !== s.ends_at || l.reason !== s.reason) {
        return true;
      }
    }

    return false;
  }, [serverData, localWindows, localBlocks]);

  // Unsaved changes beforeunload protection
  useEffect(() => {
    if (!isDirty) return;
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [isDirty]);

  // Add weekly window
  const handleAddWindow = (day: number) => {
    setLocalWindows((prev) => [
      ...prev,
      {
        localId: createLocalId('w'),
        day_of_week: day,
        start_time: '09:00',
        end_time: '18:00',
      },
    ]);
    setSaveSuccess(null);
  };

  // Update weekly window
  const handleUpdateWindow = (localId: string, field: 'start_time' | 'end_time', value: string) => {
    setLocalWindows((prev) =>
      prev.map((w) => (w.localId === localId ? { ...w, [field]: value } : w))
    );
    setSaveSuccess(null);
  };

  // Remove weekly window
  const handleRemoveWindow = (localId: string) => {
    setLocalWindows((prev) => prev.filter((w) => w.localId !== localId));
    setSaveSuccess(null);
  };

  // Add unavailability block
  const handleAddBlock = () => {
    setLocalBlocks((prev) => [
      ...prev,
      {
        localId: createLocalId('b'),
        starts_at_local: '',
        ends_at_local: '',
        reason: '',
      },
    ]);
    setSaveSuccess(null);
  };

  // Update unavailability block
  const handleUpdateBlock = (
    localId: string,
    field: 'starts_at_local' | 'ends_at_local' | 'reason',
    value: string
  ) => {
    setLocalBlocks((prev) =>
      prev.map((b) => (b.localId === localId ? { ...b, [field]: value } : b))
    );
    setSaveSuccess(null);
  };

  // Remove unavailability block
  const handleRemoveBlock = (localId: string) => {
    setLocalBlocks((prev) => prev.filter((b) => b.localId !== localId));
    setSaveSuccess(null);
  };

  // Reset to server snapshot
  const handleReset = () => {
    if (serverData) {
      populateLocalState(serverData);
      setSaveError(null);
      setSaveSuccess(null);
    }
  };

  // Save handler with race lock and server response authority
  const handleSave = async () => {
    if (!isDirty || isSaving || !validationState.isValid || submitLockRef.current) {
      return;
    }

    submitLockRef.current = true;
    setIsSaving(true);
    setSaveError(null);
    setSaveSuccess(null);

    // Exact PUT payload format: only weekly_windows and unavailability_blocks
    // Strips localId, id, timezone, etc.
    const payload = {
      weekly_windows: localWindows.map((w) => ({
        day_of_week: w.day_of_week,
        start_time: w.start_time,
        end_time: w.end_time,
      })),
      unavailability_blocks: validationState.convertedBlocks.map((b) => ({
        starts_at: b.starts_at,
        ends_at: b.ends_at,
        reason: b.reason,
      })),
    };

    try {
      const raw = await apiClient.put(endpoint, payload);

      // Server Response Authority: strictly validate returned response
      const validated = validateTrainerAvailabilityResponse(raw);

      // Replace local state with server authority
      populateLocalState(validated);
      setSaveSuccess('Müsaitlik güncellendi.');

      // Clear success notification after 4 seconds
      setTimeout(() => {
        setSaveSuccess(null);
      }, 4000);
    } catch (err: unknown) {
      console.error('Müsaitlik kaydedilemedi:', err);
      if (err instanceof ApiError) {
        if (err.code === 'TRAINER_INELIGIBLE') {
          setSaveError('Eğitmen profiliniz aktif olmadığı için müsaitlik değiştirilemiyor.');
        } else if (err.message) {
          setSaveError(err.message);
        } else {
          setSaveError('Müsaitlik kaydedilemedi.');
        }
      } else if (err instanceof Error) {
        setSaveError(err.message);
      } else {
        setSaveError('Müsaitlik kaydedilemedi.');
      }
    } finally {
      setIsSaving(false);
      submitLockRef.current = false;
    }
  };

  if (loading) {
    return (
      <div className="bg-[#121212] border border-white/10 rounded-lg p-8 flex items-center justify-center text-white/50 space-x-3">
        <Clock className="w-5 h-5 animate-spin" />
        <span>Müsaitlik bilgileri yükleniyor...</span>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="bg-[#121212] border border-white/10 rounded-lg p-6 space-y-4">
        <div className="flex items-center gap-3 text-red-400">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <span className="text-sm font-medium">{loadError}</span>
        </div>
        <button
          type="button"
          onClick={fetchAvailability}
          className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white text-xs font-medium rounded transition"
        >
          Tekrar Dene
        </button>
      </div>
    );
  }

  return (
    <div className="bg-[#121212] border border-white/10 rounded-lg p-4 sm:p-6 space-y-8">
      {/* Top Header & Global Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-4">
        <div>
          <h2 className="text-lg font-semibold text-white">Çalışma Saatleri ve Müsaitlik</h2>
          <p className="text-xs text-white/50 mt-1">
            {props.mode === 'admin' && serverData
              ? `${serverData.trainer.name} için haftalık çalışma saatlerini ve müsait olmama bloklarını yönetin.`
              : 'Haftalık düzenli çalışma saatlerinizi ve izin/müsait olmama zamanlarınızı belirleyin.'}
          </p>
        </div>

        <div className="flex items-center gap-2">
          {isDirty && (
            <button
              type="button"
              onClick={handleReset}
              disabled={isSaving}
              className="px-3 py-2 text-xs font-medium border border-white/20 text-white/80 hover:text-white hover:bg-white/5 rounded transition flex items-center gap-1.5"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Değişiklikleri Geri Al</span>
            </button>
          )}

          <button
            type="button"
            onClick={handleSave}
            disabled={!isDirty || isSaving || !validationState.isValid}
            className={`px-4 py-2 text-xs font-medium rounded transition flex items-center gap-1.5 min-h-[40px] sm:min-h-0 ${
              isDirty && validationState.isValid && !isSaving
                ? 'bg-[#851C35] hover:bg-[#99203e] text-white shadow-sm'
                : 'bg-white/10 text-white/30 cursor-not-allowed'
            }`}
          >
            <Save className="w-3.5 h-3.5" />
            <span>{isSaving ? 'Kaydediliyor...' : 'Müsaitliği Kaydet'}</span>
          </button>
        </div>
      </div>

      {/* Notifications */}
      {saveSuccess && (
        <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded flex items-center gap-2.5 text-xs text-emerald-400">
          <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
          <span>{saveSuccess}</span>
        </div>
      )}

      {saveError && (
        <div className="p-3 bg-red-500/10 border border-red-500/20 rounded flex items-center gap-2.5 text-xs text-red-400">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>{saveError}</span>
        </div>
      )}

      {!validationState.isValid && validationState.errors.length > 0 && (
        <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded text-xs text-amber-300 space-y-1">
          <div className="font-medium flex items-center gap-1.5 mb-1">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>Lütfen formu kontrol edin:</span>
          </div>
          {validationState.errors.map((err, idx) => (
            <div key={idx} className="pl-5 text-amber-200/90">• {err}</div>
          ))}
        </div>
      )}

      {/* WEEKLY WINDOWS SECTION */}
      <div className="space-y-4">
        <div>
          <h3 className="text-sm font-semibold text-white uppercase tracking-wider">
            Haftalık Çalışma Saatleri
          </h3>
          <p className="text-xs text-white/50 mt-0.5">
            Her gün için randevu kabul edebileceğiniz çalışma aralıklarını tanımlayın.
          </p>
        </div>

        {localWindows.length === 0 && (
          <div className="p-4 bg-white/5 border border-dashed border-white/10 rounded text-xs text-white/50 text-center">
            Henüz çalışma saati tanımlanmamış.
          </div>
        )}

        <div className="divide-y divide-white/5 border border-white/10 rounded-lg overflow-hidden bg-[#161616]">
          {WEEKDAYS.map(({ day, name }) => {
            const dayWindows = localWindows.filter((w) => w.day_of_week === day);

            return (
              <div key={day} className="p-4 flex flex-col md:flex-row md:items-start justify-between gap-4">
                <div className="w-32 flex-shrink-0 pt-2">
                  <span className="text-sm font-medium text-white">{name}</span>
                </div>

                <div className="flex-1 space-y-2">
                  {dayWindows.length === 0 ? (
                    <div className="text-xs text-white/40 italic py-2">
                      Çalışma saati tanımlı değil
                    </div>
                  ) : (
                    dayWindows.map((w) => (
                      <div
                        key={w.localId}
                        className="flex flex-wrap items-center gap-2 bg-white/5 p-2 rounded border border-white/5"
                      >
                        <div className="flex items-center gap-1.5">
                          <label
                            htmlFor={`start-${w.localId}`}
                            className="text-xs text-white/50 sr-only"
                          >
                            {name} Başlangıç Saati
                          </label>
                          <input
                            id={`start-${w.localId}`}
                            type="time"
                            step={60}
                            aria-label={`${name} Başlangıç Saati`}
                            value={w.start_time}
                            onChange={(e) => handleUpdateWindow(w.localId, 'start_time', e.target.value)}
                            className="bg-black/40 border border-white/10 rounded px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-white/30"
                          />
                          <span className="text-xs text-white/40">-</span>
                          <label
                            htmlFor={`end-${w.localId}`}
                            className="text-xs text-white/50 sr-only"
                          >
                            {name} Bitiş Saati
                          </label>
                          <input
                            id={`end-${w.localId}`}
                            type="time"
                            step={60}
                            aria-label={`${name} Bitiş Saati`}
                            value={w.end_time}
                            onChange={(e) => handleUpdateWindow(w.localId, 'end_time', e.target.value)}
                            className="bg-black/40 border border-white/10 rounded px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-white/30"
                          />
                        </div>

                        <button
                          type="button"
                          onClick={() => handleRemoveWindow(w.localId)}
                          aria-label={`${name} ${w.start_time}-${w.end_time} çalışma saatini sil`}
                          className="p-1.5 text-white/40 hover:text-red-400 hover:bg-white/5 rounded transition ml-auto"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))
                  )}
                </div>

                <div className="flex-shrink-0 pt-1">
                  <button
                    type="button"
                    onClick={() => handleAddWindow(day)}
                    className="px-2.5 py-1.5 bg-white/5 hover:bg-white/10 text-white/80 hover:text-white text-xs font-medium rounded transition flex items-center gap-1 min-h-[36px]"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Saat Ekle</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* UNAVAILABILITY BLOCKS SECTION */}
      <div className="space-y-4 pt-4 border-t border-white/10">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-semibold text-white uppercase tracking-wider">
              Müsait Olmadığım Zamanlar
            </h3>
            <p className="text-xs text-white/50 mt-0.5">
              İzin, tatil veya özel olarak randevu alınmaması gereken tarih ve saatleri ekleyin.
            </p>
          </div>

          <button
            type="button"
            onClick={handleAddBlock}
            className="px-3 py-2 bg-white/10 hover:bg-white/20 text-white text-xs font-medium rounded transition flex items-center justify-center gap-1.5 min-h-[40px] flex-shrink-0"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Müsait Değilim</span>
          </button>
        </div>

        {localBlocks.length === 0 ? (
          <div className="p-4 bg-white/5 border border-dashed border-white/10 rounded text-xs text-white/40 text-center">
            Tanımlı müsait olmama kaydı yok.
          </div>
        ) : (
          <div className="space-y-3">
            {localBlocks.map((b, idx) => (
              <div
                key={b.localId}
                className="bg-[#161616] border border-white/10 rounded-lg p-3 sm:p-4 flex flex-col md:flex-row md:items-center gap-3"
              >
                <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label
                      htmlFor={`block-start-${b.localId}`}
                      className="block text-[11px] text-white/50 mb-1"
                    >
                      Başlangıç
                    </label>
                    <input
                      id={`block-start-${b.localId}`}
                      type="datetime-local"
                      aria-label="Başlangıç Tarihi ve Saati"
                      value={b.starts_at_local}
                      onChange={(e) => handleUpdateBlock(b.localId, 'starts_at_local', e.target.value)}
                      className="w-full bg-black/40 border border-white/10 rounded px-3 py-2 text-xs text-white focus:outline-none focus:border-white/30"
                    />
                  </div>

                  <div>
                    <label
                      htmlFor={`block-end-${b.localId}`}
                      className="block text-[11px] text-white/50 mb-1"
                    >
                      Bitiş
                    </label>
                    <input
                      id={`block-end-${b.localId}`}
                      type="datetime-local"
                      aria-label="Bitiş Tarihi ve Saati"
                      value={b.ends_at_local}
                      onChange={(e) => handleUpdateBlock(b.localId, 'ends_at_local', e.target.value)}
                      className="w-full bg-black/40 border border-white/10 rounded px-3 py-2 text-xs text-white focus:outline-none focus:border-white/30"
                    />
                  </div>
                </div>

                <div className="flex-1">
                  <label
                    htmlFor={`block-reason-${b.localId}`}
                    className="block text-[11px] text-white/50 mb-1"
                  >
                    Açıklama (opsiyonel)
                  </label>
                  <input
                    id={`block-reason-${b.localId}`}
                    type="text"
                    maxLength={255}
                    placeholder="Örn: Yıllık İzin, Seminer"
                    aria-label="Açıklama"
                    value={b.reason}
                    onChange={(e) => handleUpdateBlock(b.localId, 'reason', e.target.value)}
                    className="w-full bg-black/40 border border-white/10 rounded px-3 py-2 text-xs text-white focus:outline-none focus:border-white/30"
                  />
                </div>

                <div className="flex justify-end md:self-end pt-1">
                  <button
                    type="button"
                    onClick={() => handleRemoveBlock(b.localId)}
                    aria-label={`Müsait olmama kaydını sil #${idx + 1}`}
                    className="p-2 text-white/40 hover:text-red-400 hover:bg-white/5 rounded transition min-h-[40px] min-w-[40px] flex items-center justify-center"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Bottom Save Bar for Mobile / Convenience */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-end gap-3 pt-4 border-t border-white/10">
        {isDirty && (
          <button
            type="button"
            onClick={handleReset}
            disabled={isSaving}
            className="px-4 py-2.5 text-xs font-medium border border-white/20 text-white/80 hover:text-white hover:bg-white/5 rounded transition flex items-center justify-center gap-1.5 min-h-[44px]"
          >
            <RotateCcw className="w-4 h-4" />
            <span>Değişiklikleri Geri Al</span>
          </button>
        )}

        <button
          type="button"
          onClick={handleSave}
          disabled={!isDirty || isSaving || !validationState.isValid}
          className={`px-6 py-2.5 text-xs font-medium rounded transition flex items-center justify-center gap-2 min-h-[44px] ${
            isDirty && validationState.isValid && !isSaving
              ? 'bg-[#851C35] hover:bg-[#99203e] text-white shadow-sm'
              : 'bg-white/10 text-white/30 cursor-not-allowed'
          }`}
        >
          <Save className="w-4 h-4" />
          <span>{isSaving ? 'Kaydediliyor...' : 'Müsaitliği Kaydet'}</span>
        </button>
      </div>
    </div>
  );
}
