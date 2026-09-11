import { useState, useEffect, useRef, useCallback } from "react";
import { apiClient, ApiError } from "../../api/client";
import { 
  MemberPortalAccountResponse, 
  validateMemberPortalAccountResponse,
  validateMemberPortalMutationResponse
} from "./memberPortalAccountTypes";

function formatDateTime(dateStr: string | null): string {
  if (!dateStr) return 'Henüz giriş yapmadı';
  const match = dateStr.match(/^(\d{4})-(\d{2})-(\d{2}) (\d{2}):(\d{2}):(\d{2})$/);
  if (!match) return dateStr;
  return `${match[3]}.${match[2]}.${match[1]} ${match[4]}:${match[5]}`;
}

export function MemberPortalAccountPanel({ memberId }: { memberId: number }) {
  const [data, setData] = useState<MemberPortalAccountResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Muation states
  const isCreating = useRef(false);
  const isUpdatingStatus = useRef(false);
  const isResettingPassword = useRef(false);

  const [createUsername, setCreateUsername] = useState("");
  const [createPassword, setCreatePassword] = useState("");
  const [createPasswordConfirm, setCreatePasswordConfirm] = useState("");

  const [resetPassword, setResetPassword] = useState("");
  const [resetPasswordConfirm, setResetPasswordConfirm] = useState("");
  const [showResetModal, setShowResetModal] = useState(false);

  const [isCreatingState, setIsCreatingState] = useState(false);
  const [isUpdatingStatusState, setIsUpdatingStatusState] = useState(false);
  const [isResettingPasswordState, setIsResettingPasswordState] = useState(false);

  const mountedRef = useRef(true);

  const fetchAccount = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await apiClient.get(`/api/admin/members/${memberId}/account`);
      if (!mountedRef.current) return;

      const validated = validateMemberPortalAccountResponse(res);
      if (validated.member.id !== memberId) {
        setError("Portal hesabı verisi doğrulanamadı.");
        return;
      }
      setData(validated);
    } catch (err) {
      if (!mountedRef.current) return;
      if (err instanceof ApiError && err.code === 'NOT_FOUND') {
        setError('Üye veya portal hesabı bulunamadı.');
      } else {
        setError('Veriler yüklenirken bir hata oluştu.');
      }
    } finally {
      if (mountedRef.current) {
        setLoading(false);
      }
    }
  }, [memberId]);

  useEffect(() => {
    mountedRef.current = true;
    void fetchAccount();
    return () => {
      mountedRef.current = false;
    };
  }, [fetchAccount]);

  const mapError = (err: unknown) => {
    if (err instanceof ApiError) {
      if (err.code === 'MEMBER_ACCOUNT_ALREADY_EXISTS') return 'Bu üyenin zaten bir portal hesabı var.';
      if (err.code === 'ACCOUNT_IDENTITY_CONFLICT') return 'Bu kullanıcı adı başka bir hesap tarafından kullanılıyor.';
      if (err.code === 'FORBIDDEN') return 'Bu işlemi yapma yetkiniz yok.';
      if (err.code === 'VALIDATION_ERROR') return err.message;
      if (err.code === 'NOT_FOUND') return 'Üye veya portal hesabı bulunamadı.';
    }
    return 'Bir hata oluştu.';
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isCreating.current) return;

    const normalizedUsername = createUsername.trim().toLowerCase();
    if (!/^[a-z0-9._-]+$/.test(normalizedUsername)) {
      alert("Kullanıcı adı sadece küçük harf, rakam, nokta, tire ve alt tire içerebilir.");
      return;
    }

    if (createPassword.length < 12 || createPassword.length > 256) {
      alert("Geçici şifre 12 ile 256 karakter arasında olmalıdır.");
      return;
    }

    if (createPassword !== createPasswordConfirm) {
      alert("Şifreler eşleşmiyor.");
      return;
    }

    try {
      isCreating.current = true;
      setIsCreatingState(true);

      const res = await apiClient.post(`/api/admin/members/${memberId}/account`, {
        username: normalizedUsername,
        password: createPassword
      });

      validateMemberPortalMutationResponse(res);

      setCreatePassword("");
      setCreatePasswordConfirm("");
      setCreateUsername("");

      await fetchAccount();
    } catch (err) {
      alert(mapError(err));
    } finally {
      isCreating.current = false;
      setIsCreatingState(false);
      setCreatePassword("");
      setCreatePasswordConfirm("");
    }
  };

  const handleToggleStatus = async () => {
    if (!data?.account) return;
    if (isUpdatingStatus.current) return;

    const newStatus = data.account.status === 'active' ? 'inactive' : 'active';
    
    if (newStatus === 'inactive') {
      const confirmDeactivate = window.confirm("Bu portal hesabını pasife almak istediğinize emin misiniz? Kullanıcı portalda oturum açamayacak ve mevcut oturumu geçersiz hale gelecektir.");
      if (!confirmDeactivate) return;
    } else {
      const confirmActivate = window.confirm("Bu portal hesabını aktifleştirmek istediğinize emin misiniz?");
      if (!confirmActivate) return;
    }

    try {
      isUpdatingStatus.current = true;
      setIsUpdatingStatusState(true);

      const res = await apiClient.patch(`/api/admin/member-accounts/${data.account.id}/status`, {
        status: newStatus
      });

      validateMemberPortalMutationResponse(res);
      await fetchAccount();
    } catch (err) {
      alert(mapError(err));
    } finally {
      isUpdatingStatus.current = false;
      setIsUpdatingStatusState(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!data?.account) return;
    if (isResettingPassword.current) return;

    if (resetPassword.length < 12 || resetPassword.length > 256) {
      alert("Geçici şifre 12 ile 256 karakter arasında olmalıdır.");
      return;
    }

    if (resetPassword !== resetPasswordConfirm) {
      alert("Şifreler eşleşmiyor.");
      return;
    }

    try {
      isResettingPassword.current = true;
      setIsResettingPasswordState(true);

      const res = await apiClient.post(`/api/admin/member-accounts/${data.account.id}/reset-password`, {
        password: resetPassword
      });

      validateMemberPortalMutationResponse(res);

      setResetPassword("");
      setResetPasswordConfirm("");
      setShowResetModal(false);

      await fetchAccount();
    } catch (err) {
      alert(mapError(err));
    } finally {
      isResettingPassword.current = false;
      setIsResettingPasswordState(false);
      setResetPassword("");
      setResetPasswordConfirm("");
    }
  };

  if (loading) {
    return <div className="text-sm text-white/50">Yükleniyor...</div>;
  }

  if (error) {
    return <div className="text-sm text-red-400">{error}</div>;
  }

  if (!data) return null;

  return (
    <div className="space-y-6">
      {data.member.status === 'inactive' && (
        <div className="bg-yellow-500/10 border border-yellow-500/20 text-yellow-400 px-4 py-3 rounded-lg text-sm">
          Bu üyenin kulüp profili pasif durumdadır.
        </div>
      )}

      {!data.account ? (
        <div className="space-y-4">
          <p className="text-sm text-white/70">Bu üye için henüz portal hesabı oluşturulmamış.</p>
          <form onSubmit={handleCreate} className="space-y-4 max-w-sm">
            <div className="space-y-2">
              <label className="text-sm font-medium text-white/70">Kullanıcı adı</label>
              <input 
                type="text"
                required
                value={createUsername}
                onChange={e => setCreateUsername(e.target.value)}
                disabled={isCreatingState}
                className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-white/30"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-white/70">Geçici şifre</label>
              <input 
                type="password"
                required
                value={createPassword}
                onChange={e => setCreatePassword(e.target.value)}
                disabled={isCreatingState}
                className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-white/30"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-white/70">Geçici şifre tekrar</label>
              <input 
                type="password"
                required
                value={createPasswordConfirm}
                onChange={e => setCreatePasswordConfirm(e.target.value)}
                disabled={isCreatingState}
                className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-white/30"
              />
            </div>
            <button 
              type="submit"
              disabled={isCreatingState}
              className="bg-white text-black px-6 py-2.5 rounded-lg text-sm font-medium hover:bg-white/90 disabled:opacity-50"
            >
              {isCreatingState ? 'Oluşturuluyor...' : 'Hesap Oluştur'}
            </button>
          </form>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-1">
              <div className="text-sm text-white/50">Kullanıcı adı</div>
              <div className="text-base font-medium">{data.account.username}</div>
            </div>
            <div className="space-y-1">
              <div className="text-sm text-white/50">Hesap durumu</div>
              <div className="text-base font-medium flex items-center gap-2">
                <span className={`w-2 h-2 rounded-full ${data.account.status === 'active' ? 'bg-green-500' : 'bg-red-500'}`}></span>
                {data.account.status === 'active' ? 'Aktif' : 'Pasif'}
              </div>
            </div>
            <div className="space-y-1">
              <div className="text-sm text-white/50">İlk oluşturulma</div>
              <div className="text-base font-medium">{formatDateTime(data.account.created_at)}</div>
            </div>
            <div className="space-y-1">
              <div className="text-sm text-white/50">Son giriş</div>
              <div className="text-base font-medium">{formatDateTime(data.account.last_login_at)}</div>
            </div>
            <div className="space-y-1">
              <div className="text-sm text-white/50">Son şifre değişimi</div>
              <div className="text-base font-medium">{formatDateTime(data.account.password_changed_at)}</div>
            </div>
            <div className="space-y-1">
              <div className="text-sm text-white/50">Şifre durumu</div>
              <div className="text-base font-medium text-yellow-400">
                {data.account.must_change_password ? 'İlk girişte şifre değişikliği gerekli' : 'Şifre güncel'}
              </div>
            </div>
          </div>

          <div className="flex flex-wrap gap-4 pt-4 border-t border-white/10">
            <button
              type="button"
              onClick={handleToggleStatus}
              disabled={isUpdatingStatusState}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 ${data.account.status === 'active' ? 'bg-red-500/10 text-red-500 hover:bg-red-500/20' : 'bg-green-500/10 text-green-500 hover:bg-green-500/20'}`}
            >
              {isUpdatingStatusState ? 'İşleniyor...' : (data.account.status === 'active' ? 'Hesabı Pasife Al' : 'Hesabı Aktifleştir')}
            </button>
            <button
              type="button"
              onClick={() => {
                setResetPassword("");
                setResetPasswordConfirm("");
                setShowResetModal(true);
              }}
              className="bg-white/10 text-white hover:bg-white/20 px-4 py-2 rounded-lg text-sm font-medium transition-colors"
            >
              Geçici Şifreyi Sıfırla
            </button>
          </div>
        </div>
      )}

      {showResetModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-[#121212] border border-white/10 rounded-2xl p-6 w-full max-w-md shadow-2xl">
            <h3 className="text-lg font-medium mb-2">Geçici Şifreyi Sıfırla</h3>
            <p className="text-sm text-white/70 mb-6">
              Şifre sıfırlandığında üyenin mevcut portal oturumu geçersiz hale gelir ve bir sonraki girişte yeni şifre belirlemesi gerekir.
            </p>
            
            <form onSubmit={handleResetPassword} className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-white/70">Yeni geçici şifre</label>
                <input 
                  type="password"
                  required
                  value={resetPassword}
                  onChange={e => setResetPassword(e.target.value)}
                  disabled={isResettingPasswordState}
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-white/30"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-white/70">Yeni geçici şifre tekrar</label>
                <input 
                  type="password"
                  required
                  value={resetPasswordConfirm}
                  onChange={e => setResetPasswordConfirm(e.target.value)}
                  disabled={isResettingPasswordState}
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-white/30"
                />
              </div>
              <div className="flex justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setResetPassword("");
                    setResetPasswordConfirm("");
                    setShowResetModal(false);
                  }}
                  disabled={isResettingPasswordState}
                  className="px-4 py-2 rounded-lg text-sm font-medium text-white/70 hover:text-white transition-colors disabled:opacity-50"
                >
                  İptal
                </button>
                <button
                  type="submit"
                  disabled={isResettingPasswordState}
                  className="bg-white text-black px-6 py-2 rounded-lg text-sm font-medium hover:bg-white/90 disabled:opacity-50"
                >
                  {isResettingPasswordState ? 'Sıfırlanıyor...' : 'Şifreyi Sıfırla'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
