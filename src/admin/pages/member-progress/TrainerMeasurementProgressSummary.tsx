import { useState, useEffect, useRef } from 'react';
import { RotateCcw } from 'lucide-react';
import { apiClient, ApiError } from '../../api/client';
import {
  TrainerMeasurementProgressReadModel,
  isTrainerMeasurementProgressReadModel,
  PROGRESS_METRIC_KEYS
} from './types';

export interface TrainerMeasurementProgressSummaryProps {
  memberId: number;
  refreshKey: number;
}

interface MetricConfig {
  key: (typeof PROGRESS_METRIC_KEYS)[number];
  label: string;
  unit: string;
}

const PROGRESS_METRICS: MetricConfig[] = [
  { key: 'weight_kg', label: 'Kilo', unit: 'kg' },
  { key: 'body_fat_percent', label: 'Vücut Yağ Oranı', unit: '%' },
  { key: 'chest_cm', label: 'Göğüs', unit: 'cm' },
  { key: 'waist_cm', label: 'Bel', unit: 'cm' },
  { key: 'hip_cm', label: 'Kalça', unit: 'cm' },
  { key: 'arm_cm', label: 'Kol', unit: 'cm' },
  { key: 'thigh_cm', label: 'Bacak / Uyluk', unit: 'cm' },
];

function formatProgressDate(dateStr: string | null | undefined): string {
  if (!dateStr || typeof dateStr !== 'string') return '—';
  const match = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!match) return dateStr;
  const [, year, month, day] = match;
  return `${day}.${month}.${year}`;
}

function formatDeltaValue(delta: number | null, unit: string): string {
  if (delta === null) return '—';
  if (delta > 0) return `+${delta} ${unit}`;
  if (delta < 0) return `${delta} ${unit}`;
  return `0 ${unit}`;
}

function mapProgressError(err: unknown): string {
  if (err instanceof ApiError) {
    if (err.code === 'TRAINER_PROFILE_NOT_LINKED') {
      return 'Aktif eğitmen profiliniz hesabınıza bağlanmamış.';
    }
    if (err.status === 403) {
      return 'Bu alana erişim yetkiniz yok.';
    }
    if (err.status === 404) {
      return 'Üye bulunamadı veya artık size bağlı değil.';
    }
  }
  return 'Ölçüm karşılaştırması yüklenirken bir hata oluştu.';
}

export function TrainerMeasurementProgressSummary({
  memberId,
  refreshKey
}: TrainerMeasurementProgressSummaryProps) {
  const [data, setData] = useState<TrainerMeasurementProgressReadModel | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const [comparisonMode, setComparisonMode] = useState<'previous' | 'first'>('previous');

  const requestGenRef = useRef(0);
  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    if (!memberId || isNaN(memberId) || memberId <= 0) {
      setLoading(false);
      setError('Geçersiz üye ID.');
      return;
    }

    const gen = ++requestGenRef.current;
    const controller = new AbortController();

    const fetchSummary = async () => {
      setLoading(true);
      setError(null);

      try {
        const res = await apiClient.get(
          `/api/trainer/members/${memberId}/measurement-progress`,
          { signal: controller.signal }
        );

        if (!isMountedRef.current || gen !== requestGenRef.current) return;

        const candidate = (typeof res === 'object' && res !== null && 'data' in res)
          ? (res as { data: unknown }).data
          : res;

        if (!isTrainerMeasurementProgressReadModel(candidate)) {
          throw new Error('INVALID_DATA');
        }

        setData(candidate);
      } catch (err: unknown) {
        if (!isMountedRef.current || gen !== requestGenRef.current) return;
        if (err instanceof Error && err.name === 'AbortError') return;
        setError(mapProgressError(err));
      } finally {
        if (isMountedRef.current && gen === requestGenRef.current) {
          setLoading(false);
        }
      }
    };

    fetchSummary();

    return () => {
      controller.abort();
    };
  }, [memberId, refreshKey, retryCount]);

  if (loading) {
    return (
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 animate-pulse">
        <div className="h-4 bg-gray-800 rounded w-1/4 mb-2" />
        <div className="h-3 bg-gray-800 rounded w-1/2 mb-6" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-24 bg-gray-800/50 rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-gray-900 border border-red-500/20 rounded-xl p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h3 className="text-sm font-semibold text-red-400">Ölçüm Değişimi</h3>
          <p className="text-xs text-gray-400 mt-1">{error}</p>
        </div>
        <button
          type="button"
          onClick={() => setRetryCount(c => c + 1)}
          className="min-h-[44px] px-4 py-2 bg-gray-800 hover:bg-gray-700 text-white rounded-lg text-sm font-medium transition flex items-center gap-2"
        >
          <RotateCcw className="w-4 h-4" />
          Tekrar Dene
        </button>
      </div>
    );
  }

  if (!data) return null;

  // Zero measurements state
  if (data.measurement_count === 0) {
    return (
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 flex flex-col gap-2">
        <h3 className="text-sm font-semibold text-white">Ölçüm Değişimi</h3>
        <p className="text-sm text-gray-400">Karşılaştırma için henüz ölçüm kaydı bulunmuyor.</p>
      </div>
    );
  }

  // One measurement state
  if (data.measurement_count === 1) {
    return (
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 flex flex-col gap-4">
        <div>
          <h3 className="text-sm font-semibold text-white">Ölçüm Değişimi</h3>
          <p className="text-xs text-gray-400 mt-1">Son ölçümün önceki ve ilk ölçüme göre sayısal farkları.</p>
        </div>
        <div className="text-sm text-gray-300 bg-gray-800/50 p-3 rounded-lg border border-gray-700/50">
          İlk ölçüm kaydedildi. Karşılaştırma için yeni bir ölçüm daha gerekli.
        </div>
        <div className="text-xs text-gray-400">
          Kayıt Tarihi: <strong className="text-gray-200">{formatProgressDate(data.latest?.measured_at)}</strong>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {PROGRESS_METRICS.map(({ key, label, unit }) => {
            const val = data.latest ? data.latest[key] : null;
            return (
              <div key={key} className="bg-gray-800/40 border border-gray-800 rounded-lg p-4 flex flex-col justify-between">
                <span className="text-xs text-gray-400 mb-1">{label}</span>
                <span className="text-lg font-semibold text-white">
                  {val !== null ? `${val} ${unit}` : '—'}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // Multi-measurement comparison state (count >= 2)
  const deltas = comparisonMode === 'previous'
    ? data.comparisons.from_previous
    : data.comparisons.from_first;

  const referenceSnapshot = comparisonMode === 'previous'
    ? data.previous
    : data.first;

  const referenceLabel = comparisonMode === 'previous'
    ? 'Önceki'
    : 'İlk';

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 flex flex-col gap-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-white">Ölçüm Değişimi</h2>
          <p className="text-xs text-gray-400 mt-0.5">Son ölçümün önceki ve ilk ölçüme göre sayısal farkları.</p>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2 text-xs text-gray-400">
            <span>Son ölçüm: <strong className="text-gray-200">{formatProgressDate(data.latest?.measured_at)}</strong></span>
            <span>Önceki: <strong className="text-gray-200">{formatProgressDate(data.previous?.measured_at)}</strong></span>
            <span>İlk: <strong className="text-gray-200">{formatProgressDate(data.first?.measured_at)}</strong></span>
          </div>
        </div>
        <div className="flex items-center gap-2 bg-gray-950 p-1 rounded-lg border border-gray-800 self-start sm:self-auto">
          <button
            type="button"
            onClick={() => setComparisonMode('previous')}
            className={`min-h-[44px] px-3 py-2 rounded-md text-xs font-medium transition ${
              comparisonMode === 'previous'
                ? 'bg-blue-600 text-white shadow'
                : 'text-gray-400 hover:text-gray-200'
            }`}
          >
            Önceki Ölçüme Göre
          </button>
          <button
            type="button"
            onClick={() => setComparisonMode('first')}
            className={`min-h-[44px] px-3 py-2 rounded-md text-xs font-medium transition ${
              comparisonMode === 'first'
                ? 'bg-blue-600 text-white shadow'
                : 'text-gray-400 hover:text-gray-200'
            }`}
          >
            İlk Ölçüme Göre
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {PROGRESS_METRICS.map(({ key, label, unit }) => {
          const currentVal = data.latest ? data.latest[key] : null;
          const refVal = referenceSnapshot ? referenceSnapshot[key] : null;
          const deltaVal = deltas ? deltas[key] : null;

          return (
            <div key={key} className="bg-gray-800/40 border border-gray-800 rounded-lg p-4 flex flex-col justify-between gap-3">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-medium text-gray-400">{label}</span>
                <span className="text-xs font-mono px-2 py-0.5 rounded bg-gray-800 text-gray-200 border border-gray-700 whitespace-nowrap">
                  {formatDeltaValue(deltaVal, unit)}
                </span>
              </div>
              <div>
                <div className="text-xl font-bold text-white tracking-tight">
                  {currentVal !== null ? `${currentVal} ${unit}` : '—'}
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  {refVal !== null ? `${referenceLabel}: ${refVal} ${unit}` : `${referenceLabel}: —`}
                </div>
              </div>
              {deltaVal === null && (
                <p className="text-[11px] text-gray-500 italic">
                  Karşılaştırma için iki ölçümde de bu değer gerekli.
                </p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
