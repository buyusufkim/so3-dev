import { useState, useEffect } from "react";
import { apiClient, ApiError } from "../../api/client";
import {
  SiteSettingsResponse,
  ContactSettings,
  LocationSettings,
  SocialSettings,
  TourSettings,
  BusinessHoursSettings,
  BusinessHoursItem,
  BusinessDay,
  AdminUser
} from "./types";
import { Save, RefreshCw, MapPin, Hash, Globe, Phone, Clock, AlertTriangle } from "lucide-react";

export function AdminSettings() {
  const [admin, setAdmin] = useState<AdminUser | null>(null);
  
  const [loading, setLoading] = useState(true);
  const [pageError, setPageError] = useState<string | null>(null);

  const [savedSettings, setSavedSettings] = useState<SiteSettingsResponse | null>(null);

  const [contact, setContact] = useState<ContactSettings>({ phone_primary: '', phone_secondary: null, whatsapp: '' });
  const [location, setLocation] = useState<LocationSettings>({ address: '', maps_directions_url: '', maps_embed_url: '' });
  const [social, setSocial] = useState<SocialSettings>({ instagram_username: '' });
  const [tour, setTour] = useState<TourSettings>({ matterport_model_id: '' });
  const [businessHours, setBusinessHours] = useState<BusinessHoursSettings>({ enabled: false, items: [] });

  const [dirtyContact, setDirtyContact] = useState(false);
  const [dirtyLocation, setDirtyLocation] = useState(false);
  const [dirtySocial, setDirtySocial] = useState(false);
  const [dirtyTour, setDirtyTour] = useState(false);
  const [dirtyBusinessHours, setDirtyBusinessHours] = useState(false);

  const [savingContact, setSavingContact] = useState(false);
  const [savingLocation, setSavingLocation] = useState(false);
  const [savingSocial, setSavingSocial] = useState(false);
  const [savingTour, setSavingTour] = useState(false);
  const [savingBusinessHours, setSavingBusinessHours] = useState(false);

  const [errorContact, setErrorContact] = useState<string | null>(null);
  const [errorLocation, setErrorLocation] = useState<string | null>(null);
  const [errorSocial, setErrorSocial] = useState<string | null>(null);
  const [errorTour, setErrorTour] = useState<string | null>(null);
  const [errorBusinessHours, setErrorBusinessHours] = useState<string | null>(null);

  const [successContact, setSuccessContact] = useState(false);
  const [successLocation, setSuccessLocation] = useState(false);
  const [successSocial, setSuccessSocial] = useState(false);
  const [successTour, setSuccessTour] = useState(false);
  const [successBusinessHours, setSuccessBusinessHours] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const anyDirty = dirtyContact || dirtyLocation || dirtySocial || dirtyTour || dirtyBusinessHours;

  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (anyDirty) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [anyDirty]);

  const fetchData = async () => {
    setLoading(true);
    setPageError(null);
    try {
      const user = await apiClient.get('/api/auth/me') as AdminUser;
      setAdmin(user);

      const data = await apiClient.get('/api/admin/site-settings') as SiteSettingsResponse;
      setSavedSettings(data);
      
      setContact(data.contact);
      setLocation(data.location);
      setSocial(data.social);
      setTour(data.tour);
      
      if (data.business_hours) {
        if (!data.business_hours.enabled && data.business_hours.items.length === 0) {
           setBusinessHours({
              enabled: false,
              items: generateEmptyBusinessHours()
           });
        } else {
           setBusinessHours(data.business_hours);
        }
      }
      
    } catch (err) {
      setPageError("Ayarlar yüklenemedi. Lütfen tekrar deneyin.");
    } finally {
      setLoading(false);
    }
  };

  const generateEmptyBusinessHours = (): BusinessHoursItem[] => {
    const days: BusinessDay[] = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
    return days.map(day => ({
      day,
      is_closed: true,
      open: null,
      close: null
    }));
  };

  const getDayLabel = (day: BusinessDay) => {
    const map: Record<BusinessDay, string> = {
      monday: 'Pazartesi',
      tuesday: 'Salı',
      wednesday: 'Çarşamba',
      thursday: 'Perşembe',
      friday: 'Cuma',
      saturday: 'Cumartesi',
      sunday: 'Pazar'
    };
    return map[day];
  };

  const canEdit = admin?.role === 'super_admin' || admin?.role === 'admin';

  const clearSuccess = (type: string) => {
    if (type === 'contact') setSuccessContact(false);
    if (type === 'location') setSuccessLocation(false);
    if (type === 'social') setSuccessSocial(false);
    if (type === 'tour') setSuccessTour(false);
    if (type === 'business_hours') setSuccessBusinessHours(false);
  };

  const handleContactChange = (field: keyof ContactSettings, value: string | null) => {
    setContact(prev => ({ ...prev, [field]: value }));
    setDirtyContact(true);
    clearSuccess('contact');
    setErrorContact(null);
  };

  const handleLocationChange = (field: keyof LocationSettings, value: string) => {
    setLocation(prev => ({ ...prev, [field]: value }));
    setDirtyLocation(true);
    clearSuccess('location');
    setErrorLocation(null);
  };

  const handleSocialChange = (field: keyof SocialSettings, value: string) => {
    let normalizedValue = value;
    if (field === 'instagram_username' && normalizedValue.startsWith('@')) {
      normalizedValue = normalizedValue.substring(1);
    }
    setSocial(prev => ({ ...prev, [field]: normalizedValue }));
    setDirtySocial(true);
    clearSuccess('social');
    setErrorSocial(null);
  };

  const handleTourChange = (field: keyof TourSettings, value: string) => {
    setTour(prev => ({ ...prev, [field]: value }));
    setDirtyTour(true);
    clearSuccess('tour');
    setErrorTour(null);
  };

  const handleBusinessHoursChange = (enabled: boolean) => {
    setBusinessHours(prev => ({ ...prev, enabled }));
    setDirtyBusinessHours(true);
    clearSuccess('business_hours');
    setErrorBusinessHours(null);
  };

  const handleBusinessHoursItemChange = (index: number, field: keyof BusinessHoursItem, value: any) => {
    setBusinessHours(prev => {
      const newItems = [...prev.items];
      const item = { ...newItems[index] };
      
      if (field === 'is_closed') {
        item.is_closed = value;
        if (value) {
          item.open = null;
          item.close = null;
        }
      } else {
        (item as any)[field] = value;
      }
      
      newItems[index] = item;
      return { ...prev, items: newItems };
    });
    setDirtyBusinessHours(true);
    clearSuccess('business_hours');
    setErrorBusinessHours(null);
  };

  const resetContact = () => {
    if (savedSettings) setContact(savedSettings.contact);
    setDirtyContact(false);
    setErrorContact(null);
    setSuccessContact(false);
  };

  const resetLocation = () => {
    if (savedSettings) setLocation(savedSettings.location);
    setDirtyLocation(false);
    setErrorLocation(null);
    setSuccessLocation(false);
  };

  const resetSocial = () => {
    if (savedSettings) setSocial(savedSettings.social);
    setDirtySocial(false);
    setErrorSocial(null);
    setSuccessSocial(false);
  };

  const resetTour = () => {
    if (savedSettings) setTour(savedSettings.tour);
    setDirtyTour(false);
    setErrorTour(null);
    setSuccessTour(false);
  };

  const resetBusinessHours = () => {
    if (savedSettings) {
      if (!savedSettings.business_hours.enabled && savedSettings.business_hours.items.length === 0) {
        setBusinessHours({
            enabled: false,
            items: generateEmptyBusinessHours()
        });
      } else {
        setBusinessHours(savedSettings.business_hours);
      }
    }
    setDirtyBusinessHours(false);
    setErrorBusinessHours(null);
    setSuccessBusinessHours(false);
  };

  const saveContact = async () => {
    if (!canEdit) return;
    setSavingContact(true);
    setErrorContact(null);
    try {
      await apiClient.patch('/api/admin/site-settings/contact', contact);
      setSavedSettings(prev => prev ? { ...prev, contact } : prev);
      setDirtyContact(false);
      setSuccessContact(true);
    } catch (err: any) {
      if (err instanceof ApiError) {
        if (err.status === 403) setErrorContact("Bu ayarı değiştirme yetkiniz yok.");
        else if (err.status === 422) setErrorContact(err.message);
        else setErrorContact("Ayar kaydedilemedi.");
      } else {
        setErrorContact("Ayar kaydedilemedi.");
      }
    } finally {
      setSavingContact(false);
    }
  };

  const saveLocation = async () => {
    if (!canEdit) return;
    setSavingLocation(true);
    setErrorLocation(null);
    try {
      await apiClient.patch('/api/admin/site-settings/location', location);
      setSavedSettings(prev => prev ? { ...prev, location } : prev);
      setDirtyLocation(false);
      setSuccessLocation(true);
    } catch (err: any) {
      if (err instanceof ApiError) {
        if (err.status === 403) setErrorLocation("Bu ayarı değiştirme yetkiniz yok.");
        else if (err.status === 422) setErrorLocation(err.message);
        else setErrorLocation("Ayar kaydedilemedi.");
      } else {
        setErrorLocation("Ayar kaydedilemedi.");
      }
    } finally {
      setSavingLocation(false);
    }
  };

  const saveSocial = async () => {
    if (!canEdit) return;
    setSavingSocial(true);
    setErrorSocial(null);
    try {
      await apiClient.patch('/api/admin/site-settings/social', social);
      setSavedSettings(prev => prev ? { ...prev, social } : prev);
      setDirtySocial(false);
      setSuccessSocial(true);
    } catch (err: any) {
      if (err instanceof ApiError) {
        if (err.status === 403) setErrorSocial("Bu ayarı değiştirme yetkiniz yok.");
        else if (err.status === 422) setErrorSocial(err.message);
        else setErrorSocial("Ayar kaydedilemedi.");
      } else {
        setErrorSocial("Ayar kaydedilemedi.");
      }
    } finally {
      setSavingSocial(false);
    }
  };

  const saveTour = async () => {
    if (!canEdit) return;
    setSavingTour(true);
    setErrorTour(null);
    try {
      await apiClient.patch('/api/admin/site-settings/tour', tour);
      setSavedSettings(prev => prev ? { ...prev, tour } : prev);
      setDirtyTour(false);
      setSuccessTour(true);
    } catch (err: any) {
      if (err instanceof ApiError) {
        if (err.status === 403) setErrorTour("Bu ayarı değiştirme yetkiniz yok.");
        else if (err.status === 422) setErrorTour(err.message);
        else setErrorTour("Ayar kaydedilemedi.");
      } else {
        setErrorTour("Ayar kaydedilemedi.");
      }
    } finally {
      setSavingTour(false);
    }
  };

  const saveBusinessHours = async () => {
    if (!canEdit) return;
    setSavingBusinessHours(true);
    setErrorBusinessHours(null);
    try {
      
      let payloadItems = businessHours.items;
      if (businessHours.enabled) {
        for (const item of businessHours.items) {
          if (!item.is_closed) {
             if (!item.open || !item.close) {
                 setErrorBusinessHours("Açık olan günler için açılış ve kapanış saatleri eksiksiz doldurulmalıdır.");
                 setSavingBusinessHours(false);
                 return;
             }
          }
        }
      } else {
        payloadItems = [];
      }

      const payload = {
         enabled: businessHours.enabled,
         items: payloadItems.map(i => ({
             day: i.day,
             is_closed: i.is_closed,
             open: i.is_closed ? null : i.open,
             close: i.is_closed ? null : i.close
         }))
      };

      await apiClient.patch('/api/admin/site-settings/business_hours', payload);
      
      const newSaved = {
         enabled: payload.enabled,
         items: payload.enabled ? payload.items : []
      };
      
      setSavedSettings(prev => prev ? { ...prev, business_hours: newSaved } : prev);
      if (!payload.enabled && businessHours.items.length === 0) {
         setBusinessHours({
            enabled: false,
            items: generateEmptyBusinessHours()
         });
      }
      setDirtyBusinessHours(false);
      setSuccessBusinessHours(true);
    } catch (err: any) {
      if (err instanceof ApiError) {
        if (err.status === 403) setErrorBusinessHours("Bu ayarı değiştirme yetkiniz yok.");
        else if (err.status === 422) setErrorBusinessHours(err.message);
        else setErrorBusinessHours("Ayar kaydedilemedi.");
      } else {
        setErrorBusinessHours("Ayar kaydedilemedi.");
      }
    } finally {
      setSavingBusinessHours(false);
    }
  };


  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-white/50 text-sm">Yükleniyor...</div>
      </div>
    );
  }

  if (pageError) {
    return (
      <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-6 rounded-lg text-sm">
        {pageError}
      </div>
    );
  }

  return (
    <div className="max-w-4xl space-y-8 pb-20">
      <div>
        <h1 className="text-2xl font-bold text-white mb-2">Ayarlar</h1>
        <p className="text-white/50 text-sm">SO3'ün iletişim, konum ve genel bağlantı bilgilerini yönetin.</p>
      </div>

      {!canEdit && (
        <div className="bg-blue-500/10 border border-blue-500/20 text-blue-400 p-4 rounded-lg text-sm flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5" />
          <p>Bu alanları görüntüleyebilirsiniz ancak değiştirme yetkiniz yok.</p>
        </div>
      )}

      {/* İLETİŞİM */}
      <div className="bg-[#111] border border-white/10 rounded-xl overflow-hidden">
        <div className="border-b border-white/10 px-6 py-4 flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center text-white/50">
             <Phone className="w-4 h-4" />
          </div>
          <h2 className="text-lg font-medium text-white">İletişim</h2>
        </div>
        <div className="p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-white/70">Birincil Telefon</label>
              <input
                type="text"
                inputMode="numeric"
                maxLength={11}
                value={contact.phone_primary}
                onChange={e => handleContactChange('phone_primary', e.target.value)}
                disabled={!canEdit || savingContact}
                className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-white placeholder-white/20 focus:outline-none focus:border-[#851C35] transition-colors disabled:opacity-50"
                placeholder="Örn: 05551234567"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-white/70">WhatsApp</label>
              <input
                type="text"
                inputMode="numeric"
                maxLength={11}
                value={contact.whatsapp}
                onChange={e => handleContactChange('whatsapp', e.target.value)}
                disabled={!canEdit || savingContact}
                className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-white placeholder-white/20 focus:outline-none focus:border-[#851C35] transition-colors disabled:opacity-50"
                placeholder="Örn: 05551234567"
              />
            </div>
            <div className="space-y-1.5 md:col-span-2">
              <label className="text-sm font-medium text-white/70 flex items-center gap-2">
                İkincil Telefon <span className="text-[10px] uppercase tracking-wider text-white/30">(Opsiyonel)</span>
              </label>
              <input
                type="text"
                inputMode="numeric"
                maxLength={11}
                value={contact.phone_secondary || ''}
                onChange={e => handleContactChange('phone_secondary', e.target.value === '' ? null : e.target.value)}
                disabled={!canEdit || savingContact}
                className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-white placeholder-white/20 focus:outline-none focus:border-[#851C35] transition-colors disabled:opacity-50"
                placeholder="Örn: 05551234567"
              />
            </div>
          </div>

          {errorContact && <div className="text-red-400 text-sm bg-red-400/10 p-3 rounded-lg border border-red-400/20">{errorContact}</div>}
          
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-white/10">
            {successContact && <span className="text-green-400 text-sm mr-auto">Kaydedildi.</span>}
            {dirtyContact && canEdit && (
              <button onClick={resetContact} disabled={savingContact} className="px-4 py-2 text-sm text-white/50 hover:text-white transition-colors">
                Değişiklikleri Geri Al
              </button>
            )}
            <button
              onClick={saveContact}
              disabled={!canEdit || !dirtyContact || savingContact}
              className="flex items-center gap-2 bg-[#851C35] text-white px-5 py-2 rounded-lg text-sm font-medium hover:bg-[#851C35]/80 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Save className="w-4 h-4" />
              İletişim Bilgilerini Kaydet
            </button>
          </div>
        </div>
      </div>

      {/* KONUM */}
      <div className="bg-[#111] border border-white/10 rounded-xl overflow-hidden">
        <div className="border-b border-white/10 px-6 py-4 flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center text-white/50">
             <MapPin className="w-4 h-4" />
          </div>
          <h2 className="text-lg font-medium text-white">Konum ve Harita</h2>
        </div>
        <div className="p-6 space-y-6">
          <div className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-white/70">Adres</label>
              <textarea
                value={location.address}
                onChange={e => handleLocationChange('address', e.target.value)}
                disabled={!canEdit || savingLocation}
                rows={3}
                maxLength={500}
                className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white placeholder-white/20 focus:outline-none focus:border-[#851C35] transition-colors disabled:opacity-50 resize-none"
              />
            </div>
            
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-white/70">Google Maps Yol Tarifi Bağlantısı</label>
              <p className="text-xs text-white/40 mb-2">Google Maps'te kullanıcıyı konuma götüren bağlantı.</p>
              <div className="flex gap-3">
                <input
                  type="text"
                  value={location.maps_directions_url}
                  onChange={e => handleLocationChange('maps_directions_url', e.target.value)}
                  disabled={!canEdit || savingLocation}
                  className="flex-1 bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-white placeholder-white/20 focus:outline-none focus:border-[#851C35] transition-colors disabled:opacity-50"
                />
                {location.maps_directions_url && (
                  <a href={location.maps_directions_url} target="_blank" rel="noopener noreferrer" className="flex-shrink-0 flex items-center gap-2 bg-white/5 text-white/70 px-4 py-2.5 rounded-lg text-sm font-medium hover:bg-white/10 hover:text-white transition-colors">
                    Bağlantıyı Aç
                  </a>
                )}
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium text-white/70">Google Maps Embed Bağlantısı</label>
              <p className="text-xs text-white/40 mb-2">Sitedeki haritada kullanılan Google Maps embed bağlantısı.</p>
              <textarea
                value={location.maps_embed_url}
                onChange={e => handleLocationChange('maps_embed_url', e.target.value)}
                disabled={!canEdit || savingLocation}
                rows={4}
                className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white font-mono text-xs placeholder-white/20 focus:outline-none focus:border-[#851C35] transition-colors disabled:opacity-50 resize-none"
              />
            </div>
          </div>

          {errorLocation && <div className="text-red-400 text-sm bg-red-400/10 p-3 rounded-lg border border-red-400/20">{errorLocation}</div>}

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-white/10">
            {successLocation && <span className="text-green-400 text-sm mr-auto">Kaydedildi.</span>}
            {dirtyLocation && canEdit && (
              <button onClick={resetLocation} disabled={savingLocation} className="px-4 py-2 text-sm text-white/50 hover:text-white transition-colors">
                Değişiklikleri Geri Al
              </button>
            )}
            <button
              onClick={saveLocation}
              disabled={!canEdit || !dirtyLocation || savingLocation}
              className="flex items-center gap-2 bg-[#851C35] text-white px-5 py-2 rounded-lg text-sm font-medium hover:bg-[#851C35]/80 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Save className="w-4 h-4" />
              Konumu Kaydet
            </button>
          </div>
        </div>
      </div>

      {/* INSTAGRAM */}
      <div className="bg-[#111] border border-white/10 rounded-xl overflow-hidden">
        <div className="border-b border-white/10 px-6 py-4 flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center text-white/50">
             <Hash className="w-4 h-4" />
          </div>
          <h2 className="text-lg font-medium text-white">Instagram</h2>
        </div>
        <div className="p-6 space-y-6">
          <div className="space-y-1.5 max-w-md">
            <label className="text-sm font-medium text-white/70">Instagram Kullanıcı Adı</label>
            <div className="flex items-center gap-3 mt-1 relative">
              <div className="absolute left-4 top-1/2 -translate-y-1/2 text-white/40 pointer-events-none">
                @
              </div>
              <input
                type="text"
                value={social.instagram_username}
                onChange={e => handleSocialChange('instagram_username', e.target.value)}
                disabled={!canEdit || savingSocial}
                className="w-full bg-white/5 border border-white/10 rounded-lg pl-9 pr-4 py-2.5 text-white placeholder-white/20 focus:outline-none focus:border-[#851C35] transition-colors disabled:opacity-50"
                placeholder="so3pt"
              />
            </div>
            {social.instagram_username && (
               <a href={`https://www.instagram.com/${social.instagram_username}/`} target="_blank" rel="noopener noreferrer" className="inline-flex text-xs text-[#851C35] hover:underline mt-2">
                 Instagram Profilini Aç
               </a>
            )}
          </div>

          {errorSocial && <div className="text-red-400 text-sm bg-red-400/10 p-3 rounded-lg border border-red-400/20">{errorSocial}</div>}

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-white/10">
            {successSocial && <span className="text-green-400 text-sm mr-auto">Kaydedildi.</span>}
            {dirtySocial && canEdit && (
              <button onClick={resetSocial} disabled={savingSocial} className="px-4 py-2 text-sm text-white/50 hover:text-white transition-colors">
                Değişiklikleri Geri Al
              </button>
            )}
            <button
              onClick={saveSocial}
              disabled={!canEdit || !dirtySocial || savingSocial}
              className="flex items-center gap-2 bg-[#851C35] text-white px-5 py-2 rounded-lg text-sm font-medium hover:bg-[#851C35]/80 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Save className="w-4 h-4" />
              Instagram'ı Kaydet
            </button>
          </div>
        </div>
      </div>

      {/* MATTERPORT */}
      <div className="bg-[#111] border border-white/10 rounded-xl overflow-hidden">
        <div className="border-b border-white/10 px-6 py-4 flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center text-white/50">
             <Globe className="w-4 h-4" />
          </div>
          <h2 className="text-lg font-medium text-white">360° Sanal Tur</h2>
        </div>
        <div className="p-6 space-y-6">
          <div className="space-y-1.5 max-w-md">
            <label className="text-sm font-medium text-white/70">Matterport Model ID</label>
            <input
              type="text"
              value={tour.matterport_model_id}
              onChange={e => handleTourChange('matterport_model_id', e.target.value)}
              disabled={!canEdit || savingTour}
              className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-white placeholder-white/20 focus:outline-none focus:border-[#851C35] transition-colors disabled:opacity-50 mt-1"
              placeholder="sXAzAwRLnGs"
            />
            {tour.matterport_model_id && (
               <a href={`https://my.matterport.com/show/?m=${tour.matterport_model_id}`} target="_blank" rel="noopener noreferrer" className="inline-flex text-xs text-[#851C35] hover:underline mt-2">
                 Sanal Turu Aç
               </a>
            )}
          </div>

          {errorTour && <div className="text-red-400 text-sm bg-red-400/10 p-3 rounded-lg border border-red-400/20">{errorTour}</div>}

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-white/10">
            {successTour && <span className="text-green-400 text-sm mr-auto">Kaydedildi.</span>}
            {dirtyTour && canEdit && (
              <button onClick={resetTour} disabled={savingTour} className="px-4 py-2 text-sm text-white/50 hover:text-white transition-colors">
                Değişiklikleri Geri Al
              </button>
            )}
            <button
              onClick={saveTour}
              disabled={!canEdit || !dirtyTour || savingTour}
              className="flex items-center gap-2 bg-[#851C35] text-white px-5 py-2 rounded-lg text-sm font-medium hover:bg-[#851C35]/80 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Save className="w-4 h-4" />
              Sanal Turu Kaydet
            </button>
          </div>
        </div>
      </div>

      {/* ÇALIŞMA SAATLERİ */}
      <div className="bg-[#111] border border-white/10 rounded-xl overflow-hidden">
        <div className="border-b border-white/10 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
             <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center text-white/50">
               <Clock className="w-4 h-4" />
             </div>
             <h2 className="text-lg font-medium text-white">Çalışma Saatleri</h2>
          </div>
          
          <label className="flex items-center gap-3 cursor-pointer">
            <span className="text-sm text-white/70 font-medium">Çalışma Saatleri Aktif</span>
            <div className="relative">
              <input 
                type="checkbox" 
                className="sr-only peer" 
                checked={businessHours.enabled}
                onChange={e => handleBusinessHoursChange(e.target.checked)}
                disabled={!canEdit || savingBusinessHours}
              />
              <div className="w-11 h-6 bg-white/10 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#851C35] disabled:opacity-50"></div>
            </div>
          </label>
        </div>
        <div className="p-6 space-y-6">
          
          {!businessHours.enabled && (
            <div className="text-white/50 text-sm">
              Çalışma saatleri henüz tanımlanmamış veya aktif değil.
            </div>
          )}

          <div className="space-y-4">
             {businessHours.items.map((item, index) => (
               <div key={item.day} className="flex flex-col sm:flex-row sm:items-center gap-4 bg-white/5 border border-white/10 p-4 rounded-lg">
                  <div className="w-32 font-medium text-white/90">
                    {getDayLabel(item.day)}
                  </div>
                  <div className="flex items-center gap-4 flex-1">
                    <select 
                      value={item.is_closed ? 'closed' : 'open'}
                      onChange={e => handleBusinessHoursItemChange(index, 'is_closed', e.target.value === 'closed')}
                      disabled={!canEdit || savingBusinessHours}
                      className="bg-black border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-[#851C35] disabled:opacity-50"
                    >
                      <option value="open">Açık</option>
                      <option value="closed">Kapalı</option>
                    </select>

                    {!item.is_closed && (
                      <div className="flex items-center gap-3">
                         <div className="flex items-center gap-2">
                           <span className="text-xs text-white/40">Açılış</span>
                           <input 
                             type="time" 
                             value={item.open || ''}
                             onChange={e => handleBusinessHoursItemChange(index, 'open', e.target.value)}
                             disabled={!canEdit || savingBusinessHours}
                             className="bg-black border border-white/10 rounded-lg px-2 py-1.5 text-sm text-white focus:outline-none focus:border-[#851C35] disabled:opacity-50"
                           />
                         </div>
                         <span className="text-white/30">-</span>
                         <div className="flex items-center gap-2">
                           <span className="text-xs text-white/40">Kapanış</span>
                           <input 
                             type="time" 
                             value={item.close || ''}
                             onChange={e => handleBusinessHoursItemChange(index, 'close', e.target.value)}
                             disabled={!canEdit || savingBusinessHours}
                             className="bg-black border border-white/10 rounded-lg px-2 py-1.5 text-sm text-white focus:outline-none focus:border-[#851C35] disabled:opacity-50"
                           />
                         </div>
                      </div>
                    )}
                  </div>
               </div>
             ))}
          </div>

          {errorBusinessHours && <div className="text-red-400 text-sm bg-red-400/10 p-3 rounded-lg border border-red-400/20">{errorBusinessHours}</div>}

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-white/10">
            {successBusinessHours && <span className="text-green-400 text-sm mr-auto">Kaydedildi.</span>}
            {dirtyBusinessHours && canEdit && (
              <button onClick={resetBusinessHours} disabled={savingBusinessHours} className="px-4 py-2 text-sm text-white/50 hover:text-white transition-colors">
                Değişiklikleri Geri Al
              </button>
            )}
            <button
              onClick={saveBusinessHours}
              disabled={!canEdit || !dirtyBusinessHours || savingBusinessHours}
              className="flex items-center gap-2 bg-[#851C35] text-white px-5 py-2 rounded-lg text-sm font-medium hover:bg-[#851C35]/80 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Save className="w-4 h-4" />
              Çalışma Saatlerini Kaydet
            </button>
          </div>
        </div>
      </div>

    </div>
  );
}
