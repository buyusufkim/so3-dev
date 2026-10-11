import { useState, useEffect, useRef, useCallback } from 'react';
import { User, Phone, Shield, AlertCircle } from 'lucide-react';
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

  const abortControllerRef = useRef<AbortController | null>(null);
  const requestGenerationRef = useRef(0);
  const isMountedRef = useRef(true);

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
    };
  }, [fetchProfile]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-white">Hesabım</h1>
        <p className="text-sm text-white/60 mt-1">
          Hesap ve iletişim bilgilerini görüntüle.
        </p>
      </div>

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
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Kart A — Kişisel Bilgiler */}
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

          {/* Kart B — İletişim Bilgileri */}
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
                  <dd className="text-white font-medium break-words">
                    {formatValue(profileData.profile.email)}
                  </dd>
                </div>
              </dl>
            </div>
          </div>

          {/* Kart C — Hesap ve Acil Durum Bilgileri */}
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
                  <dd className="text-white font-medium break-words">
                    {formatValue(profileData.profile.emergency_contact_name)}
                  </dd>
                </div>
                <div>
                  <dt className="text-white/50 text-xs uppercase tracking-wider mb-1">Acil Durum Telefonu</dt>
                  <dd className="text-white font-medium break-words">
                    {formatValue(profileData.profile.emergency_contact_phone)}
                  </dd>
                </div>
              </dl>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
