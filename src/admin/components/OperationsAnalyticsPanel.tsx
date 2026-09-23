import { useEffect, useState, useRef } from "react";
import { apiClient } from "../api/client";

export type AnalyticsRange = '7d' | '30d' | '90d';

export interface AppointmentCounts {
  total: number;
  scheduled: number;
  completed: number;
  cancelled: number;
  no_show: number;
}

export interface OperationsAnalyticsDay {
  date: string;
  visits: number;
  unique_visitors: number;
  renewals: number;
  appointments: AppointmentCounts;
}

export interface OperationsAnalyticsResponse {
  range: AnalyticsRange;
  start_date: string;
  end_date: string;
  timezone: 'Europe/Istanbul';
  current: {
    active_members: number;
    current_occupancy: number;
  };
  period: {
    visits: {
      total: number;
      unique_members: number;
    };
    renewals: {
      total: number;
      unique_members: number;
    };
    appointments: AppointmentCounts;
  };
  daily: OperationsAnalyticsDay[];
}

type TrendMetric = 'visits' | 'unique_visitors' | 'renewals' | 'appointments';

function isNonNegativeInteger(val: unknown): val is number {
  return typeof val === 'number' && Number.isInteger(val) && val >= 0;
}

function isValidDateOnly(str: unknown): str is string {
  if (typeof str !== 'string') return false;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(str)) return false;
  const parts = str.split('-');
  const year = parseInt(parts[0], 10);
  const month = parseInt(parts[1], 10);
  const day = parseInt(parts[2], 10);
  if (isNaN(year) || isNaN(month) || isNaN(day)) return false;
  if (month < 1 || month > 12 || day < 1 || day > 31) return false;
  const utcDate = new Date(Date.UTC(year, month - 1, day));
  return (
    utcDate.getUTCFullYear() === year &&
    utcDate.getUTCMonth() === month - 1 &&
    utcDate.getUTCDate() === day
  );
}

function validateAppointmentCounts(obj: unknown): obj is AppointmentCounts {
  if (!obj || typeof obj !== 'object') return false;
  const a = obj as Record<string, unknown>;
  if (
    !isNonNegativeInteger(a.total) ||
    !isNonNegativeInteger(a.scheduled) ||
    !isNonNegativeInteger(a.completed) ||
    !isNonNegativeInteger(a.cancelled) ||
    !isNonNegativeInteger(a.no_show)
  ) {
    return false;
  }
  return a.scheduled + a.completed + a.cancelled + a.no_show === a.total;
}

export function validateAnalyticsResponse(
  raw: unknown,
  requestedRange: AnalyticsRange
): OperationsAnalyticsResponse | null {
  if (!raw || typeof raw !== 'object') return null;
  const res = raw as Record<string, unknown>;

  // 1. Requested range match
  if (res.range !== requestedRange) return null;
  if (!['7d', '30d', '90d'].includes(res.range as string)) return null;

  // 2. Exact timezone authority
  if (res.timezone !== 'Europe/Istanbul') return null;

  // 3. Start & End date Gregorian validity
  if (!isValidDateOnly(res.start_date) || !isValidDateOnly(res.end_date)) return null;

  // 4. Current snapshot
  if (!res.current || typeof res.current !== 'object') return null;
  const curr = res.current as Record<string, unknown>;
  if (!isNonNegativeInteger(curr.active_members) || !isNonNegativeInteger(curr.current_occupancy)) {
    return null;
  }

  // 5. Period totals & relational invariants
  if (!res.period || typeof res.period !== 'object') return null;
  const period = res.period as Record<string, unknown>;

  if (!period.visits || typeof period.visits !== 'object') return null;
  const pVisits = period.visits as Record<string, unknown>;
  if (!isNonNegativeInteger(pVisits.total) || !isNonNegativeInteger(pVisits.unique_members)) return null;
  if (pVisits.unique_members > pVisits.total) return null;

  if (!period.renewals || typeof period.renewals !== 'object') return null;
  const pRenewals = period.renewals as Record<string, unknown>;
  if (!isNonNegativeInteger(pRenewals.total) || !isNonNegativeInteger(pRenewals.unique_members)) return null;
  if (pRenewals.unique_members > pRenewals.total) return null;

  if (!validateAppointmentCounts(period.appointments)) return null;

  // 6. Daily series validation
  if (!Array.isArray(res.daily)) return null;
  const expectedLength = requestedRange === '7d' ? 7 : requestedRange === '30d' ? 30 : 90;
  if (res.daily.length !== expectedLength) return null;

  if (res.daily[0]?.date !== res.start_date) return null;
  if (res.daily[res.daily.length - 1]?.date !== res.end_date) return null;

  let prevUtcTime: number | null = null;
  for (let i = 0; i < res.daily.length; i++) {
    const day = res.daily[i];
    if (!day || typeof day !== 'object') return null;
    if (!isValidDateOnly(day.date)) return null;

    const parts = day.date.split('-');
    const currentUtcTime = Date.UTC(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));

    if (prevUtcTime !== null) {
      // Must be contiguous exactly 1 calendar day apart (86,400,000 ms) and strictly ascending
      if (currentUtcTime - prevUtcTime !== 86400000) {
        return null;
      }
    }
    prevUtcTime = currentUtcTime;

    if (
      !isNonNegativeInteger(day.visits) ||
      !isNonNegativeInteger(day.unique_visitors) ||
      !isNonNegativeInteger(day.renewals)
    ) {
      return null;
    }
    if (day.unique_visitors > day.visits) return null;
    if (!validateAppointmentCounts(day.appointments)) return null;
  }

  // Cast only AFTER complete exhaustive validation
  return raw as OperationsAnalyticsResponse;
}

export function formatDateTurkish(dateStr: string): string {
  const parts = dateStr.split('-');
  if (parts.length !== 3) return dateStr;
  return `${parts[2]}.${parts[1]}.${parts[0]}`;
}

export function formatDayMonth(dateStr: string): string {
  const parts = dateStr.split('-');
  if (parts.length !== 3) return dateStr;
  return `${parts[2]}.${parts[1]}`;
}

export function OperationsAnalyticsPanel() {
  const [requestedRange, setRequestedRange] = useState<AnalyticsRange>('30d');
  const [data, setData] = useState<OperationsAnalyticsResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [trendMetric, setTrendMetric] = useState<TrendMetric>('visits');

  const abortControllerRef = useRef<AbortController | null>(null);
  const requestGenerationRef = useRef<number>(0);

  const fetchAnalytics = async (rangeToFetch: AnalyticsRange) => {
    // Abort previous pending request
    abortControllerRef.current?.abort();
    const controller = new AbortController();
    abortControllerRef.current = controller;
    const generation = ++requestGenerationRef.current;

    setLoading(true);
    setError(null);

    try {
      const url = `/api/admin/analytics/operations?range=${encodeURIComponent(rangeToFetch)}`;
      const res = await apiClient.get(url, { signal: controller.signal });

      if (controller.signal.aborted || generation !== requestGenerationRef.current) {
        return;
      }

      const validated = validateAnalyticsResponse(res, rangeToFetch);
      if (!validated) {
        throw new Error('Analitik yanıt formatı geçersiz.');
      }

      setData(validated);
      setError(null);
    } catch (err: unknown) {
      if (controller.signal.aborted || (err instanceof DOMException && err.name === 'AbortError')) {
        return;
      }
      if (generation !== requestGenerationRef.current) {
        return;
      }
      const label = rangeToFetch === '7d' ? '7' : rangeToFetch === '30d' ? '30' : '90';
      setError(`${label} günlük operasyon analitiği yüklenemedi.`);
    } finally {
      if (!controller.signal.aborted && generation === requestGenerationRef.current) {
        setLoading(false);
      }
    }
  };

  useEffect(() => {
    fetchAnalytics('30d');
    return () => {
      abortControllerRef.current?.abort();
    };
  }, []);

  const handleRangeSelect = (r: AnalyticsRange) => {
    if (r === requestedRange && !error) return;
    setRequestedRange(r);
    fetchAnalytics(r);
  };

  const metricLabelMap: Record<TrendMetric, string> = {
    visits: 'Ziyaret',
    unique_visitors: 'Tekil Ziyaretçi',
    renewals: 'Yenileme',
    appointments: 'Randevu',
  };

  // SVG Chart Computations
  const renderChart = () => {
    if (!data || data.daily.length === 0) return null;

    // Preserve backend chronology directly (do not sort or reverse)
    const pointsData = data.daily.map(day => {
      let val = 0;
      switch (trendMetric) {
        case 'unique_visitors':
          val = day.unique_visitors;
          break;
        case 'renewals':
          val = day.renewals;
          break;
        case 'appointments':
          val = day.appointments.total;
          break;
        case 'visits':
        default:
          val = day.visits;
          break;
      }
      return { date: day.date, val };
    });

    const values = pointsData.map(p => p.val);
    const maxVal = Math.max(...values, 0);

    const width = 600;
    const height = 200;
    const paddingTop = 20;
    const paddingBottom = 30;
    const usableHeight = height - paddingTop - paddingBottom;

    // Safe zero handling without NaN
    const isAllZero = maxVal === 0;

    const coordinates = pointsData.map((p, i) => {
      const x = pointsData.length > 1 ? (i / (pointsData.length - 1)) * width : width / 2;
      const y = isAllZero
        ? height - paddingBottom
        : (height - paddingBottom) - ((p.val / maxVal) * usableHeight);
      return { ...p, x, y };
    });

    const polylinePoints = coordinates.map(c => `${c.x.toFixed(1)},${c.y.toFixed(1)}`).join(' ');

    const firstDateFormatted = formatDayMonth(pointsData[0].date);
    const lastDateFormatted = formatDayMonth(pointsData[pointsData.length - 1].date);
    const midIndex = Math.floor(pointsData.length / 2);
    const midDateFormatted = formatDayMonth(pointsData[midIndex].date);

    const chartAriaLabel = `Son ${pointsData.length} gündeki günlük ${metricLabelMap[trendMetric]} trendi`;

    return (
      <div className="space-y-3">
        <div className="w-full relative min-h-[180px] sm:min-h-[200px]">
          <svg
            viewBox={`0 0 ${width} ${height}`}
            className="w-full h-auto overflow-visible"
            role="img"
            aria-label={chartAriaLabel}
          >
            {/* Horizontal Grid lines */}
            <line x1="0" y1={paddingTop} x2={width} y2={paddingTop} stroke="currentColor" strokeOpacity="0.08" strokeDasharray="4 4" />
            <line x1="0" y1={paddingTop + usableHeight / 2} x2={width} y2={paddingTop + usableHeight / 2} stroke="currentColor" strokeOpacity="0.08" strokeDasharray="4 4" />
            <line x1="0" y1={height - paddingBottom} x2={width} y2={height - paddingBottom} stroke="currentColor" strokeOpacity="0.15" />

            {/* Polyline */}
            <polyline
              points={polylinePoints}
              fill="none"
              stroke="#851C35"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />

            {/* Circles for each point */}
            {coordinates.map((c, i) => (
              <circle
                key={c.date}
                cx={c.x}
                cy={c.y}
                r={i === coordinates.length - 1 ? 4.5 : 3}
                fill={i === coordinates.length - 1 ? "#851C35" : "#1a1a1a"}
                stroke={i === coordinates.length - 1 ? "#ffffff" : "#851C35"}
                strokeWidth="2"
              />
            ))}
          </svg>
        </div>

        {/* X-axis date labels */}
        <div className="flex justify-between text-xs text-white/40 px-1 select-none">
          <span>{firstDateFormatted}</span>
          <span className="hidden sm:inline">{midDateFormatted}</span>
          <span>{lastDateFormatted}</span>
        </div>

        {isAllZero && (
          <div className="text-center py-2 text-xs text-white/40 bg-white/5 rounded">
            Bu dönemde bu metrik için hareket bulunmuyor.
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-6 bg-[#121212] border border-white/10 p-5 sm:p-6 rounded-xl">
      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-lg font-semibold text-white">Operasyon Analitiği</h3>
            {loading && data && (
              <span className="text-xs text-white/40 animate-pulse">Güncelleniyor...</span>
            )}
          </div>
          <p className="text-white/50 text-sm mt-0.5">
            Ziyaret, yenileme ve randevu hareketlerinin dönemsel görünümü.
          </p>
        </div>

        {/* Range Selector */}
        <div className="flex items-center gap-2 self-start sm:self-auto">
          {(['7d', '30d', '90d'] as AnalyticsRange[]).map((r) => {
            const isSelected = data ? data.range === r : requestedRange === r;
            const isPending = loading && requestedRange === r && data?.range !== r;
            const labels: Record<AnalyticsRange, string> = {
              '7d': '7 Gün',
              '30d': '30 Gün',
              '90d': '90 Gün',
            };

            return (
              <button
                key={r}
                type="button"
                aria-pressed={isSelected}
                onClick={() => handleRangeSelect(r)}
                className={`min-h-[44px] px-4 py-2 text-sm font-medium rounded-lg transition-colors cursor-pointer ${
                  isSelected
                    ? 'bg-[#851C35] text-white'
                    : 'bg-[#1a1a1a] text-white/70 hover:text-white hover:bg-white/10 border border-white/5'
                } ${isPending ? 'opacity-70 animate-pulse' : ''}`}
              >
                {labels[r]}
              </button>
            );
          })}
        </div>
      </div>

      {/* Date Range Info */}
      {data && (
        <div className="text-xs text-white/40 flex flex-wrap items-center gap-2">
          <span>
            Dönem: {formatDateTurkish(data.start_date)} – {formatDateTurkish(data.end_date)}
          </span>
          {data.range !== requestedRange && (
            <span className="text-amber-400/80">
              (Görüntülenen: {data.range === '7d' ? '7 Gün' : data.range === '30d' ? '30 Gün' : '90 Gün'})
            </span>
          )}
        </div>
      )}

      {/* Error Banner with Retry */}
      {error && (
        <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-4 rounded-lg flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-sm">
          <span>{error}</span>
          <button
            type="button"
            onClick={() => fetchAnalytics(requestedRange)}
            className="min-h-[44px] px-4 py-2 bg-red-500/20 hover:bg-red-500/30 text-white rounded-lg transition-colors font-medium cursor-pointer"
          >
            Tekrar Dene
          </button>
        </div>
      )}

      {/* Initial Loading Skeleton */}
      {loading && !data && (
        <div className="py-12 text-center text-white/40 text-sm">
          Operasyon analitiği yükleniyor...
        </div>
      )}

      {/* Main Analytics Content */}
      {data && (
        <div className="space-y-6">
          {/* Current & Period Cards Grid */}
          <div>
            <div className="text-xs uppercase tracking-wider text-white/40 font-semibold mb-3">
              Özet Göstergeler
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
              {/* Current: Active Members */}
              <div className="bg-[#1a1a1a] border border-white/10 p-5 rounded-lg flex flex-col justify-between">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] uppercase tracking-widest text-white/40">Aktif Üyeler</span>
                  <span className="text-[9px] bg-white/10 text-white/60 px-1.5 py-0.5 rounded">Anlık</span>
                </div>
                <div className="text-2xl font-bold text-white">{data.current.active_members}</div>
                <div className="text-[11px] text-white/40 mt-1">Sistemdeki aktif üye</div>
              </div>

              {/* Current: Current Occupancy */}
              <div className="bg-[#1a1a1a] border border-white/10 p-5 rounded-lg flex flex-col justify-between">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] uppercase tracking-widest text-white/40">Şu An İçeride</span>
                  <span className="text-[9px] bg-white/10 text-white/60 px-1.5 py-0.5 rounded">Anlık</span>
                </div>
                <div className="text-2xl font-bold text-white">{data.current.current_occupancy}</div>
                <div className="text-[11px] text-white/40 mt-1">Açık kulüp ziyareti</div>
              </div>

              {/* Period: Visits */}
              <div className="bg-[#1a1a1a] border border-white/10 p-5 rounded-lg flex flex-col justify-between">
                <div className="text-[10px] uppercase tracking-widest text-white/40 mb-2">Ziyaretler</div>
                <div className="text-2xl font-bold text-white">{data.period.visits.total}</div>
                <div className="text-[11px] text-white/50 mt-1">
                  {data.period.visits.unique_members} farklı üye
                </div>
              </div>

              {/* Period: Renewals */}
              <div className="bg-[#1a1a1a] border border-white/10 p-5 rounded-lg flex flex-col justify-between">
                <div className="text-[10px] uppercase tracking-widest text-white/40 mb-2">Üyelik Yenilemeleri</div>
                <div className="text-2xl font-bold text-white">{data.period.renewals.total}</div>
                <div className="text-[11px] text-white/50 mt-1">
                  {data.period.renewals.unique_members} farklı üye
                </div>
              </div>

              {/* Period: Appointments */}
              <div className="bg-[#1a1a1a] border border-white/10 p-5 rounded-lg flex flex-col justify-between">
                <div className="text-[10px] uppercase tracking-widest text-white/40 mb-2">Randevular</div>
                <div className="text-2xl font-bold text-white mb-2">{data.period.appointments.total}</div>
                <div className="grid grid-cols-2 gap-x-2 gap-y-1 text-[10px] text-white/50">
                  <div>Planlı: <span className="text-white/80">{data.period.appointments.scheduled}</span></div>
                  <div>Tamamlandı: <span className="text-white/80">{data.period.appointments.completed}</span></div>
                  <div>İptal: <span className="text-white/80">{data.period.appointments.cancelled}</span></div>
                  <div>Gelmedi: <span className="text-white/80">{data.period.appointments.no_show}</span></div>
                </div>
              </div>
            </div>
          </div>

          {/* Daily Trend Section */}
          <div className="bg-[#1a1a1a] border border-white/10 p-5 rounded-xl space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h4 className="text-sm font-semibold text-white">Günlük Trend</h4>
                <p className="text-xs text-white/40">Dönem içindeki günlük hareketlerin değişimi</p>
              </div>

              {/* Trend Metric Buttons */}
              <div className="flex flex-wrap items-center gap-1.5">
                {(['visits', 'unique_visitors', 'renewals', 'appointments'] as TrendMetric[]).map((metric) => {
                  const isActive = trendMetric === metric;
                  return (
                    <button
                      key={metric}
                      type="button"
                      aria-pressed={isActive}
                      onClick={() => setTrendMetric(metric)}
                      className={`min-h-[44px] px-3 py-1.5 text-xs font-medium rounded-lg transition-colors cursor-pointer ${
                        isActive
                          ? 'bg-[#851C35] text-white'
                          : 'bg-white/5 text-white/60 hover:text-white hover:bg-white/10'
                      }`}
                    >
                      {metricLabelMap[metric]}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Chart Area */}
            <div className="pt-2">
              {renderChart()}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
