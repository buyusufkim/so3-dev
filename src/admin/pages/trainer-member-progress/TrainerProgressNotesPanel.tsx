import { useState, useEffect } from "react";
import {
  FileText,
  Calendar,
  Filter,
  ChevronLeft,
  ChevronRight,
  X,
  Clock,
  AlertCircle
} from "lucide-react";
import { apiClient, ApiError } from "../../api/client";
import {
  MemberProgressNoteListItem,
  MemberProgressNoteDetail,
  isMemberProgressNoteListResponse,
  isMemberProgressNoteDetail
} from "../member-progress/types";

type DeletedFilter = "active" | "deleted" | "all";

interface TrainerProgressNotesPanelProps {
  memberId: number;
}

function formatDateTime(dateStr: string | null): string {
  if (!dateStr) return "—";
  try {
    const d = new Date(dateStr.replace(" ", "T"));
    if (isNaN(d.getTime())) return dateStr;
    return new Intl.DateTimeFormat("tr-TR", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    }).format(d);
  } catch {
    return dateStr;
  }
}

export function TrainerProgressNotesPanel({ memberId }: TrainerProgressNotesPanelProps) {
  // List State
  const [items, setItems] = useState<MemberProgressNoteListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Pagination & Filter State
  const [page, setPage] = useState(1);
  const perPage = 20;
  const [lastPage, setLastPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [deletedFilter, setDeletedFilter] = useState<DeletedFilter>("active");

  // Detail State
  const [selectedNoteId, setSelectedNoteId] = useState<number | null>(null);
  const [detail, setDetail] = useState<MemberProgressNoteDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);

  // 1. Fetch Notes List
  useEffect(() => {
    let isSubscribed = true;
    setLoading(true);
    setError(null);

    const fetchNotes = async () => {
      try {
        const queryParams = new URLSearchParams({
          page: page.toString(),
          per_page: perPage.toString(),
          deleted: deletedFilter
        });

        const res = await apiClient.get(
          `/api/trainer/members/${memberId}/progress-notes?${queryParams.toString()}`
        );

        if (!isSubscribed) return;

        if (!isMemberProgressNoteListResponse(res)) {
          throw new Error("Sunucudan geçersiz gelişim notları verisi alındı.");
        }

        setItems(res.items);
        setTotal(res.pagination.total);
        setLastPage(res.pagination.last_page);
      } catch (err: unknown) {
        if (!isSubscribed) return;
        if (err instanceof ApiError) {
          if (err.code === "TRAINER_PROFILE_NOT_LINKED") {
            setError("Aktif eğitmen profiliniz hesabınıza bağlanmamış.");
          } else if (err.status === 403 || err.code === "FORBIDDEN") {
            setError("Bu alana erişim yetkiniz yok.");
          } else if (err.status === 404 || err.code === "NOT_FOUND") {
            setError("Üye bulunamadı veya bu üyeye erişim yetkiniz yok.");
          } else if (err.status === 422 || err.code === "VALIDATION_ERROR") {
            setError("Geçersiz istek parametresi.");
          } else {
            setError("Gelişim notları yüklenemedi.");
          }
        } else if (err instanceof Error && err.message) {
          setError(err.message);
        } else {
          setError("Gelişim notları yüklenirken bilinmeyen bir hata oluştu.");
        }
      } finally {
        if (isSubscribed) {
          setLoading(false);
        }
      }
    };

    fetchNotes();

    return () => {
      isSubscribed = false;
    };
  }, [memberId, page, deletedFilter]);

  // 2. Fetch Active Note Detail
  useEffect(() => {
    if (!selectedNoteId) {
      setDetail(null);
      setDetailLoading(false);
      setDetailError(null);
      return;
    }

    let isSubscribed = true;
    setDetailLoading(true);
    setDetailError(null);

    const fetchDetail = async () => {
      try {
        const res = await apiClient.get(`/api/trainer/member-progress-notes/${selectedNoteId}`);

        if (!isSubscribed) return;

        if (!isMemberProgressNoteDetail(res)) {
          throw new Error("Sunucudan geçersiz not detay verisi alındı.");
        }

        setDetail(res);
      } catch (err: unknown) {
        if (!isSubscribed) return;
        if (err instanceof ApiError) {
          if (err.code === "TRAINER_PROFILE_NOT_LINKED") {
            setDetailError("Aktif eğitmen profiliniz hesabınıza bağlanmamış.");
          } else if (err.status === 403 || err.code === "FORBIDDEN") {
            setDetailError("Bu alana erişim yetkiniz yok.");
          } else if (err.status === 404 || err.code === "NOT_FOUND") {
            setDetailError("Gelişim notu bulunamadı veya erişilemiyor.");
          } else if (err.status === 422 || err.code === "VALIDATION_ERROR") {
            setDetailError("Geçersiz istek parametresi.");
          } else {
            setDetailError("Gelişim notu detayı yüklenemedi.");
          }
        } else if (err instanceof Error && err.message) {
          setDetailError(err.message);
        } else {
          setDetailError("Gelişim notu detayı yüklenirken bir sorun oluştu.");
        }
      } finally {
        if (isSubscribed) {
          setDetailLoading(false);
        }
      }
    };

    fetchDetail();

    return () => {
      isSubscribed = false;
    };
  }, [selectedNoteId]);

  const handleFilterChange = (filter: DeletedFilter) => {
    if (filter === deletedFilter) return;
    setDeletedFilter(filter);
    setPage(1);
    setSelectedNoteId(null);
    setDetail(null);
    setDetailLoading(false);
    setDetailError(null);
  };

  const handlePageChange = (newPage: number) => {
    if (newPage === page || newPage < 1 || newPage > lastPage) return;
    setPage(newPage);
    setSelectedNoteId(null);
    setDetail(null);
    setDetailLoading(false);
    setDetailError(null);
  };

  const handleItemClick = (n: MemberProgressNoteListItem) => {
    if (n.deleted_at !== null) {
      // Archived record cannot be fetched via detail endpoint
      return;
    }
    if (selectedNoteId === n.id) {
      return;
    }
    setSelectedNoteId(n.id);
    setDetail(null);
    setDetailError(null);
  };

  const handleCloseDetail = () => {
    setSelectedNoteId(null);
    setDetail(null);
    setDetailError(null);
  };

  return (
    <div className="space-y-6">
      {/* Filter Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 bg-[#121212] border border-white/10 p-4 rounded-xl">
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-white/40" />
          <span className="text-xs font-semibold uppercase tracking-wider text-white/40 mr-1">
            Filtrele:
          </span>
          <div className="inline-flex rounded-lg bg-white/5 p-1 border border-white/5">
            <button
              type="button"
              onClick={() => handleFilterChange("active")}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition ${
                deletedFilter === "active"
                  ? "bg-[#851C35] text-white shadow-sm"
                  : "text-white/60 hover:text-white hover:bg-white/5"
              }`}
            >
              Aktif Notlar
            </button>
            <button
              type="button"
              onClick={() => handleFilterChange("deleted")}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition ${
                deletedFilter === "deleted"
                  ? "bg-[#851C35] text-white shadow-sm"
                  : "text-white/60 hover:text-white hover:bg-white/5"
              }`}
            >
              Arşivlenmiş
            </button>
            <button
              type="button"
              onClick={() => handleFilterChange("all")}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition ${
                deletedFilter === "all"
                  ? "bg-[#851C35] text-white shadow-sm"
                  : "text-white/60 hover:text-white hover:bg-white/5"
              }`}
            >
              Tümü
            </button>
          </div>
        </div>

        <div className="text-xs text-white/40 self-end sm:self-center">
          Toplam <span className="text-white font-medium">{total}</span> kayıt listeleniyor
        </div>
      </div>

      {/* Main Content Grid: List (2 cols) + Detail (1 col) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Notes List */}
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-[#121212] border border-white/10 rounded-xl overflow-hidden min-h-[420px] flex flex-col justify-between">
            {loading ? (
              <div className="flex-1 flex flex-col items-center justify-center p-12 text-white/50 space-y-3">
                <div className="w-8 h-8 border-2 border-[#851C35]/30 border-t-[#851C35] rounded-full animate-spin" />
                <span className="text-xs font-medium">Gelişim notları yükleniyor...</span>
              </div>
            ) : error ? (
              <div className="flex-1 flex flex-col items-center justify-center p-8 text-center space-y-3">
                <AlertCircle className="w-8 h-8 text-red-400 opacity-80" />
                <p className="text-sm text-red-400 max-w-md">{error}</p>
                <button
                  type="button"
                  onClick={() => {
                    setPage(1);
                    setSelectedNoteId(null);
                    setDetail(null);
                  }}
                  className="px-4 py-1.5 bg-white/10 hover:bg-white/15 text-white rounded-lg text-xs font-medium transition"
                >
                  Tekrar Dene
                </button>
              </div>
            ) : items.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center p-12 text-center text-white/40 space-y-2">
                <FileText className="w-10 h-10 opacity-30 text-[#851C35]" />
                <p className="text-sm font-medium text-white/70">Kayıtlı Gelişim Notu Bulunamadı</p>
                <p className="text-xs text-white/40 max-w-sm">
                  {deletedFilter === "active"
                    ? "Bu üyeye ait henüz aktif bir gelişim notu girilmemiş."
                    : deletedFilter === "deleted"
                    ? "Arşivlenmiş gelişim notu kaydı bulunmuyor."
                    : "Herhangi bir gelişim notu kaydı bulunamadı."}
                </p>
              </div>
            ) : (
              <div className="divide-y divide-white/5 flex-1">
                {items.map((n) => {
                  const isSelected = selectedNoteId === n.id;
                  const isArchived = n.deleted_at !== null;

                  return (
                    <div
                      key={n.id}
                      onClick={() => handleItemClick(n)}
                      className={`p-4 transition flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                        isArchived
                          ? "bg-white/[0.01] opacity-75 cursor-default"
                          : "cursor-pointer hover:bg-white/[0.03]"
                      } ${
                        isSelected
                          ? "bg-white/[0.05] border-l-2 border-[#851C35]"
                          : "border-l-2 border-transparent"
                      }`}
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <Calendar className="w-3.5 h-3.5 text-[#851C35]" />
                          <span className="text-sm font-semibold text-white">
                            {formatDateTime(n.recorded_at)}
                          </span>
                        </div>
                        {isArchived ? (
                          <span className="text-[11px] font-medium text-red-400 bg-red-500/10 border border-red-500/20 px-2 py-0.5 rounded inline-block">
                            Arşivlenmiş
                          </span>
                        ) : (
                          <div className="text-[11px] text-white/40 font-mono">
                            {n.uuid}
                          </div>
                        )}
                      </div>

                      <div className="flex items-center gap-3 text-xs text-white/40">
                        <div className="flex items-center gap-1">
                          <Clock className="w-3 h-3 text-white/30" />
                          <span>Kayıt: {formatDateTime(n.created_at)}</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Pagination Bar */}
            {!loading && !error && items.length > 0 && (
              <div className="p-4 border-t border-white/10 bg-white/[0.01] flex items-center justify-between text-xs">
                <div className="text-white/50">
                  Toplam <span className="text-white font-medium">{total}</span> kayıt &bull; Sayfa{" "}
                  <span className="text-white font-medium">{page}</span> / {lastPage}
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    disabled={page <= 1}
                    onClick={() => handlePageChange(Math.max(1, page - 1))}
                    className="p-1.5 bg-white/5 hover:bg-white/10 text-white/70 hover:text-white rounded border border-white/10 disabled:opacity-30 disabled:cursor-not-allowed transition"
                    title="Önceki Sayfa"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <span className="text-white/60 font-medium px-1">{page}</span>
                  <button
                    type="button"
                    disabled={page >= lastPage}
                    onClick={() => handlePageChange(Math.min(lastPage, page + 1))}
                    className="p-1.5 bg-white/5 hover:bg-white/10 text-white/70 hover:text-white rounded border border-white/10 disabled:opacity-30 disabled:cursor-not-allowed transition"
                    title="Sonraki Sayfa"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right 1 Col: Progress Note Detail Card */}
        <div className="lg:col-span-1">
          <div className="bg-[#121212] border border-white/10 rounded-xl p-5 min-h-[420px] sticky top-6">
            {!selectedNoteId ? (
              <div className="h-full min-h-[380px] flex flex-col items-center justify-center text-white/40 text-xs text-center p-6 space-y-2">
                <FileText className="w-8 h-8 opacity-25 text-[#851C35]" />
                <p className="font-medium text-white/60">Gelişim Notu Detayı</p>
                <p className="leading-relaxed">
                  Detaylı not içeriğini görüntülemek için sol taraftaki listeden aktif bir nota tıklayın.
                </p>
              </div>
            ) : detailLoading ? (
              <div className="h-full min-h-[380px] flex flex-col items-center justify-center p-8 text-white/50">
                <div className="w-7 h-7 border-2 border-[#851C35]/30 border-t-[#851C35] rounded-full animate-spin mb-3" />
                <span className="text-xs">Gelişim notu detayı alınıyor...</span>
              </div>
            ) : detailError ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-semibold text-white">Gelişim Notu Detayı</h4>
                  <button
                    type="button"
                    onClick={handleCloseDetail}
                    className="p-1 text-white/50 hover:text-white rounded hover:bg-white/5 transition"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
                <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-4 rounded-lg text-xs leading-relaxed">
                  {detailError}
                </div>
              </div>
            ) : detail ? (
              <div className="space-y-5">
                {/* Detail Card Header */}
                <div className="flex items-start justify-between gap-3 border-b border-white/10 pb-4">
                  <div>
                    <div className="text-xs text-white/50 font-medium">Gelişim Notu</div>
                    <h4 className="text-base font-bold text-white mt-0.5">
                      {formatDateTime(detail.recorded_at)}
                    </h4>
                    <div className="text-[11px] text-white/40 font-mono mt-0.5">
                      {detail.uuid}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={handleCloseDetail}
                    className="p-1.5 text-white/50 hover:text-white rounded hover:bg-white/5 transition"
                    title="Kapat"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {/* Note Content */}
                <div className="space-y-2">
                  <div className="text-xs font-semibold uppercase tracking-wider text-white/40">
                    Not İçeriği
                  </div>
                  <div className="bg-white/[0.02] border border-white/5 rounded-lg p-4 text-sm text-white/90 whitespace-pre-wrap break-words leading-relaxed max-h-[360px] overflow-y-auto">
                    {detail.note}
                  </div>
                </div>

                {/* Meta info */}
                <div className="pt-2 border-t border-white/5 space-y-1.5 text-[11px] text-white/40">
                  <div className="flex items-center gap-1.5">
                    <Clock className="w-3 h-3 text-white/30" />
                    <span>Oluşturulma: {formatDateTime(detail.created_at)}</span>
                  </div>
                  {detail.updated_at !== detail.created_at && (
                    <div className="flex items-center gap-1.5 pl-4.5 text-white/30">
                      <span>Güncellenme: {formatDateTime(detail.updated_at)}</span>
                    </div>
                  )}
                </div>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
