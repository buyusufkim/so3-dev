import React, { useState, useEffect, useRef } from 'react';
import { apiClient, ApiError } from '../../api/client';
import { StaffAccount, isStaffAccountListResponse } from './types';
import { Shield, Plus, KeyRound, Power, PowerOff, ShieldAlert, CircleUserRound } from 'lucide-react';

export function StaffAccountsPage() {
  const [data, setData] = useState<StaffAccount[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [createFormData, setCreateFormData] = useState({
    username: '',
    email: '',
    display_name: '',
    password: '',
    password_confirmation: '',
    role: 'admin' as 'admin' | 'editor' | 'reception'
  });
  const [createFormError, setCreateFormError] = useState<string | null>(null);
  const [createFormSuccess, setCreateFormSuccess] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isSubmittingRef = useRef(false);

  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [selectedAccountForPassword, setSelectedAccountForPassword] = useState<StaffAccount | null>(null);
  const [passwordFormData, setPasswordFormData] = useState({
    password: '',
    password_confirmation: ''
  });
  const [passwordFormError, setPasswordFormError] = useState<string | null>(null);
  const [passwordFormSuccess, setPasswordFormSuccess] = useState<string | null>(null);
  const [isSubmittingPassword, setIsSubmittingPassword] = useState(false);
  const isSubmittingPasswordRef = useRef(false);

  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const isUpdatingStatusRef = useRef(false);

  const [isUpdatingRole, setIsUpdatingRole] = useState(false);
  const isUpdatingRoleRef = useRef(false);

  const fetchData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const json = await apiClient.get('/api/admin/staff-accounts');
      if (isStaffAccountListResponse(json)) {
        setData(json.items);
      } else {
        setData([]);
        setError('Personel hesabı verisi doğrulanamadı.');
      }
    } catch (err: unknown) {
      setData([]);
      if (err instanceof ApiError) {
        setError(err.message || 'Personel hesapları yüklenemedi.');
      } else {
        setError('Personel hesapları yüklenemedi.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return 'Bilinmiyor';
    try {
      const regex = /^(\d{4})-(\d{2})-(\d{2}) (\d{2}):(\d{2}):(\d{2})$/;
      const match = dateStr.match(regex);
      if (match) {
        const [, year, month, day, hour, minute] = match;
        return `${day}.${month}.${year} ${hour}:${minute}`;
      }
      return dateStr;
    } catch {
      return dateStr;
    }
  };

  const mapApiError = (err: unknown): string => {
    if (err instanceof ApiError) {
      if (err.code === 'ACCOUNT_IDENTITY_CONFLICT') return 'Kullanıcı adı veya e-posta kullanımda.';
      if (err.code === 'ACCOUNT_NOT_FOUND') return 'Hesap bulunamadı.';
      if (err.code === 'VALIDATION_ERROR') return err.message || 'Geçersiz veri gönderildi.';
      if (err.code === 'FORBIDDEN') return 'Bu işlemi yapma yetkiniz yok.';
      if (err.code === 'CONFLICT') return 'Bu hesap bu personel yönetim akışından yönetilemiyor.';
      return err.message || 'İşlem gerçekleştirilemedi.';
    }
    return 'Beklenmeyen bir hata oluştu.';
  };

  const handleCreateAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmittingRef.current) return;
    
    setCreateFormError(null);
    setCreateFormSuccess(null);
    
    const { username, email, display_name, password, password_confirmation, role } = createFormData;
    
    const trimmedUsername = username.trim();
    if (!trimmedUsername || trimmedUsername.length < 3 || trimmedUsername.length > 50 || !/^[A-Za-z0-9._-]+$/.test(trimmedUsername)) {
      setCreateFormError('Kullanıcı adı 3-50 karakter olmalı ve sadece harf, sayı, nokta, tire, alt çizgi içermelidir.');
      return;
    }
    
    if (!email.trim() || email.trim().length > 100 || !email.includes('@')) {
      setCreateFormError('Geçerli bir e-posta adresi gereklidir.');
      return;
    }
    
    const trimmedDisplayName = display_name.trim();
    if (!trimmedDisplayName || trimmedDisplayName.length < 2 || trimmedDisplayName.length > 100) {
      setCreateFormError('Görünen ad 2-100 karakter arasında olmalıdır.');
      return;
    }
    
    if (!password || Array.from(password).length < 12 || Array.from(password).length > 256) {
      setCreateFormError('Şifre 12-256 karakter arasında olmalıdır.');
      return;
    }
    
    if (password !== password_confirmation) {
      setCreateFormError('Şifreler eşleşmiyor.');
      return;
    }

    if (role !== 'admin' && role !== 'editor' && role !== 'reception') {
      setCreateFormError('Geçersiz rol seçimi.');
      return;
    }

    isSubmittingRef.current = true;
    setIsSubmitting(true);

    try {
      await apiClient.post('/api/admin/staff-accounts', {
        username: trimmedUsername,
        email: email.trim(),
        display_name: trimmedDisplayName,
        password,
        role
      });
      setCreateFormSuccess('Hesap başarıyla oluşturuldu.');
      setTimeout(() => {
        setIsCreateModalOpen(false);
        setCreateFormData({
          username: '',
          email: '',
          display_name: '',
          password: '',
          password_confirmation: '',
          role: 'admin'
        });
        setCreateFormSuccess(null);
        fetchData();
      }, 1500);
    } catch (err: unknown) {
      setCreateFormError(mapApiError(err));
    } finally {
      isSubmittingRef.current = false;
      setIsSubmitting(false);
    }
  };

  const toggleStatus = async (account: StaffAccount) => {
    if (isUpdatingStatusRef.current) return;
    const isActivating = account.status === 'inactive';
    const actionText = isActivating ? 'Aktifleştir' : 'Pasife Al';
    
    const msg = isActivating 
      ? `Bu hesabı aktifleştirmek istediğinize emin misiniz?`
      : `Bu hesabı pasife almak istediğinize emin misiniz? Pasife alma kullanıcının giriş yapmasını engeller.`;

    if (!window.confirm(msg)) return;

    isUpdatingStatusRef.current = true;
    setIsUpdatingStatus(true);
    
    try {
      const newStatus = isActivating ? 'active' : 'inactive';
      await apiClient.patch(`/api/admin/staff-accounts/${account.id}/status`, { status: newStatus });
      await fetchData();
    } catch (err: unknown) {
      alert(mapApiError(err));
    } finally {
      isUpdatingStatusRef.current = false;
      setIsUpdatingStatus(false);
    }
  };

  const changeRole = async (account: StaffAccount, newRole: 'admin' | 'editor' | 'reception') => {
    if (account.role === newRole) return;
    if (isUpdatingRoleRef.current) return;

    const roleNames = {
      admin: 'Yönetici',
      editor: 'Editör',
      reception: 'Resepsiyon'
    };

    const msg = `Bu hesabın yetki rolü ${roleNames[newRole]} olarak değiştirilecek. Devam etmek istiyor musunuz?`;
    if (!window.confirm(msg)) return;

    isUpdatingRoleRef.current = true;
    setIsUpdatingRole(true);

    try {
      await apiClient.patch(`/api/admin/staff-accounts/${account.id}/role`, { role: newRole });
      await fetchData();
    } catch (err: unknown) {
      alert(mapApiError(err));
    } finally {
      isUpdatingRoleRef.current = false;
      setIsUpdatingRole(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmittingPasswordRef.current || !selectedAccountForPassword) return;
    
    setPasswordFormError(null);
    setPasswordFormSuccess(null);
    
    const { password, password_confirmation } = passwordFormData;
    
    if (!password || Array.from(password).length < 12 || Array.from(password).length > 256) {
      setPasswordFormError('Şifre 12-256 karakter arasında olmalıdır.');
      return;
    }
    
    if (password !== password_confirmation) {
      setPasswordFormError('Şifreler eşleşmiyor.');
      return;
    }

    isSubmittingPasswordRef.current = true;
    setIsSubmittingPassword(true);

    try {
      await apiClient.post(`/api/admin/staff-accounts/${selectedAccountForPassword.id}/reset-password`, {
        password
      });
      setPasswordFormSuccess('Şifre başarıyla güncellendi.');
      
      // Cleanup
      setTimeout(() => {
        setIsPasswordModalOpen(false);
        setPasswordFormData({ password: '', password_confirmation: '' });
        setPasswordFormSuccess(null);
        setSelectedAccountForPassword(null);
        fetchData();
      }, 1500);
    } catch (err: unknown) {
      setPasswordFormError(mapApiError(err));
    } finally {
      isSubmittingPasswordRef.current = false;
      setIsSubmittingPassword(false);
    }
  };

  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'admin':
        return <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium bg-red-500/10 text-red-500 border border-red-500/20"><ShieldAlert className="w-3.5 h-3.5" /> Yönetici</span>;
      case 'editor':
        return <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium bg-blue-500/10 text-blue-500 border border-blue-500/20"><Shield className="w-3.5 h-3.5" /> Editör</span>;
      case 'reception':
        return <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium bg-emerald-500/10 text-emerald-500 border border-emerald-500/20"><CircleUserRound className="w-3.5 h-3.5" /> Resepsiyon</span>;
      default:
        return <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium bg-zinc-500/10 text-zinc-400 border border-zinc-500/20">{role}</span>;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium bg-green-500/10 text-green-500 border border-green-500/20">Aktif</span>;
      case 'inactive':
        return <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium bg-zinc-500/10 text-zinc-400 border border-zinc-500/20">Pasif</span>;
      default:
        return <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium bg-zinc-500/10 text-zinc-400 border border-zinc-500/20">{status}</span>;
    }
  };

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-light text-white tracking-tight">Personel Hesapları</h1>
          <p className="text-sm text-zinc-400 mt-2">Yönetici, editör ve resepsiyon kullanıcı hesaplarını yönetin.</p>
        </div>
        <button
          onClick={() => {
            setCreateFormError(null);
            setCreateFormSuccess(null);
            setCreateFormData({
              username: '',
              email: '',
              display_name: '',
              password: '',
              password_confirmation: '',
              role: 'admin'
            });
            setIsCreateModalOpen(true);
          }}
          className="inline-flex items-center gap-2 bg-white text-black px-4 py-2 rounded-lg text-sm font-medium hover:bg-zinc-200 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Yeni Personel Hesabı
        </button>
      </div>

      {/* List */}
      {isLoading ? (
        <div className="bg-[#121212] rounded-xl border border-white/10 p-12 text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-white mb-4"></div>
          <p className="text-zinc-400">Hesaplar yükleniyor...</p>
        </div>
      ) : error ? (
        <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-8 text-center">
          <ShieldAlert className="w-12 h-12 text-red-500 mx-auto mb-4 opacity-50" />
          <h3 className="text-lg font-medium text-red-500 mb-2">Hata</h3>
          <p className="text-red-400/80">{error}</p>
          <button 
            onClick={fetchData}
            className="mt-4 px-4 py-2 bg-red-500/20 text-red-500 rounded-lg text-sm font-medium hover:bg-red-500/30 transition-colors"
          >
            Tekrar Dene
          </button>
        </div>
      ) : data.length === 0 ? (
        <div className="bg-[#121212] rounded-xl border border-white/10 p-12 text-center">
          <Shield className="w-12 h-12 text-zinc-600 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-white mb-2">Hesap Bulunamadı</h3>
          <p className="text-zinc-400 mb-6">Henüz yönetilebilir bir personel hesabı oluşturulmamış.</p>
        </div>
      ) : (
        <div className="bg-[#121212] rounded-xl border border-white/10 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm whitespace-nowrap">
              <thead className="bg-[#1a1a1a] border-b border-white/10 text-zinc-400">
                <tr>
                  <th className="px-6 py-4 font-medium">Görünen Ad</th>
                  <th className="px-6 py-4 font-medium">Kullanıcı Adı</th>
                  <th className="px-6 py-4 font-medium">E-posta</th>
                  <th className="px-6 py-4 font-medium">Rol</th>
                  <th className="px-6 py-4 font-medium">Durum</th>
                  <th className="px-6 py-4 font-medium">Son Giriş</th>
                  <th className="px-6 py-4 font-medium">Şifre Değişimi</th>
                  <th className="px-6 py-4 font-medium text-right">İşlemler</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/10">
                {data.map((account) => (
                  <tr key={account.id} className="hover:bg-white/[0.02] transition-colors">
                    <td className="px-6 py-4 text-white font-medium">{account.display_name}</td>
                    <td className="px-6 py-4 text-zinc-400">{account.username}</td>
                    <td className="px-6 py-4 text-zinc-400">{account.email}</td>
                    <td className="px-6 py-4">
                      <select 
                        value={account.role}
                        onChange={(e) => changeRole(account, e.target.value as 'admin' | 'editor' | 'reception')}
                        disabled={isUpdatingRole}
                        className="bg-transparent border border-white/10 rounded-md text-xs text-zinc-300 px-2 py-1 focus:outline-none focus:border-white/30"
                      >
                        <option value="admin">Yönetici</option>
                        <option value="editor">Editör</option>
                        <option value="reception">Resepsiyon</option>
                      </select>
                    </td>
                    <td className="px-6 py-4">{getStatusBadge(account.status)}</td>
                    <td className="px-6 py-4 text-zinc-400">{formatDate(account.last_login_at)}</td>
                    <td className="px-6 py-4 text-zinc-400">{formatDate(account.password_changed_at)}</td>
                    <td className="px-6 py-4 text-right space-x-2">
                      <button
                        onClick={() => {
                          setSelectedAccountForPassword(account);
                          setPasswordFormData({ password: '', password_confirmation: '' });
                          setPasswordFormError(null);
                          setPasswordFormSuccess(null);
                          setIsPasswordModalOpen(true);
                        }}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white/5 hover:bg-white/10 text-zinc-300 rounded-md transition-colors"
                        title="Şifre Sıfırla"
                      >
                        <KeyRound className="w-3.5 h-3.5" />
                        <span className="text-xs">Şifre</span>
                      </button>
                      <button
                        onClick={() => toggleStatus(account)}
                        disabled={isUpdatingStatus}
                        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md transition-colors ${
                          account.status === 'active' 
                            ? 'bg-red-500/10 text-red-500 hover:bg-red-500/20' 
                            : 'bg-green-500/10 text-green-500 hover:bg-green-500/20'
                        } disabled:opacity-50`}
                      >
                        {account.status === 'active' ? <PowerOff className="w-3.5 h-3.5" /> : <Power className="w-3.5 h-3.5" />}
                        <span className="text-xs">{account.status === 'active' ? 'Pasife Al' : 'Aktifleştir'}</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Create Modal */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-[#121212] border border-white/10 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl">
            <div className="p-6 border-b border-white/10">
              <h3 className="text-xl font-medium text-white">Yeni Personel Hesabı</h3>
            </div>
            
            <form onSubmit={handleCreateAccount} className="p-6 space-y-5">
              {createFormError && (
                <div className="bg-red-500/10 border border-red-500/20 text-red-500 p-3 rounded-lg text-sm">
                  {createFormError}
                </div>
              )}
              {createFormSuccess && (
                <div className="bg-green-500/10 border border-green-500/20 text-green-500 p-3 rounded-lg text-sm">
                  {createFormSuccess}
                </div>
              )}

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-zinc-400 mb-1.5">Görünen Ad</label>
                  <input
                    type="text"
                    value={createFormData.display_name}
                    onChange={e => setCreateFormData({...createFormData, display_name: e.target.value})}
                    className="w-full bg-[#1a1a1a] border border-white/10 rounded-lg px-4 py-2.5 text-white placeholder-zinc-600 focus:outline-none focus:border-white/30"
                    placeholder="Örn: Ayşe Yılmaz"
                    disabled={isSubmitting || !!createFormSuccess}
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-zinc-400 mb-1.5">Kullanıcı Adı</label>
                  <input
                    type="text"
                    value={createFormData.username}
                    onChange={e => setCreateFormData({...createFormData, username: e.target.value})}
                    className="w-full bg-[#1a1a1a] border border-white/10 rounded-lg px-4 py-2.5 text-white placeholder-zinc-600 focus:outline-none focus:border-white/30"
                    placeholder="Örn: ayse.yilmaz"
                    disabled={isSubmitting || !!createFormSuccess}
                    required
                  />
                  <p className="text-[10px] text-zinc-500 mt-1">3-50 karakter. Sadece harf, sayı, nokta, tire, alt çizgi.</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-zinc-400 mb-1.5">E-posta</label>
                  <input
                    type="email"
                    value={createFormData.email}
                    onChange={e => setCreateFormData({...createFormData, email: e.target.value})}
                    className="w-full bg-[#1a1a1a] border border-white/10 rounded-lg px-4 py-2.5 text-white placeholder-zinc-600 focus:outline-none focus:border-white/30"
                    placeholder="Örn: ayse@so3.com"
                    disabled={isSubmitting || !!createFormSuccess}
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-zinc-400 mb-1.5">Rol</label>
                  <select
                    value={createFormData.role}
                    onChange={e => setCreateFormData({...createFormData, role: e.target.value as 'admin'|'editor'|'reception'})}
                    className="w-full bg-[#1a1a1a] border border-white/10 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-white/30 appearance-none"
                    disabled={isSubmitting || !!createFormSuccess}
                  >
                    <option value="admin">Yönetici</option>
                    <option value="editor">Editör</option>
                    <option value="reception">Resepsiyon</option>
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-zinc-400 mb-1.5">Şifre</label>
                    <input
                      type="password"
                      value={createFormData.password}
                      onChange={e => setCreateFormData({...createFormData, password: e.target.value})}
                      className="w-full bg-[#1a1a1a] border border-white/10 rounded-lg px-4 py-2.5 text-white placeholder-zinc-600 focus:outline-none focus:border-white/30"
                      disabled={isSubmitting || !!createFormSuccess}
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-zinc-400 mb-1.5">Şifre Tekrar</label>
                    <input
                      type="password"
                      value={createFormData.password_confirmation}
                      onChange={e => setCreateFormData({...createFormData, password_confirmation: e.target.value})}
                      className="w-full bg-[#1a1a1a] border border-white/10 rounded-lg px-4 py-2.5 text-white placeholder-zinc-600 focus:outline-none focus:border-white/30"
                      disabled={isSubmitting || !!createFormSuccess}
                      required
                    />
                  </div>
                </div>
                <p className="text-[10px] text-zinc-500 mt-1">En az 12 karakter olmalıdır.</p>
              </div>

              <div className="flex gap-3 pt-4 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  disabled={isSubmitting || !!createFormSuccess}
                  className="flex-1 px-4 py-2.5 border border-white/10 text-white rounded-lg font-medium hover:bg-white/5 transition-colors disabled:opacity-50"
                >
                  İptal
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || !!createFormSuccess}
                  className="flex-1 px-4 py-2.5 bg-white text-black rounded-lg font-medium hover:bg-zinc-200 transition-colors flex items-center justify-center disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <div className="w-5 h-5 border-2 border-black/30 border-t-black rounded-full animate-spin" />
                  ) : (
                    'Hesap Oluştur'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Password Reset Modal */}
      {isPasswordModalOpen && selectedAccountForPassword && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-[#121212] border border-white/10 rounded-2xl w-full max-w-sm overflow-hidden shadow-2xl">
            <div className="p-6 border-b border-white/10">
              <h3 className="text-xl font-medium text-white">Şifre Sıfırla</h3>
              <p className="text-sm text-zinc-400 mt-1">{selectedAccountForPassword.display_name}</p>
            </div>
            
            <form onSubmit={handleResetPassword} className="p-6 space-y-5">
              {passwordFormError && (
                <div className="bg-red-500/10 border border-red-500/20 text-red-500 p-3 rounded-lg text-sm">
                  {passwordFormError}
                </div>
              )}
              {passwordFormSuccess && (
                <div className="bg-green-500/10 border border-green-500/20 text-green-500 p-3 rounded-lg text-sm">
                  {passwordFormSuccess}
                </div>
              )}

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-zinc-400 mb-1.5">Yeni Şifre</label>
                  <input
                    type="password"
                    value={passwordFormData.password}
                    onChange={e => setPasswordFormData({...passwordFormData, password: e.target.value})}
                    className="w-full bg-[#1a1a1a] border border-white/10 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-white/30"
                    disabled={isSubmittingPassword || !!passwordFormSuccess}
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-zinc-400 mb-1.5">Yeni Şifre Tekrar</label>
                  <input
                    type="password"
                    value={passwordFormData.password_confirmation}
                    onChange={e => setPasswordFormData({...passwordFormData, password_confirmation: e.target.value})}
                    className="w-full bg-[#1a1a1a] border border-white/10 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-white/30"
                    disabled={isSubmittingPassword || !!passwordFormSuccess}
                    required
                  />
                </div>
                <p className="text-[10px] text-zinc-500 mt-1">En az 12 karakter olmalıdır.</p>
              </div>

              <div className="flex gap-3 pt-4 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setIsPasswordModalOpen(false)}
                  disabled={isSubmittingPassword || !!passwordFormSuccess}
                  className="flex-1 px-4 py-2.5 border border-white/10 text-white rounded-lg font-medium hover:bg-white/5 transition-colors disabled:opacity-50"
                >
                  İptal
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingPassword || !!passwordFormSuccess}
                  className="flex-1 px-4 py-2.5 bg-white text-black rounded-lg font-medium hover:bg-zinc-200 transition-colors flex items-center justify-center disabled:opacity-50"
                >
                  {isSubmittingPassword ? (
                    <div className="w-5 h-5 border-2 border-black/30 border-t-black rounded-full animate-spin" />
                  ) : (
                    'Sıfırla'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
