import { useState, useEffect, useRef } from "react";
import { useParams, Link } from "react-router-dom";
import {
  ArrowLeft,
  Activity,
  FileText,
  Dumbbell,
  Calendar,
  HeartPulse,
  Sparkles,
  TrendingUp,
  ChevronLeft,
  ChevronRight,
  X,
  Clock,
  Plus,
  Pencil,
  Archive,
  RotateCcw
} from "lucide-react";
import { apiClient, ApiError } from "../../api/client";
import { TrainerMemberDetail as ITrainerMemberDetail, isTrainerMemberDetail } from "../trainer-members/types";
import {
  MemberMeasurementListItem,
  MemberMeasurementDetail,
  isMemberMeasurementListResponse,
  isMemberMeasurementDetail,
  isMemberProgressSuccessResponse
} from "../member-progress/types";
import { TrainerMeasurementFormModal } from "./TrainerMeasurementFormModal";
import { TrainerProgressNotesPanel } from "./TrainerProgressNotesPanel";

type ProgressTab = "measurements" | "notes";
type DeletedFilter = "active" | "deleted" | "all";

function formatDateTime(dateStr: unknown): string {
  if (typeof dateStr !== "string") return "—";
  const regex = /^(\d{4})-(\d{2})-(\d{2}) (\d{2}):(\d{2}):(\d{2})$/;
  const match = dateStr.match(regex);
  if (!match) return dateStr;

  const [, yStr, mStr, dStr, hStr, iStr, sStr] = match;
  const year = parseInt(yStr, 10);
  const month = parseInt(mStr, 10);
  const day = parseInt(dStr, 10);
  const hour = parseInt(hStr, 10);
  const minute = parseInt(iStr, 10);
  const second = parseInt(sStr, 10);

  const dateObj = new Date(year, month - 1, day, hour, minute, second);

  if (
    dateObj.getFullYear() !== year ||
    dateObj.getMonth() !== month - 1 ||
    dateObj.getDate() !== day ||
    dateObj.getHours() !== hour ||
    dateObj.getMinutes() !== minute ||
    dateObj.getSeconds() !== second
  ) {
    return dateStr;
  }

  try {
    return new Intl.DateTimeFormat("tr-TR", {
      day: "2-digit",
      month: "long",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    }).format(dateObj);
  } catch {
    return dateStr;
  }
}

export function TrainerMemberProgressPage() {
  const { memberId } = useParams<{ memberId: string }>();
  const isValidMemberId = /^[1-9]\d*$/.test(memberId || "");

  // Member State
  const [member, setMember] = useState<ITrainerMemberDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<ProgressTab>("measurements");

  // Measurements State
  const [deletedFilter, setDeletedFilter] = useState<DeletedFilter>("active");
  const [page, setPage] = useState(1);
  const [lastPage, setLastPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [measurements, setMeasurements] = useState<MemberMeasurementListItem[]>([]);
  const [measurementsLoading, setMeasurementsLoading] = useState(false);
  const [measurementsError, setMeasurementsError] = useState<string | null>(null);

  // Selected Detail State
  const [selectedMeasurementId, setSelectedMeasurementId] = useState<number | null>(null);
  const [detail, setDetail] = useState<MemberMeasurementDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);

  // Form Modal & Refresh Keys
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [editingMeasurement, setEditingMeasurement] = useState<MemberMeasurementDetail | null>(null);
  const [listRefreshKey, setListRefreshKey] = useState(0);
  const [detailRefreshKey, setDetailRefreshKey] = useState(0);

  // Mutation Locks & State
  const isMutatingRef = useRef(false);
  const isMountedRef = useRef(true);
  const [archivingId, setArchivingId] = useState<number | null>(null);
  const [restoringId, setRestoringId] = useState<number | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  // 1. Fetch Member Context
  useEffect(() => {
    if (!isValidMemberId) {
      setLoading(false);
      setError("Geçersiz üye ID parametresi.");
      return;
    }

    let isSubscribed = true;
    setLoading(true);
    setError(null);

    const fetchMember = async () => {
      try {
        const response = await apiClient.get(`/api/trainer/members/${memberId}`);
        if (!isSubscribed) return;
        if (isTrainerMemberDetail(response)) {
          setMember(response);
        } else {
          throw new Error("Geçersiz sunucu yanıtı.");
        }
      } catch (err: unknown) {
        if (!isSubscribed) return;
        if (err instanceof ApiError) {
          if (err.code === "TRAINER_PROFILE_NOT_LINKED") {
            setError("Aktif eğitmen profiliniz hesabınıza bağlanmamış.");
          } else if (err.status === 403 || err.code === "FORBIDDEN") {
            setError("Bu alana erişim yetkiniz yok.");
          } else if (err.status === 404 || err.code === "NOT_FOUND") {
            setError("Üye bulunamadı veya bu üyeye erişim yetkiniz yok.");
          } else {
            setError(err.message || "Üye bulunamadı veya bu üyeye erişim yetkiniz yok.");
          }
        } else if (err instanceof Error) {
          setError(err.message);
        } else {
          setError("Bilinmeyen bir hata oluştu.");
        }
      } finally {
        if (isSubscribed) setLoading(false);
      }
    };

    fetchMember();

    return () => {
      isSubscribed = false;
    };
  }, [memberId, isValidMemberId]);

  // 2. Fetch Measurements List
  useEffect(() => {
    if (!isValidMemberId || activeTab !== "measurements") {
      return;
    }

    let isSubscribed = true;
    setMeasurementsLoading(true);
    setMeasurementsError(null);

    const fetchMeasurements = async () => {
      try {
        const res = await apiClient.get(
          `/api/trainer/members/${memberId}/measurements?page=${page}&per_page=20&deleted=${deletedFilter}`
        );
        if (!isSubscribed) return;
        if (isMemberMeasurementListResponse(res)) {
          setMeasurements(res.items);
          setLastPage(res.pagination.last_page);
          setTotal(res.pagination.total);
        } else {
          setMeasurementsError("Sunucudan geçersiz ölçüm listesi yanıtı alındı.");
        }
      } catch (err: unknown) {
        if (!isSubscribed) return;
        if (err instanceof ApiError) {
          if (err.code === "TRAINER_PROFILE_NOT_LINKED") {
            setMeasurementsError("Aktif eğitmen profiliniz hesabınıza bağlanmamış.");
          } else if (err.status === 403 || err.code === "FORBIDDEN") {
            setMeasurementsError("Bu alana erişim yetkiniz yok.");
          } else if (err.status === 404 || err.code === "NOT_FOUND") {
            setMeasurementsError("Üye bulunamadı veya bu üyeye erişim yetkiniz yok.");
          } else if (err.status === 422 || err.code === "VALIDATION_ERROR") {
            setMeasurementsError("Geçersiz istek parametresi.");
          } else {
            setMeasurementsError(err.message || "Ölçümler yüklenirken bir hata oluştu.");
          }
        } else if (err instanceof Error) {
          setMeasurementsError(err.message);
        } else {
          setMeasurementsError("Bilinmeyen bir hata oluştu.");
        }
      } finally {
        if (isSubscribed) setMeasurementsLoading(false);
      }
    };

    fetchMeasurements();

    return () => {
      isSubscribed = false;
    };
  }, [memberId, isValidMemberId, activeTab, deletedFilter, page, listRefreshKey]);

  // 3. Fetch Measurement Detail
  useEffect(() => {
    if (!selectedMeasurementId || activeTab !== "measurements") {
      setDetail(null);
      setDetailLoading(false);
      setDetailError(null);
      return;
    }

    const currentItem = measurements.find((m) => m.id === selectedMeasurementId);
    if (currentItem && currentItem.deleted_at !== null) {
      setDetail(null);
      setDetailLoading(false);
      setDetailError("Arşivlenmiş kayıtların detay notu görüntülenemez.");
      return;
    }

    let isSubscribed = true;
    setDetailLoading(true);
    setDetailError(null);

    const fetchDetail = async () => {
      try {
        const res = await apiClient.get(`/api/trainer/member-measurements/${selectedMeasurementId}`);
        if (!isSubscribed) return;
        if (isMemberMeasurementDetail(res)) {
          setDetail(res);
        } else {
          setDetailError("Sunucudan geçersiz ölçüm detay yanıtı alındı.");
        }
      } catch (err: unknown) {
        if (!isSubscribed) return;
        if (err instanceof ApiError) {
          if (err.code === "TRAINER_PROFILE_NOT_LINKED") {
            setDetailError("Aktif eğitmen profiliniz hesabınıza bağlanmamış.");
          } else if (err.status === 403 || err.code === "FORBIDDEN") {
            setDetailError("Bu alana erişim yetkiniz yok.");
          } else if (err.status === 404 || err.code === "NOT_FOUND") {
            setDetailError("Ölçüm kaydı bulunamadı veya erişilemiyor.");
          } else {
            setDetailError(err.message || "Ölçüm detayı yüklenemedi.");
          }
        } else if (err instanceof Error) {
          setDetailError(err.message);
        } else {
          setDetailError("Ölçüm detayı yüklenirken bir hata oluştu.");
        }
      } finally {
        if (isSubscribed) setDetailLoading(false);
      }
    };

    fetchDetail();

    return () => {
      isSubscribed = false;
    };
  }, [selectedMeasurementId, activeTab, measurements, detailRefreshKey]);

  const getMutationErrorMessage = (err: unknown, defaultMsg: string): string => {
    if (err instanceof ApiError) {
      if (err.code === "TRAINER_PROFILE_NOT_LINKED") {
        return "Aktif eğitmen profiliniz hesabınıza bağlanmamış.";
      }
      if (err.status === 403 || err.code === "FORBIDDEN") {
        return "Bu işlem için yetkiniz yok.";
      }
      if (err.status === 404 || err.code === "NOT_FOUND") {
        return "Ölçüm kaydı bulunamadı veya erişilemiyor.";
      }
      if (err.code === "MEASUREMENT_NOT_ARCHIVED" || err.status === 409 || err.code === "CONFLICT") {
        return "Ölçüm arşivlenmiş durumda değil / kayıt durumu değişmiş olabilir.";
      }
      if (err.message) {
        return err.message;
      }
    } else if (err instanceof Error && err.message) {
      return err.message;
    }
    return defaultMsg;
  };

  const handleFilterChange = (filter: DeletedFilter) => {
    if (filter === deletedFilter) return;
    setDeletedFilter(filter);
    setPage(1);
    setSelectedMeasurementId(null);
    setDetail(null);
    setDetailLoading(false);
    setDetailError(null);
    setActionError(null);
  };

  const handlePageChange = (newPage: number) => {
    const targetPage = Math.max(1, Math.min(lastPage, newPage));
    if (targetPage === page) {
      return;
    }
    setPage(targetPage);
    setSelectedMeasurementId(null);
    setDetail(null);
    setDetailLoading(false);
    setDetailError(null);
    setActionError(null);
  };

  const handleItemClick = (m: MemberMeasurementListItem) => {
    if (selectedMeasurementId === m.id) {
      return;
    }
    setSelectedMeasurementId(m.id);
    setDetail(null);
    setDetailError(null);
    setActionError(null);
  };

  const handleCloseDetail = () => {
    setSelectedMeasurementId(null);
    setDetail(null);
    setDetailError(null);
    setActionError(null);
  };

  const handleOpenCreate = () => {
    setEditingMeasurement(null);
    setIsFormModalOpen(true);
    setActionError(null);
  };

  const handleOpenEdit = (targetDetail: MemberMeasurementDetail) => {
    setEditingMeasurement(targetDetail);
    setIsFormModalOpen(true);
    setActionError(null);
  };

  const handleFormSuccess = () => {
    setIsFormModalOpen(false);
    setActionError(null);
    if (!editingMeasurement) {
      // Create success: reset to active filter, page 1, clear stale detail, trigger list refresh
      setDeletedFilter("active");
      setPage(1);
      setSelectedMeasurementId(null);
      setDetail(null);
      setDetailError(null);
      setListRefreshKey((k) => k + 1);
    } else {
      // Edit success: refresh list and refetch detail
      setListRefreshKey((k) => k + 1);
      setDetailRefreshKey((k) => k + 1);
    }
    setEditingMeasurement(null);
  };

  const handleCloseModal = () => {
    setIsFormModalOpen(false);
    setEditingMeasurement(null);
  };

  const handleArchive = async (id: number) => {
    if (isMutatingRef.current) return;

    if (!window.confirm("Bu ölçümü arşivlemek istediğinize emin misiniz?")) {
      return;
    }

    isMutatingRef.current = true;
    setArchivingId(id);
    setActionError(null);

    try {
      const res = await apiClient.delete(`/api/trainer/member-measurements/${id}`);
      if (!isMemberProgressSuccessResponse(res)) {
        throw new Error("Sunucudan geçersiz yanıt alındı.");
      }

      if (!isMountedRef.current) return;

      // Archive success state
      setSelectedMeasurementId(null);
      setDetail(null);
      setDetailError(null);
      setPage(1);
      setListRefreshKey((k) => k + 1);
    } catch (err: unknown) {
      if (!isMountedRef.current) return;
      setActionError(getMutationErrorMessage(err, "Ölçüm arşivlenirken bir hata oluştu. Lütfen tekrar deneyin."));
    } finally {
      isMutatingRef.current = false;
      if (isMountedRef.current) {
        setArchivingId(null);
      }
    }
  };

  const handleRestore = async (e: React.MouseEvent, id: number) => {
    e.stopPropagation();

    if (isMutatingRef.current) return;

    if (!window.confirm("Bu ölçümü geri yüklemek istediğinize emin misiniz?")) {
      return;
    }

    isMutatingRef.current = true;
    setRestoringId(id);
    setActionError(null);

    try {
      const res = await apiClient.post(`/api/trainer/member-measurements/${id}/restore`, {});
      if (!isMemberProgressSuccessResponse(res)) {
        throw new Error("Sunucudan geçersiz yanıt alındı.");
      }

      if (!isMountedRef.current) return;

      // Restore success state
      setSelectedMeasurementId(null);
      setDetail(null);
      setDetailError(null);
      setPage(1);
      setListRefreshKey((k) => k + 1);
    } catch (err: unknown) {
      if (!isMountedRef.current) return;
      setActionError(getMutationErrorMessage(err, "Ölçüm geri yüklenirken bir hata oluştu. Lütfen tekrar deneyin."));
    } finally {
      isMutatingRef.current = false;
      if (isMountedRef.current) {
        setRestoringId(null);
      }
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Link
            to={isValidMemberId ? `/admin/my-members/${memberId}` : "/admin/my-members"}
            className="p-2 bg-[#121212] border border-white/10 rounded hover:bg-white/5 transition"
          >
            <ArrowLeft className="w-4 h-4 text-white/70" />
          </Link>
          <h2 className="text-2xl font-bold">Gelişim Takibi Yükleniyor...</h2>
        </div>
      </div>
    );
  }

  if (error || !member) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4 mb-6">
          <Link
            to={isValidMemberId ? `/admin/my-members/${memberId}` : "/admin/my-members"}
            className="p-2 bg-[#121212] border border-white/10 rounded hover:bg-white/5 transition"
          >
            <ArrowLeft className="w-4 h-4 text-white/70" />
          </Link>
          <h2 className="text-2xl font-bold">Hata</h2>
        </div>
        <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-6 rounded-lg text-sm text-center">
          {error || "Üye bulunamadı."}
        </div>
        <div className="flex justify-center">
          <Link
            to={isValidMemberId ? `/admin/my-members/${memberId}` : "/admin/my-members"}
            className="text-[#851C35] hover:text-[#a02240] text-sm font-medium transition"
          >
            {isValidMemberId ? "Üye Detayına Dön" : "Üye Listesine Dön"}
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Link
            to={`/admin/my-members/${member.id}`}
            className="p-2 bg-[#121212] border border-white/10 rounded hover:bg-white/5 transition"
            title="Üye Detayına Dön"
          >
            <ArrowLeft className="w-4 h-4 text-white/70" />
          </Link>
          <div>
            <div className="flex items-center gap-3">
              <h2 className="text-2xl font-bold">
                {member.first_name} {member.last_name}
              </h2>
              <span
                className={`inline-flex px-2.5 py-0.5 rounded text-xs font-medium ${
                  member.status === "active"
                    ? "bg-green-500/20 text-green-400 border border-green-500/30"
                    : "bg-red-500/20 text-red-400 border border-red-500/30"
                }`}
              >
                {member.status === "active" ? "Aktif" : "Pasif"}
              </span>
            </div>
            <div className="text-sm text-white/50 font-mono mt-0.5">
              Gelişim Takibi Workspace • {member.uuid}
            </div>
          </div>
        </div>

        {/* Action Link to Training Programs */}
        <div className="flex flex-wrap items-center gap-3">
          <Link
            to={`/admin/my-members/${member.id}/training-programs`}
            className="flex items-center gap-2 px-3.5 py-2 bg-white/10 hover:bg-white/20 text-white text-sm font-medium rounded transition"
          >
            <Dumbbell className="w-4 h-4 text-white/80" />
            Antrenman Programları
          </Link>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="bg-[#121212] border border-white/10 rounded-xl p-2 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setActiveTab("measurements")}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition ${
            activeTab === "measurements"
              ? "bg-[#851C35] text-white shadow-sm"
              : "text-white/60 hover:text-white hover:bg-white/5"
          }`}
        >
          <Activity className="w-4 h-4" />
          Ölçümler
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("notes")}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition ${
            activeTab === "notes"
              ? "bg-[#851C35] text-white shadow-sm"
              : "text-white/60 hover:text-white hover:bg-white/5"
          }`}
        >
          <FileText className="w-4 h-4" />
          Gelişim Notları
        </button>
      </div>

      {/* Tab Content: Measurements Read-Only View */}
      {activeTab === "measurements" && (
        <div className="space-y-6">
          {/* Controls Bar: Filter, New Button & Info */}
          <div className="bg-[#121212] border border-white/10 rounded-xl p-4 flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
            <div className="flex items-center gap-1.5 bg-white/5 p-1 rounded-lg border border-white/5">
              <button
                type="button"
                onClick={() => handleFilterChange("active")}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition ${
                  deletedFilter === "active"
                    ? "bg-[#851C35] text-white shadow-sm"
                    : "text-white/60 hover:text-white hover:bg-white/5"
                }`}
              >
                Aktif Kayıtlar
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

            <div className="flex items-center gap-4 w-full sm:w-auto justify-between sm:justify-end">
              <div className="text-xs text-white/50">
                Toplam <span className="text-white font-medium">{total}</span> ölçüm kaydı
              </div>
              <button
                type="button"
                onClick={handleOpenCreate}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-[#851C35] hover:bg-[#6b162b] text-white text-xs font-semibold rounded-lg shadow-sm transition shrink-0"
              >
                <Plus className="w-4 h-4" />
                Yeni Ölçüm
              </button>
            </div>
          </div>

          {measurementsError && (
            <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-4 rounded-xl text-sm">
              {measurementsError}
            </div>
          )}

          {actionError && (
            <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-4 rounded-xl text-sm flex items-center justify-between gap-2">
              <span>{actionError}</span>
              <button
                type="button"
                onClick={() => setActionError(null)}
                className="p-1 text-red-400/70 hover:text-red-400 rounded hover:bg-red-500/10 transition shrink-0"
                title="Kapat"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* List + Detail Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left 2 Cols: Measurements List */}
            <div className="lg:col-span-2 flex flex-col">
              <div className="bg-[#121212] border border-white/10 rounded-xl overflow-hidden flex flex-col min-h-[420px]">
                {measurementsLoading ? (
                  <div className="flex-1 flex flex-col items-center justify-center p-12 text-white/50">
                    <div className="w-8 h-8 border-2 border-[#851C35]/30 border-t-[#851C35] rounded-full animate-spin mb-3" />
                    <span className="text-xs">Ölçümler yükleniyor...</span>
                  </div>
                ) : measurements.length === 0 ? (
                  <div className="flex-1 flex flex-col items-center justify-center p-12 text-white/40 text-center">
                    <Activity className="w-12 h-12 mb-3 opacity-20 text-[#851C35]" />
                    <p className="text-sm font-medium text-white/60">Ölçüm kaydı bulunamadı.</p>
                    <p className="text-xs text-white/40 mt-1 max-w-sm">
                      {deletedFilter === "active"
                        ? "Bu üye için henüz aktif fiziksel ölçüm kaydı bulunmuyor."
                        : deletedFilter === "deleted"
                        ? "Arşivlenmiş herhangi bir ölçüm kaydı bulunamadı."
                        : "Bu üye için kayıtlı herhangi bir ölçüm bulunamadı."}
                    </p>
                  </div>
                ) : (
                  <div className="flex-1 flex flex-col divide-y divide-white/5">
                    {measurements.map((m) => {
                      const isSelected = selectedMeasurementId === m.id;
                      const isArchived = m.deleted_at !== null;
                      return (
                        <div
                          key={m.id}
                          onClick={() => handleItemClick(m)}
                          className={`p-4 transition cursor-pointer flex flex-col gap-3 ${
                            isSelected
                              ? "bg-[#851C35]/15 border-l-4 border-[#851C35]"
                              : "hover:bg-white/[0.03] border-l-4 border-transparent"
                          }`}
                        >
                          <div className="flex items-center justify-between gap-2 flex-wrap">
                            <div className="flex items-center gap-2">
                              <Calendar className="w-3.5 h-3.5 text-[#851C35]" />
                              <span className="text-sm font-semibold text-white">
                                {formatDateTime(m.measured_at)}
                              </span>
                            </div>
                            {isArchived && (
                              <div className="flex items-center gap-2">
                                <span className="text-[11px] font-medium text-red-400 bg-red-500/10 border border-red-500/20 px-2 py-0.5 rounded">
                                  Arşivlenmiş
                                </span>
                                <button
                                  type="button"
                                  disabled={isMutatingRef.current || restoringId !== null}
                                  onClick={(e) => handleRestore(e, m.id)}
                                  className="flex items-center gap-1.5 px-2 py-0.5 bg-[#851C35]/20 hover:bg-[#851C35]/40 text-white rounded border border-[#851C35]/40 text-xs font-medium transition disabled:opacity-40 disabled:cursor-not-allowed"
                                  title="Ölçümü Geri Yükle"
                                >
                                  <RotateCcw className="w-3 h-3 text-[#851C35]" />
                                  {restoringId === m.id ? "Geri Yükleniyor..." : "Geri Yükle"}
                                </button>
                              </div>
                            )}
                          </div>

                          <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-2 text-xs">
                            <div className="bg-white/[0.02] border border-white/5 rounded p-2">
                              <span className="text-white/40 block text-[10px]">Kilo</span>
                              <span className="text-white font-medium">
                                {m.weight_kg !== null ? `${m.weight_kg} kg` : "—"}
                              </span>
                            </div>
                            <div className="bg-white/[0.02] border border-white/5 rounded p-2">
                              <span className="text-white/40 block text-[10px]">Yağ</span>
                              <span className="text-white font-medium">
                                {m.body_fat_percent !== null ? `%${m.body_fat_percent}` : "—"}
                              </span>
                            </div>
                            <div className="bg-white/[0.02] border border-white/5 rounded p-2">
                              <span className="text-white/40 block text-[10px]">Göğüs</span>
                              <span className="text-white font-medium">
                                {m.chest_cm !== null ? `${m.chest_cm} cm` : "—"}
                              </span>
                            </div>
                            <div className="bg-white/[0.02] border border-white/5 rounded p-2">
                              <span className="text-white/40 block text-[10px]">Bel</span>
                              <span className="text-white font-medium">
                                {m.waist_cm !== null ? `${m.waist_cm} cm` : "—"}
                              </span>
                            </div>
                            <div className="bg-white/[0.02] border border-white/5 rounded p-2">
                              <span className="text-white/40 block text-[10px]">Kalça</span>
                              <span className="text-white font-medium">
                                {m.hip_cm !== null ? `${m.hip_cm} cm` : "—"}
                              </span>
                            </div>
                            <div className="bg-white/[0.02] border border-white/5 rounded p-2">
                              <span className="text-white/40 block text-[10px]">Kol</span>
                              <span className="text-white font-medium">
                                {m.arm_cm !== null ? `${m.arm_cm} cm` : "—"}
                              </span>
                            </div>
                            <div className="bg-white/[0.02] border border-white/5 rounded p-2">
                              <span className="text-white/40 block text-[10px]">Bacak</span>
                              <span className="text-white font-medium">
                                {m.thigh_cm !== null ? `${m.thigh_cm} cm` : "—"}
                              </span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Pagination Controls */}
                {!measurementsLoading && measurements.length > 0 && (
                  <div className="p-4 border-t border-white/10 bg-[#121212] flex items-center justify-between text-xs text-white/60">
                    <div>
                      Toplam {total} kayıt • Sayfa {page} / {lastPage}
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        disabled={page <= 1}
                        onClick={() => handlePageChange(page - 1)}
                        className="p-1.5 bg-white/5 hover:bg-white/10 text-white/70 hover:text-white rounded border border-white/5 disabled:opacity-40 disabled:hover:bg-white/5 disabled:cursor-not-allowed transition"
                        title="Önceki Sayfa"
                      >
                        <ChevronLeft className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        disabled={page >= lastPage}
                        onClick={() => handlePageChange(page + 1)}
                        className="p-1.5 bg-white/5 hover:bg-white/10 text-white/70 hover:text-white rounded border border-white/5 disabled:opacity-40 disabled:hover:bg-white/5 disabled:cursor-not-allowed transition"
                        title="Sonraki Sayfa"
                      >
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Right 1 Col: Measurement Detail Card */}
            <div className="lg:col-span-1">
              <div className="bg-[#121212] border border-white/10 rounded-xl p-5 min-h-[420px] sticky top-6">
                {!selectedMeasurementId ? (
                  <div className="h-full min-h-[380px] flex flex-col items-center justify-center text-white/40 text-xs text-center p-6 space-y-2">
                    <Activity className="w-8 h-8 opacity-25 text-[#851C35]" />
                    <p className="font-medium text-white/60">Ölçüm Detayı</p>
                    <p className="leading-relaxed">
                      Detaylı verileri ve antrenör notunu görüntülemek için sol taraftaki listeden bir ölçüme tıklayın.
                    </p>
                  </div>
                ) : detailLoading ? (
                  <div className="h-full min-h-[380px] flex flex-col items-center justify-center p-8 text-white/50">
                    <div className="w-7 h-7 border-2 border-[#851C35]/30 border-t-[#851C35] rounded-full animate-spin mb-3" />
                    <span className="text-xs">Ölçüm detayı alınıyor...</span>
                  </div>
                ) : detailError ? (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h4 className="text-sm font-semibold text-white">Ölçüm Detayı</h4>
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
                        <div className="text-xs text-white/50 font-medium">Ölçüm Detayı</div>
                        <h4 className="text-base font-bold text-white mt-0.5">
                          {formatDateTime(detail.measured_at)}
                        </h4>
                        <div className="text-[11px] text-white/40 font-mono mt-0.5">
                          {detail.uuid}
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {detail.deleted_at === null && (
                          <>
                            <button
                              type="button"
                              disabled={isMutatingRef.current || archivingId !== null}
                              onClick={() => handleOpenEdit(detail)}
                              className="flex items-center gap-1.5 px-2.5 py-1 bg-white/5 hover:bg-white/10 text-white/80 hover:text-white rounded border border-white/10 text-xs font-medium transition disabled:opacity-40 disabled:cursor-not-allowed"
                              title="Ölçümü Düzenle"
                            >
                              <Pencil className="w-3.5 h-3.5" />
                              Düzenle
                            </button>
                            <button
                              type="button"
                              disabled={isMutatingRef.current || archivingId !== null}
                              onClick={() => handleArchive(detail.id)}
                              className="flex items-center gap-1.5 px-2.5 py-1 bg-red-500/10 hover:bg-red-500/20 text-red-400 hover:text-red-300 rounded border border-red-500/20 text-xs font-medium transition disabled:opacity-40 disabled:cursor-not-allowed"
                              title="Ölçümü Arşivle"
                            >
                              <Archive className="w-3.5 h-3.5" />
                              {archivingId === detail.id ? "Arşivleniyor..." : "Arşivle"}
                            </button>
                          </>
                        )}
                        <button
                          type="button"
                          onClick={handleCloseDetail}
                          className="p-1.5 text-white/50 hover:text-white rounded hover:bg-white/5 transition"
                          title="Kapat"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    {/* Metrics 2-column Grid */}
                    <div className="grid grid-cols-2 gap-2.5 text-xs">
                      <div className="bg-white/[0.02] border border-white/5 rounded-lg p-3">
                        <span className="text-white/40 text-[11px] block mb-0.5">Ağırlık (Kilo)</span>
                        <span className="text-sm font-semibold text-white">
                          {detail.weight_kg !== null ? `${detail.weight_kg} kg` : "—"}
                        </span>
                      </div>
                      <div className="bg-white/[0.02] border border-white/5 rounded-lg p-3">
                        <span className="text-white/40 text-[11px] block mb-0.5">Vücut Yağ Oranı</span>
                        <span className="text-sm font-semibold text-white">
                          {detail.body_fat_percent !== null ? `%${detail.body_fat_percent}` : "—"}
                        </span>
                      </div>
                      <div className="bg-white/[0.02] border border-white/5 rounded-lg p-3">
                        <span className="text-white/40 text-[11px] block mb-0.5">Göğüs Çevresi</span>
                        <span className="text-sm font-semibold text-white">
                          {detail.chest_cm !== null ? `${detail.chest_cm} cm` : "—"}
                        </span>
                      </div>
                      <div className="bg-white/[0.02] border border-white/5 rounded-lg p-3">
                        <span className="text-white/40 text-[11px] block mb-0.5">Bel Çevresi</span>
                        <span className="text-sm font-semibold text-white">
                          {detail.waist_cm !== null ? `${detail.waist_cm} cm` : "—"}
                        </span>
                      </div>
                      <div className="bg-white/[0.02] border border-white/5 rounded-lg p-3">
                        <span className="text-white/40 text-[11px] block mb-0.5">Kalça Çevresi</span>
                        <span className="text-sm font-semibold text-white">
                          {detail.hip_cm !== null ? `${detail.hip_cm} cm` : "—"}
                        </span>
                      </div>
                      <div className="bg-white/[0.02] border border-white/5 rounded-lg p-3">
                        <span className="text-white/40 text-[11px] block mb-0.5">Kol Çevresi</span>
                        <span className="text-sm font-semibold text-white">
                          {detail.arm_cm !== null ? `${detail.arm_cm} cm` : "—"}
                        </span>
                      </div>
                      <div className="bg-white/[0.02] border border-white/5 rounded-lg p-3 col-span-2">
                        <span className="text-white/40 text-[11px] block mb-0.5">Bacak / Uyluk Çevresi</span>
                        <span className="text-sm font-semibold text-white">
                          {detail.thigh_cm !== null ? `${detail.thigh_cm} cm` : "—"}
                        </span>
                      </div>
                    </div>

                    {/* Notes Section */}
                    <div className="space-y-1.5 pt-1">
                      <span className="text-xs font-medium text-white/80 block">Antrenör Notları</span>
                      {detail.notes ? (
                        <div className="bg-white/[0.03] border border-white/5 rounded-lg p-3 text-xs text-white/80 whitespace-pre-wrap leading-relaxed">
                          {detail.notes}
                        </div>
                      ) : (
                        <div className="bg-white/[0.01] border border-dashed border-white/10 rounded-lg p-3 text-xs text-white/40 italic">
                          Bu ölçüm kaydına ait açıklama veya not bulunmuyor.
                        </div>
                      )}
                    </div>

                    {/* Timestamps Info */}
                    <div className="pt-2 border-t border-white/5 flex flex-col gap-1 text-[11px] text-white/40">
                      <div className="flex items-center gap-1.5">
                        <Clock className="w-3 h-3 text-white/30" />
                        <span>Kayıt: {formatDateTime(detail.created_at)}</span>
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
      )}

      {/* Tab Content: Trainer Progress Notes Panel */}
      {activeTab === "notes" && isValidMemberId && memberId && (
        <TrainerProgressNotesPanel memberId={parseInt(memberId, 10)} />
      )}

      {/* Create / Edit Measurement Modal */}
      {isFormModalOpen && isValidMemberId && memberId && (
        <TrainerMeasurementFormModal
          memberId={parseInt(memberId, 10)}
          initialData={editingMeasurement}
          onClose={handleCloseModal}
          onSuccess={handleFormSuccess}
        />
      )}
    </div>
  );
}

