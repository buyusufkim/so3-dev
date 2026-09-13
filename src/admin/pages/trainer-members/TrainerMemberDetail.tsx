import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { apiClient, ApiError } from "../../api/client";
import { TrainerMemberDetail as ITrainerMemberDetail, isTrainerMemberDetail } from "./types";
import { TrainerMemberWorkspaceNav } from "../../components/TrainerMemberWorkspaceNav";

export function TrainerMemberDetail() {
  const { id } = useParams<{ id: string }>();
  const isValidMemberId = /^[1-9]\d*$/.test(id || "");
  const [member, setMember] = useState<ITrainerMemberDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
        const response = await apiClient.get(`/api/trainer/members/${id}`);
        if (!isSubscribed) return;
        if (isTrainerMemberDetail(response)) {
          setMember(response);
        } else {
          throw new Error('Geçersiz sunucu yanıtı.');
        }
      } catch (err: unknown) {
        if (!isSubscribed) return;
        if (err instanceof ApiError) {
          if (err.code === 'TRAINER_PROFILE_NOT_LINKED') {
            setError('Aktif eğitmen profiliniz hesabınıza bağlanmamış.');
          } else if (err.status === 403 || err.code === 'FORBIDDEN') {
            setError('Bu alana erişim yetkiniz yok.');
          } else if (err.status === 404 || err.code === 'NOT_FOUND') {
            setError('Üye bulunamadı veya bu üyeye erişim yetkiniz yok.');
          } else if (err.status === 422 || err.code === 'VALIDATION_ERROR') {
            setError(err.message || 'Geçersiz istek parametresi.');
          } else {
            setError(err.message || 'Üye bulunamadı veya bu üyeye erişim yetkiniz yok.');
          }
        } else if (err instanceof Error) {
          setError(err.message);
        } else {
          setError('Bilinmeyen bir hata oluştu.');
        }
      } finally {
        if (isSubscribed) {
          setLoading(false);
        }
      }
    };

    fetchMember();

    return () => {
      isSubscribed = false;
    };
  }, [id, isValidMemberId]);

  if (loading) {
    return (
      <div className="space-y-4 lg:space-y-6">
        <div className="flex items-center gap-4">
          <Link to="/admin/my-members" aria-label="Üye listesine dön" className="min-w-10 min-h-10 flex items-center justify-center bg-[#121212] border border-white/10 rounded-lg hover:bg-white/5 transition shrink-0">
            <ArrowLeft className="w-4 h-4 text-white/70" />
          </Link>
          <h1 className="text-xl lg:text-2xl font-bold">Üye Detayı Yükleniyor...</h1>
        </div>
      </div>
    );
  }

  if (error || !member) {
    return (
      <div className="space-y-4 lg:space-y-6">
        <div className="flex items-center gap-4 mb-4 lg:mb-6">
          <Link to="/admin/my-members" aria-label="Üye listesine dön" className="min-w-10 min-h-10 flex items-center justify-center bg-[#121212] border border-white/10 rounded-lg hover:bg-white/5 transition shrink-0">
            <ArrowLeft className="w-4 h-4 text-white/70" />
          </Link>
          <h1 className="text-xl lg:text-2xl font-bold">Hata</h1>
        </div>
        <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-4 lg:p-6 rounded-lg text-sm text-center">
          {error || 'Üye bulunamadı.'}
        </div>
        <div className="flex justify-center">
          <Link to="/admin/my-members" className="text-[#851C35] hover:text-[#a02240] text-sm font-medium transition min-h-10 flex items-center">
            Listeye Dön
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 lg:space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3 lg:gap-4 w-full sm:w-auto">
          <Link to="/admin/my-members" aria-label="Üye listesine dön" className="min-w-10 min-h-10 flex items-center justify-center bg-[#121212] border border-white/10 rounded-lg hover:bg-white/5 transition shrink-0">
            <ArrowLeft className="w-4 h-4 text-white/70" />
          </Link>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-xl lg:text-2xl font-bold truncate">{member.first_name} {member.last_name}</h1>
              <span className={`inline-flex px-2 py-0.5 lg:px-3 lg:py-1.5 rounded text-xs lg:text-sm font-medium ${
                member.status === 'active' ? 'bg-green-500/20 text-green-400 border border-green-500/30' : 'bg-red-500/20 text-red-400 border border-red-500/30'
              }`}>
                {member.status === 'active' ? 'Aktif Üye' : 'Pasif Üye'}
              </span>
            </div>
            <div className="text-xs lg:text-sm text-white/50 font-mono mt-0.5 lg:mt-1 truncate">{member.uuid}</div>
          </div>
        </div>
      </div>

      <TrainerMemberWorkspaceNav memberId={member.id} active="member" />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 lg:gap-6">
        <div className="space-y-4 lg:space-y-6">
          <div className="bg-[#121212] border border-white/10 rounded-lg p-4 lg:p-6">
            <h3 className="text-xs lg:text-sm font-semibold uppercase tracking-wider text-white/40 mb-3 lg:mb-4">İletişim Bilgileri</h3>
            <div className="space-y-3 lg:space-y-4 text-sm">
              <div>
                <div className="text-white/50 mb-0.5 lg:mb-1">Telefon</div>
                <div className="font-medium">{member.phone}</div>
              </div>
              {member.email && (
                <div>
                  <div className="text-white/50 mb-0.5 lg:mb-1">E-posta</div>
                  <div className="font-medium break-all">{member.email}</div>
                </div>
              )}
            </div>
          </div>

          <div className="bg-[#121212] border border-white/10 rounded-lg p-4 lg:p-6">
            <h3 className="text-xs lg:text-sm font-semibold uppercase tracking-wider text-white/40 mb-3 lg:mb-4">Acil Durum</h3>
            {member.emergency_contact_name || member.emergency_contact_phone ? (
              <div className="space-y-3 lg:space-y-4 text-sm">
                {member.emergency_contact_name && (
                  <div>
                    <div className="text-white/50 mb-0.5 lg:mb-1">Kişi Adı</div>
                    <div className="font-medium">{member.emergency_contact_name}</div>
                  </div>
                )}
                {member.emergency_contact_phone && (
                  <div>
                    <div className="text-white/50 mb-0.5 lg:mb-1">Telefon</div>
                    <div className="font-medium">{member.emergency_contact_phone}</div>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-sm text-white/40 italic">Acil durum bilgisi girilmemiş.</div>
            )}
          </div>
        </div>

        <div className="space-y-4 lg:space-y-6">
          <div className="bg-[#121212] border border-white/10 rounded-lg p-4 lg:p-6">
            <h3 className="text-xs lg:text-sm font-semibold uppercase tracking-wider text-white/40 mb-3 lg:mb-4">Üyelik Süreci</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 lg:gap-4 text-sm">
              <div>
                <div className="text-white/50 mb-0.5 lg:mb-1">Kayıt Tarihi</div>
                <div className="font-medium">{new Date(member.created_at).toLocaleDateString('tr-TR')}</div>
              </div>
              <div>
                <div className="text-white/50 mb-0.5 lg:mb-1">Son Güncelleme</div>
                <div className="font-medium">{new Date(member.updated_at).toLocaleDateString('tr-TR')}</div>
              </div>
              <div>
                <div className="text-white/50 mb-0.5 lg:mb-1">Başlangıç Tarihi</div>
                <div className="font-medium">
                  {member.membership_start_date ? new Date(member.membership_start_date).toLocaleDateString('tr-TR') : '-'}
                </div>
              </div>
              <div>
                <div className="text-white/50 mb-0.5 lg:mb-1">Bitiş Tarihi</div>
                <div className="font-medium">
                  {member.membership_end_date ? new Date(member.membership_end_date).toLocaleDateString('tr-TR') : '-'}
                </div>
              </div>
            </div>
          </div>

          <div className="bg-[#121212] border border-white/10 rounded-lg p-4 lg:p-6">
            <h3 className="text-xs lg:text-sm font-semibold uppercase tracking-wider text-white/40 mb-3 lg:mb-4">Genel Notlar</h3>
            {member.notes ? (
              <div className="text-sm whitespace-pre-wrap break-words">{member.notes}</div>
            ) : (
              <div className="text-sm text-white/40 italic">Bu üye için henüz not eklenmemiş.</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
