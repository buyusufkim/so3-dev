import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Plus, Search, Edit2, Trash2, Eye, Filter, RefreshCcw, MoreVertical, CheckCircle2 } from "lucide-react";
import { apiClient } from "../../api/client";

interface EventItem {
  id: number;
  title: string;
  category_name: string;
  status: 'draft' | 'published' | 'archived';
  event_date: string | null;
  featured_on_home: boolean | number;
  updated_at: string;
  cover_thumbnail_url: string | null;
  cover_url: string | null;
  deleted_at: string | null;
}

export function AdminEventsList() {
  const [events, setEvents] = useState<EventItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [deleted, setDeleted] = useState("false");
  const [category, setCategory] = useState("");
  const [featured, setFeatured] = useState("");
  const [categories, setCategories] = useState<{id: number, name: string}[]>([]);

  useEffect(() => {
    apiClient.get('/api/admin/event-categories').then(res => setCategories(res.data)).catch(() => {});
  }, []);

  
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const fetchEvents = async () => {
    try {
      setLoading(true);
      const res = await apiClient.get(`/api/admin/events?page=${page}&limit=20&search=${encodeURIComponent(search)}&status=${status}&deleted=${deleted}&category=${category}&featured=${featured}`);
      setEvents(res.data);
      setTotalPages(res.meta?.total_pages || 1);
    } catch (err) {
      // API call failed
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEvents();
  }, [page, search, status, deleted, category, featured]);

  const handleDelete = async (id: number) => {
    if (!confirm('Bu etkinliği silmek istediğinize emin misiniz?')) return;
    try {
      await apiClient.delete(`/api/admin/events/${id}`);
      fetchEvents();
    } catch (err) {
      alert('Silinemedi.');
    }
  };

  const handleRestore = async (id: number) => {
    try {
      await apiClient.post(`/api/admin/events/${id}/restore`, {});
      fetchEvents();
    } catch (err) {
      alert('Geri yüklenemedi.');
    }
  };

  const getStatusBadge = (status: string, deletedAt: string | null) => {
    if (deletedAt) return <span className="px-2 py-1 rounded text-[10px] font-medium uppercase tracking-wider bg-red-500/10 text-red-500 border border-red-500/20">Silindi</span>;
    if (status === 'published') return <span className="px-2 py-1 rounded text-[10px] font-medium uppercase tracking-wider bg-white text-black">Yayında</span>;
    if (status === 'draft') return <span className="px-2 py-1 rounded text-[10px] font-medium uppercase tracking-wider bg-white/10 text-white/70 border border-white/20">Taslak</span>;
    if (status === 'archived') return <span className="px-2 py-1 rounded text-[10px] font-medium uppercase tracking-wider bg-[#851C35]/20 text-[#851C35] border border-[#851C35]/30">Arşivde</span>;
    return null;
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-semibold text-white">Etkinlikler</h2>
          <p className="text-sm text-white/50 mt-1">Etkinliklerinizi yönetin.</p>
        </div>
        <Link 
          to="/admin/events/new" 
          className="flex items-center space-x-2 bg-white text-black px-4 py-2 rounded text-sm font-medium hover:bg-white/90 transition"
        >
          <Plus className="w-4 h-4" />
          <span>Yeni Etkinlik</span>
        </Link>
      </div>

      <div className="bg-[#121212] border border-white/10 rounded-xl overflow-hidden flex flex-col">
        <div className="p-4 border-b border-white/10 flex flex-wrap gap-4 items-center bg-[#1a1a1a]">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
            <input 
              type="text" 
              placeholder="Etkinlik ara..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              className="w-full bg-black/20 border border-white/10 rounded pl-10 pr-4 py-2 text-sm text-white focus:outline-none focus:border-white/30"
            />
          </div>
          
          <select 
            value={category}
            onChange={(e) => { setCategory(e.target.value); setPage(1); }}
            className="bg-black/20 border border-white/10 rounded px-3 py-2 text-sm text-white focus:outline-none focus:border-white/30 appearance-none min-w-[120px]"
          >
            <option value="">Tüm Kategoriler</option>
            {categories.map(c => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>

          <select 
            value={featured}
            onChange={(e) => { setFeatured(e.target.value); setPage(1); }}
            className="bg-black/20 border border-white/10 rounded px-3 py-2 text-sm text-white focus:outline-none focus:border-white/30 appearance-none min-w-[120px]"
          >
            <option value="">Tüm Vitrin</option>
            <option value="1">Vitrinde</option>
            <option value="0">Vitrinde Değil</option>
          </select>
          <select 
            value={status}
            onChange={(e) => { setStatus(e.target.value); setPage(1); }}
            className="bg-black/20 border border-white/10 rounded px-3 py-2 text-sm text-white focus:outline-none focus:border-white/30 appearance-none min-w-[120px]"
          >
            <option value="">Tüm Durumlar</option>
            <option value="published">Yayında</option>
            <option value="draft">Taslak</option>
            <option value="archived">Arşivde</option>
          </select>

          <select 
            value={deleted}
            onChange={(e) => { setDeleted(e.target.value); setPage(1); }}
            className="bg-black/20 border border-white/10 rounded px-3 py-2 text-sm text-white focus:outline-none focus:border-white/30 appearance-none min-w-[120px]"
          >
            <option value="false">Aktifler</option>
            <option value="true">Silinmişler</option>
          </select>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-[#1a1a1a] text-white/50 uppercase tracking-wider text-[10px] border-b border-white/10">
              <tr>
                <th className="px-6 py-4 font-medium">Etkinlik</th>
                <th className="px-6 py-4 font-medium">Kategori</th>
                <th className="px-6 py-4 font-medium">Tarih</th>
                <th className="px-6 py-4 font-medium">Son Güncelleme</th>
                <th className="px-6 py-4 font-medium">Durum</th>
                <th className="px-6 py-4 font-medium">Vitrin</th>
                <th className="px-6 py-4 font-medium text-right">İşlemler</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {loading && events.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-white/50">
                    <div className="flex justify-center"><div className="w-6 h-6 border-2 border-white/20 border-t-white/80 rounded-full animate-spin" /></div>
                  </td>
                </tr>
              ) : events.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-white/50">
                    Henüz etkinlik oluşturulmamış.
                  </td>
                </tr>
              ) : (
                events.map(event => (
                  <tr key={event.id} className="hover:bg-white/5 transition group">
                    <td className="px-6 py-4">
                      <div className="flex items-center space-x-3">
                        <div className="w-12 h-12 bg-black/40 rounded overflow-hidden flex-shrink-0 border border-white/10">
                          {event.cover_thumbnail_url || event.cover_url ? (
                            <img src={event.cover_thumbnail_url || event.cover_url!} alt={event.title} className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-white/20"><Eye className="w-4 h-4" /></div>
                          )}
                        </div>
                        <div className="max-w-[200px] truncate font-medium text-white/90">
                          {event.title}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-white/70">
                      {event.category_name}
                    </td>
                    <td className="px-6 py-4 text-white/70">
                      {event.event_date ? new Date(event.event_date).toLocaleDateString('tr-TR') : '-'}
                    </td>
                    <td className="px-6 py-4 text-white/70">
                      {event.updated_at ? new Date(event.updated_at).toLocaleString('tr-TR', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '-'}
                    </td>
                    <td className="px-6 py-4">
                      {getStatusBadge(event.status, event.deleted_at)}
                    </td>
                    <td className="px-6 py-4">
                      {event.featured_on_home ? (
                        <CheckCircle2 className="w-4 h-4 text-green-400" />
                      ) : '-'}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end space-x-2">
                        {event.deleted_at ? (
                          <button 
                            onClick={() => handleRestore(event.id)}
                            className="p-2 text-white/50 hover:text-white hover:bg-white/10 rounded transition"
                            title="Geri Yükle"
                          >
                            <RefreshCcw className="w-4 h-4" />
                          </button>
                        ) : (
                          <>
                            <Link 
                              to={`/admin/events/${event.id}`}
                              className="p-2 text-white/50 hover:text-white hover:bg-white/10 rounded transition"
                              title="Düzenle"
                            >
                              <Edit2 className="w-4 h-4" />
                            </Link>
                            <button 
                              onClick={() => handleDelete(event.id)}
                              className="p-2 text-white/50 hover:text-red-400 hover:bg-red-400/10 rounded transition"
                              title="Sil"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        
        {totalPages > 1 && (
          <div className="p-4 border-t border-white/10 flex items-center justify-between bg-[#1a1a1a]">
            <span className="text-xs text-white/50">Sayfa {page} / {totalPages}</span>
            <div className="flex space-x-1">
              <button 
                disabled={page === 1}
                onClick={() => setPage(p => p - 1)}
                className="px-3 py-1 bg-black/20 border border-white/10 rounded text-xs disabled:opacity-50 hover:bg-white/5"
              >Önceki</button>
              <button 
                disabled={page === totalPages}
                onClick={() => setPage(p => p + 1)}
                className="px-3 py-1 bg-black/20 border border-white/10 rounded text-xs disabled:opacity-50 hover:bg-white/5"
              >Sonraki</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
