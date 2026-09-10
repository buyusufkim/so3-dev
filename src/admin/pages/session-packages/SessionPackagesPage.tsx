import { useState, useEffect, useRef } from "react";
import { Plus, Search, Edit2 } from "lucide-react";
import { apiClient } from "../../api/client";
import { SessionPackage, SessionPackageListResponse, validateSessionPackageListResponse } from "./types";

export function SessionPackagesPage() {
  const [data, setData] = useState<SessionPackageListResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  
  const [q, setQ] = useState("");
  const [status, setStatus] = useState<"all" | "active" | "inactive">("all");
  const [page, setPage] = useState(1);
  const perPage = 20;

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPackage, setEditingPackage] = useState<SessionPackage | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    session_count: 12,
    validity_days: 30 as number | null,
    status: "active" as "active" | "inactive"
  });
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");

  const formRef = useRef<HTMLFormElement>(null);

  const fetchPackages = async () => {
    setIsLoading(true);
    setError("");
    try {
      const query = new URLSearchParams();
      if (q) query.set("q", q);
      if (status !== "all") query.set("status", status);
      query.set("page", page.toString());
      query.set("per_page", perPage.toString());

      const res = await apiClient.get(`/api/admin/session-packages?${query.toString()}`);
      if (!validateSessionPackageListResponse(res)) {
        throw new Error("Invalid response format from server");
      }
      setData(res);
    } catch (err: any) {
      setError(err.message || "Paketler yüklenirken hata oluştu");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchPackages();
  }, [q, status, page]);

  const handleOpenModal = (pkg?: SessionPackage) => {
    if (pkg) {
      setEditingPackage(pkg);
      setFormData({
        name: pkg.name,
        session_count: pkg.session_count,
        validity_days: pkg.validity_days,
        status: pkg.status
      });
    } else {
      setEditingPackage(null);
      setFormData({
        name: "",
        session_count: 12,
        validity_days: 30,
        status: "active"
      });
    }
    setSubmitError("");
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingPackage(null);
    setSubmitError("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    setIsSubmitting(true);
    setSubmitError("");

    try {
      const payload = {
        name: formData.name.trim(),
        session_count: Number(formData.session_count),
        validity_days: formData.validity_days === null || formData.validity_days === "" as unknown as number ? null : Number(formData.validity_days),
        status: formData.status
      };

      if (editingPackage) {
        await apiClient.patch(`/api/admin/session-packages/${editingPackage.id}`, payload);
      } else {
        await apiClient.post(`/api/admin/session-packages`, payload);
      }

      handleCloseModal();
      fetchPackages();
    } catch (err: any) {
      setSubmitError(err.message || "İşlem sırasında hata oluştu");
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatDate = (dateStr: string) => {
    try {
      const [datePart] = dateStr.split(" ");
      const [year, month, day] = datePart.split("-");
      return `${day}.${month}.${year}`;
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-semibold">Seans Paketleri</h2>
        <button
          onClick={() => handleOpenModal()}
          className="bg-white text-black px-4 py-2 rounded text-sm font-medium hover:bg-gray-200 transition flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          Yeni Seans Paketi
        </button>
      </div>

      <div className="bg-[#121212] border border-white/10 rounded-lg p-4 flex gap-4">
        <div className="flex-1 relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-white/50" />
          <input
            type="text"
            placeholder="Paket ara..."
            value={q}
            onChange={(e) => {
              setQ(e.target.value);
              setPage(1);
            }}
            className="w-full bg-[#1a1a1a] border border-white/10 rounded pl-9 pr-3 py-2 text-sm focus:outline-none focus:border-white/30"
          />
        </div>
        <select
          value={status}
          onChange={(e) => {
            setStatus(e.target.value as any);
            setPage(1);
          }}
          className="bg-[#1a1a1a] border border-white/10 rounded px-3 py-2 text-sm focus:outline-none focus:border-white/30"
        >
          <option value="all">Tümü</option>
          <option value="active">Aktif</option>
          <option value="inactive">Pasif</option>
        </select>
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-4 rounded text-sm">
          {error}
        </div>
      )}

      {isLoading ? (
        <div className="text-center py-12 text-white/50">Yükleniyor...</div>
      ) : (
        <div className="bg-[#121212] border border-white/10 rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm whitespace-nowrap">
              <thead className="bg-[#1a1a1a] text-white/60">
                <tr>
                  <th className="px-6 py-4 font-medium">Paket Adı</th>
                  <th className="px-6 py-4 font-medium">Seans</th>
                  <th className="px-6 py-4 font-medium">Geçerlilik</th>
                  <th className="px-6 py-4 font-medium">Durum</th>
                  <th className="px-6 py-4 font-medium">Güncellenme</th>
                  <th className="px-6 py-4 font-medium">İşlem</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/10">
                {data?.items.map((pkg) => (
                  <tr key={pkg.id} className="hover:bg-white/5 transition">
                    <td className="px-6 py-4">{pkg.name}</td>
                    <td className="px-6 py-4">{pkg.session_count} Seans</td>
                    <td className="px-6 py-4">
                      {pkg.validity_days ? `${pkg.validity_days} Gün` : "Süre Sınırı Yok"}
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${
                          pkg.status === "active"
                            ? "bg-green-500/10 text-green-400"
                            : "bg-red-500/10 text-red-400"
                        }`}
                      >
                        {pkg.status === "active" ? "Aktif" : "Pasif"}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-white/60">
                      {formatDate(pkg.updated_at)}
                    </td>
                    <td className="px-6 py-4">
                      <button
                        onClick={() => handleOpenModal(pkg)}
                        className="text-white/60 hover:text-white transition flex items-center gap-1"
                      >
                        <Edit2 className="w-4 h-4" />
                        <span>Düzenle</span>
                      </button>
                    </td>
                  </tr>
                ))}
                {data?.items.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-6 py-8 text-center text-white/50">
                      Paket bulunamadı.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {data && data.pagination.total_pages > 1 && (
            <div className="border-t border-white/10 p-4 flex items-center justify-between text-sm">
              <div className="text-white/60">
                Toplam {data.pagination.total_items} paket
              </div>
              <div className="flex items-center gap-4">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="px-3 py-1 bg-white/5 rounded hover:bg-white/10 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Önceki
                </button>
                <span className="text-white/80">
                  {data.pagination.current_page} / {data.pagination.total_pages}
                </span>
                <button
                  onClick={() => setPage((p) => Math.min(data.pagination.total_pages, p + 1))}
                  disabled={page === data.pagination.total_pages}
                  className="px-3 py-1 bg-white/5 rounded hover:bg-white/10 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Sonraki
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Create / Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
          <div className="bg-[#121212] border border-white/10 rounded-lg w-full max-w-md">
            <div className="px-6 py-4 border-b border-white/10 flex justify-between items-center">
              <h3 className="text-lg font-medium">
                {editingPackage ? "Paketi Düzenle" : "Yeni Seans Paketi"}
              </h3>
              <button
                onClick={handleCloseModal}
                className="text-white/50 hover:text-white"
              >
                ✕
              </button>
            </div>

            <form ref={formRef} onSubmit={handleSubmit} className="p-6 space-y-4">
              {submitError && (
                <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-3 rounded text-sm">
                  {submitError}
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-white/80 mb-1">
                  Paket Adı
                </label>
                <input
                  type="text"
                  required
                  maxLength={150}
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full bg-[#1a1a1a] border border-white/10 rounded px-3 py-2 text-sm focus:outline-none focus:border-white/30"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-white/80 mb-1">
                  Seans Sayısı
                </label>
                <input
                  type="number"
                  required
                  min="1"
                  value={formData.session_count}
                  onChange={(e) => setFormData({ ...formData, session_count: Number(e.target.value) })}
                  className="w-full bg-[#1a1a1a] border border-white/10 rounded px-3 py-2 text-sm focus:outline-none focus:border-white/30"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-white/80 mb-1">
                  Geçerlilik Süresi (Gün) <span className="text-white/40 text-xs">- Sınırsız ise boş bırakın</span>
                </label>
                <input
                  type="number"
                  min="1"
                  value={formData.validity_days || ""}
                  onChange={(e) => setFormData({ ...formData, validity_days: e.target.value ? Number(e.target.value) : null })}
                  className="w-full bg-[#1a1a1a] border border-white/10 rounded px-3 py-2 text-sm focus:outline-none focus:border-white/30"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-white/80 mb-1">
                  Durum
                </label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                  className="w-full bg-[#1a1a1a] border border-white/10 rounded px-3 py-2 text-sm focus:outline-none focus:border-white/30"
                >
                  <option value="active">Aktif</option>
                  <option value="inactive">Pasif</option>
                </select>
                {formData.status === "inactive" && (
                  <p className="mt-2 text-xs text-yellow-500/80">
                    Bu paket yeni üyelere atanamaz hale gelecek. Daha önce atanmış paketler etkilenmez.
                  </p>
                )}
              </div>

              <div className="pt-4 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={handleCloseModal}
                  className="px-4 py-2 text-sm rounded bg-white/5 hover:bg-white/10 transition"
                  disabled={isSubmitting}
                >
                  İptal
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 text-sm font-medium rounded bg-white text-black hover:bg-gray-200 transition disabled:opacity-50"
                >
                  {isSubmitting ? "Kaydediliyor..." : "Kaydet"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
