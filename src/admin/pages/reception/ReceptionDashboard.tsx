import React, { useState, useEffect, useCallback, useRef } from "react";
import { apiClient, ApiError } from "../../api/client";
import { 
  ReceptionOccupancyResponse, 
  ReceptionSearchResponse, 
  ReceptionOccupancyItem, 
  ReceptionMemberSearchItem,
  ReceptionCheckInResponse,
  ReceptionCheckOutResponse
} from "./types";
import { Search, RotateCcw, AlertTriangle, Users } from "lucide-react";

// Runtime Validators

function validateOccupancyResponse(data: any): ReceptionOccupancyResponse {
  if (!data || typeof data !== 'object') throw new Error('Invalid occupancy response');
  if (typeof data.current_count !== 'number' || data.current_count < 0 || !Number.isInteger(data.current_count)) {
    throw new Error('Invalid current_count');
  }
  if (typeof data.stale_count !== 'number' || data.stale_count < 0 || !Number.isInteger(data.stale_count)) {
    throw new Error('Invalid stale_count');
  }
  if (data.stale_count > data.current_count) {
    throw new Error('stale_count cannot exceed current_count');
  }
  if (!Array.isArray(data.items)) {
    throw new Error('Invalid items array');
  }

  const items = data.items.map((item: any): ReceptionOccupancyItem => {
    if (!item || typeof item !== 'object') throw new Error('Invalid item object');
    
    const visit = item.visit;
    if (!visit || typeof visit !== 'object') throw new Error('Invalid visit object');
    if (typeof visit.id !== 'number' || visit.id <= 0 || !Number.isInteger(visit.id)) throw new Error('Invalid visit id');
    if (typeof visit.uuid !== 'string' || visit.uuid === '') throw new Error('Invalid visit uuid');
    if (typeof visit.checked_in_at !== 'string' || visit.checked_in_at === '') throw new Error('Invalid checked_in_at');

    const member = item.member;
    if (!member || typeof member !== 'object') throw new Error('Invalid member object');
    if (typeof member.id !== 'number' || member.id <= 0 || !Number.isInteger(member.id)) throw new Error('Invalid member id');
    if (typeof member.uuid !== 'string' || member.uuid === '') throw new Error('Invalid member uuid');
    if (typeof member.first_name !== 'string') throw new Error('Invalid member first_name');
    if (typeof member.last_name !== 'string') throw new Error('Invalid member last_name');
    
    if (typeof item.is_stale !== 'boolean') throw new Error('Invalid is_stale boolean');

    return {
      visit: {
        id: visit.id,
        uuid: visit.uuid,
        checked_in_at: visit.checked_in_at
      },
      member: {
        id: member.id,
        uuid: member.uuid,
        first_name: member.first_name,
        last_name: member.last_name
      },
      is_stale: item.is_stale
    };
  });

  return {
    current_count: data.current_count,
    stale_count: data.stale_count,
    items
  };
}

function validateSearchResponse(data: any): ReceptionSearchResponse {
  if (!data || typeof data !== 'object') throw new Error('Invalid search response');
  if (!Array.isArray(data.items)) throw new Error('Invalid search items array');

  const items = data.items.map((item: any): ReceptionMemberSearchItem => {
    if (!item || typeof item !== 'object') throw new Error('Invalid search item object');
    if (typeof item.id !== 'number' || item.id <= 0 || !Number.isInteger(item.id)) throw new Error('Invalid id');
    if (typeof item.uuid !== 'string' || item.uuid === '') throw new Error('Invalid uuid');
    if (typeof item.first_name !== 'string') throw new Error('Invalid first_name');
    if (typeof item.last_name !== 'string') throw new Error('Invalid last_name');
    if (typeof item.phone !== 'string') throw new Error('Invalid phone');
    if (item.status !== 'active' && item.status !== 'inactive') throw new Error('Invalid status');
    
    if (item.membership_start_date !== null && typeof item.membership_start_date !== 'string') throw new Error('Invalid membership_start_date');
    if (item.membership_end_date !== null && typeof item.membership_end_date !== 'string') throw new Error('Invalid membership_end_date');

    return {
      id: item.id,
      uuid: item.uuid,
      first_name: item.first_name,
      last_name: item.last_name,
      phone: item.phone,
      status: item.status,
      membership_start_date: item.membership_start_date,
      membership_end_date: item.membership_end_date
    };
  });

  return { items };
}

function validateCheckInResponse(data: any): ReceptionCheckInResponse {
  if (!data || typeof data !== 'object') throw new Error('Invalid check-in response');
  const visit = data.visit;
  if (!visit || typeof visit !== 'object') throw new Error('Invalid check-in visit object');
  if (typeof visit.id !== 'number' || visit.id <= 0 || !Number.isInteger(visit.id)) throw new Error('Invalid check-in visit id');
  if (typeof visit.uuid !== 'string' || visit.uuid === '') throw new Error('Invalid check-in visit uuid');
  if (typeof visit.member_id !== 'number' || visit.member_id <= 0 || !Number.isInteger(visit.member_id)) throw new Error('Invalid check-in member_id');
  if (typeof visit.checked_in_at !== 'string' || visit.checked_in_at === '') throw new Error('Invalid check-in checked_in_at');

  return {
    visit: {
      id: visit.id,
      uuid: visit.uuid,
      member_id: visit.member_id,
      checked_in_at: visit.checked_in_at
    }
  };
}

function validateCheckOutResponse(data: any): ReceptionCheckOutResponse {
  if (!data || typeof data !== 'object') throw new Error('Invalid check-out response');
  const visit = data.visit;
  if (!visit || typeof visit !== 'object') throw new Error('Invalid check-out visit object');
  if (typeof visit.id !== 'number' || visit.id <= 0 || !Number.isInteger(visit.id)) throw new Error('Invalid check-out visit id');
  if (typeof visit.uuid !== 'string' || visit.uuid === '') throw new Error('Invalid check-out visit uuid');
  if (typeof visit.member_id !== 'number' || visit.member_id <= 0 || !Number.isInteger(visit.member_id)) throw new Error('Invalid check-out member_id');
  if (typeof visit.checked_in_at !== 'string' || visit.checked_in_at === '') throw new Error('Invalid check-out checked_in_at');
  if (typeof visit.checked_out_at !== 'string' || visit.checked_out_at === '') throw new Error('Invalid check-out checked_out_at');

  return {
    visit: {
      id: visit.id,
      uuid: visit.uuid,
      member_id: visit.member_id,
      checked_in_at: visit.checked_in_at,
      checked_out_at: visit.checked_out_at
    }
  };
}

// Format date helper
function formatDateTime(dateStr: string) {
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return new Intl.DateTimeFormat('tr-TR', {
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit'
    }).format(d);
  } catch {
    return dateStr;
  }
}

function formatDate(dateStr: string) {
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return new Intl.DateTimeFormat('tr-TR', {
      day: '2-digit', month: '2-digit', year: 'numeric'
    }).format(d);
  } catch {
    return dateStr;
  }
}

export function ReceptionDashboard() {
  const [occupancy, setOccupancy] = useState<ReceptionOccupancyResponse | null>(null);
  const [occupancyLoading, setOccupancyLoading] = useState(true);
  const [occupancyError, setOccupancyError] = useState<string | null>(null);

  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<ReceptionMemberSearchItem[] | null>(null);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [localValidationError, setLocalValidationError] = useState<string | null>(null);

  const [activeMutation, setActiveMutation] = useState<{ memberId: number; kind: 'check-in' | 'check-out' } | null>(null);
  const [mutationFeedback, setMutationFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const isMountedRef = useRef(true);
  const mutationAbortRef = useRef<AbortController | null>(null);
  const occupancyAbortRef = useRef<AbortController | null>(null);
  const searchAbortRef = useRef<AbortController | null>(null);
  const searchTimeoutRef = useRef<number | null>(null);
  const searchGenerationRef = useRef<number>(0);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      if (mutationAbortRef.current) mutationAbortRef.current.abort();
    };
  }, []);

  const fetchOccupancy = useCallback(async () => {
    if (occupancyAbortRef.current) {
      occupancyAbortRef.current.abort();
    }
    const abortController = new AbortController();
    occupancyAbortRef.current = abortController;

    setOccupancyLoading(true);
    setOccupancyError(null);

    try {
      const response = await apiClient.get('/api/reception/occupancy', {
        signal: abortController.signal
      });
      const validated = validateOccupancyResponse(response);
      setOccupancy(validated);
    } catch (err: unknown) {
      if (abortController.signal.aborted) return;
      
      let errMsg = "Resepsiyon verileri alınamadı.";
      if (err instanceof ApiError) {
        if (err.status === 401) {
          // Handled globally
        } else if (err.status === 403) {
          errMsg = "Bu ekran için yetkiniz yok.";
        } else {
          errMsg = "Sunucudan beklenmeyen bir yanıt alındı.";
        }
      } else if (err instanceof Error && err.message.includes('Invalid')) {
        errMsg = "Sunucudan beklenmeyen bir yanıt alındı.";
      }
      setOccupancyError(errMsg);
    } finally {
      if (!abortController.signal.aborted) {
        setOccupancyLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    fetchOccupancy();
    return () => {
      if (occupancyAbortRef.current) occupancyAbortRef.current.abort();
    };
  }, [fetchOccupancy]);

  const performSearch = useCallback(async (q: string, generation: number) => {
    const abortController = new AbortController();
    searchAbortRef.current = abortController;

    setSearchLoading(true);
    setSearchError(null);

    try {
      const encodedQ = encodeURIComponent(q);
      const response = await apiClient.get(`/api/reception/members?q=${encodedQ}`, {
        signal: abortController.signal
      });
      const validated = validateSearchResponse(response);
      
      if (abortController.signal.aborted || searchGenerationRef.current !== generation) return;

      setSearchResults(validated.items);
    } catch (err: unknown) {
      if (abortController.signal.aborted || searchGenerationRef.current !== generation) return;
      
      let errMsg = "Arama sonuçları alınamadı.";
      if (err instanceof ApiError) {
        if (err.status === 401) {
          // Handled globally
        } else if (err.status === 403) {
          errMsg = "Bu işlem için yetkiniz yok.";
        } else if (err.status === 422) {
          errMsg = "Arama bilgisi geçersiz.";
        } else {
          errMsg = "Sunucudan beklenmeyen bir yanıt alındı.";
        }
      } else if (err instanceof Error && err.message.includes('Invalid')) {
        errMsg = "Sunucudan beklenmeyen bir yanıt alındı.";
      }
      setSearchError(errMsg);
      setSearchResults(null);
    } finally {
      if (!abortController.signal.aborted && searchGenerationRef.current === generation) {
        setSearchLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    const currentGeneration = ++searchGenerationRef.current;
    
    if (searchAbortRef.current) {
      searchAbortRef.current.abort();
    }

    const trimmed = searchQuery.trim();
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    if (trimmed.length === 0 || trimmed.length === 1) {
      setSearchResults(null);
      setSearchError(null);
      setLocalValidationError(null);
      setSearchLoading(false);
      return;
    }

    if (trimmed.length > 80) {
      setSearchResults(null);
      setSearchError(null);
      setSearchLoading(false);
      setLocalValidationError("Arama terimi çok uzun.");
      return;
    }

    setLocalValidationError(null);

    searchTimeoutRef.current = window.setTimeout(() => {
      performSearch(trimmed, currentGeneration);
    }, 350);

    return () => {
      if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
      if (searchAbortRef.current) searchAbortRef.current.abort();
    };
  }, [searchQuery, performSearch]);

  const handleCheckIn = useCallback(async (memberId: number) => {
    if (activeMutation) return;

    if (mutationAbortRef.current) {
      mutationAbortRef.current.abort();
    }
    const abortController = new AbortController();
    mutationAbortRef.current = abortController;

    setActiveMutation({ memberId, kind: 'check-in' });
    setMutationFeedback(null);

    let rawResponse: any;
    let contractValidationFailed = false;

    try {
      rawResponse = await apiClient.post(
        `/api/reception/members/${memberId}/check-in`,
        {},
        { signal: abortController.signal }
      );
    } catch (err: unknown) {
      if (abortController.signal.aborted || !isMountedRef.current) return;

      let errMsg = "Giriş işlemi tamamlanamadı.";
      let shouldRefreshOccupancy = false;

      if (err instanceof ApiError) {
        if (err.code === 'MEMBER_INACTIVE') {
          errMsg = "Üye pasif durumda. Giriş yapılamaz.";
        } else if (err.code === 'MEMBERSHIP_EXPIRED') {
          errMsg = "Üyelik süresi dolmuş. Giriş yapılamaz.";
        } else if (err.code === 'MEMBER_ALREADY_CHECKED_IN') {
          errMsg = "Üyenin zaten açık bir girişi bulunuyor.";
          shouldRefreshOccupancy = true;
        } else if (err.status === 404) {
          errMsg = "Üye bulunamadı.";
        } else if (err.status === 403) {
          errMsg = "Bu işlem için yetkiniz yok.";
        } else if (err.status === 422) {
          errMsg = "Giriş isteği geçersiz.";
        } else {
          errMsg = "Giriş işlemi tamamlanamadı.";
        }
      }

      setMutationFeedback({ type: 'error', message: errMsg });
      setActiveMutation(null);

      if (shouldRefreshOccupancy) {
        fetchOccupancy();
      }
      return;
    }

    try {
      validateCheckInResponse(rawResponse);
    } catch {
      contractValidationFailed = true;
    }

    if (!isMountedRef.current) return;

    if (contractValidationFailed) {
      setMutationFeedback({
        type: 'error',
        message: "İşlem sonucu doğrulanamadı. Salon durumu yenileniyor."
      });
      setActiveMutation(null);
      fetchOccupancy();
      return;
    }

    setMutationFeedback({ type: 'success', message: "Giriş kaydedildi." });
    setActiveMutation(null);
    fetchOccupancy();
  }, [activeMutation, fetchOccupancy]);

  const handleCheckOut = useCallback(async (memberId: number) => {
    if (activeMutation) return;

    if (mutationAbortRef.current) {
      mutationAbortRef.current.abort();
    }
    const abortController = new AbortController();
    mutationAbortRef.current = abortController;

    setActiveMutation({ memberId, kind: 'check-out' });
    setMutationFeedback(null);

    let rawResponse: any;
    let contractValidationFailed = false;

    try {
      rawResponse = await apiClient.post(
        `/api/reception/members/${memberId}/check-out`,
        {},
        { signal: abortController.signal }
      );
    } catch (err: unknown) {
      if (abortController.signal.aborted || !isMountedRef.current) return;

      let errMsg = "Çıkış işlemi tamamlanamadı.";
      let shouldRefreshOccupancy = false;

      if (err instanceof ApiError) {
        if (err.code === 'MEMBER_NOT_CHECKED_IN') {
          errMsg = "Üyenin açık bir girişi bulunmuyor.";
          shouldRefreshOccupancy = true;
        } else if (err.status === 404) {
          errMsg = "Üye bulunamadı.";
        } else if (err.status === 403) {
          errMsg = "Bu işlem için yetkiniz yok.";
        } else if (err.status === 422) {
          errMsg = "Çıkış isteği geçersiz.";
        } else {
          errMsg = "Çıkış işlemi tamamlanamadı.";
        }
      }

      setMutationFeedback({ type: 'error', message: errMsg });
      setActiveMutation(null);

      if (shouldRefreshOccupancy) {
        fetchOccupancy();
      }
      return;
    }

    try {
      validateCheckOutResponse(rawResponse);
    } catch {
      contractValidationFailed = true;
    }

    if (!isMountedRef.current) return;

    if (contractValidationFailed) {
      setMutationFeedback({
        type: 'error',
        message: "İşlem sonucu doğrulanamadı. Salon durumu yenileniyor."
      });
      setActiveMutation(null);
      fetchOccupancy();
      return;
    }

    setMutationFeedback({ type: 'success', message: "Çıkış kaydedildi." });
    setActiveMutation(null);
    fetchOccupancy();
  }, [activeMutation, fetchOccupancy]);

  const openMemberIds = new Set(occupancy?.items.map((item) => item.member.id) ?? []);

  return (
    <div className="space-y-8">
      {/* Metrics Header */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white/5 border border-white/10 rounded-xl p-6 flex items-center justify-between">
          <div>
            <p className="text-white/50 text-sm font-medium mb-1">İçerideki Üye</p>
            <h3 className="text-3xl font-bold text-white">
              {occupancyLoading && !occupancy ? "-" : occupancy?.current_count ?? "-"}
            </h3>
          </div>
          <div className="bg-blue-500/10 p-3 rounded-lg border border-blue-500/20">
            <Users className="w-6 h-6 text-blue-400" />
          </div>
        </div>

        <div className="bg-white/5 border border-white/10 rounded-xl p-6 flex items-center justify-between">
          <div>
            <p className="text-white/50 text-sm font-medium mb-1">Eski Açık Giriş</p>
            <h3 className="text-3xl font-bold text-white">
              {occupancyLoading && !occupancy ? "-" : occupancy?.stale_count ?? "-"}
            </h3>
          </div>
          <div className="bg-amber-500/10 p-3 rounded-lg border border-amber-500/20">
            <AlertTriangle className="w-6 h-6 text-amber-400" />
          </div>
        </div>
      </div>

      {/* Mutation Feedback */}
      {mutationFeedback && (
        <div className={`p-4 rounded-xl text-sm border flex items-center justify-between ${
          mutationFeedback.type === 'success'
            ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
            : 'bg-red-500/10 border-red-500/20 text-red-400'
        }`}>
          <span>{mutationFeedback.message}</span>
          <button
            type="button"
            onClick={() => setMutationFeedback(null)}
            className="text-white/40 hover:text-white text-xs font-medium ml-4 transition-colors"
          >
            Kapat
          </button>
        </div>
      )}

      {/* Main Content Sections */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* Occupancy Section */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold">Anlık Salon Durumu</h2>
            <button 
              onClick={fetchOccupancy}
              disabled={occupancyLoading}
              className="flex items-center space-x-2 px-3 py-1.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
            >
              <RotateCcw className={`w-4 h-4 ${occupancyLoading ? 'animate-spin' : ''}`} />
              <span>Yenile</span>
            </button>
          </div>

          <div className="bg-white/5 border border-white/10 rounded-xl overflow-hidden min-h-[300px]">
            {occupancyLoading && !occupancy ? (
              <div className="p-8 text-center text-white/50">Yükleniyor...</div>
            ) : occupancyError ? (
              <div className="p-8 text-center text-red-400">{occupancyError}</div>
            ) : occupancy && occupancy.items.length === 0 ? (
              <div className="p-8 text-center text-white/50">Şu anda içeride görünen üye yok.</div>
            ) : (
              <div className="divide-y divide-white/10">
                {occupancy?.items.map((item) => {
                  const isThisMemberMutating = activeMutation?.memberId === item.member.id;

                  return (
                    <div key={item.visit.id} className="p-4 flex items-center justify-between hover:bg-white/5 transition-colors">
                      <div>
                        <div className="font-medium text-white">
                          {item.member.first_name} {item.member.last_name}
                        </div>
                        <div className="text-sm text-white/50 mt-1">
                          Giriş: {formatDateTime(item.visit.checked_in_at)}
                        </div>
                      </div>
                      <div className="flex items-center space-x-3">
                        {item.is_stale && (
                          <span className="inline-flex items-center px-2 py-1 rounded-md bg-amber-500/10 text-amber-400 text-xs border border-amber-500/20 whitespace-nowrap">
                            Önceki günden açık giriş
                          </span>
                        )}
                        <button
                          type="button"
                          onClick={() => handleCheckOut(item.member.id)}
                          disabled={activeMutation !== null}
                          className="px-3 py-1.5 bg-white/10 hover:bg-white/15 border border-white/20 rounded-lg text-xs font-medium text-white transition-colors disabled:opacity-50 flex items-center space-x-1.5 whitespace-nowrap"
                        >
                          {isThisMemberMutating && activeMutation?.kind === 'check-out' ? (
                            <>
                              <RotateCcw className="w-3.5 h-3.5 animate-spin" />
                              <span>Çıkış yapılıyor...</span>
                            </>
                          ) : (
                            <span>Çıkış Yap</span>
                          )}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Search Section */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold">Üye Ara</h2>
          </div>

          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/30" />
            <input
              type="text"
              placeholder="İsim, soyisim, telefon veya UUID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-xl pl-12 pr-4 py-3 text-white placeholder-white/30 focus:outline-none focus:border-white/30 transition-colors"
            />
          </div>

          {localValidationError && (
            <div className="text-amber-400 text-sm mt-2">{localValidationError}</div>
          )}

          <div className="bg-white/5 border border-white/10 rounded-xl overflow-hidden min-h-[300px]">
            {searchLoading ? (
              <div className="p-8 text-center text-white/50">Aranıyor...</div>
            ) : searchError ? (
              <div className="p-8 text-center text-red-400">{searchError}</div>
            ) : searchResults ? (
              searchResults.length === 0 ? (
                <div className="p-8 text-center text-white/50">Sonuç bulunamadı.</div>
              ) : (
                <div className="divide-y divide-white/10 max-h-[600px] overflow-y-auto">
                  {searchResults.map((member) => {
                    const hasOpenVisit = openMemberIds.has(member.id);
                    const isThisMemberMutating = activeMutation?.memberId === member.id;

                    return (
                      <div key={member.id} className="p-4 hover:bg-white/5 transition-colors">
                        <div className="flex justify-between items-start mb-2">
                          <div className="font-medium text-white">
                            {member.first_name} {member.last_name}
                          </div>
                          <span className={`px-2 py-1 rounded-md text-xs border ${
                            member.status === 'active' 
                              ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' 
                              : 'bg-white/5 text-white/50 border-white/10'
                          }`}>
                            {member.status === 'active' ? 'Aktif' : 'Pasif'}
                          </span>
                        </div>
                        <div className="flex items-end justify-between mt-3 pt-2 border-t border-white/5">
                          <div className="space-y-1 text-sm text-white/50">
                            {member.phone && <div>Telefon: {member.phone}</div>}
                            <div>
                              Başlangıç: {member.membership_start_date ? formatDate(member.membership_start_date) : '-'}
                            </div>
                            <div>
                              Bitiş: {member.membership_end_date ? formatDate(member.membership_end_date) : 'Bitiş tarihi tanımlı değil'}
                            </div>
                          </div>

                          <div className="flex items-center space-x-2 shrink-0 ml-4">
                            {hasOpenVisit ? (
                              <button
                                type="button"
                                onClick={() => handleCheckOut(member.id)}
                                disabled={activeMutation !== null}
                                className="px-3 py-1.5 bg-white/10 hover:bg-white/15 border border-white/20 rounded-lg text-xs font-medium text-white transition-colors disabled:opacity-50 flex items-center space-x-1.5 whitespace-nowrap"
                              >
                                {isThisMemberMutating && activeMutation?.kind === 'check-out' ? (
                                  <>
                                    <RotateCcw className="w-3.5 h-3.5 animate-spin" />
                                    <span>Çıkış yapılıyor...</span>
                                  </>
                                ) : (
                                  <span>Çıkış Yap</span>
                                )}
                              </button>
                            ) : member.status === 'inactive' ? (
                              <div className="flex items-center space-x-2">
                                <span className="text-xs text-white/40">Pasif üye</span>
                                <button
                                  type="button"
                                  disabled
                                  className="px-3 py-1.5 bg-white/5 border border-white/10 rounded-lg text-xs font-medium text-white/30 cursor-not-allowed whitespace-nowrap"
                                >
                                  Giriş Yap
                                </button>
                              </div>
                            ) : (
                              <button
                                type="button"
                                onClick={() => handleCheckIn(member.id)}
                                disabled={activeMutation !== null}
                                className="px-3 py-1.5 bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/30 rounded-lg text-xs font-medium text-emerald-400 transition-colors disabled:opacity-50 flex items-center space-x-1.5 whitespace-nowrap"
                              >
                                {isThisMemberMutating && activeMutation?.kind === 'check-in' ? (
                                  <>
                                    <RotateCcw className="w-3.5 h-3.5 animate-spin" />
                                    <span>Giriş yapılıyor...</span>
                                  </>
                                ) : (
                                  <span>Giriş Yap</span>
                                )}
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )
            ) : (
              <div className="p-8 text-center text-white/50">Arama yapmak için isim, soyisim veya telefon numarası girin.</div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
