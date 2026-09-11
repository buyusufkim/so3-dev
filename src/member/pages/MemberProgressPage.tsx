import React, { useEffect, useState, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMemberAuth } from '../auth/MemberAuthContext';
import { memberApiClient, MemberApiError } from '../api/client';
import { MemberMeasurement } from '../api/validators';
import { MeasurementTrendChart, MeasurementTrendPoint } from '../components/MeasurementTrendChart';
import { Activity, Scale, Ruler } from 'lucide-react';

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

function formatDate(dateStr: string) {
  if (!dateStr) return '';
  const [date, time] = dateStr.split(' ');
  const [year, month, day] = date.split('-');
  const [hour, minute] = (time || '').split(':');
  
  const months = ['', 'Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'];
  const monthName = months[parseInt(month, 10)];
  
  return `${parseInt(day, 10)} ${monthName} ${year}${hour ? ` • ${hour}:${minute}` : ''}`;
}

export function MemberProgressPage() {
  const { identity, isLoading: isAuthLoading, refreshIdentity } = useMemberAuth();
  const navigate = useNavigate();
  
  const [measurements, setMeasurements] = useState<MemberMeasurement[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedMetric, setSelectedMetric] = useState<MeasurementMetricKey>('weight_kg');

  const abortControllerRef = useRef<AbortController | null>(null);

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

  useEffect(() => {
    if (!isAuthLoading && identity) {
      if (identity.account.must_change_password) {
        navigate('/uye/sifre-degistir', { replace: true });
      } else {
        loadData();
      }
    }
  }, [isAuthLoading, identity, navigate]);

  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
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

  // Delta calculation
  let deltaText = 'Önceki ölçüm yok';
  let deltaValue: number | null = null;
  if (chartData.length >= 2) {
    const current = chartData[chartData.length - 1].value;
    const previous = chartData[chartData.length - 2].value;
    deltaValue = current - previous;
    const sign = deltaValue > 0 ? '+' : '';
    deltaText = `Son ölçüme göre ${sign}${deltaValue.toFixed(1)} ${METRIC_LABELS[selectedMetric].unit}`;
  } else if (chartData.length === 1) {
    deltaText = 'Önceki ölçüm yok';
  }

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

      {/* Trends */}
      {availableMetrics.length > 0 && (
        <div className="bg-[#121212] border border-white/10 rounded-2xl p-5 sm:p-6">
          <div className="flex flex-col md:flex-row justify-between md:items-start gap-6 mb-8">
            <div>
              <h2 className="text-lg font-medium text-white mb-1">Gelişim Trendi</h2>
              <p className="text-white/50 text-sm">{deltaText}</p>
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
