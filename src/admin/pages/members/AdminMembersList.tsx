import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Plus, Pen, Search, RotateCcw } from "lucide-react";
import { apiClient, ApiError } from "../../api/client";
import { Member, MembersResponse } from "./types";
import { AdminTrainerListItem } from "../trainers/types";

export function AdminMembersList() {
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Pagination and filters
  const [q, setQ] = useState("");
  const [status, setStatus] = useState<"all" | "active" | "inactive">("all");
  const [deleted, setDeleted] = useState<"active" | "deleted" | "all">("active");
  const [trainerId, setTrainerId] = useState<string>("all");
  const [page, setPage] = useState(1);
  const [paginationInfo, setPaginationInfo] = useState({ total: 0, last_page: 1 });
  const [trainers, setTrainers] = useState<AdminTrainerListItem[]>([]);

  // Debounced search
  const [debouncedQ, setDebouncedQ] = useState("");

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQ(q);
      setPage(1); // Reset page on search
    }, 500);
    return () => clearTimeout(timer);
  }, [q]);

  useEffect(() => {
    fetchMembers();
  }, [debouncedQ, status, deleted, trainerId, page]);

  useEffect(() => {
    fetchTrainers();
  }, []);

  const fetchTrainers = async () => {
    try {
      const data = await apiClient.get('/api/admin/trainers') as AdminTrainerListItem[];
      setTrainers(data);
    } catch (err) {
      console.error("Eğitmenler yüklenemedi", err);
    }
  };

  const handleFilterChange = () => {
    setPage(1);
  };

  const fetchMembers = async () => {
    try {
      setLoading(true);
      
      const params = new URLSearchParams();
      if (debouncedQ) params.append('q', debouncedQ);
      if (status !== 'all') params.append('status', status);
      if (trainerId !== 'all') params.append('trainer_id', trainerId);
      params.append('deleted', deleted);
      params.append('page', page.toString());
      
      const data = await apiClient.get(`/api/admin/members?${params.toString()}`) as MembersResponse;
      setMembers(data.items);
      setPaginationInfo({
        total: data.pagination.total,
        last_page: data.pagination.last_page
      });
      setError(null);
    } catch (err: unknown) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError("Üyeler yüklenirken bir hata oluştu.");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleRestore = async (id: number) => {
    if (!window.confirm("Bu üyeyi geri yüklemek istediğinize emin misiniz?")) return;
    try {
      await apiClient.post(`/api/admin/members/${id}/restore`, {});
      fetchMembers();
    } catch (err: unknown) {
      if (err instanceof ApiError) {
        alert("Üye geri yüklenemedi: " + err.message);
      } else {
        alert("Üye geri yüklenemedi.");
      }
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold mb-1">Üyeler</h2>
          <p className="text-sm text-white/50">Kulüp üyelerini, üyelik durumlarını ve profil bilgilerini yönetin.</p>
        </div>
        <div className="flex gap-3">
          <Link
            to="/admin/members/new"
            className="flex items-center gap-2 px-4 py-2 bg-white text-black text-sm font-medium rounded hover:bg-white/90 transition"
          >
            <Plus className="w-4 h-4" />
            Yeni Üye
          </Link>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
          <input
            type="text"
            placeholder="Ad, soyad, telefon veya e-posta ile ara..."
            value={q}
            onChange={(e) => setQ(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-[#121212] border border-white/10 rounded-lg text-sm focus:outline-none focus:border-white/20 transition-colors placeholder:text-white/30"
          />
        </div>
        <div className="flex flex-wrap gap-2">
          <select
            value={status}
            onChange={(e) => {
              setStatus(e.target.value as any);
              handleFilterChange();
            }}
            className="bg-[#121212] border border-white/10 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-white/20"
          >
            <option value="all">Tüm Durumlar</option>
            <option value="active">Aktif Üyeler</option>
            <option value="inactive">Pasif Üyeler</option>
          </select>
          <select
            value={trainerId}
            onChange={(e) => {
              setTrainerId(e.target.value);
              handleFilterChange();
            }}
            className="bg-[#121212] border border-white/10 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-white/20"
          >
            <option value="all">Tüm Eğitmenler</option>
            {trainers.map(t => (
              <option key={t.id} value={t.id.toString()}>{t.name}</option>
            ))}
          </select>
          <select
            value={deleted}
            onChange={(e) => {
              setDeleted(e.target.value as any);
              handleFilterChange();
            }}
            className="bg-[#121212] border border-white/10 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-white/20"
          >
            <option value="active">Aktif Kayıtlar</option>
            <option value="deleted">Arşivdekiler</option>
            <option value="all">Tümü</option>
          </select>
        </div>
      </div>

      {error ? (
        <div className="bg-red-500/10 border border-red-500/20 text-red-500 p-4 rounded text-sm">
          {error}
        </div>
      ) : (
        <div className="bg-[#121212] border border-white/10 rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-xs uppercase bg-white/5 text-white/40">
                <tr>
                  <th className="px-6 py-4 font-medium">Üye Bilgisi</th>
                  <th className="px-6 py-4 font-medium">İletişim</th>
                  <th className="px-6 py-4 font-medium">Eğitmen</th>
                  <th className="px-6 py-4 font-medium">Üyelik Tarihleri</th>
                  <th className="px-6 py-4 font-medium">Durum</th>
                  <th className="px-6 py-4 font-medium text-right">İşlemler</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {loading ? (
                   <tr>
                     <td colSpan={6} className="px-6 py-8 text-center text-white/50">
                       Yükleniyor...
                     </td>
                   </tr>
                ) : members.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-8 text-center text-white/50">
                      Sonuç bulunamadı.
                    </td>
                  </tr>
                ) : (
                  members.map((member) => (
                    <tr key={member.id} className={`hover:bg-white/[0.02] transition-colors ${member.deleted_at ? 'opacity-50' : ''}`}>
                      <td className="px-6 py-4 font-medium">
                        {member.first_name} {member.last_name}
                      </td>
                      <td className="px-6 py-4 text-white/70">
                        <div>{member.phone}</div>
                        {member.email && <div className="text-xs text-white/40">{member.email}</div>}
                      </td>
                      <td className="px-6 py-4 text-white/70">
                        {member.trainer ? member.trainer.name : '-'}
                      </td>
                      <td className="px-6 py-4 text-white/70 text-xs">
                        {member.membership_start_date || '-'} <br/>
                        {member.membership_end_date || '-'}
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`px-2 py-1 text-[10px] font-medium uppercase tracking-wider rounded ${
                            member.status === 'active'
                              ? 'bg-emerald-500/10 text-emerald-500'
                              : 'bg-white/10 text-white/50'
                          }`}
                        >
                          {member.status === 'active' ? 'Aktif' : 'Pasif'}
                        </span>
                        {member.deleted_at && (
                          <span className="ml-2 px-2 py-1 text-[10px] font-medium uppercase tracking-wider rounded bg-red-500/10 text-red-500">
                            Arşiv
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          {member.deleted_at ? (
                            <button
                              onClick={() => handleRestore(member.id)}
                              className="p-2 text-white/40 hover:text-white transition"
                              title="Geri Yükle"
                            >
                              <RotateCcw className="w-4 h-4" />
                            </button>
                          ) : (
                            <Link
                              to={`/admin/members/${member.id}`}
                              className="p-2 text-white/40 hover:text-white transition"
                              title="Düzenle"
                            >
                              <Pen className="w-4 h-4" />
                            </Link>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          
          {/* Pagination */}
          {!loading && paginationInfo.last_page > 1 && (
            <div className="px-6 py-4 border-t border-white/5 flex items-center justify-between text-sm">
              <div className="text-white/50">
                Toplam {paginationInfo.total} kayıt
              </div>
              <div className="flex gap-2">
                <button
                  disabled={page === 1}
                  onClick={() => setPage(p => p - 1)}
                  className="px-3 py-1 bg-white/5 hover:bg-white/10 rounded disabled:opacity-50"
                >
                  Önceki
                </button>
                <span className="px-3 py-1">
                  {page} / {paginationInfo.last_page}
                </span>
                <button
                  disabled={page === paginationInfo.last_page}
                  onClick={() => setPage(p => p + 1)}
                  className="px-3 py-1 bg-white/5 hover:bg-white/10 rounded disabled:opacity-50"
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
