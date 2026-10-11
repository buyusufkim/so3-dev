import { useState, useEffect, useRef, useCallback } from 'react';
import { User, Phone, Shield, AlertCircle, Edit3, CheckCircle2 } from 'lucide-react';
import { memberApiClient } from '../api/client';
import type { MemberProfileResponse } from '../api/validators';

function formatValue(value: string | null | undefined): string {
  if (!value || typeof value !== 'string' || value.trim() === '') {
    return 'Belirtilmemiş';
  }
  return value.trim();
}

function formatAccountStatus(status: string | null | undefined): { label: string; badgeClass: string } {
  if (!status || typeof status !== 'string') {
    return { label: 'Belirtilmemiş', badgeClass: 'bg-white/10 text-white/70 border-white/10' };
  }
  const normalized = status.trim().toLowerCase();
  if (normalized === 'active') {
    return { label: 'Aktif', badgeClass: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' };
  }
  return { label: 'Belirtilmemiş', badgeClass: 'bg-white/10 text-white/70 border-white/10' };
}

export function MemberProfilePage() {
  const [profileData, setProfileData] = useState<MemberProfileResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Editing state
  const [isEditing, setIsEditing] = useState(false);
  const [editEmail, setEditEmail] = useState('');
  const [editEmergencyName, setEditEmergencyName] = useState('');
  const [editEmergencyPhone, setEditEmergencyPhone] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const abortControllerRef = useRef<AbortController | null>(null);
  const patchAbortControllerRef = useRef<AbortController | null>(null);
  const requestGenerationRef = useRef(0);
  const patchGenerationRef = useRef(0);
  const isMountedRef = useRef(true);
  const isSubmittingRef = useRef(false);

  const fetchProfile = useCallback(async () => {
    abortControllerRef.current?.abort();

    const controller = new AbortController();
    abortControllerRef.current = controller;
    const generation = ++requestGenerationRef.current;

    setLoading(true);
    setError('');

    try {
      const data = await memberApiClient.getProfile(controller.signal);

      if (!isMountedRef.current || generation !== requestGenerationRef.current) {
        return;
      }

      setProfileData(data);
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') {
        return;
      }
      if (!isMountedRef.current || generation !== requestGenerationRef.current) {
        return;
      }
      setError('Hesap bilgilerin yüklenemedi.');
    } finally {
      if (isMountedRef.current && generation === requestGenerationRef.current) {
        setLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    isMountedRef.current = true;
    fetchProfile();

    return () => {
      isMountedRef.current = false;
      abortControllerRef.current?.abort();
      patchAbortControllerRef.current?.abort();
    };
  }, [fetchProfile]);

  const handleStartEdit = () => {
    if (!profileData) return;
    setEditEmail(profileData.profile.email ?? '');
    setEditEmergencyName(profileData.profile.emergency_contact_name ?? '');
    setEditEmergencyPhone(profileData.profile.emergency_contact_phone ?? '');
    setFormError('');
    setSuccessMessage('');
    setIsEditing(true);
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setFormError('');
  };

  // Check if form values actually changed compared to current profile
  const isFormDirty = (() => {
    if (!profileData) return false;
    const initialEmail = profileData.profile.email ?? '';
    const initialName = profileData.profile.emergency_contact_name ?? '';
    const initialPhone = profileData.profile.emergency_contact_phone ?? '';

    return (
      editEmail.trim() !== initialEmail.trim() ||
      editEmergencyName.trim() !== initialName.trim() ||
      editEmergencyPhone.trim() !== initialPhone.trim()
    );
  })();

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();

    // Prevent duplicate submission via ref lock
    if (isSubmittingRef.current || submitting) return;

    // Reject if no changes made
    if (!isFormDirty) {
      setIsEditing(false);
      return;
    }

    isSubmittingRef.current = true;
    setSubmitting(true);
    setFormError('');
    setSuccessMessage('');

    patchAbortControllerRef.current?.abort();
    const patchController = new AbortController();
    patchAbortControllerRef.current = patchController;
    const pGen = ++patchGenerationRef.current;

    const payload = {
      email: editEmail.trim() ? editEmail.trim() : null,
      emergency_contact_name: editEmergencyName.trim() ? editEmergencyName.trim() : null,
      emergency_contact_phone: editEmergencyPhone.trim() ? editEmergencyPhone.trim() : null
    };

    try {
      const updated = await memberApiClient.updateProfile(payload, patchController.signal);

      if (!isMountedRef.current || pGen !== patchGenerationRef.current) return;

      // Invalidate any background GET requests that might overwrite with stale data
      requestGenerationRef.current++;

      setProfileData(updated);
      setIsEditing(false);
      setSuccessMessage('Bilgilerin güncellendi.');
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') return;
      if (!isMountedRef.current || pGen !== patchGenerationRef.current) return;

      setFormError('Bilgilerin güncellenemedi.');
    } finally {
      if (isMountedRef.current && pGen === patchGenerationRef.current) {
        setSubmitting(false);
      }
      isSubmittingRef.current = false;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white">Hesabım</h1>
          <p className="text-sm text-white/60 mt-1">
            Hesap ve iletişim bilgilerini görüntüle.
          </p>
        </div>

        {profileData && !loading && !error && !isEditing && (
          <button
            type="button"
            onClick={handleStartEdit}
            className="min-h-[44px] px-4 py-2 bg-white/5 hover:bg-white/10 text-white text-sm font-medium rounded-lg border border-white/10 transition-colors inline-flex items-center justify-center gap-2 cursor-pointer self-start sm:self-auto"
          >
            <Edit3 className="w-4 h-4 text-[#851C35]" />
            Bilgilerimi Düzenle
          </button>
        )}
      </div>

      {successMessage && !isEditing && (
        <div className="rounded-xl border border-emerald-500/20 bg-emerald-950/20 p-4 flex items-center gap-3">
          <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
          <p className="text-sm text-emerald-300 font-medium">{successMessage}</p>
        </div>
      )}

      {error ? (
        <div className="rounded-xl border border-red-500/20 bg-red-950/20 p-6 text-center">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-red-500/10 text-red-400 mb-3">
            <AlertCircle className="w-6 h-6" />
          </div>
          <p className="text-sm text-red-400 mb-4">{error}</p>
          <button
            type="button"
            onClick={fetchProfile}
            className="min-h-[44px] px-5 py-2.5 bg-[#851C35] hover:bg-[#851C35]/90 text-white text-sm font-medium rounded-lg transition-colors inline-flex items-center justify-center cursor-pointer"
          >
            Tekrar Dene
          </button>
        </div>
      ) : loading ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[1, 2, 3].map((skeletonId) => (
            <div
              key={skeletonId}
              className="rounded-xl border border-white/10 bg-[#121212] p-5 sm:p-6 space-y-4 animate-pulse"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-white/10" />
                <div className="h-5 w-32 bg-white/10 rounded" />
              </div>
              <div className="space-y-3 pt-2">
                <div className="space-y-1">
                  <div className="h-3 w-16 bg-white/5 rounded" />
                  <div className="h-4 w-28 bg-white/10 rounded" />
                </div>
                <div className="space-y-1">
                  <div className="h-3 w-16 bg-white/5 rounded" />
                  <div className="h-4 w-36 bg-white/10 rounded" />
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : profileData ? (
        <form onSubmit={handleSave} className="space-y-6">
          {formError && isEditing && (
            <div className="rounded-xl border border-red-500/20 bg-red-950/20 p-4 flex items-center gap-3">
              <AlertCircle className="w-5 h-5 text-red-400 shrink-0" />
              <p className="text-sm text-red-400 font-medium">{formError}</p>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Kart A — Kişisel Bilgiler (HER ZAMAN READ-ONLY) */}
            <div className="rounded-xl border border-white/10 bg-[#121212] p-5 sm:p-6 flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-3 mb-4 pb-3 border-b border-white/5">
                  <div className="p-2 rounded-lg bg-white/5 text-white/80">
                    <User className="w-4 h-4 text-[#851C35]" />
                  </div>
                  <h2 className="text-base font-semibold text-white">Kişisel Bilgiler</h2>
                </div>
                <dl className="space-y-4 text-sm">
                  <div>
                    <dt className="text-white/50 text-xs uppercase tracking-wider mb-1">Ad</dt>
                    <dd className="text-white font-medium break-words">
                      {formatValue(profileData.profile.first_name)}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-white/50 text-xs uppercase tracking-wider mb-1">Soyad</dt>
                    <dd className="text-white font-medium break-words">
                      {formatValue(profileData.profile.last_name)}
                    </dd>
                  </div>
                </dl>
              </div>
            </div>

            {/* Kart B — İletişim Bilgileri (Telefon HER ZAMAN READ-ONLY, E-posta DÜZENLENEBİLİR) */}
            <div className="rounded-xl border border-white/10 bg-[#121212] p-5 sm:p-6 flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-3 mb-4 pb-3 border-b border-white/5">
                  <div className="p-2 rounded-lg bg-white/5 text-white/80">
                    <Phone className="w-4 h-4 text-[#851C35]" />
                  </div>
                  <h2 className="text-base font-semibold text-white">İletişim Bilgileri</h2>
                </div>
                <dl className="space-y-4 text-sm">
                  <div>
                    <dt className="text-white/50 text-xs uppercase tracking-wider mb-1">Telefon</dt>
                    <dd className="text-white font-medium break-words">
                      {formatValue(profileData.profile.phone)}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-white/50 text-xs uppercase tracking-wider mb-1">E-posta</dt>
                    {isEditing ? (
                      <dd>
                        <input
                          type="email"
                          value={editEmail}
                          onChange={(e) => setEditEmail(e.target.value)}
                          disabled={submitting}
                          maxLength={120}
                          placeholder="ornek@so3pt.com"
                          className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm focus:outline-none focus:border-[#851C35] focus:ring-1 focus:ring-[#851C35] transition-colors disabled:opacity-50"
                        />
                      </dd>
                    ) : (
                      <dd className="text-white font-medium break-words">
                        {formatValue(profileData.profile.email)}
                      </dd>
                    )}
                  </div>
                </dl>
              </div>
            </div>

            {/* Kart C — Hesap ve Acil Durum Bilgileri (Kullanıcı adı ve durum READ-ONLY, Acil durum DÜZENLENEBİLİR) */}
            <div className="rounded-xl border border-white/10 bg-[#121212] p-5 sm:p-6 flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-3 mb-4 pb-3 border-b border-white/5">
                  <div className="p-2 rounded-lg bg-white/5 text-white/80">
                    <Shield className="w-4 h-4 text-[#851C35]" />
                  </div>
                  <h2 className="text-base font-semibold text-white">Hesap ve Acil Durum Bilgileri</h2>
                </div>
                <dl className="space-y-4 text-sm">
                  <div>
                    <dt className="text-white/50 text-xs uppercase tracking-wider mb-1">Kullanıcı Adı</dt>
                    <dd className="text-white font-medium break-words">
                      {formatValue(profileData.account.username)}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-white/50 text-xs uppercase tracking-wider mb-1">Hesap Durumu</dt>
                    <dd className="pt-0.5">
                      {(() => {
                        const statusInfo = formatAccountStatus(profileData.account.status);
                        return (
                          <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border ${statusInfo.badgeClass}`}>
                            {statusInfo.label}
                          </span>
                        );
                      })()}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-white/50 text-xs uppercase tracking-wider mb-1">Acil Durum Kişisi</dt>
                    {isEditing ? (
                      <dd>
                        <input
                          type="text"
                          value={editEmergencyName}
                          onChange={(e) => setEditEmergencyName(e.target.value)}
                          disabled={submitting}
                          maxLength={120}
                          placeholder="Ad Soyad"
                          className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm focus:outline-none focus:border-[#851C35] focus:ring-1 focus:ring-[#851C35] transition-colors disabled:opacity-50"
                        />
                      </dd>
                    ) : (
                      <dd className="text-white font-medium break-words">
                        {formatValue(profileData.profile.emergency_contact_name)}
                      </dd>
                    )}
                  </div>
                  <div>
                    <dt className="text-white/50 text-xs uppercase tracking-wider mb-1">Acil Durum Telefonu</dt>
                    {isEditing ? (
                      <dd>
                        <input
                          type="tel"
                          value={editEmergencyPhone}
                          onChange={(e) => setEditEmergencyPhone(e.target.value)}
                          disabled={submitting}
                          maxLength={20}
                          placeholder="05XXXXXXXXX"
                          className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm focus:outline-none focus:border-[#851C35] focus:ring-1 focus:ring-[#851C35] transition-colors disabled:opacity-50"
                        />
                      </dd>
                    ) : (
                      <dd className="text-white font-medium break-words">
                        {formatValue(profileData.profile.emergency_contact_phone)}
                      </dd>
                    )}
                  </div>
                </dl>
              </div>
            </div>
          </div>

          {isEditing && (
            <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={handleCancelEdit}
                disabled={submitting}
                className="min-h-[44px] px-5 py-2.5 bg-white/5 hover:bg-white/10 text-white text-sm font-medium rounded-lg border border-white/10 transition-colors inline-flex items-center justify-center cursor-pointer disabled:opacity-50"
              >
                Vazgeç
              </button>
              <button
                type="submit"
                disabled={submitting || !isFormDirty}
                className="min-h-[44px] px-6 py-2.5 bg-[#851C35] hover:bg-[#851C35]/90 text-white text-sm font-medium rounded-lg transition-colors inline-flex items-center justify-center cursor-pointer disabled:opacity-50"
              >
                {submitting ? 'Kaydediliyor...' : 'Kaydet'}
              </button>
            </div>
          )}
        </form>
      ) : null}
    </div>
  );
}

