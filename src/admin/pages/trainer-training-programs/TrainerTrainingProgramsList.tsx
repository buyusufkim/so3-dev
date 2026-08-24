import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { ArrowLeft, Plus, Edit2 } from "lucide-react";
import { apiClient, ApiError } from "../../api/client";
import {
  TrainerTrainingProgramListItem,
  isTrainerTrainingProgramsResponse,
  isTrainingProgramStatus
} from "./types";

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
    fetchPrograms();
  }, [memberId, page, statusFilter]);

  const getErrorMessage = (err: unknown): string => {
    if (err instanceof ContractValidationError) {
      return err.message;
    }
    if (err instanceof ApiError) {
      if (err.code === "TRAINER_PROFILE_NOT_LINKED") {
        return "Aktif eğitmen profiliniz hesabınıza bağlanmamış.";
      }
      if (err.status === 404 || err.code === "NOT_FOUND") {
        return "Üye bulunamadı veya bu üyeye erişim yetkiniz yok.";
      }
      if (err.status === 403 || err.code === "FORBIDDEN") {
        return "Bu alana erişim yetkiniz yok.";
      }
      if (err.status === 422 || err.code === "VALIDATION_ERROR") {
        return err.message || "Doğrulama hatası.";
      }
      return "Programlar yüklenirken bir hata oluştu.";
    }
    return "Programlar yüklenirken bir hata oluştu.";
  };

  const fetchPrograms = async () => {
    try {
      setLoading(true);
      setError(null);

      const query = new URLSearchParams();
      query.set("page", page.toString());
      query.set("per_page", perPage.toString());

      if (statusFilter !== "all") {
        query.set("status", statusFilter);
      }

      const rawRes = await apiClient.get(`/api/trainer/members/${memberId}/training-programs?${query.toString()}`);
      if (!isTrainerTrainingProgramsResponse(rawRes)) {
        throw new ContractValidationError("Antrenman programı verisi doğrulanamadı.");
      }
      setItems(rawRes.items);
      setTotal(rawRes.pagination.total);
      setLastPage(rawRes.pagination.last_page);
    } catch (err: unknown) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
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
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link
            to={`/admin/my-members/${memberId}`}
            className="p-2 hover:bg-white/10 rounded-full transition text-white/70 hover:text-white"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold">Antrenman Programları</h1>
            <p className="text-white/50 text-sm mt-1">
              Üyenize ait antrenman programları listesi
            </p>
          </div>
        </div>

        <Link
          to={`/admin/my-members/${memberId}/training-programs/new`}
          className="flex items-center gap-2 px-4 py-2 bg-white text-black text-sm font-medium rounded hover:bg-white/90 transition"
        >
          <Plus className="w-4 h-4" />
          Yeni Program
        </Link>
      </div>

      <div className="flex flex-wrap gap-4 bg-[#121212] p-4 rounded-lg border border-white/10">
        <div className="space-y-1">
          <label className="text-xs text-white/50 font-medium uppercase">Durum</label>
          <select
            value={statusFilter}
            onChange={(e) => handleStatusChange(e.target.value)}
            className="w-full bg-white/5 border border-white/10 rounded px-3 py-1.5 text-sm focus:outline-none focus:border-white/30"
          >
            <option value="all">Tümü</option>
            <option value="draft">Taslak</option>
            <option value="active">Aktif</option>
            <option value="archived">Tamamlandı/Arşivlendi</option>
          </select>
        </div>
      </div>

      {error ? (
        <div className="bg-red-500/10 border border-red-500/20 text-red-500 p-4 rounded text-sm">
          {error}
        </div>
      ) : loading ? (
        <div className="text-white/50">Yükleniyor...</div>
      ) : items.length === 0 ? (
        <div className="text-center py-12 bg-[#121212] border border-white/10 rounded-lg">
          <p className="text-white/50">Kayıt bulunamadı.</p>
        </div>
      ) : (
        <div className="bg-[#121212] border border-white/10 rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
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
                        className="inline-flex items-center gap-1.5 px-3 py-1 bg-white/5 hover:bg-white/10 text-white rounded text-xs font-medium transition"
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
            <div className="flex items-center justify-between px-4 py-3 border-t border-white/10 text-sm">
              <span className="text-white/50">
                Toplam {total} kayıttan {(page - 1) * perPage + 1}-
                {Math.min(page * perPage, total)} arası gösteriliyor
              </span>
              <div className="flex gap-2">
                <button
                  disabled={page === 1}
                  onClick={() => setPage((p) => p - 1)}
                  className="px-3 py-1 bg-white/5 hover:bg-white/10 disabled:opacity-50 disabled:cursor-not-allowed rounded text-xs"
                >
                  Önceki
                </button>
                <button
                  disabled={page === lastPage}
                  onClick={() => setPage((p) => p + 1)}
                  className="px-3 py-1 bg-white/5 hover:bg-white/10 disabled:opacity-50 disabled:cursor-not-allowed rounded text-xs"
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
