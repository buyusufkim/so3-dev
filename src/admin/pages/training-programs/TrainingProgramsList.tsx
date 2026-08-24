import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { ArrowLeft, Plus, Edit2, RotateCcw } from "lucide-react";
import { apiClient, ApiError } from "../../api/client";
import { TrainingProgramListItem, TrainingProgramsResponse, SuccessResponse } from "./types";

export function TrainingProgramsList() {
  const { memberId } = useParams<{ memberId: string }>();
  const navigate = useNavigate();

  // Validate memberId as positive canonical integer
  const isValidMemberId = /^[1-9]\d*$/.test(memberId || "");

  const [items, setItems] = useState<TrainingProgramListItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [lastPage, setLastPage] = useState(1);
  const [perPage] = useState(20);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [statusFilter, setStatusFilter] = useState<"all" | "draft" | "active" | "archived">("all");
  const [deletedFilter, setDeletedFilter] = useState<"active" | "deleted" | "all">("active");

  const isRestoring = useRef(false);

  useEffect(() => {
    if (!isValidMemberId) return;
    fetchPrograms();
  }, [memberId, page, statusFilter, deletedFilter]);

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
      query.set("deleted", deletedFilter);

      const res = await apiClient.get(`/api/admin/members/${memberId}/training-programs?${query.toString()}`) as TrainingProgramsResponse;
      setItems(res.items);
      setTotal(res.pagination.total);
      setLastPage(res.pagination.last_page);
    } catch (err: unknown) {
      if (err instanceof ApiError) {
        if (err.code === "NOT_FOUND") {
          setError("Üye bulunamadı.");
        } else {
          setError(err.message);
        }
      } else {
        setError("Programlar yüklenirken bir hata oluştu.");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = (val: "all" | "draft" | "active" | "archived") => {
    setStatusFilter(val);
    setPage(1);
  };

  const handleDeletedChange = (val: "active" | "deleted" | "all") => {
    setDeletedFilter(val);
    setPage(1);
  };

  const handleRestore = async (id: number) => {
    if (isRestoring.current) return;
    
    if (!window.confirm("Bu programı geri yüklemek istediğinize emin misiniz?")) {
      return;
    }

    isRestoring.current = true;
    try {
      const res = await apiClient.post(`/api/admin/training-programs/${id}/restore`, {}) as SuccessResponse;
      if (res && typeof res === 'object' && res.success) {
        alert("Program başarıyla geri yüklendi.");
        fetchPrograms();
      } else {
        throw new Error("Beklenmeyen yanıt formatı.");
      }
    } catch (err: unknown) {
      if (err instanceof ApiError) {
        alert(err.message);
      } else {
        alert("Geri yüklenirken bir hata oluştu.");
      }
    } finally {
      isRestoring.current = false;
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "draft": return "Taslak";
      case "active": return "Aktif";
      case "archived": return "Tamamlandı/Arşivlendi";
      default: return status;
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
            to={`/admin/members/${memberId}`}
            className="p-2 hover:bg-white/10 rounded-full transition"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold">Antrenman Programları</h1>
            <p className="text-white/50 text-sm mt-1">
              Bu üyeye ait antrenman programları
            </p>
          </div>
        </div>
        
        <Link
          to={`/admin/members/${memberId}/training-programs/new`}
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
            onChange={(e) => handleStatusChange(e.target.value as any)}
            className="w-full bg-white/5 border border-white/10 rounded px-3 py-1.5 text-sm focus:outline-none focus:border-white/30"
          >
            <option value="all">Tümü</option>
            <option value="draft">Taslak</option>
            <option value="active">Aktif</option>
            <option value="archived">Tamamlandı/Arşivlendi</option>
          </select>
        </div>
        <div className="space-y-1">
          <label className="text-xs text-white/50 font-medium uppercase">Silinme Durumu</label>
          <select
            value={deletedFilter}
            onChange={(e) => handleDeletedChange(e.target.value as any)}
            className="w-full bg-white/5 border border-white/10 rounded px-3 py-1.5 text-sm focus:outline-none focus:border-white/30"
          >
            <option value="active">Sadece Aktif Olanlar</option>
            <option value="deleted">Sadece Silinenler (Çöp Kutusu)</option>
            <option value="all">Tümü</option>
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
                  <th className="px-4 py-3 font-medium text-white/70">Eğitmen</th>
                  <th className="px-4 py-3 font-medium text-white/70">Başlangıç</th>
                  <th className="px-4 py-3 font-medium text-white/70">Bitiş</th>
                  <th className="px-4 py-3 font-medium text-white/70 text-right">İşlemler</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {items.map((item) => (
                  <tr key={item.id} className={`hover:bg-white/[0.02] transition ${item.deleted_at ? 'opacity-50' : ''}`}>
                    <td className="px-4 py-3">
                      <div className="font-medium">{item.title}</div>
                      {item.deleted_at && <div className="text-xs text-red-400 mt-1">Silinmiş</div>}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 rounded text-xs font-medium ${
                        item.status === 'active' ? 'bg-green-500/10 text-green-500' :
                        item.status === 'archived' ? 'bg-blue-500/10 text-blue-500' :
                        'bg-yellow-500/10 text-yellow-500'
                      }`}>
                        {getStatusLabel(item.status)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-white/70">
                      {item.trainer?.name || '-'}
                    </td>
                    <td className="px-4 py-3 text-white/70">
                      {item.start_date || '-'}
                    </td>
                    <td className="px-4 py-3 text-white/70">
                      {item.end_date || '-'}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {item.deleted_at ? (
                        <button
                          onClick={() => handleRestore(item.id)}
                          className="p-2 text-white/50 hover:text-white hover:bg-white/10 rounded transition inline-flex"
                          title="Geri Yükle"
                        >
                          <RotateCcw className="w-4 h-4" />
                        </button>
                      ) : (
                        <Link
                          to={`/admin/training-programs/${item.id}`}
                          className="p-2 text-white/50 hover:text-white hover:bg-white/10 rounded transition inline-flex"
                          title="Düzenle"
                        >
                          <Edit2 className="w-4 h-4" />
                        </Link>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {lastPage > 1 && (
            <div className="p-4 border-t border-white/10 flex items-center justify-between text-sm">
              <span className="text-white/50">
                Toplam {total} kayıttan {(page - 1) * perPage + 1}-{Math.min(page * perPage, total)} arası gösteriliyor.
              </span>
              <div className="flex gap-2">
                <button
                  disabled={page === 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  className="px-3 py-1 bg-white/5 hover:bg-white/10 disabled:opacity-50 disabled:hover:bg-white/5 rounded transition"
                >
                  Önceki
                </button>
                <button
                  disabled={page === lastPage}
                  onClick={() => setPage((p) => Math.min(lastPage, p + 1))}
                  className="px-3 py-1 bg-white/5 hover:bg-white/10 disabled:opacity-50 disabled:hover:bg-white/5 rounded transition"
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
