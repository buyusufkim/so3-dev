import { useEffect, useState, useRef } from "react";
import { Link } from "react-router-dom";
import { AlertTriangle, Clock, ArrowRight, CheckCircle2 } from "lucide-react";
import { apiClient } from "../../api/client";
import { validateOperationsAttention, type OperationsAttentionResponse } from "./types";

/**
 * Formats canonical `YYYY-MM-DD HH:mm:ss` server timestamp into `DD.MM.YYYY HH:mm`.
 * Falls back safely to input string if parsing fails.
 */
function formatDateTime(val: string | null | undefined): string {
  if (!val || typeof val !== "string") return "";
  const match = /^(\d{4})-(\d{2})-(\d{2}) (\d{2}):(\d{2}):\d{2}$/.exec(val);
  if (!match) return val;
  const [, year, month, day, hour, minute] = match;
  return `${day}.${month}.${year} ${hour}:${minute}`;
}

export function OperationsAttentionPanel() {
  const [data, setData] = useState<OperationsAttentionResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const abortControllerRef = useRef<AbortController | null>(null);
  const requestGenerationRef = useRef(0);
  const isMountedRef = useRef(true);

  const fetchAttention = async () => {
    // Abort prior in-flight request
    abortControllerRef.current?.abort();

    const controller = new AbortController();
    abortControllerRef.current = controller;
    const generation = ++requestGenerationRef.current;

    setLoading(true);
    setError("");

    try {
      const response = await apiClient.get('/api/admin/operations/attention', {
        signal: controller.signal
      });

      if (
        controller.signal.aborted ||
        generation !== requestGenerationRef.current ||
        !isMountedRef.current
      ) {
        return;
      }

      if (validateOperationsAttention(response)) {
        setData(response);
      } else {
        setError("Dikkat verileri doğrulanamadı.");
      }
    } catch (_err: unknown) {
      if (
        controller.signal.aborted ||
        generation !== requestGenerationRef.current ||
        !isMountedRef.current
      ) {
        return;
      }
      setError("Dikkat verileri yüklenemedi.");
    } finally {
      if (
        !controller.signal.aborted &&
        generation === requestGenerationRef.current &&
        isMountedRef.current
      ) {
        setLoading(false);
      }
    }
  };

  useEffect(() => {
    isMountedRef.current = true;
    fetchAttention();
    return () => {
      isMountedRef.current = false;
      abortControllerRef.current?.abort();
    };
  }, []);

  if (loading) {
    return (
      <div className="bg-[#1a1a1a] border border-white/10 p-5 rounded-lg space-y-4">
        <div className="flex items-center justify-between">
          <div className="h-5 w-44 bg-white/10 rounded animate-pulse" />
          <div className="h-4 w-28 bg-white/10 rounded animate-pulse" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="h-28 bg-white/5 rounded animate-pulse" />
          <div className="h-28 bg-white/5 rounded animate-pulse" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-[#1a1a1a] border border-red-500/20 p-5 rounded-lg flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="text-red-400 text-sm">{error}</div>
        <button
          type="button"
          onClick={fetchAttention}
          className="self-start sm:self-auto min-h-[44px] px-4 py-2 text-xs bg-white/10 hover:bg-white/20 text-white rounded transition inline-flex items-center justify-center font-medium"
        >
          Tekrar Dene
        </button>
      </div>
    );
  }

  if (!data) return null;

  const apptCount = data.appointments.needs_terminalization_count;
  const carriedOverVisits = data.open_visits.carried_over;
  const futureDatedVisits = data.open_visits.future_dated;
  const totalAttentionItems = apptCount + carriedOverVisits + futureDatedVisits;

  const formattedGeneratedAt = formatDateTime(data.generated_at);

  // Compact clear-state when all attention counters are zero
  if (totalAttentionItems === 0) {
    return (
      <div className="bg-[#1a1a1a] border border-white/10 p-4 rounded-lg">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <h3 className="text-base font-semibold text-white">Dikkat Gerektirenler</h3>
            <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5" />
              Tümü Olağan
            </span>
          </div>
          <div className="text-xs text-white/40">
            Güncellendi: {formattedGeneratedAt} ({data.timezone})
          </div>
        </div>
        <p className="mt-2 text-xs text-white/60">
          Sonuçlandırılması gereken randevu veya günü devreden açık ziyaret bulunmuyor.
        </p>
      </div>
    );
  }

  const activeCardsCount =
    (apptCount > 0 ? 1 : 0) +
    (carriedOverVisits > 0 ? 1 : 0) +
    (futureDatedVisits > 0 ? 1 : 0);

  const gridCols =
    activeCardsCount === 3
      ? "grid-cols-1 md:grid-cols-3"
      : activeCardsCount === 2
      ? "grid-cols-1 md:grid-cols-2"
      : "grid-cols-1";

  return (
    <div className="bg-[#1a1a1a] border border-white/10 p-5 rounded-lg space-y-4">
      {/* Başlık ve Durum */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-white/10 pb-3">
        <div className="flex items-center gap-2">
          <h3 className="text-base font-semibold text-white">Dikkat Gerektirenler</h3>
          <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20">
            {totalAttentionItems} durum
          </span>
        </div>
        <div className="text-xs text-white/40">
          Güncellendi: {formattedGeneratedAt} ({data.timezone})
        </div>
      </div>

      {/* Kartlar: Yalnız pozitif metrikler için render edilir */}
      <div className={`grid ${gridCols} gap-4`}>
        {/* 1. Kapatılması gereken randevular — yalnız apptCount > 0 olduğunda render edilir */}
        {apptCount > 0 && (
          <div className="p-4 rounded-lg border flex flex-col justify-between bg-amber-500/5 border-amber-500/30">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-medium uppercase tracking-wider text-white/60">
                  Kapatılmamış Randevular
                </span>
                <AlertTriangle className="w-4 h-4 text-amber-400" />
              </div>
              <div className="text-2xl font-bold text-white mb-2">{apptCount}</div>
              <p className="text-xs text-white/60 mb-2">
                Bitiş saati geçtiği halde sonuçlandırılmamış randevular.
              </p>
              {data.appointments.oldest_needs_terminalization_ends_at && (
                <div className="text-[11px] text-white/40 mb-2">
                  En eski:{" "}
                  <span className="text-white/70">
                    {formatDateTime(data.appointments.oldest_needs_terminalization_ends_at)}
                  </span>
                </div>
              )}
              <div className="text-[10px] text-white/40 space-y-0.5 pt-2 border-t border-white/5">
                <div>
                  Bugün biten: <span className="text-white/60">{data.appointments.today.needs_terminalization}</span>
                </div>
                <div>
                  Bugün devam eden: <span className="text-white/60">{data.appointments.today.scheduled_in_progress}</span>
                </div>
                <div>
                  Bugün gelecek: <span className="text-white/60">{data.appointments.today.scheduled_future}</span>
                </div>
              </div>
            </div>
            <Link
              to="/admin/appointments"
              className="mt-3 min-h-[44px] inline-flex items-center gap-1.5 text-xs text-amber-400 hover:text-amber-300 font-medium transition"
            >
              Randevuları İncele
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        )}

        {/* 2. Günü devreden açık ziyaretler — yalnız carriedOverVisits > 0 olduğunda render edilir */}
        {carriedOverVisits > 0 && (
          <div className="p-4 rounded-lg border flex flex-col justify-between bg-amber-500/5 border-amber-500/30">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-medium uppercase tracking-wider text-white/60">
                  Günü Devreden Ziyaretler
                </span>
                <Clock className="w-4 h-4 text-amber-400" />
              </div>
              <div className="text-2xl font-bold text-white mb-2">{carriedOverVisits}</div>
              <p className="text-xs text-white/60 mb-2">
                Önceki günlerden çıkışı yapılmamış açık ziyaret kayıtları.
              </p>
              {data.open_visits.oldest_checked_in_at && (
                <div className="text-[11px] text-white/40 mb-2">
                  En eski giriş:{" "}
                  <span className="text-white/70">
                    {formatDateTime(data.open_visits.oldest_checked_in_at)}
                  </span>
                </div>
              )}
              <div className="text-[10px] text-white/40 space-y-0.5 pt-2 border-t border-white/5">
                <div>
                  Bugün açılan açık ziyaret: <span className="text-white/60">{data.open_visits.opened_today}</span>
                </div>
                <div>
                  Toplam içerideki: <span className="text-white/60">{data.open_visits.current}</span>
                </div>
              </div>
            </div>
            <Link
              to="/admin/reception"
              className="mt-3 min-h-[44px] inline-flex items-center gap-1.5 text-xs text-amber-400 hover:text-amber-300 font-medium transition"
            >
              Resepsiyonu İncele
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        )}

        {/* 3. İleri tarihli açık ziyaretler — yalnızca future_dated > 0 olduğunda render edilir */}
        {futureDatedVisits > 0 && (
          <div className="p-4 rounded-lg border flex flex-col justify-between bg-rose-500/5 border-rose-500/30">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-medium uppercase tracking-wider text-white/60">
                  İleri Tarihli Ziyaretler
                </span>
                <AlertTriangle className="w-4 h-4 text-rose-400" />
              </div>
              <div className="text-2xl font-bold text-white mb-2">{futureDatedVisits}</div>
              <p className="text-xs text-white/60 mb-2">
                Giriş saati yarın veya sonrasına ait tarih anomalisi kayıtları.
              </p>
              <div className="text-[10px] text-white/40 pt-2 border-t border-white/5">
                Durum: <span className="text-rose-400">Veri tutarsızlığı incelenmeli</span>
              </div>
            </div>
            <Link
              to="/admin/reception"
              className="mt-3 min-h-[44px] inline-flex items-center gap-1.5 text-xs text-rose-400 hover:text-rose-300 font-medium transition"
            >
              Resepsiyonu İncele
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
