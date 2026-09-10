import { useState, useEffect, useRef } from "react";
import { Plus, X, Search, Clock } from "lucide-react";
import { apiClient } from "../../api/client";
import { 
  MemberSessionPackage, 
  validateMemberSessionPackage, 
  MemberLedgerEntry, 
  validateMemberLedgerEntry 
} from "./types";
import { SessionPackage, SessionPackageListResponse, validateSessionPackageListResponse } from "../session-packages/types";

interface Props {
  memberId: number;
}

export function MemberSessionPackagesPanel({ memberId }: Props) {
  const [packages, setPackages] = useState<MemberSessionPackage[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [catalogPackages, setCatalogPackages] = useState<SessionPackage[]>([]);
  const [assignForm, setAssignForm] = useState({
    session_package_id: "",
    valid_from: new Date().toISOString().split('T')[0]
  });
  const [isAssigning, setIsAssigning] = useState(false);
  const isAssigningRef = useRef(false);
  const [assignError, setAssignError] = useState("");

  const [cancelModalPkg, setCancelModalPkg] = useState<MemberSessionPackage | null>(null);
  const [cancelReason, setCancelReason] = useState("");
  const [isCancelling, setIsCancelling] = useState(false);
  const isCancellingRef = useRef(false);
  const [cancelError, setCancelError] = useState("");

  const [ledgerModalPkg, setLedgerModalPkg] = useState<MemberSessionPackage | null>(null);
  const [ledgerEntries, setLedgerEntries] = useState<MemberLedgerEntry[]>([]);
  const [isLedgerLoading, setIsLedgerLoading] = useState(false);

  const fetchPackages = async () => {
    setIsLoading(true);
    setError("");
    try {
      const res = await apiClient.get(`/api/admin/members/${memberId}/session-packages`);
      if (!Array.isArray(res)) {
        throw new Error("Invalid response format");
      }
      const validPackages = res.filter(validateMemberSessionPackage);
      if (validPackages.length !== res.length) {
        throw new Error("Malformed package data received");
      }
      setPackages(validPackages);
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("Paketler yüklenirken hata oluştu");
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchPackages();
  }, [memberId]);

  const openAssignModal = async () => {
    setAssignError("");
    try {
      const res = await apiClient.get("/api/admin/session-packages?status=active&per_page=100");
      if (!validateSessionPackageListResponse(res)) {
         throw new Error("Paket kataloğu verisi doğrulanamadı.");
      }
      setCatalogPackages(res.items);
      
      const now = new Date();
      // YYYY-MM-DD
      const localDate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
      
      setAssignForm({
        session_package_id: "",
        valid_from: localDate
      });
      setIsAssignModalOpen(true);
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message); // Show in main error area instead of opening modal
      } else {
        setError("Katalog yüklenirken hata oluştu");
      }
      setCatalogPackages([]);
    }
  };

  const handleAssign = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isAssigningRef.current) return;
    
    const packageId = Number(assignForm.session_package_id);
    if (!Number.isFinite(packageId) || !Number.isInteger(packageId) || packageId <= 0) {
       setAssignError("Lütfen geçerli bir paket seçin.");
       return;
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(assignForm.valid_from)) {
       setAssignError("Lütfen geçerli bir başlangıç tarihi seçin.");
       return;
    }
    
    setAssignError("");
    setIsAssigning(true);
    isAssigningRef.current = true;
    
    try {
      const res = await apiClient.post(`/api/admin/members/${memberId}/session-packages`, {
        session_package_id: packageId,
        valid_from: assignForm.valid_from
      });
      
      if (!validateMemberSessionPackage(res)) {
         throw new Error("Sunucu geçersiz atama verisi döndürdü");
      }
      
      setIsAssignModalOpen(false);
      fetchPackages();
    } catch (err: any) {
      setAssignError(err.message || "Atama sırasında hata oluştu");
    } finally {
      setIsAssigning(false);
      isAssigningRef.current = false;
    }
  };

  const openCancelModal = (pkg: MemberSessionPackage) => {
    setCancelModalPkg(pkg);
    setCancelReason("");
    setCancelError("");
  };

  const handleCancel = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isCancellingRef.current || !cancelModalPkg) return;
    
    const trimmedReason = cancelReason.trim();
    if (trimmedReason.length === 0 || trimmedReason.length > 255) {
       setCancelError("Lütfen 1-255 karakter uzunluğunda bir iptal sebebi girin.");
       return;
    }
    
    setCancelError("");
    setIsCancelling(true);
    isCancellingRef.current = true;

    try {
      const res = await apiClient.post(`/api/admin/member-session-packages/${cancelModalPkg.id}/cancel`, {
        reason: trimmedReason
      });
      
      if (!validateMemberSessionPackage(res)) {
         throw new Error("Sunucu geçersiz paket iptal verisi döndürdü");
      }
      
      setCancelModalPkg(null);
      fetchPackages();
    } catch (err: any) {
      if (err.code === "PACKAGE_HAS_ACTIVE_RESERVATIONS") {
        setCancelError("Bu pakete bağlı aktif randevu rezervasyonları bulunduğu için paket iptal edilemez.");
      } else if (err.code === "CONFLICT") {
        setCancelError("Paket zaten iptal edilmiş olabilir.");
      } else if (err.code === "NOT_FOUND") {
        setCancelError("Paket bulunamadı.");
      } else {
        setCancelError(err.message || "İptal işlemi başarısız.");
      }
    } finally {
      setIsCancelling(false);
      isCancellingRef.current = false;
    }
  };

  const openLedgerModal = async (pkg: MemberSessionPackage) => {
    setLedgerModalPkg(pkg);
    setIsLedgerLoading(true);
    try {
      const res = await apiClient.get(`/api/admin/member-session-packages/${pkg.id}/ledger`);
      if (!Array.isArray(res)) throw new Error("Invalid response format");
      const validEntries = res.filter(validateMemberLedgerEntry);
      if (validEntries.length !== res.length) throw new Error("Malformed ledger data");
      setLedgerEntries(validEntries);
    } catch (err) {
      // Handle error gracefully
      setLedgerEntries([]);
    } finally {
      setIsLedgerLoading(false);
    }
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return "-";
    try {
      const [datePart] = dateStr.split(" ");
      const [year, month, day] = datePart.split("-");
      return `${day}.${month}.${year}`;
    } catch {
      return dateStr;
    }
  };
  
  const formatDateTime = (dateStr: string) => {
    try {
      const [datePart, timePart] = dateStr.split(" ");
      const [year, month, day] = datePart.split("-");
      const [hr, min] = timePart.split(":");
      return `${day}.${month}.${year} ${hr}:${min}`;
    } catch {
      return dateStr;
    }
  };

  const renderBadge = (status: string) => {
    switch (status) {
      case "active":
        return <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-green-500/10 text-green-400">Aktif</span>;
      case "exhausted":
        return <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-yellow-500/10 text-yellow-400">Hakkı Bitti</span>;
      case "expired":
        return <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-orange-500/10 text-orange-400">Süresi Doldu</span>;
      case "cancelled":
        return <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-red-500/10 text-red-400">İptal</span>;
      default:
        return <span>{status}</span>;
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-medium">Üye Seans Paketleri</h3>
        <button
          onClick={openAssignModal}
          className="bg-white text-black px-4 py-2 rounded text-sm font-medium hover:bg-gray-200 transition flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          Paket Ata
        </button>
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-4 rounded text-sm">
          {error}
        </div>
      )}

      {isLoading ? (
        <div className="text-center py-8 text-white/50">Yükleniyor...</div>
      ) : packages.length === 0 ? (
        <div className="text-center py-8 text-white/50 bg-[#1a1a1a] rounded-lg border border-white/10">
          Bu üyeye atanmış herhangi bir paket bulunamadı.
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {packages.map(pkg => (
            <div key={pkg.id} className="bg-[#1a1a1a] border border-white/10 rounded-lg p-5 space-y-4">
              <div className="flex justify-between items-start">
                <div>
                  <h4 className="font-semibold">{pkg.package_name}</h4>
                  <div className="text-sm text-white/50 mt-1">
                    {pkg.remaining_sessions} / {pkg.total_sessions} Seans Kalan
                  </div>
                </div>
                <div>
                  {renderBadge(pkg.effective_status)}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 text-sm bg-white/5 p-3 rounded">
                <div>
                  <div className="text-white/40 mb-1">Rezerve</div>
                  <div>{pkg.reserved_sessions} Seans</div>
                </div>
                <div>
                  <div className="text-white/40 mb-1">Geçerlilik</div>
                  <div>
                    {formatDate(pkg.valid_from)} - {formatDate(pkg.valid_until)}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 pt-2 border-t border-white/5">
                <button
                  onClick={() => openLedgerModal(pkg)}
                  className="flex-1 px-3 py-1.5 text-xs font-medium rounded bg-white/5 hover:bg-white/10 transition flex items-center justify-center gap-1.5"
                >
                  <Clock className="w-3.5 h-3.5" />
                  Hareketler
                </button>
                {pkg.stored_status === 'active' && (
                  <button
                    onClick={() => openCancelModal(pkg)}
                    className="flex-1 px-3 py-1.5 text-xs font-medium rounded bg-red-500/10 text-red-400 hover:bg-red-500/20 transition flex items-center justify-center gap-1.5"
                  >
                    <X className="w-3.5 h-3.5" />
                    Paketi İptal Et
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Assign Modal */}
      {isAssignModalOpen && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
          <div className="bg-[#121212] border border-white/10 rounded-lg w-full max-w-md">
            <div className="px-6 py-4 border-b border-white/10 flex justify-between items-center">
              <h3 className="text-lg font-medium">Paket Ata</h3>
              <button
                onClick={() => setIsAssignModalOpen(false)}
                className="text-white/50 hover:text-white"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleAssign} className="p-6 space-y-4">
              {assignError && (
                <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-3 rounded text-sm">
                  {assignError}
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-white/80 mb-1">
                  Paket Seçimi
                </label>
                <select
                  required
                  value={assignForm.session_package_id}
                  onChange={(e) => setAssignForm({ ...assignForm, session_package_id: e.target.value })}
                  className="w-full bg-[#1a1a1a] border border-white/10 rounded px-3 py-2 text-sm focus:outline-none focus:border-white/30"
                >
                  <option value="" disabled>Seçiniz...</option>
                  {catalogPackages.map(c => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.session_count} Seans{c.validity_days ? `, ${c.validity_days} Gün` : ""})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-white/80 mb-1">
                  Başlangıç Tarihi
                </label>
                <input
                  type="date"
                  required
                  value={assignForm.valid_from}
                  onChange={(e) => setAssignForm({ ...assignForm, valid_from: e.target.value })}
                  className="w-full bg-[#1a1a1a] border border-white/10 rounded px-3 py-2 text-sm focus:outline-none focus:border-white/30"
                  style={{ colorScheme: "dark" }}
                />
              </div>

              <div className="pt-4 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsAssignModalOpen(false)}
                  className="px-4 py-2 text-sm rounded bg-white/5 hover:bg-white/10 transition"
                  disabled={isAssigning}
                >
                  İptal
                </button>
                <button
                  type="submit"
                  disabled={isAssigning}
                  className="px-4 py-2 text-sm font-medium rounded bg-white text-black hover:bg-gray-200 transition disabled:opacity-50"
                >
                  {isAssigning ? "Atanıyor..." : "Ata"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Cancel Modal */}
      {cancelModalPkg && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
          <div className="bg-[#121212] border border-white/10 rounded-lg w-full max-w-md">
            <div className="px-6 py-4 border-b border-white/10 flex justify-between items-center">
              <h3 className="text-lg font-medium">Paketi İptal Et</h3>
              <button
                onClick={() => setCancelModalPkg(null)}
                className="text-white/50 hover:text-white"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCancel} className="p-6 space-y-4">
              {cancelError && (
                <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-3 rounded text-sm">
                  {cancelError}
                </div>
              )}

              <p className="text-sm text-white/80">
                <strong className="text-white">{cancelModalPkg.package_name}</strong> paketini iptal etmek üzeresiniz.
              </p>

              <div>
                <label className="block text-sm font-medium text-white/80 mb-1">
                  İptal Sebebi
                </label>
                <textarea
                  required
                  maxLength={255}
                  rows={3}
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                  className="w-full bg-[#1a1a1a] border border-white/10 rounded px-3 py-2 text-sm focus:outline-none focus:border-white/30 resize-none"
                  placeholder="Lütfen iptal sebebini belirtin..."
                />
              </div>

              <div className="pt-4 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setCancelModalPkg(null)}
                  className="px-4 py-2 text-sm rounded bg-white/5 hover:bg-white/10 transition"
                  disabled={isCancelling}
                >
                  Vazgeç
                </button>
                <button
                  type="submit"
                  disabled={isCancelling || cancelReason.trim().length === 0}
                  className="px-4 py-2 text-sm font-medium rounded bg-red-600 text-white hover:bg-red-700 transition disabled:opacity-50"
                >
                  {isCancelling ? "İptal Ediliyor..." : "Paketi İptal Et"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Ledger Modal */}
      {ledgerModalPkg && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
          <div className="bg-[#121212] border border-white/10 rounded-lg w-full max-w-2xl max-h-[90vh] flex flex-col">
            <div className="px-6 py-4 border-b border-white/10 flex justify-between items-center">
              <h3 className="text-lg font-medium">Hareket Geçmişi - {ledgerModalPkg.package_name}</h3>
              <button
                onClick={() => setLedgerModalPkg(null)}
                className="text-white/50 hover:text-white"
              >
                ✕
              </button>
            </div>

            <div className="p-6 overflow-y-auto">
              {isLedgerLoading ? (
                <div className="text-center py-8 text-white/50">Yükleniyor...</div>
              ) : ledgerEntries.length === 0 ? (
                <div className="text-center py-8 text-white/50 bg-[#1a1a1a] rounded-lg border border-white/10">
                  Henüz hareket kaydı bulunmuyor.
                </div>
              ) : (
                <div className="bg-[#1a1a1a] border border-white/10 rounded-lg overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm whitespace-nowrap">
                      <thead className="bg-white/5 text-white/60">
                        <tr>
                          <th className="px-4 py-3 font-medium">Tarih</th>
                          <th className="px-4 py-3 font-medium">İşlem</th>
                          <th className="px-4 py-3 font-medium text-center">Değişim</th>
                          <th className="px-4 py-3 font-medium">İşlemi Yapan</th>
                          <th className="px-4 py-3 font-medium">Açıklama</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5">
                        {ledgerEntries.map(entry => {
                          let typeLabel: string = entry.entry_type;
                          if (entry.entry_type === 'reserve') typeLabel = 'Randevu Rezervasyonu';
                          if (entry.entry_type === 'release') typeLabel = 'Rezervasyon İadesi';
                          if (entry.entry_type === 'adjustment') typeLabel = 'Manuel Düzeltme';

                          return (
                            <tr key={entry.id} className="hover:bg-white/5">
                              <td className="px-4 py-3 text-white/80">{formatDateTime(entry.created_at)}</td>
                              <td className="px-4 py-3">{typeLabel}</td>
                              <td className="px-4 py-3 text-center">
                                <span className={`inline-block px-2 py-0.5 rounded text-xs font-bold ${
                                  entry.delta > 0 ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
                                }`}>
                                  {entry.delta > 0 ? `+${entry.delta}` : entry.delta}
                                </span>
                              </td>
                              <td className="px-4 py-3 text-white/80">{entry.created_by_name}</td>
                              <td className="px-4 py-3 text-white/50 truncate max-w-[200px]" title={entry.reason || ''}>
                                {entry.reason || "-"}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
            <div className="px-6 py-4 border-t border-white/10 flex justify-end">
              <button
                onClick={() => setLedgerModalPkg(null)}
                className="px-4 py-2 text-sm rounded bg-white/5 hover:bg-white/10 transition"
              >
                Kapat
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
