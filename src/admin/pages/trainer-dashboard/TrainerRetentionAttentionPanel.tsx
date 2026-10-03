import React, { useState, useEffect, useCallback, useRef } from "react";
import { Link } from "react-router-dom";
import { apiClient, ApiError } from "../../api/client";
import {
  TrainerRetentionAttentionResponse,
  validateTrainerRetentionAttention
} from "./retentionTypes";
import { WhatsAppContactLink } from "../../components/WhatsAppContactLink";
import { buildTrainerWhatsAppQuickMessage } from "../../utils/whatsapp";
import { Clock, RefreshCw, AlertCircle } from "lucide-react";

export interface TrainerRetentionAttentionPanelProps {
  className?: string;
}

function formatLastCompletedDate(dtStr: string): string {
  if (/^\d{4}-\d{2}-\d{2}/.test(dtStr)) {
    const year = dtStr.substring(0, 4);
    const month = dtStr.substring(5, 7);
    const day = dtStr.substring(8, 10);
    return `${day}.${month}.${year}`;
  }
  return dtStr;
}

export function TrainerRetentionAttentionPanel({
  className = ""
}: TrainerRetentionAttentionPanelProps) {
  const [data, setData] = useState<TrainerRetentionAttentionResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const abortControllerRef = useRef<AbortController | null>(null);
  const requestGenerationRef = useRef<number>(0);
  const isMountedRef = useRef<boolean>(true);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  const fetchRetentionAttention = useCallback(async () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    const generation = ++requestGenerationRef.current;
    setLoading(true);
    setError(null);

    try {
      const response = await apiClient.get('/api/trainer/retention-attention', {
        signal: abortController.signal
      });

      if (abortController.signal.aborted || !isMountedRef.current || generation !== requestGenerationRef.current) {
        return;
      }

      const validated = validateTrainerRetentionAttention(response);
      setData(validated);
    } catch (err: unknown) {
      if (abortController.signal.aborted || !isMountedRef.current || generation !== requestGenerationRef.current) {
        return;
      }

      let errMsg = "Takip listesi yüklenirken bir hata oluştu.";
      if (err instanceof ApiError) {
        if (err.code === 'TRAINER_PROFILE_NOT_LINKED') {
          errMsg = "Aktif eğitmen profiliniz hesabınıza bağlanmamış.";
        } else if (err.status === 403 || err.code === 'FORBIDDEN') {
          errMsg = "Bu alana erişim yetkiniz yok.";
        } else {
          errMsg = "Takip listesi yüklenirken bir hata oluştu.";
        }
      }
      setError(errMsg);
    } finally {
      if (isMountedRef.current && generation === requestGenerationRef.current && !abortController.signal.aborted) {
        setLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    fetchRetentionAttention();
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [fetchRetentionAttention, refreshKey]);

  return (
    <div className={`bg-[#121212] border border-white/10 rounded-lg p-4 sm:p-5 space-y-4 ${className}`}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <h3 className="text-base sm:text-lg font-bold text-white">Uzun Süredir Gelmeyenler</h3>
          <p className="text-xs sm:text-sm text-white/50 mt-0.5">
            Son tamamlanan seansının üzerinden 14 gün veya daha fazla geçen ve planlı seansı bulunmayan aktif üyeler.
          </p>
        </div>
      </div>

      {/* Body */}
      {loading && !data ? (
        <div className="space-y-3 py-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-16 bg-white/5 rounded-lg animate-pulse" />
          ))}
        </div>
      ) : error && !data ? (
        <div className="p-4 bg-red-500/10 border border-red-500/20 text-red-400 rounded-lg text-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
          <button
            type="button"
            onClick={() => setRefreshKey((k) => k + 1)}
            className="px-3.5 py-2 min-h-[44px] bg-red-500/20 hover:bg-red-500/30 border border-red-500/30 text-red-200 text-xs font-medium rounded-lg transition shrink-0 flex items-center justify-center gap-1.5"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Tekrar Dene</span>
          </button>
        </div>
      ) : data && data.items.length === 0 ? (
        <div className="p-6 text-center text-white/50 text-sm bg-white/[0.02] border border-white/5 rounded-lg">
          Şu anda takip gerektiren üye bulunmuyor.
        </div>
      ) : data ? (
        <div className="divide-y divide-white/5 border border-white/5 rounded-lg overflow-hidden bg-white/[0.01]">
          {data.items.map((item) => {
            const followUpMessage = buildTrainerWhatsAppQuickMessage({
              kind: 'follow_up',
              firstName: item.member.first_name
            });
            const lastSessionDate = formatLastCompletedDate(item.last_completed_at);

            return (
              <div
                key={item.member.id}
                className="p-3.5 sm:p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-white/[0.02] transition-colors"
              >
                <div className="space-y-1.5 min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-semibold text-white text-sm sm:text-base truncate">
                      {item.member.first_name} {item.member.last_name}
                    </span>
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-amber-500/10 text-amber-400 border border-amber-500/20">
                      {item.inactivity_days} gündür tamamlanan seans yok
                    </span>
                  </div>

                  <div className="text-xs text-white/50 flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 shrink-0 text-white/40" />
                    <span>Son seans: {lastSessionDate}</span>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 shrink-0 w-full sm:w-auto pt-1 sm:pt-0">
                  <WhatsAppContactLink
                    phone={item.member.phone}
                    name={`${item.member.first_name} ${item.member.last_name}`}
                    label="WhatsApp"
                    message={followUpMessage}
                    showDisabledIfInvalid={false}
                    className="w-full sm:w-auto"
                  />
                  <Link
                    to={`/admin/my-members/${item.member.id}`}
                    className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 bg-white/5 hover:bg-white/10 border border-white/10 text-white text-xs font-medium rounded-lg transition min-h-[44px] w-full sm:w-auto text-center"
                  >
                    <span>Üyeyi Aç</span>
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
