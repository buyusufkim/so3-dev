import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, ChevronLeft, ChevronRight, Activity, FileText, Plus, Edit2, Trash2, RotateCcw } from "lucide-react";
import { apiClient, ApiError } from "../../api/client";
import {
  MemberMeasurementListItem,
  MemberMeasurementDetail,
  MemberProgressNoteListItem,
  MemberProgressNoteDetail,
  isMemberMeasurementListResponse,
  isMemberMeasurementDetail,
  isMemberProgressNoteListResponse,
  isMemberProgressNoteDetail,
  isMemberProgressSuccessResponse
} from "./types";
import { MemberMeasurementFormModal } from "./MemberMeasurementFormModal";

function formatDateTime(dateStr: unknown): string {
  if (typeof dateStr !== 'string') return "—";
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
    return new Intl.DateTimeFormat('tr-TR', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(dateObj);
  } catch (e) {
    return dateStr;
  }
}

export function AdminMemberProgressPage() {
  const { memberId } = useParams<{ memberId: string }>();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState<'measurements' | 'notes'>('measurements');
  const [deletedFilter, setDeletedFilter] = useState<'active' | 'deleted' | 'all'>('active');
  const [page, setPage] = useState(1);
  const [lastPage, setLastPage] = useState(1);
  const [total, setTotal] = useState(0);

  const [measurements, setMeasurements] = useState<MemberMeasurementListItem[]>([]);
  const [notesList, setNotesList] = useState<MemberProgressNoteListItem[]>([]);
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);
  const [selectedMeasurement, setSelectedMeasurement] = useState<MemberMeasurementDetail | null>(null);
  const [selectedNote, setSelectedNote] = useState<MemberProgressNoteDetail | null>(null);
  
  const [refreshKey, setRefreshKey] = useState(0);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create');
  const clearDetailSelection = () => {
    setSelectedId(null);
    setSelectedMeasurement(null);
    setSelectedNote(null);
    setDetailError(null);
    setDetailLoading(false);
  };

  const handleTabChange = (newTab: 'measurements' | 'notes') => {
    if (activeTab === newTab) return;
    setActiveTab(newTab);
    setPage(1);
    clearDetailSelection();
  };

  const handleFilterChange = (newFilter: 'active' | 'deleted' | 'all') => {
    if (deletedFilter === newFilter) return;
    setDeletedFilter(newFilter);
    setPage(1);
    clearDetailSelection();
  };

  const handlePageChange = (newPage: number) => {
    if (page === newPage) return;
    setPage(newPage);
    clearDetailSelection();
  };
  const handleArchive = async (id: number) => {
    if (!window.confirm('Bu ölçümü arşivlemek istediğinize emin misiniz?')) return;
    try {
      const res: unknown = await apiClient.delete(`/api/admin/member-measurements/${id}`);
      if (!isMemberProgressSuccessResponse(res)) {
        throw new Error('Sunucudan geçersiz yanıt döndü.');
      }
      clearDetailSelection();
      setRefreshKey(prev => prev + 1);
    } catch (err: unknown) {
      if (err instanceof ApiError) {
        alert(err.message);
      } else {
        alert('Arşivleme işlemi başarısız oldu.');
      }
    }
  };

  const handleRestore = async (id: number, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!window.confirm('Bu ölçümü geri yüklemek istediğinize emin misiniz?')) return;
    try {
      const res: unknown = await apiClient.post(`/api/admin/member-measurements/${id}/restore`, {});
      if (!isMemberProgressSuccessResponse(res)) {
        throw new Error('Sunucudan geçersiz yanıt döndü.');
      }
      setRefreshKey(prev => prev + 1);
    } catch (err: unknown) {
      if (err instanceof ApiError) {
        alert(err.message);
      } else {
        alert('Geri yükleme işlemi başarısız oldu.');
      }
    }
  };

  const handleModalSuccess = () => {
    setIsModalOpen(false);
    if (modalMode === 'create') {
      setActiveTab('measurements');
      setDeletedFilter('active');
      setPage(1);
      clearDetailSelection();
    } else {
      clearDetailSelection();
    }
    setRefreshKey(prev => prev + 1);
  };



  useEffect(() => {
    if (!memberId || !/^[1-9]\d*$/.test(memberId)) {
      setError("Geçersiz üye ID.");
      return;
    }

    let isSubscribed = true;
    setLoading(true);
    setError(null);
    setMeasurements([]);
    setNotesList([]);

    const fetchList = async () => {
      try {
        if (activeTab === 'measurements') {
          const res: unknown = await apiClient.get(`/api/admin/members/${memberId}/measurements?page=${page}&per_page=20&deleted=${deletedFilter}`);
          if (!isSubscribed) return;
          if (isMemberMeasurementListResponse(res)) {
            setMeasurements(res.items);
            setLastPage(res.pagination.last_page);
            setTotal(res.pagination.total);
          } else {
            setError("Sunucudan geçersiz veri döndü.");
          }
        } else {
          const res: unknown = await apiClient.get(`/api/admin/members/${memberId}/progress-notes?page=${page}&per_page=20&deleted=${deletedFilter}`);
          if (!isSubscribed) return;
          if (isMemberProgressNoteListResponse(res)) {
            setNotesList(res.items);
            setLastPage(res.pagination.last_page);
            setTotal(res.pagination.total);
          } else {
            setError("Sunucudan geçersiz veri döndü.");
          }
        }
      } catch (err: unknown) {
        if (!isSubscribed) return;
        if (err instanceof ApiError) {
          if (err.status === 404) setError("Üye bulunamadı.");
          else if (err.status === 403) setError("Bu alana erişim yetkiniz yok.");
          else setError(err.message);
        } else {
          setError("Bir hata oluştu.");
        }
      } finally {
        if (isSubscribed) setLoading(false);
      }
    };

    fetchList();
    return () => { isSubscribed = false; };
  }, [memberId, activeTab, deletedFilter, page, refreshKey]);



  const handleItemClick = (id: number, isDeleted: boolean) => {
    if (isDeleted) {
      clearDetailSelection();
      return;
    }
    if (selectedId === id) return;
    setSelectedId(id);
    setSelectedMeasurement(null);
    setSelectedNote(null);
    setDetailError(null);
  };

  useEffect(() => {
    if (!selectedId) {
      setDetailLoading(false);
      return;
    }
    
    let isSubscribed = true;
    setDetailLoading(true);

    const fetchDetail = async () => {
      try {
        if (activeTab === 'measurements') {
          const res: unknown = await apiClient.get(`/api/admin/member-measurements/${selectedId}`);
          if (!isSubscribed) return;
          if (isMemberMeasurementDetail(res)) {
            setSelectedMeasurement(res);
          } else {
            setDetailError("Sunucudan geçersiz veri döndü.");
          }
        } else {
          const res: unknown = await apiClient.get(`/api/admin/member-progress-notes/${selectedId}`);
          if (!isSubscribed) return;
          if (isMemberProgressNoteDetail(res)) {
            setSelectedNote(res);
          } else {
            setDetailError("Sunucudan geçersiz veri döndü.");
          }
        }
      } catch (err: unknown) {
        if (!isSubscribed) return;
        if (err instanceof ApiError) {
          if (err.status === 403) setDetailError("Bu alana erişim yetkiniz yok.");
          else setDetailError(err.message);
        } else {
          setDetailError("Bir hata oluştu.");
        }
      } finally {
        if (isSubscribed) setDetailLoading(false);
      }
    };

    fetchDetail();
    return () => { isSubscribed = false; };
  }, [selectedId, activeTab]);

  return (
    <div className="p-6 max-w-7xl mx-auto flex flex-col gap-6">
      <div className="flex items-center gap-4">
        <button
          onClick={() => navigate(`/admin/members/${memberId}`)}
          className="p-2 bg-gray-800 text-gray-300 hover:text-white rounded-lg transition"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-white">Gelişim Takibi</h1>
          <p className="text-sm text-gray-400">Üyenin ölçüm geçmişi ve genel gelişim notları</p>
        </div>
      </div>

      {error ? (
        <div className="bg-red-500/10 text-red-500 p-4 rounded-lg">
          {error}
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 flex flex-col gap-4">
            <div className="bg-gray-800/50 p-4 rounded-xl flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
              <div className="flex items-center gap-2 bg-gray-900 p-1 rounded-lg">
                <button
                  onClick={() => handleTabChange('measurements')}
                  className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition ${
                    activeTab === 'measurements' ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-gray-300'
                  }`}
                >
                  <Activity className="w-4 h-4" />
                  Ölçümler
                </button>
                <button
                  onClick={() => handleTabChange('notes')}
                  className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition ${
                    activeTab === 'notes' ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-gray-300'
                  }`}
                >
                  <FileText className="w-4 h-4" />
                  Gelişim Notları
                </button>
              </div>
              <select
                value={deletedFilter}
                onChange={(e) => {
                  const val = e.target.value;
                  if (val === 'active' || val === 'deleted' || val === 'all') {
                    handleFilterChange(val);
                  }
                }}
                className="bg-gray-900 border border-gray-700 text-white text-sm rounded-lg px-3 py-2 focus:outline-none focus:border-blue-500 transition"
              >
                <option value="active">Aktif Kayıtlar</option>
                <option value="deleted">Arşivlenmiş Kayıtlar</option>
                <option value="all">Tümü</option>
              </select>
              {activeTab === 'measurements' && (
                <button
                  onClick={() => {
                    setModalMode('create');
                    setIsModalOpen(true);
                  }}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md text-sm font-medium transition shadow-lg shadow-blue-500/20"
                >
                  <Plus className="w-4 h-4" />
                  Yeni Ölçüm
                </button>
              )}
            </div>

            <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden flex flex-col min-h-[400px]">
              {loading ? (
                <div className="flex-1 flex items-center justify-center p-8">
                  <div className="w-8 h-8 border-4 border-blue-500/20 border-t-blue-500 rounded-full animate-spin" />
                </div>
              ) : activeTab === 'measurements' ? (
                measurements.length === 0 ? (
                  <div className="flex-1 flex flex-col items-center justify-center p-8 text-gray-500">
                    <Activity className="w-12 h-12 mb-4 opacity-20" />
                    <p>Kayıt bulunamadı.</p>
                  </div>
                ) : (
                  <div className="flex-1 flex flex-col divide-y divide-gray-800/50">
                    {measurements.map(m => (
                      <div
                        key={m.id}
                        onClick={() => handleItemClick(m.id, !!m.deleted_at)}
                        className={`p-4 hover:bg-gray-800/50 transition cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
                          selectedId === m.id ? 'bg-gray-800/80 border-l-2 border-blue-500' : 'border-l-2 border-transparent'
                        }`}
                      >
                        <div>
                          <div className="text-sm font-medium text-white">{formatDateTime(m.measured_at)}</div>
                          {m.deleted_at && <span className="text-xs text-red-500 bg-red-500/10 px-2 py-0.5 rounded mt-1 inline-block">Arşivlenmiş</span>}
                        </div>
                        <div className="flex items-center gap-4 flex-wrap text-sm text-gray-400">
                          {m.deleted_at && (
                            <button
                              onClick={(e) => handleRestore(m.id, e)}
                              className="p-1.5 bg-gray-800 text-gray-400 hover:text-white rounded transition"
                              title="Geri Yükle"
                            >
                              <RotateCcw className="w-4 h-4" />
                            </button>
                          )}
                          <div>Kilo: <span className="text-white">{m.weight_kg !== null ? `${m.weight_kg} kg` : '—'}</span></div>
                          <div>Yağ: <span className="text-white">{m.body_fat_percent !== null ? `${m.body_fat_percent}%` : '—'}</span></div>
                          <div>Göğüs: <span className="text-white">{m.chest_cm !== null ? `${m.chest_cm} cm` : '—'}</span></div>
                          <div>Bel: <span className="text-white">{m.waist_cm !== null ? `${m.waist_cm} cm` : '—'}</span></div>
                          <div>Kol: <span className="text-white">{m.arm_cm !== null ? `${m.arm_cm} cm` : '—'}</span></div>
                        </div>
                      </div>
                    ))}
                  </div>
                )
              ) : (
                notesList.length === 0 ? (
                  <div className="flex-1 flex flex-col items-center justify-center p-8 text-gray-500">
                    <FileText className="w-12 h-12 mb-4 opacity-20" />
                    <p>Kayıt bulunamadı.</p>
                  </div>
                ) : (
                  <div className="flex-1 flex flex-col divide-y divide-gray-800/50">
                    {notesList.map(n => (
                      <div
                        key={n.id}
                        onClick={() => handleItemClick(n.id, !!n.deleted_at)}
                        className={`p-4 hover:bg-gray-800/50 transition cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
                          selectedId === n.id ? 'bg-gray-800/80 border-l-2 border-blue-500' : 'border-l-2 border-transparent'
                        }`}
                      >
                        <div>
                          <div className="text-sm font-medium text-white">{formatDateTime(n.recorded_at)}</div>
                          {n.deleted_at && <span className="text-xs text-red-500 bg-red-500/10 px-2 py-0.5 rounded mt-1 inline-block">Arşivlenmiş</span>}
                        </div>
                        <div className="text-xs text-gray-500">
                          Güncellenme: {formatDateTime(n.updated_at)}
                        </div>
                      </div>
                    ))}
                  </div>
                )
              )}

              {!loading && (activeTab === 'measurements' ? measurements.length > 0 : notesList.length > 0) && (
                <div className="p-4 border-t border-gray-800 bg-gray-900 flex items-center justify-between text-sm">
                  <div className="text-gray-500">Toplam {total} kayıt &bull; Sayfa {page} / {lastPage}</div>
                  <div className="flex gap-2">
                    <button
                      disabled={page <= 1}
                      onClick={() => handlePageChange(Math.max(1, page - 1))}
                      className="p-1.5 bg-gray-800 text-gray-300 rounded hover:text-white disabled:opacity-50 transition"
                    >
                      <ChevronLeft className="w-5 h-5" />
                    </button>
                    <button
                      disabled={page >= lastPage}
                      onClick={() => handlePageChange(Math.min(lastPage, page + 1))}
                      className="p-1.5 bg-gray-800 text-gray-300 rounded hover:text-white disabled:opacity-50 transition"
                    >
                      <ChevronRight className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="lg:col-span-1">
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 min-h-[400px] sticky top-6">
              {!selectedId ? (
                <div className="h-full flex flex-col items-center justify-center text-gray-500 text-sm text-center">
                  Detayları görüntülemek için sol taraftan aktif bir kayıt seçin.
                </div>
              ) : detailLoading ? (
                <div className="h-full flex items-center justify-center p-8">
                  <div className="w-8 h-8 border-4 border-blue-500/20 border-t-blue-500 rounded-full animate-spin" />
                </div>
              ) : detailError ? (
                <div className="bg-red-500/10 text-red-500 p-4 rounded-lg text-sm">
                  {detailError}
                </div>
              ) : (
                <div className="flex flex-col gap-6">
                  {activeTab === 'measurements' && selectedMeasurement && (
                    <>
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <h3 className="text-lg font-bold text-white mb-1">Ölçüm Detayı</h3>
                          <div className="text-sm text-gray-400">{formatDateTime(selectedMeasurement.measured_at)}</div>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => {
                              setModalMode('edit');
                              setIsModalOpen(true);
                            }}
                            className="p-2 bg-gray-800 text-gray-300 hover:text-white hover:bg-gray-700 rounded-lg transition flex items-center gap-2 text-sm"
                          >
                            <Edit2 className="w-4 h-4" />
                            <span className="hidden sm:inline">Düzenle</span>
                          </button>
                          <button
                            onClick={() => handleArchive(selectedMeasurement.id)}
                            className="p-2 bg-red-500/10 text-red-500 hover:bg-red-500/20 rounded-lg transition flex items-center gap-2 text-sm"
                          >
                            <Trash2 className="w-4 h-4" />
                            <span className="hidden sm:inline">Arşivle</span>
                          </button>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="bg-gray-800/50 p-3 rounded-lg">
                          <div className="text-xs text-gray-500 mb-1">Kilo</div>
                          <div className="font-medium text-white">{selectedMeasurement.weight_kg !== null ? `${selectedMeasurement.weight_kg} kg` : '—'}</div>
                        </div>
                        <div className="bg-gray-800/50 p-3 rounded-lg">
                          <div className="text-xs text-gray-500 mb-1">Yağ Oranı</div>
                          <div className="font-medium text-white">{selectedMeasurement.body_fat_percent !== null ? `${selectedMeasurement.body_fat_percent}%` : '—'}</div>
                        </div>
                        <div className="bg-gray-800/50 p-3 rounded-lg">
                          <div className="text-xs text-gray-500 mb-1">Göğüs</div>
                          <div className="font-medium text-white">{selectedMeasurement.chest_cm !== null ? `${selectedMeasurement.chest_cm} cm` : '—'}</div>
                        </div>
                        <div className="bg-gray-800/50 p-3 rounded-lg">
                          <div className="text-xs text-gray-500 mb-1">Bel</div>
                          <div className="font-medium text-white">{selectedMeasurement.waist_cm !== null ? `${selectedMeasurement.waist_cm} cm` : '—'}</div>
                        </div>
                        <div className="bg-gray-800/50 p-3 rounded-lg">
                          <div className="text-xs text-gray-500 mb-1">Kalça</div>
                          <div className="font-medium text-white">{selectedMeasurement.hip_cm !== null ? `${selectedMeasurement.hip_cm} cm` : '—'}</div>
                        </div>
                        <div className="bg-gray-800/50 p-3 rounded-lg">
                          <div className="text-xs text-gray-500 mb-1">Kol</div>
                          <div className="font-medium text-white">{selectedMeasurement.arm_cm !== null ? `${selectedMeasurement.arm_cm} cm` : '—'}</div>
                        </div>
                        <div className="bg-gray-800/50 p-3 rounded-lg">
                          <div className="text-xs text-gray-500 mb-1">Bacak</div>
                          <div className="font-medium text-white">{selectedMeasurement.thigh_cm !== null ? `${selectedMeasurement.thigh_cm} cm` : '—'}</div>
                        </div>
                      </div>
                      <div>
                        <div className="text-sm font-medium text-white mb-2">Notlar</div>
                        {selectedMeasurement.notes ? (
                          <div className="text-sm text-gray-300 bg-gray-800/30 p-4 rounded-lg whitespace-pre-wrap">
                            {selectedMeasurement.notes}
                          </div>
                        ) : (
                          <div className="text-sm text-gray-500 italic">Bu ölçüm için not girilmemiş.</div>
                        )}
                      </div>
                    </>
                  )}
                  {activeTab === 'notes' && selectedNote && (
                    <>
                      <div>
                        <h3 className="text-lg font-bold text-white mb-1">Gelişim Notu Detayı</h3>
                        <div className="text-sm text-gray-400">{formatDateTime(selectedNote.recorded_at)}</div>
                      </div>
                      <div>
                        <div className="text-sm text-gray-300 bg-gray-800/30 p-4 rounded-lg whitespace-pre-wrap">
                          {selectedNote.note}
                        </div>
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
      {isModalOpen && (
        <MemberMeasurementFormModal
          memberId={parseInt(memberId!, 10)}
          initialData={modalMode === 'edit' ? (selectedMeasurement || undefined) : undefined}
          onClose={() => setIsModalOpen(false)}
          onSuccess={handleModalSuccess}
        />
      )}
    </div>
  );
}
