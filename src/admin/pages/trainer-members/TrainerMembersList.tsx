import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { apiClient } from "../../api/client";
import { TrainerMemberListItem, TrainerMembersResponse, isTrainerMembersResponse } from "./types";
import { Search } from "lucide-react";

export function TrainerMembersList() {
  const [items, setItems] = useState<TrainerMemberListItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [perPage] = useState(20);
  const [lastPage, setLastPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [q, setQ] = useState("");
  const [debouncedQ, setDebouncedQ] = useState("");
  const [status, setStatus] = useState<"" | "active" | "inactive">("");

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQ(q);
      setPage(1); // Reset page on new search
    }, 500);
    return () => clearTimeout(timer);
  }, [q]);

  const fetchMembers = async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      params.append('page', page.toString());
      params.append('per_page', perPage.toString());
      if (status) params.append('status', status);
      if (debouncedQ) params.append('q', debouncedQ);

      const response = await apiClient.get(`/api/trainer/members?${params.toString()}`);
      if (isTrainerMembersResponse(response)) {
        setItems(response.items);
        setTotal(response.pagination.total);
        setLastPage(response.pagination.last_page);
      } else {
        throw new Error('Geçersiz sunucu yanıtı.');
      }
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Bilinmeyen bir hata oluştu.');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMembers();
  }, [page, perPage, debouncedQ, status]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold">Bana Atanan Üyeler</h2>
          <p className="text-white/50 text-sm mt-1">Sorumlu olduğunuz üyeleri listeleyebilir ve detaylarını görüntüleyebilirsiniz.</p>
        </div>
      </div>

      <div className="bg-[#121212] border border-white/10 rounded-lg p-4 flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
          <input
            type="text"
            placeholder="Üye ara (Ad, Soyad, Tel, E-posta)..."
            value={q}
            onChange={(e) => setQ(e.target.value)}
            className="w-full bg-[#1A1A1A] border border-white/10 rounded pl-10 pr-4 py-2 text-sm text-white focus:outline-none focus:border-[#851C35] transition"
          />
        </div>
        <div className="w-full sm:w-48">
          <select
            value={status}
            onChange={(e) => {
              setStatus(e.target.value as "" | "active" | "inactive");
              setPage(1);
            }}
            className="w-full bg-[#1A1A1A] border border-white/10 rounded px-3 py-2 text-sm text-white focus:outline-none focus:border-[#851C35] transition"
          >
            <option value="">Tüm Durumlar</option>
            <option value="active">Aktif</option>
            <option value="inactive">Pasif</option>
          </select>
        </div>
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-4 rounded text-sm">
          {error}
        </div>
      )}

      <div className="bg-[#121212] border border-white/10 rounded-lg overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="bg-white/5 border-b border-white/10">
            <tr>
              <th className="px-4 py-3 font-medium text-white/70">Üye</th>
              <th className="px-4 py-3 font-medium text-white/70">İletişim</th>
              <th className="px-4 py-3 font-medium text-white/70">Durum</th>
              <th className="px-4 py-3 font-medium text-white/70">Kayıt Tarihi</th>
              <th className="px-4 py-3 font-medium text-white/70">İşlem</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-white/50">
                  Yükleniyor...
                </td>
              </tr>
            ) : items.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-white/50">
                  Üye bulunamadı.
                </td>
              </tr>
            ) : (
              items.map((item) => (
                <tr key={item.id} className="border-b border-white/5 hover:bg-white/5 transition">
                  <td className="px-4 py-3">
                    <div className="font-medium">{item.first_name} {item.last_name}</div>
                    <div className="text-xs text-white/40 font-mono mt-0.5">{item.uuid}</div>
                  </td>
                  <td className="px-4 py-3">
                    <div>{item.phone}</div>
                    {item.email && <div className="text-xs text-white/50 mt-0.5">{item.email}</div>}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex px-2 py-1 rounded text-xs font-medium ${
                      item.status === 'active' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
                    }`}>
                      {item.status === 'active' ? 'Aktif' : 'Pasif'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-white/70">
                    {new Date(item.created_at).toLocaleDateString('tr-TR')}
                  </td>
                  <td className="px-4 py-3">
                    <Link
                      to={`/admin/my-members/${item.id}`}
                      className="text-[#851C35] hover:text-[#a02240] text-sm font-medium transition"
                    >
                      İncele
                    </Link>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {!loading && items.length > 0 && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-white/60">
          <div>
            Toplam <span className="text-white font-medium">{total}</span> kayıt bulundu.
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              className="px-3 py-1 bg-[#1A1A1A] border border-white/10 rounded disabled:opacity-50 hover:bg-white/5 transition"
            >
              Önceki
            </button>
            <span className="px-2">
              Sayfa {page} / {lastPage}
            </span>
            <button
              onClick={() => setPage(p => Math.min(lastPage, p + 1))}
              disabled={page === lastPage}
              className="px-3 py-1 bg-[#1A1A1A] border border-white/10 rounded disabled:opacity-50 hover:bg-white/5 transition"
            >
              Sonraki
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
