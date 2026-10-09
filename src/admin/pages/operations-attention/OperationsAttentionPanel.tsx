import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { AlertTriangle, Clock, ArrowRight, CheckCircle2 } from "lucide-react";
import { apiClient } from "../../api/client";
import { validateOperationsAttention, type OperationsAttentionResponse } from "./types";

export function OperationsAttentionPanel() {
  const [data, setData] = useState<OperationsAttentionResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchAttention = async () => {
    setLoading(true);
    setError("");
    try {
      const response = await apiClient.get('/api/admin/operations/attention');
      if (validateOperationsAttention(response)) {
        setData(response);
      } else {
        setError("Operasyonel dikkat verileri doğrulanamadı.");
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Operasyonel dikkat verileri alınamadı.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAttention();
  }, []);

  if (loading) {
    return (
      <div className="bg-[#1a1a1a] border border-white/10 p-5 rounded-lg space-y-4">
        <div className="flex items-center justify-between">
          <div className="h-5 w-44 bg-white/10 rounded animate-pulse" />
          <div className="h-4 w-28 bg-white/10 rounded animate-pulse" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="h-28 bg-white/5 rounded animate-pulse" />
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
          className="self-start sm:self-auto px-3 py-1.5 text-xs bg-white/10 hover:bg-white/20 text-white rounded transition"
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

  return (
    <div className="bg-[#1a1a1a] border border-white/10 p-5 rounded-lg space-y-4">
      {/* Başlık ve Durum */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-white/10 pb-3">
        <div className="flex items-center gap-2">
          <h3 className="text-base font-semibold text-white">Dikkat Gerektirenler</h3>
          {totalAttentionItems > 0 ? (
            <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20">
              {totalAttentionItems} durum
            </span>
          ) : (
            <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3" />
              Tümü Olağan
            </span>
          )}
        </div>
        <div className="text-xs text-white/40">
          Güncellendi: {data.generated_at.slice(11, 16)} (Europe/Istanbul)
        </div>
      </div>

      {/* Kartlar */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* 1. Kapatılması gereken randevular */}
        <div
          className={`p-4 rounded-lg border flex flex-col justify-between ${
            apptCount > 0 ? "bg-amber-500/5 border-amber-500/30" : "bg-white/[0.02] border-white/5"
          }`}
        >
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-medium uppercase tracking-wider text-white/60">
                Kapatılmamış Randevular
              </span>
              {apptCount > 0 && <AlertTriangle className="w-4 h-4 text-amber-400" />}
            </div>
            <div className="text-2xl font-bold text-white mb-2">{apptCount}</div>
            <p className="text-xs text-white/60 mb-2">
              {apptCount > 0
                ? "Bitiş saati geçtiği halde sonuçlandırılmamış randevular."
                : "Sonuçlandırılması gereken randevu bulunmuyor."}
            </p>
            {data.appointments.oldest_needs_terminalization_ends_at && (
              <div className="text-[11px] text-white/40 mb-2">
                En eski: <span className="text-white/70">{data.appointments.oldest_needs_terminalization_ends_at}</span>
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
          {apptCount > 0 && (
            <Link
              to="/admin/appointments"
              className="mt-3 inline-flex items-center gap-1 text-xs text-amber-400 hover:text-amber-300 font-medium transition"
            >
              Randevuları İncele
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          )}
        </div>

        {/* 2. Günü devreden açık ziyaretler */}
        <div
          className={`p-4 rounded-lg border flex flex-col justify-between ${
            carriedOverVisits > 0 ? "bg-amber-500/5 border-amber-500/30" : "bg-white/[0.02] border-white/5"
          }`}
        >
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-medium uppercase tracking-wider text-white/60">
                Günü Devreden Ziyaretler
              </span>
              {carriedOverVisits > 0 && <Clock className="w-4 h-4 text-amber-400" />}
            </div>
            <div className="text-2xl font-bold text-white mb-2">{carriedOverVisits}</div>
            <p className="text-xs text-white/60 mb-2">
              {carriedOverVisits > 0
                ? "Önceki günlerden çıkışı yapılmamış açık ziyaret kayıtları."
                : "Önceki günlerden açık kalan ziyaret kaydı yok."}
            </p>
            {data.open_visits.oldest_checked_in_at && carriedOverVisits > 0 && (
              <div className="text-[11px] text-white/40 mb-2">
                En eski giriş: <span className="text-white/70">{data.open_visits.oldest_checked_in_at}</span>
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
          {carriedOverVisits > 0 && (
            <Link
              to="/admin/reception"
              className="mt-3 inline-flex items-center gap-1 text-xs text-amber-400 hover:text-amber-300 font-medium transition"
            >
              Resepsiyonu İncele
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          )}
        </div>

        {/* 3. İleri tarihli açık ziyaretler */}
        <div
          className={`p-4 rounded-lg border flex flex-col justify-between ${
            futureDatedVisits > 0 ? "bg-rose-500/5 border-rose-500/30" : "bg-white/[0.02] border-white/5"
          }`}
        >
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-medium uppercase tracking-wider text-white/60">
                İleri Tarihli Ziyaretler
              </span>
              {futureDatedVisits > 0 && <AlertTriangle className="w-4 h-4 text-rose-400" />}
            </div>
            <div className="text-2xl font-bold text-white mb-2">{futureDatedVisits}</div>
            <p className="text-xs text-white/60 mb-2">
              {futureDatedVisits > 0
                ? "Giriş saati yarın veya sonrasına ait tarih anomalisi kayıtları."
                : "Tarih anomalisi içeren açık ziyaret kaydı yok."}
            </p>
            <div className="text-[10px] text-white/40 pt-2 border-t border-white/5">
              Durum:{" "}
              <span className={futureDatedVisits > 0 ? "text-rose-400" : "text-emerald-400"}>
                {futureDatedVisits > 0 ? "Veri tutarsızlığı incelenmeli" : "Olağan akış"}
              </span>
            </div>
          </div>
          {futureDatedVisits > 0 && (
            <Link
              to="/admin/reception"
              className="mt-3 inline-flex items-center gap-1 text-xs text-rose-400 hover:text-rose-300 font-medium transition"
            >
              Resepsiyonu İncele
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
