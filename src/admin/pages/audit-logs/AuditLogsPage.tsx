import { useState, useEffect } from "react";
import { apiClient } from "../../api/client";
import { AlertCircle, FileText } from "lucide-react";

interface AuditLog {
  id: number;
  action: string;
  entity_type: string | null;
  entity_id: number | null;
  actor: {
    admin_id: number;
    display_name: string;
  } | null;
  created_at: string;
}

interface PaginationMeta {
  total: number;
  page: number;
  per_page: number;
  last_page: number;
}

function formatSafeDate(dateString: string | null | undefined): string {
  if (!dateString) return "-";
  
  const dateRegex = /^(\d{4})-(\d{2})-(\d{2})$/;
  const dateMatch = dateString.match(dateRegex);
  if (dateMatch) {
    const [, y, m, d] = dateMatch;
    if (Number(m) < 1 || Number(m) > 12 || Number(d) < 1 || Number(d) > 31) return "-";
    return `${d}.${m}.${y}`;
  }

  const datetimeRegex = /^(\d{4})-(\d{2})-(\d{2}) (\d{2}):(\d{2}):(\d{2})$/;
  const datetimeMatch = dateString.match(datetimeRegex);
  if (datetimeMatch) {
    const [, y, m, d, hh, mm, ss] = datetimeMatch;
    if (Number(m) < 1 || Number(m) > 12 || Number(d) < 1 || Number(d) > 31) return "-";
    if (Number(hh) > 23 || Number(mm) > 59 || Number(ss) > 59) return "-";
    return `${d}.${m}.${y} ${hh}:${mm}:${ss}`;
  }

  return "-";
}

export function AuditLogsPage() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [meta, setMeta] = useState<PaginationMeta | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    fetchLogs(currentPage);
  }, [currentPage]);

  const fetchLogs = async (page: number) => {
    try {
      setIsLoading(true);
      setError(null);
      const res = await apiClient.get(`/api/admin/audit-logs?page=${page}&per_page=20`);
      setLogs(res.data || []);
      setMeta(res.meta || null);
    } catch (err: any) {
      console.error("Denetim kayıtları alınamadı:", err);
      // Empty response on error to hide details
      setLogs([]);
      setMeta(null);
      setError("Denetim kayıtları yüklenirken bir hata oluştu.");
    } finally {
      setIsLoading(false);
    }
  };

  const handlePrevPage = () => {
    if (currentPage > 1) {
      setCurrentPage((prev) => prev - 1);
    }
  };

  const handleNextPage = () => {
    if (meta && currentPage < meta.last_page) {
      setCurrentPage((prev) => prev + 1);
    }
  };

  if (isLoading && logs.length === 0) {
    return (
      <div className="flex justify-center py-12">
        <div className="w-8 h-8 border-4 border-white/20 border-t-white rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Denetim Kayıtları</h2>
        <div className="text-sm text-white/50">
          Son kayıtlar gösteriliyor
        </div>
      </div>

      {error ? (
        <div className="p-4 bg-red-500/10 border border-red-500/20 rounded text-red-400 flex items-center">
          <AlertCircle className="w-5 h-5 mr-2" />
          {error}
        </div>
      ) : logs.length === 0 ? (
        <div className="py-12 text-center text-white/50 border border-white/10 rounded">
          Kayıt bulunamadı.
        </div>
      ) : (
        <div className="bg-[#121212] border border-white/10 rounded overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-[#1a1a1a] text-white/70">
                <tr>
                  <th className="px-4 py-3 font-medium border-b border-white/10">Tarih/Saat</th>
                  <th className="px-4 py-3 font-medium border-b border-white/10">İşlemi Yapan</th>
                  <th className="px-4 py-3 font-medium border-b border-white/10">Aksiyon</th>
                  <th className="px-4 py-3 font-medium border-b border-white/10">Varlık Tipi</th>
                  <th className="px-4 py-3 font-medium border-b border-white/10">Varlık ID</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {logs.map((log) => (
                  <tr key={log.id} className="hover:bg-white/[0.02]">
                    <td className="px-4 py-3 whitespace-nowrap text-white/80">
                      {formatSafeDate(log.created_at)}
                    </td>
                    <td className="px-4 py-3">
                      {log.actor ? (
                        <div className="flex flex-col">
                          <span className="font-medium text-white/90">{log.actor.display_name}</span>
                          <span className="text-xs text-white/40">ID: {log.actor.admin_id}</span>
                        </div>
                      ) : (
                        <span className="text-white/40 italic">Sistem / Silinmiş Kullanıcı</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span className="inline-block px-2 py-1 bg-white/5 border border-white/10 rounded text-xs font-mono">
                        {log.action}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-white/70">
                      {log.entity_type || '-'}
                    </td>
                    <td className="px-4 py-3 font-mono text-white/50">
                      {log.entity_id || '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {meta && meta.last_page > 1 && (
            <div className="p-4 border-t border-white/10 flex items-center justify-between">
              <div className="text-sm text-white/50">
                Toplam {meta.total} kayıttan {(meta.page - 1) * meta.per_page + 1}-{Math.min(meta.page * meta.per_page, meta.total)} gösteriliyor
              </div>
              <div className="flex gap-2">
                <button
                  onClick={handlePrevPage}
                  disabled={currentPage <= 1 || isLoading}
                  className="px-3 py-1.5 bg-white/5 hover:bg-white/10 disabled:opacity-50 disabled:hover:bg-white/5 rounded text-sm transition"
                >
                  Önceki
                </button>
                <div className="px-3 py-1.5 text-sm text-white/70">
                  {meta.page} / {meta.last_page}
                </div>
                <button
                  onClick={handleNextPage}
                  disabled={currentPage >= meta.last_page || isLoading}
                  className="px-3 py-1.5 bg-white/5 hover:bg-white/10 disabled:opacity-50 disabled:hover:bg-white/5 rounded text-sm transition"
                >
                  Sonraki
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
