import React, { useState, useEffect, useRef } from 'react';
import { apiClient, ApiError } from '../../api/client';
import { TrainerAccountRow, isTrainerAccountRows, isTrainerAccountStatusResponse, isTrainerAccountPasswordResponse } from './types';

export function TrainerAccountsPage() {
  const [data, setData] = useState<TrainerAccountRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedTrainer, setSelectedTrainer] = useState<TrainerAccountRow['trainer'] | null>(null);
  
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    display_name: '',
    password: '',
    password_confirmation: ''
  });
  const [formError, setFormError] = useState<string | null>(null);
  const [formSuccess, setFormSuccess] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isSubmittingRef = useRef(false);

  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const isUpdatingStatusRef = useRef(false);

  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [selectedTrainerForPassword, setSelectedTrainerForPassword] = useState<{trainer: TrainerAccountRow['trainer'], account: NonNullable<TrainerAccountRow['account']>} | null>(null);
  const [passwordFormData, setPasswordFormData] = useState({
    password: '',
    password_confirmation: ''
  });
  const [passwordFormError, setPasswordFormError] = useState<string | null>(null);
  const [passwordFormSuccess, setPasswordFormSuccess] = useState<string | null>(null);
  const [isSubmittingPassword, setIsSubmittingPassword] = useState(false);
  const isSubmittingPasswordRef = useRef(false);

  const fetchData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const json = await apiClient.get('/api/admin/trainer-accounts');
      if (isTrainerAccountRows(json)) {
        setData(json);
      } else {
        setData([]);
        setError('Eğitmen hesabı verisi doğrulanamadı.');
      }
    } catch (error: unknown) {
      setError('Veriler yüklenirken bir sorun oluştu.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleOpenModal = (trainer: TrainerAccountRow['trainer']) => {
    setSelectedTrainer(trainer);
    setFormData({
      username: '',
      email: '',
      display_name: trainer.name,
      password: '',
      password_confirmation: ''
    });
    setFormError(null);
    setFormSuccess(null);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedTrainer(null);
    setFormData({
      username: '',
      email: '',
      display_name: '',
      password: '',
      password_confirmation: ''
    });
    setFormError(null);
    setFormSuccess(null);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleToggleStatus = async (trainerId: number, currentStatus: 'active' | 'inactive') => {
    if (isUpdatingStatusRef.current) return;
    
    const isActivating = currentStatus === 'inactive';
    const confirmMsg = isActivating 
      ? "Bu eğitmen hesabı aktifleştirilecek ve sisteme giriş yapabilecektir. Devam etmek istiyor musunuz?" 
      : "Bu eğitmen hesabı pasife alınacak ve kullanıcı giriş yapamayacaktır. Devam etmek istiyor musunuz?";
      
    if (!window.confirm(confirmMsg)) return;

    setIsUpdatingStatus(true);
    isUpdatingStatusRef.current = true;
    setError(null);

    try {
      const payload = {
        status: isActivating ? 'active' : 'inactive'
      };
      const json = await apiClient.patch(`/api/admin/trainer-accounts/${trainerId}/status`, payload);
      
      if (isTrainerAccountStatusResponse(json)) {
        await fetchData();
      } else {
        setError('Hesap durumu güncellendi ancak sunucu yanıtı doğrulanamadı.');
      }
    } catch (error: unknown) {
      let errMsg = 'Durum güncellenirken bilinmeyen bir hata oluştu.';
      if (error instanceof ApiError) {
        switch (error.code) {
          case 'TRAINER_NOT_FOUND': errMsg = 'Eğitmen kaydı bulunamadı.'; break;
          case 'TRAINER_ACCOUNT_NOT_LINKED': errMsg = 'Bu eğitmenin bağlı bir hesabı yok.'; break;
          case 'TRAINER_ACCOUNT_INVALID_LINK': errMsg = 'Geçersiz veya yetkisiz hesap bağlantısı.'; break;
          case 'VALIDATION_ERROR': errMsg = error.message || 'Gönderilen veriler geçersiz.'; break;
          case 'FORBIDDEN': errMsg = 'Bu işlemi yapma yetkiniz yok.'; break;
          default: errMsg = error.message || errMsg;
        }
      }
      setError(errMsg);
    } finally {
      setIsUpdatingStatus(false);
      isUpdatingStatusRef.current = false;
    }
  };

  const handleOpenPasswordModal = (trainer: TrainerAccountRow['trainer'], account: NonNullable<TrainerAccountRow['account']>) => {
    setSelectedTrainerForPassword({ trainer, account });
    setPasswordFormData({ password: '', password_confirmation: '' });
    setPasswordFormError(null);
    setPasswordFormSuccess(null);
    setIsPasswordModalOpen(true);
  };

  const handleClosePasswordModal = () => {
    setIsPasswordModalOpen(false);
    setSelectedTrainerForPassword(null);
    setPasswordFormData({ password: '', password_confirmation: '' });
    setPasswordFormError(null);
    setPasswordFormSuccess(null);
  };

  const handlePasswordInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setPasswordFormData(prev => ({ ...prev, [name]: value }));
  };

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmittingPasswordRef.current || !selectedTrainerForPassword) return;

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

    setIsSubmittingPassword(true);
    isSubmittingPasswordRef.current = true;

    try {
      const payload = { password };
      const json = await apiClient.post(`/api/admin/trainer-accounts/${selectedTrainerForPassword.trainer.id}/reset-password`, payload);
      
      if (isTrainerAccountPasswordResponse(json)) {
        setPasswordFormData({ password: '', password_confirmation: '' });
        await fetchData();
        handleClosePasswordModal();
      } else {
        setPasswordFormError('Şifre yenilendi ancak sunucu yanıtı doğrulanamadı.');
      }
    } catch (error: unknown) {
      let errMsg = 'Şifre yenilenirken bilinmeyen bir hata oluştu.';
      if (error instanceof ApiError) {
        switch (error.code) {
          case 'TRAINER_NOT_FOUND': errMsg = 'Eğitmen kaydı bulunamadı.'; break;
          case 'TRAINER_ACCOUNT_NOT_LINKED': errMsg = 'Bu eğitmenin bağlı bir hesabı yok.'; break;
          case 'TRAINER_ACCOUNT_INVALID_LINK': errMsg = 'Geçersiz veya yetkisiz hesap bağlantısı.'; break;
          case 'VALIDATION_ERROR': errMsg = error.message || 'Gönderilen veriler geçersiz.'; break;
          case 'FORBIDDEN': errMsg = 'Bu işlemi yapma yetkiniz yok.'; break;
          default: errMsg = error.message || errMsg;
        }
      }
      setPasswordFormError(errMsg);
    } finally {
      setIsSubmittingPassword(false);
      isSubmittingPasswordRef.current = false;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmittingRef.current || !selectedTrainer) return;

    setFormError(null);
    setFormSuccess(null);

    // Client side validation
    const username = formData.username.trim();
    const email = formData.email.trim();
    const display_name = formData.display_name.trim();
    const { password, password_confirmation } = formData;
    
    if (!username || username.length < 3 || username.length > 50 || !/^[A-Za-z0-9._-]+$/.test(username)) {
      setFormError('Kullanıcı adı 3-50 karakter uzunluğunda olmalı ve sadece harf, sayı, nokta, tire veya alt çizgi içermelidir.');
      return;
    }

    if (!email || email.length > 100 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setFormError('Geçerli bir e-posta adresi giriniz (maksimum 100 karakter).');
      return;
    }

    // Using Array.from for correct unicode length in JS
    if (!display_name || Array.from(display_name).length < 2 || Array.from(display_name).length > 100) {
      setFormError('Görünen ad 2-100 karakter arasında olmalıdır.');
      return;
    }

    if (!password || Array.from(password).length < 12 || Array.from(password).length > 256) {
      setFormError('Şifre 12-256 karakter arasında olmalıdır.');
      return;
    }

    if (password !== password_confirmation) {
      setFormError('Şifreler eşleşmiyor.');
      return;
    }

    setIsSubmitting(true);
    isSubmittingRef.current = true;

    try {
      const payload = {
        trainer_id: selectedTrainer.id,
        username,
        email,
        display_name,
        password
      };

      await apiClient.post('/api/admin/trainer-accounts', payload);

      setFormSuccess('Hesap başarıyla oluşturuldu.');
      
      // Clean password explicitly from memory
      setFormData(prev => ({
        ...prev,
        password: '',
        password_confirmation: ''
      }));

      // Reload list and close immediately
      await fetchData();
      handleCloseModal();

    } catch (error: unknown) {
      let errMsg = 'Bilinmeyen bir hata oluştu.';
      if (error instanceof ApiError) {
        switch (error.code) {
          case 'TRAINER_ACCOUNT_ALREADY_LINKED':
            errMsg = 'Bu eğitmen zaten bir hesaba bağlı.';
            break;
          case 'ACCOUNT_IDENTITY_CONFLICT':
            errMsg = 'Kullanıcı adı veya e-posta adresi kullanımda.';
            break;
          case 'TRAINER_NOT_FOUND':
            errMsg = 'Eğitmen kaydı bulunamadı.';
            break;
          case 'FORBIDDEN':
            errMsg = 'Bu işlemi yapma yetkiniz yok.';
            break;
          case 'VALIDATION_ERROR':
            errMsg = error.message || 'Gönderilen veriler geçersiz.';
            break;
          default:
            errMsg = error.message || errMsg;
        }
      }
      setFormError(errMsg);
    } finally {
      setIsSubmitting(false);
      isSubmittingRef.current = false;
    }
  };

  return (
    <div className="p-4 md:p-6 md:pb-24 max-w-7xl mx-auto w-full">
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white mb-1">Eğitmen Hesapları</h1>
          <p className="text-sm text-white/50">Eğitmen profillerine yönetici hesabı tanımlayın.</p>
        </div>
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/20 text-red-400 px-4 py-3 rounded mb-6 text-sm">
          {error}
        </div>
      )}

      {isLoading ? (
        <div className="flex items-center justify-center p-12 text-white/50">
          <div className="animate-pulse">Yükleniyor...</div>
        </div>
      ) : data.length === 0 ? (
        <div className="bg-[#0A0A0A] border border-white/10 rounded-lg p-12 text-center text-white/50">
          Henüz eğitmen profili bulunmuyor.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {data.map((row) => (
            <div key={row.trainer.id} className="bg-[#0A0A0A] border border-white/10 rounded-lg p-5 flex flex-col h-full">
              <div className="mb-4 flex-1">
                <div className="flex items-start justify-between gap-2 mb-1">
                  <h3 className="text-lg font-medium text-white truncate" title={row.trainer.name}>
                    {row.trainer.name}
                  </h3>
                  <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium uppercase tracking-wider ${row.trainer.is_active ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-zinc-500/10 text-zinc-400 border border-zinc-500/20'}`}>
                    {row.trainer.is_active ? 'Aktif' : 'Pasif'}
                  </span>
                </div>
                <div className="text-xs text-white/40 mb-3 font-mono">{row.trainer.slug}</div>

                {row.account ? (
                  <div className="bg-white/5 rounded p-3 border border-white/10 mt-4">
                    <div className="text-[10px] uppercase tracking-widest text-emerald-400/80 mb-2 font-medium flex items-center gap-1.5">
                      <div className="w-1.5 h-1.5 rounded-full bg-emerald-500"></div>
                      Bağlı Hesap
                    </div>
                    <div className="space-y-1.5 text-sm">
                      <div className="flex justify-between">
                        <span className="text-white/40">Görünen Ad:</span>
                        <span className="text-white/90 truncate max-w-[120px]" title={row.account.display_name}>{row.account.display_name}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-white/40">Kullanıcı:</span>
                        <span className="text-white/90 font-mono text-xs">{row.account.username}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-white/40">E-posta:</span>
                        <span className="text-white/90 truncate max-w-[120px]" title={row.account.email}>{row.account.email}</span>
                      </div>
                      <div className="flex justify-between mt-2 pt-2 border-t border-white/5">
                        <span className="text-white/40">Durum:</span>
                        <span className={row.account.status === 'active' ? 'text-emerald-400' : 'text-amber-400'}>
                          {row.account.status === 'active' ? 'Aktif' : 'Pasif'}
                        </span>
                      </div>
                      {row.account.last_login_at && (
                        <div className="flex justify-between">
                          <span className="text-white/40">Son Giriş:</span>
                          <span className="text-white/70 text-xs">
                            {new Date(row.account.last_login_at).toLocaleString('tr-TR')}
                          </span>
                        </div>
                      )}
                    </div>

                    <div className="mt-4 flex gap-2">
                      <button
                        type="button"
                        onClick={() => handleToggleStatus(row.trainer.id, row.account!.status)}
                        disabled={isUpdatingStatus}
                        className={`flex-1 px-3 py-2 text-[10px] font-medium uppercase tracking-wider rounded transition-colors ${
                          row.account.status === 'active' 
                            ? 'bg-amber-500/10 text-amber-400 hover:bg-amber-500/20 border border-amber-500/20'
                            : 'bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 border border-emerald-500/20'
                        }`}
                      >
                        {row.account.status === 'active' ? 'Hesabı Pasife Al' : 'Hesabı Aktifleştir'}
                      </button>
                      <button
                        type="button"
                        onClick={() => handleOpenPasswordModal(row.trainer, row.account!)}
                        disabled={isUpdatingStatus}
                        className="flex-1 px-3 py-2 text-[10px] font-medium uppercase tracking-wider rounded bg-white/5 text-white/70 hover:bg-white/10 hover:text-white border border-white/10 transition-colors"
                      >
                        Şifreyi Yenile
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="bg-white/5 rounded p-3 border border-white/5 mt-4 border-dashed flex flex-col items-center justify-center py-6">
                    <div className="text-white/30 text-sm mb-3">Hesap bağlantısı yok</div>
                    <button 
                      onClick={() => handleOpenModal(row.trainer)}
                      className="px-4 py-2 bg-white text-black text-sm font-medium rounded hover:bg-white/90 transition-colors"
                    >
                      Hesap Oluştur
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal Overlay */}
      {isModalOpen && selectedTrainer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-[#0F0F0F] border border-white/10 rounded-xl shadow-2xl w-full max-w-md overflow-hidden">
            <div className="p-5 border-b border-white/10 flex justify-between items-center bg-[#0A0A0A]">
              <h3 className="text-lg font-medium text-white">Hesap Oluştur</h3>
              <button 
                onClick={handleCloseModal} 
                disabled={isSubmitting}
                className="text-white/40 hover:text-white transition-colors"
              >
                Kapat
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-5 space-y-4">
              {formError && (
                <div className="bg-red-500/10 border border-red-500/20 text-red-400 px-3 py-2 rounded text-sm">
                  {formError}
                </div>
              )}
              {formSuccess && (
                <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 px-3 py-2 rounded text-sm">
                  {formSuccess}
                </div>
              )}

              <div>
                <label className="block text-xs font-medium text-white/50 mb-1.5 uppercase tracking-wider">
                  Eğitmen Profili
                </label>
                <div className="px-3 py-2 bg-white/5 border border-white/10 rounded text-white/70 text-sm">
                  {selectedTrainer.name}
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-white/50 mb-1.5 uppercase tracking-wider">
                  Görünen Ad
                </label>
                <input 
                  type="text" 
                  name="display_name"
                  value={formData.display_name}
                  onChange={handleInputChange}
                  disabled={isSubmitting}
                  className="w-full bg-[#050505] border border-white/10 rounded px-3 py-2 text-sm text-white focus:outline-none focus:border-white/30 transition-colors"
                  placeholder="Panelde görünecek isim"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-white/50 mb-1.5 uppercase tracking-wider">
                  Kullanıcı Adı
                </label>
                <input 
                  type="text" 
                  name="username"
                  value={formData.username}
                  onChange={handleInputChange}
                  disabled={isSubmitting}
                  className="w-full bg-[#050505] border border-white/10 rounded px-3 py-2 text-sm text-white font-mono focus:outline-none focus:border-white/30 transition-colors"
                  placeholder="Sisteme giriş için"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-white/50 mb-1.5 uppercase tracking-wider">
                  E-posta
                </label>
                <input 
                  type="email" 
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  disabled={isSubmitting}
                  className="w-full bg-[#050505] border border-white/10 rounded px-3 py-2 text-sm text-white focus:outline-none focus:border-white/30 transition-colors"
                  placeholder="İletişim e-postası"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-white/50 mb-1.5 uppercase tracking-wider">
                  Şifre
                </label>
                <input 
                  type="password" 
                  name="password"
                  value={formData.password}
                  onChange={handleInputChange}
                  disabled={isSubmitting}
                  autoComplete="new-password"
                  className="w-full bg-[#050505] border border-white/10 rounded px-3 py-2 text-sm text-white focus:outline-none focus:border-white/30 transition-colors"
                  placeholder="En az 12 karakter"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-white/50 mb-1.5 uppercase tracking-wider">
                  Şifre (Tekrar)
                </label>
                <input 
                  type="password" 
                  name="password_confirmation"
                  value={formData.password_confirmation}
                  onChange={handleInputChange}
                  disabled={isSubmitting}
                  autoComplete="new-password"
                  className="w-full bg-[#050505] border border-white/10 rounded px-3 py-2 text-sm text-white focus:outline-none focus:border-white/30 transition-colors"
                  placeholder="Şifreyi onaylayın"
                  required
                />
              </div>

              <div className="pt-4 flex justify-end gap-3">
                <button 
                  type="button" 
                  onClick={handleCloseModal}
                  disabled={isSubmitting}
                  className="px-4 py-2 text-sm font-medium text-white/60 hover:text-white transition-colors"
                >
                  İptal
                </button>
                <button 
                  type="submit" 
                  disabled={isSubmitting}
                  className="px-6 py-2 bg-white text-black text-sm font-medium rounded hover:bg-white/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? 'Oluşturuluyor...' : 'Oluştur'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Password Reset Modal */}
      {isPasswordModalOpen && selectedTrainerForPassword && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-[#0F0F0F] border border-white/10 rounded-xl shadow-2xl w-full max-w-md overflow-hidden">
            <div className="p-5 border-b border-white/10 flex justify-between items-center bg-[#0A0A0A]">
              <h3 className="text-lg font-medium text-white">Şifreyi Yenile</h3>
              <button 
                type="button"
                onClick={handleClosePasswordModal} 
                disabled={isSubmittingPassword}
                className="text-white/40 hover:text-white transition-colors"
              >
                Kapat
              </button>
            </div>
            
            <form onSubmit={handlePasswordSubmit} className="p-5 space-y-4">
              {passwordFormError && (
                <div className="bg-red-500/10 border border-red-500/20 text-red-400 px-3 py-2 rounded text-sm">
                  {passwordFormError}
                </div>
              )}
              {passwordFormSuccess && (
                <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 px-3 py-2 rounded text-sm">
                  {passwordFormSuccess}
                </div>
              )}

              <div>
                <label className="block text-xs font-medium text-white/50 mb-1.5 uppercase tracking-wider">
                  Eğitmen Profili
                </label>
                <div className="px-3 py-2 bg-white/5 border border-white/10 rounded text-white/70 text-sm">
                  {selectedTrainerForPassword.trainer.name}
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-white/50 mb-1.5 uppercase tracking-wider">
                  Kullanıcı Adı
                </label>
                <div className="px-3 py-2 bg-white/5 border border-white/10 rounded text-white/70 text-sm font-mono">
                  {selectedTrainerForPassword.account.username}
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-white/50 mb-1.5 uppercase tracking-wider">
                  Yeni Şifre
                </label>
                <input 
                  type="password" 
                  name="password"
                  value={passwordFormData.password}
                  onChange={handlePasswordInputChange}
                  disabled={isSubmittingPassword}
                  autoComplete="new-password"
                  className="w-full bg-[#050505] border border-white/10 rounded px-3 py-2 text-sm text-white focus:outline-none focus:border-white/30 transition-colors"
                  placeholder="En az 12 karakter"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-white/50 mb-1.5 uppercase tracking-wider">
                  Yeni Şifre (Tekrar)
                </label>
                <input 
                  type="password" 
                  name="password_confirmation"
                  value={passwordFormData.password_confirmation}
                  onChange={handlePasswordInputChange}
                  disabled={isSubmittingPassword}
                  autoComplete="new-password"
                  className="w-full bg-[#050505] border border-white/10 rounded px-3 py-2 text-sm text-white focus:outline-none focus:border-white/30 transition-colors"
                  placeholder="Şifreyi onaylayın"
                  required
                />
              </div>

              <div className="pt-4 flex justify-end gap-3">
                <button 
                  type="button" 
                  onClick={handleClosePasswordModal}
                  disabled={isSubmittingPassword}
                  className="px-4 py-2 text-sm font-medium text-white/60 hover:text-white transition-colors"
                >
                  İptal
                </button>
                <button 
                  type="submit" 
                  disabled={isSubmittingPassword}
                  className="px-6 py-2 bg-white text-black text-sm font-medium rounded hover:bg-white/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSubmittingPassword ? 'Yenileniyor...' : 'Yenile'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
