import React, { useEffect, useState, useRef, useMemo } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { useMemberAuth } from '../auth/MemberAuthContext';
import { memberApiClient, MemberApiError } from '../api/client';
import {
  MemberMeasurement,
  MemberMeasurementProgressResponse
} from '../api/validators';
import { MeasurementTrendChart, MeasurementTrendPoint } from '../components/MeasurementTrendChart';
import { Activity, Scale, Ruler, RotateCcw } from 'lucide-react';

type MeasurementMetricKey = 'weight_kg' | 'body_fat_percent' | 'chest_cm' | 'waist_cm' | 'hip_cm' | 'arm_cm' | 'thigh_cm';

const METRIC_LABELS: Record<MeasurementMetricKey, { label: string; unit: string; icon: React.ReactNode }> = {
  weight_kg: { label: 'Kilo', unit: 'kg', icon: <Scale className="w-4 h-4" /> },
  body_fat_percent: { label: 'Yağ Oranı', unit: '%', icon: <Activity className="w-4 h-4" /> },
  chest_cm: { label: 'Göğüs', unit: 'cm', icon: <Ruler className="w-4 h-4" /> },
  waist_cm: { label: 'Bel', unit: 'cm', icon: <Ruler className="w-4 h-4" /> },
  hip_cm: { label: 'Kalça', unit: 'cm', icon: <Ruler className="w-4 h-4" /> },
  arm_cm: { label: 'Kol', unit: 'cm', icon: <Ruler className="w-4 h-4" /> },
  thigh_cm: { label: 'Bacak', unit: 'cm', icon: <Ruler className="w-4 h-4" /> }
};

const COMPARISON_METRICS: Array<{ key: MeasurementMetricKey; label: string; unit: string }> = [
  { key: 'weight_kg', label: 'Kilo', unit: 'kg' },
  { key: 'body_fat_percent', label: 'Yağ Oranı', unit: '%' },
  { key: 'chest_cm', label: 'Göğüs', unit: 'cm' },
  { key: 'waist_cm', label: 'Bel', unit: 'cm' },
  { key: 'hip_cm', label: 'Kalça', unit: 'cm' },
  { key: 'arm_cm', label: 'Kol', unit: 'cm' },
  { key: 'thigh_cm', label: 'Bacak', unit: 'cm' }
];

function formatDate(dateStr: string) {
  if (!dateStr) return '';
  const [date, time] = dateStr.split(' ');
  const [year, month, day] = date.split('-');
  const [hour, minute] = (time || '').split(':');
  
  const months = ['', 'Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'];
  const monthName = months[parseInt(month, 10)];
  
  return `${parseInt(day, 10)} ${monthName} ${year}${hour ? ` • ${hour}:${minute}` : ''}`;
}

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

export function MemberProgressPage() {
  const { identity, isLoading: isAuthLoading, refreshIdentity } = useMemberAuth();
  const navigate = useNavigate();
  
  const [measurements, setMeasurements] = useState<MemberMeasurement[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedMetric, setSelectedMetric] = useState<MeasurementMetricKey>('weight_kg');

  // Independent Progress Summary State
  const [progressData, setProgressData] = useState<MemberMeasurementProgressResponse | null>(null);
  const [progressLoading, setProgressLoading] = useState(true);
  const [progressError, setProgressError] = useState<string | null>(null);
  const [comparisonMode, setComparisonMode] = useState<'previous' | 'first'>('previous');

  const abortControllerRef = useRef<AbortController | null>(null);
  const progressAbortControllerRef = useRef<AbortController | null>(null);

  const loadData = async () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    const controller = new AbortController();
    abortControllerRef.current = controller;

    setIsLoading(true);
    setError(null);

    try {
      const data = await memberApiClient.getMeasurements(controller.signal);
      if (!controller.signal.aborted) {
        setMeasurements(data);
        setIsLoading(false);
      }
    } catch (err) {
      if (controller.signal.aborted) return;
      
      if (err instanceof MemberApiError && err.code === 'PASSWORD_CHANGE_REQUIRED') {
        await refreshIdentity();
        navigate('/uye/sifre-degistir', { replace: true });
        return;
      }
      
      setError('Gelişim verileri yüklenirken bir hata oluştu.');
      setIsLoading(false);
    }
  };

  const loadProgress = async () => {
    if (progressAbortControllerRef.current) {
      progressAbortControllerRef.current.abort();
    }
    const controller = new AbortController();
    progressAbortControllerRef.current = controller;

    setProgressLoading(true);
    setProgressError(null);

    try {
      const data = await memberApiClient.getMeasurementProgress(controller.signal);
      if (!controller.signal.aborted) {
        setProgressData(data);
        setProgressLoading(false);
      }
    } catch (err) {
      if (controller.signal.aborted) return;

      if (err instanceof MemberApiError && err.code === 'PASSWORD_CHANGE_REQUIRED') {
        await refreshIdentity();
        navigate('/uye/sifre-degistir', { replace: true });
        return;
      }

      setProgressError('Ölçüm karşılaştırması yüklenemedi.');
      setProgressLoading(false);
    }
  };

  useEffect(() => {
    if (!isAuthLoading && identity) {
      if (identity.account.must_change_password) {
        navigate('/uye/sifre-degistir', { replace: true });
      } else {
        loadData();
        loadProgress();
      }
    }
  }, [isAuthLoading, identity, navigate]);

  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      if (progressAbortControllerRef.current) {
        progressAbortControllerRef.current.abort();
      }
    };
  }, []);

  // Determine available metrics
  const availableMetrics = useMemo(() => {
    const metrics: MeasurementMetricKey[] = [];
    const keys = Object.keys(METRIC_LABELS) as MeasurementMetricKey[];
    
    for (const key of keys) {
      if (measurements.some(m => m[key] !== null)) {
        metrics.push(key);
      }
    }
    return metrics;
  }, [measurements]);

  // Set default selected metric safely
  useEffect(() => {
    if (measurements.length > 0 && availableMetrics.length > 0 && !availableMetrics.includes(selectedMetric)) {
      if (availableMetrics.includes('weight_kg')) setSelectedMetric('weight_kg');
      else if (availableMetrics.includes('body_fat_percent')) setSelectedMetric('body_fat_percent');
      else if (availableMetrics.includes('waist_cm')) setSelectedMetric('waist_cm');
      else setSelectedMetric(availableMetrics[0]);
    }
  }, [availableMetrics, measurements, selectedMetric]);


  if (!isAuthLoading && !identity) {
    return <Navigate to="/uye/giris" replace />;
  }

  if (isAuthLoading || (isLoading && measurements.length === 0)) {
    return (
      <div className="animate-pulse space-y-6">
        <div className="h-24 bg-[#121212] border border-white/10 rounded-2xl"></div>
        <div className="h-64 bg-[#121212] border border-white/10 rounded-2xl"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-[#121212] border border-white/10 rounded-2xl p-8 text-center max-w-md mx-auto mt-12">
        <div className="text-red-400 mb-6">{error}</div>
        <button
          onClick={loadData}
          className="px-6 py-2 bg-[#851C35] hover:bg-[#851C35]/90 text-white rounded-lg transition-colors text-sm"
        >
          Tekrar Dene
        </button>
      </div>
    );
  }

  if (measurements.length === 0) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-medium text-white mb-1">Gelişimim</h1>
          <p className="text-white/50 text-sm">Ölçüm geçmişini ve zaman içindeki değişimini takip et.</p>
        </div>
        
        <div className="bg-[#121212] border border-white/10 rounded-2xl p-12 text-center">
          <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-4 text-white/20">
            <Activity className="w-8 h-8" />
          </div>
          <h2 className="text-lg font-medium text-white mb-2">Henüz kayıtlı bir ölçümün bulunmuyor.</h2>
          <p className="text-sm text-white/50 max-w-sm mx-auto">
            İlk ölçümün kaydedildiğinde gelişimini burada takip edebilirsin.
          </p>
        </div>
      </div>
    );
  }

  const latest = measurements[0];
  
  // Chart data
  const chartData: MeasurementTrendPoint[] = measurements
    .filter(m => m[selectedMetric] !== null)
    .map(m => ({
      id: m.id,
      measured_at: m.measured_at,
      value: m[selectedMetric] as number
    }))
    .reverse(); // oldest to newest for chart

  return (
    <div className="space-y-8 pb-12">
      <div>
        <h1 className="text-2xl font-medium text-white mb-1">Gelişimim</h1>
        <p className="text-white/50 text-sm">Ölçüm geçmişini ve zaman içindeki değişimini takip et.</p>
      </div>

      {/* Latest Measurement Summary */}
      <div className="bg-[#121212] border border-white/10 rounded-2xl overflow-hidden">
        <div className="p-5 border-b border-white/5 flex flex-col sm:flex-row justify-between sm:items-center gap-4">
          <div>
            <h2 className="text-lg font-medium text-white">Son Ölçüm</h2>
            <div className="text-sm text-white/50 mt-1">{formatDate(latest.measured_at)}</div>
          </div>
          {latest.trainer && (
            <div className="text-sm text-right">
              <div className="text-white/40 mb-0.5">Ölçümü kaydeden</div>
              <div className="text-white/80">{latest.trainer.name}</div>
            </div>
          )}
        </div>
        <div className="p-5 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
          {(Object.keys(METRIC_LABELS) as MeasurementMetricKey[]).map(key => {
            const val = latest[key];
            if (val === null) return null;
            const meta = METRIC_LABELS[key];
            return (
              <div key={key} className="bg-[#0A0A0A] border border-white/5 rounded-xl p-4">
                <div className="flex items-center gap-2 text-white/50 mb-2 text-sm">
                  {meta.icon}
                  {meta.label}
                </div>
                <div className="text-2xl font-light text-white">
                  {val.toFixed(1)} <span className="text-sm text-white/40">{meta.unit}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Factual Comparison Panel */}
      {progressLoading && !progressData && (
        <div className="bg-[#121212] border border-white/10 rounded-2xl p-5 sm:p-6 animate-pulse">
          <div className="h-5 bg-white/10 rounded w-1/4 mb-2"></div>
          <div className="h-4 bg-white/5 rounded w-1/2 mb-6"></div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-24 bg-white/5 rounded-xl"></div>
            ))}
          </div>
        </div>
      )}

      {progressError && (
        <div className="bg-[#121212] border border-white/10 rounded-2xl p-5 sm:p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-medium text-white">Ölçüm Değişimi</h2>
            <p className="text-sm text-red-400 mt-1">{progressError}</p>
          </div>
          <button
            type="button"
            onClick={loadProgress}
            className="min-h-[44px] px-4 py-2 bg-white/10 hover:bg-white/15 text-white rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
          >
            <RotateCcw className="w-4 h-4" />
            Tekrar Dene
          </button>
        </div>
      )}

      {!progressLoading && !progressError && progressData && progressData.measurement_count === 1 && (
        <div className="bg-[#121212] border border-white/10 rounded-2xl p-5 sm:p-6">
          <h2 className="text-lg font-medium text-white mb-1">Ölçüm Değişimi</h2>
          <p className="text-white/50 text-sm mb-4">Son ölçümünün önceki ve ilk ölçümüne göre sayısal farkları.</p>
          <div className="bg-white/5 border border-white/10 rounded-xl p-4 text-sm text-white/80">
            İlk ölçümün kaydedildi. Karşılaştırma için yeni bir ölçüm daha gerekli.
          </div>
        </div>
      )}

      {!progressLoading && !progressError && progressData && progressData.measurement_count >= 2 && (
        <div className="bg-[#121212] border border-white/10 rounded-2xl p-5 sm:p-6 space-y-6">
          <div className="flex flex-col sm:flex-row justify-between sm:items-start gap-4">
            <div>
              <h2 className="text-lg font-medium text-white mb-1">Ölçüm Değişimi</h2>
              <p className="text-white/50 text-sm">Son ölçümünün önceki ve ilk ölçümüne göre sayısal farkları.</p>
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2 text-xs text-white/50">
                <span>Son ölçüm: <strong className="text-white/80 font-normal">{formatProgressDate(progressData.latest?.measured_at)}</strong></span>
                <span>Önceki: <strong className="text-white/80 font-normal">{formatProgressDate(progressData.previous?.measured_at)}</strong></span>
                <span>İlk: <strong className="text-white/80 font-normal">{formatProgressDate(progressData.first?.measured_at)}</strong></span>
              </div>
            </div>

            <div className="flex items-center gap-1 bg-[#0A0A0A] p-1 rounded-lg border border-white/10 self-start sm:self-auto">
              <button
                type="button"
                onClick={() => setComparisonMode('previous')}
                className={`min-h-[44px] px-3.5 py-2 rounded-md text-xs font-medium transition-colors ${
                  comparisonMode === 'previous'
                    ? 'bg-[#851C35] text-white shadow-sm'
                    : 'text-white/60 hover:text-white'
                }`}
              >
                Önceki Ölçüme Göre
              </button>
              <button
                type="button"
                onClick={() => setComparisonMode('first')}
                className={`min-h-[44px] px-3.5 py-2 rounded-md text-xs font-medium transition-colors ${
                  comparisonMode === 'first'
                    ? 'bg-[#851C35] text-white shadow-sm'
                    : 'text-white/60 hover:text-white'
                }`}
              >
                İlk Ölçüme Göre
              </button>
            </div>
          </div>

          {(() => {
            const deltas = comparisonMode === 'previous'
              ? progressData.comparisons.from_previous
              : progressData.comparisons.from_first;
            const refSnapshot = comparisonMode === 'previous'
              ? progressData.previous
              : progressData.first;
            const referenceLabel = comparisonMode === 'previous' ? 'Önceki' : 'İlk';

            return (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                {COMPARISON_METRICS.map(({ key, label, unit }) => {
                  const currentVal = progressData.latest ? progressData.latest[key] : null;
                  const refVal = refSnapshot ? refSnapshot[key] : null;
                  const deltaVal = deltas ? deltas[key] : null;

                  return (
                    <div key={key} className="bg-[#0A0A0A] border border-white/5 rounded-xl p-4 flex flex-col justify-between gap-3">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs text-white/50">{label}</span>
                        <span className="text-xs font-mono px-2 py-0.5 rounded bg-white/5 text-white/80 border border-white/10 whitespace-nowrap">
                          {formatDeltaValue(deltaVal, unit)}
                        </span>
                      </div>
                      <div>
                        <div className="text-xl font-light text-white">
                          {currentVal !== null ? `${currentVal.toFixed(1)} ${unit}` : '—'}
                        </div>
                        <div className="text-xs text-white/40 mt-1">
                          {referenceLabel}: {refVal !== null ? `${refVal.toFixed(1)} ${unit}` : '—'}
                        </div>
                      </div>
                      {deltaVal === null && (
                        <p className="text-[11px] text-white/40 italic">
                          Karşılaştırma için iki ölçümde de bu değer gerekli.
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            );
          })()}
        </div>
      )}

      {/* Trends */}
      {availableMetrics.length > 0 && (
        <div className="bg-[#121212] border border-white/10 rounded-2xl p-5 sm:p-6">
          <div className="flex flex-col md:flex-row justify-between md:items-start gap-6 mb-8">
            <div>
              <h2 className="text-lg font-medium text-white mb-1">Gelişim Trendi</h2>
              <p className="text-white/50 text-sm">Seçili ölçümün zaman içindeki kayıtları.</p>
            </div>
            
            <div className="flex flex-wrap gap-2">
              {availableMetrics.map(key => (
                <button
                  key={key}
                  type="button"
                  aria-pressed={selectedMetric === key}
                  onClick={() => setSelectedMetric(key)}
                  className={`px-3 py-1.5 rounded-lg text-sm border transition-colors whitespace-nowrap ${
                    selectedMetric === key 
                      ? 'bg-white/10 border-white/20 text-white' 
                      : 'bg-transparent border-white/5 text-white/50 hover:text-white/80 hover:border-white/10'
                  }`}
                >
                  {METRIC_LABELS[key].label}
                </button>
              ))}
            </div>
          </div>
          
          <div className="h-[260px] w-full">
            <MeasurementTrendChart 
              data={chartData} 
              label={METRIC_LABELS[selectedMetric].label} 
              unit={METRIC_LABELS[selectedMetric].unit} 
            />
          </div>
        </div>
      )}

      {/* History */}
      <div>
        <h2 className="text-lg font-medium text-white mb-4">Ölçüm Geçmişi</h2>
        <div className="space-y-3">
          {measurements.map(m => (
            <div key={m.id} className="bg-[#121212] border border-white/10 rounded-2xl p-4 sm:p-5 flex flex-col md:flex-row gap-4 md:items-center justify-between">
              <div>
                <div className="text-white font-medium mb-1">{formatDate(m.measured_at)}</div>
                {m.trainer && (
                  <div className="text-sm text-white/50">{m.trainer.name}</div>
                )}
              </div>
              <div className="flex flex-wrap gap-x-6 gap-y-2">
                {(Object.keys(METRIC_LABELS) as MeasurementMetricKey[]).map(key => {
                  const val = m[key];
                  if (val === null) return null;
                  return (
                    <div key={key} className="flex items-baseline gap-1.5">
                      <span className="text-white/40 text-xs uppercase tracking-wider">{METRIC_LABELS[key].label}</span>
                      <span className="text-white/90 text-sm font-medium">{val.toFixed(1)}<span className="text-white/40 ml-0.5">{METRIC_LABELS[key].unit}</span></span>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
}
