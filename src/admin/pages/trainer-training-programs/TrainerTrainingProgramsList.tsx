import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { ArrowLeft, Plus, Edit2 } from "lucide-react";
import { apiClient, ApiError } from "../../api/client";
import {
  TrainerTrainingProgramListItem,
  isTrainerTrainingProgramsResponse,
  isTrainingProgramStatus
} from "./types";
import { TrainerMemberWorkspaceNav } from "../../components/TrainerMemberWorkspaceNav";

class ContractValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ContractValidationError";
  }
}

export function TrainerTrainingProgramsList() {
  const { memberId } = useParams<{ memberId: string }>();

  // Validate memberId as positive canonical integer
  const isValidMemberId = /^[1-9]\d*$/.test(memberId || "");

  const [items, setItems] = useState<TrainerTrainingProgramListItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [lastPage, setLastPage] = useState(1);
  const [perPage] = useState(20);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [statusFilter, setStatusFilter] = useState<"all" | "draft" | "active" | "archived">("all");

  useEffect(() => {
    if (!isValidMemberId) return;

    let isSubscribed = true;
    setLoading(true);
    setError(null);

    const fetchPrograms = async () => {
      try {
        const query = new URLSearchParams();
        query.set("page", page.toString());
        query.set("per_page", perPage.toString());

        if (statusFilter !== "all") {
          query.set("status", statusFilter);
        }

        const rawRes = await apiClient.get(`/api/trainer/members/${memberId}/training-programs?${query.toString()}`);
        if (!isSubscribed) return;
        if (!isTrainerTrainingProgramsResponse(rawRes)) {
          throw new ContractValidationError("Antrenman programı verisi doğrulanamadı.");
        }
        setItems(rawRes.items);
        setTotal(rawRes.pagination.total);
        setLastPage(rawRes.pagination.last_page);
      } catch (err: unknown) {
        if (!isSubscribed) return;
        setError(getErrorMessage(err));
      } finally {
        if (isSubscribed) {
          setLoading(false);
        }
      }
    };

    fetchPrograms();

    return () => {
      isSubscribed = false;
    };
  }, [memberId, page, statusFilter, isValidMemberId, perPage]);

  const getErrorMessage = (err: unknown): string => {
    if (err instanceof ContractValidationError) {
      return err.message;
    }
    if (err instanceof ApiError) {
      if (err.code === "TRAINER_PROFILE_NOT_LINKED") {
        return "Aktif eğitmen profiliniz hesabınıza bağlanmamış.";
      }
      if (err.status === 403 || err.code === "FORBIDDEN") {
        return "Bu alana erişim yetkiniz yok.";
      }
      if (err.status === 404 || err.code === "NOT_FOUND") {
        return "Üye bulunamadı veya bu üyeye erişim yetkiniz yok.";
      }
      if (err.status === 422 || err.code === "VALIDATION_ERROR") {
        return err.message || "Geçersiz istek parametresi.";
      }
      return "Programlar yüklenirken bir hata oluştu.";
    } else if (err instanceof Error) {
      return err.message;
    }
    return "Programlar yüklenirken bir hata oluştu.";
  };

  const handleStatusChange = (val: string) => {
    if (val === "all" || isTrainingProgramStatus(val)) {
      setStatusFilter(val);
      setPage(1);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "draft":
        return <span className="px-2 py-0.5 rounded text-xs bg-yellow-500/10 text-yellow-400 border border-yellow-500/20">Taslak</span>;
      case "active":
        return <span className="px-2 py-0.5 rounded text-xs bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">Aktif</span>;
      case "archived":
        return <span className="px-2 py-0.5 rounded text-xs bg-white/10 text-white/60 border border-white/10">Arşivlendi</span>;
      default:
        return <span className="px-2 py-0.5 rounded text-xs bg-white/5 text-white/50">{status}</span>;
    }
  };

  if (!isValidMemberId) {
    return <div className="text-red-500 p-4">Geçersiz üye ID'si.</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3 sm:gap-4 w-full sm:w-auto">
          <Link
            to={`/admin/my-members/${memberId}`}
            className="min-h-[44px] min-w-[44px] flex items-center justify-center p-2 bg-[#121212] border border-white/10 rounded-lg hover:bg-white/5 transition text-white/70 hover:text-white shrink-0"
            aria-label="Üye detayına dön"
            title="Üye Detayına Dön"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div className="min-w-0 flex-1">
            <h1 className="text-xl sm:text-2xl font-bold truncate">Antrenman Programları</h1>
            <p className="text-white/50 text-xs sm:text-sm mt-0.5 truncate">
              Üyenize ait antrenman programları listesi
            </p>
          </div>
        </div>

        <Link
          to={`/admin/my-members/${memberId}/training-programs/new`}
          className="w-full sm:w-auto min-h-[44px] flex items-center justify-center gap-2 px-4 py-2 bg-white text-black text-sm font-medium rounded-lg hover:bg-white/90 transition shrink-0 shadow-sm"
        >
          <Plus className="w-4 h-4" />
          Yeni Program
        </Link>
      </div>

      <TrainerMemberWorkspaceNav memberId={memberId} active="programs" />

      <div className="flex flex-wrap gap-4 bg-[#121212] p-4 rounded-xl border border-white/10">
        <div className="space-y-1.5 w-full sm:w-64">
          <label className="text-xs text-white/50 font-medium uppercase tracking-wider">Durum</label>
          <select
            value={statusFilter}
            onChange={(e) => handleStatusChange(e.target.value)}
            className="w-full min-h-[44px] bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-base sm:text-sm focus:outline-none focus:border-white/30 transition-colors"
          >
            <option value="all">Tümü</option>
            <option value="draft">Taslak</option>
            <option value="active">Aktif</option>
            <option value="archived">Tamamlandı/Arşivlendi</option>
          </select>
        </div>
      </div>

      {error ? (
        <div className="bg-red-500/10 border border-red-500/20 text-red-500 p-4 rounded-xl text-sm">
          {error}
        </div>
      ) : loading ? (
        <div className="text-white/50 p-4">Yükleniyor...</div>
      ) : items.length === 0 ? (
        <div className="text-center py-12 bg-[#121212] border border-white/10 rounded-xl">
          <p className="text-white/50 text-sm">Kayıt bulunamadı.</p>
        </div>
      ) : (
        <div className="bg-[#121212] border border-white/10 rounded-xl overflow-hidden shadow-sm">
          {/* Mobile Cards (< lg) */}
          <div className="lg:hidden divide-y divide-white/10">
            {items.map((item) => (
              <Link
                key={item.id}
                to={`/admin/my-members/${memberId}/training-programs/${item.id}`}
                className="block p-4 hover:bg-white/[0.03] transition space-y-3"
              >
                <div className="flex items-start justify-between gap-2">
                  <h3 className="font-semibold text-white text-base leading-snug line-clamp-2">
                    {item.title}
                  </h3>
                  <div className="shrink-0 pt-0.5">
                    {getStatusBadge(item.status)}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs text-white/70 bg-white/[0.02] p-2.5 rounded-lg border border-white/5">
                  <div>
                    <span className="text-white/40 block text-[10px] uppercase font-medium">Başlangıç</span>
                    <span className="mt-0.5 block font-medium">{item.start_date || "-"}</span>
                  </div>
                  <div>
                    <span className="text-white/40 block text-[10px] uppercase font-medium">Bitiş</span>
                    <span className="mt-0.5 block font-medium">{item.end_date || "-"}</span>
                  </div>
                </div>

                <div className="flex items-center justify-between text-xs text-white/50 pt-1">
                  <span>Oluşturulma: {new Date(item.created_at).toLocaleDateString("tr-TR")}</span>
                  <span className="inline-flex items-center gap-1 text-white font-medium">
                    <Edit2 className="w-3.5 h-3.5" />
                    Düzenle
                  </span>
                </div>
              </Link>
            ))}
          </div>

          {/* Desktop Table (>= lg) */}
          <div className="hidden lg:block overflow-x-auto">
            <table className="w-full text-left text-sm whitespace-nowrap">
              <thead className="bg-white/5 border-b border-white/10">
                <tr>
                  <th className="px-4 py-3 font-medium text-white/70">Başlık</th>
                  <th className="px-4 py-3 font-medium text-white/70">Durum</th>
                  <th className="px-4 py-3 font-medium text-white/70">Başlangıç</th>
                  <th className="px-4 py-3 font-medium text-white/70">Bitiş</th>
                  <th className="px-4 py-3 font-medium text-white/70">Oluşturulma</th>
                  <th className="px-4 py-3 font-medium text-white/70 text-right">İşlemler</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/10">
                {items.map((item) => (
                  <tr key={item.id} className="hover:bg-white/[0.02] transition">
                    <td className="px-4 py-3 font-medium">{item.title}</td>
                    <td className="px-4 py-3">{getStatusBadge(item.status)}</td>
                    <td className="px-4 py-3 text-white/70">{item.start_date || "-"}</td>
                    <td className="px-4 py-3 text-white/70">{item.end_date || "-"}</td>
                    <td className="px-4 py-3 text-white/50 text-xs">
                      {new Date(item.created_at).toLocaleDateString("tr-TR")}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Link
                        to={`/admin/my-members/${memberId}/training-programs/${item.id}`}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white/5 hover:bg-white/10 text-white rounded text-xs font-medium transition"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                        Düzenle
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {lastPage > 1 && (
            <div className="flex flex-col sm:flex-row items-center justify-between p-4 border-t border-white/10 gap-3 text-sm">
              <span className="text-white/50 text-xs sm:text-sm text-center sm:text-left">
                Toplam {total} kayıttan {(page - 1) * perPage + 1}-
                {Math.min(page * perPage, total)} arası gösteriliyor
              </span>
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <button
                  type="button"
                  disabled={page === 1}
                  onClick={() => setPage((p) => p - 1)}
                  className="flex-1 sm:flex-initial min-h-[44px] px-4 py-2 bg-white/5 hover:bg-white/10 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg text-sm font-medium transition text-center"
                >
                  Önceki
                </button>
                <button
                  type="button"
                  disabled={page === lastPage}
                  onClick={() => setPage((p) => p + 1)}
                  className="flex-1 sm:flex-initial min-h-[44px] px-4 py-2 bg-white/5 hover:bg-white/10 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg text-sm font-medium transition text-center"
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
