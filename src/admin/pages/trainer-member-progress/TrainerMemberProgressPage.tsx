import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { ArrowLeft, Activity, FileText, Dumbbell, Calendar, HeartPulse, Sparkles, TrendingUp } from "lucide-react";
import { apiClient, ApiError } from "../../api/client";
import { TrainerMemberDetail as ITrainerMemberDetail, isTrainerMemberDetail } from "../trainer-members/types";

type ProgressTab = "measurements" | "notes";

export function TrainerMemberProgressPage() {
  const { memberId } = useParams<{ memberId: string }>();
  const isValidMemberId = /^[1-9]\d*$/.test(memberId || "");

  const [member, setMember] = useState<ITrainerMemberDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<ProgressTab>("measurements");

  useEffect(() => {
    if (!isValidMemberId) {
      setLoading(false);
      setError("Geçersiz üye ID parametresi.");
      return;
    }

    const fetchMember = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await apiClient.get(`/api/trainer/members/${memberId}`);
        if (isTrainerMemberDetail(response)) {
          setMember(response);
        } else {
          throw new Error("Geçersiz sunucu yanıtı.");
        }
      } catch (err: unknown) {
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
        setLoading(false);
      }
    };

    fetchMember();
  }, [memberId, isValidMemberId]);

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

      {/* Tab Content: Foundation Workspace States */}
      {activeTab === "measurements" && (
        <div className="bg-[#121212] border border-white/10 rounded-xl p-8 space-y-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-[#851C35]/15 border border-[#851C35]/30 flex items-center justify-center text-[#851C35] shrink-0">
              <Activity className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-white">Fiziksel Ölçüm ve Vücut Kompozisyonu</h3>
              <p className="text-sm text-white/60 mt-1">
                Bu alanda üyenin periyodik vücut kompozisyonu ve bölgesel çevre ölçümleri tarihsel olarak takip edilir.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
            <div className="bg-white/[0.03] border border-white/5 rounded-lg p-4 space-y-2">
              <div className="flex items-center gap-2 text-white/90 text-sm font-medium">
                <HeartPulse className="w-4 h-4 text-[#851C35]" />
                Kilo & Yağ Oranı
              </div>
              <p className="text-xs text-white/50 leading-relaxed">
                Vücut ağırlığı (kg) ve yağ oranı (%) değerlerinin seans bazlı kayıtları ve periyot analizi.
              </p>
            </div>

            <div className="bg-white/[0.03] border border-white/5 rounded-lg p-4 space-y-2">
              <div className="flex items-center gap-2 text-white/90 text-sm font-medium">
                <TrendingUp className="w-4 h-4 text-[#851C35]" />
                Bölgesel Çevre Ölçümleri
              </div>
              <p className="text-xs text-white/50 leading-relaxed">
                Göğüs, bel, kalça, kol ve bacak çevre ölçümlerinin santimetre bazında hassas takibi.
              </p>
            </div>

            <div className="bg-white/[0.03] border border-white/5 rounded-lg p-4 space-y-2">
              <div className="flex items-center gap-2 text-white/90 text-sm font-medium">
                <Calendar className="w-4 h-4 text-[#851C35]" />
                Tarihsel Karşılaştırma
              </div>
              <p className="text-xs text-white/50 leading-relaxed">
                Önceki ölçümlerle karşılaştırmalı değişim oranları ve hedef doğrultusunda fiziksel ilerleme.
              </p>
            </div>
          </div>
        </div>
      )}

      {activeTab === "notes" && (
        <div className="bg-[#121212] border border-white/10 rounded-xl p-8 space-y-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-[#851C35]/15 border border-[#851C35]/30 flex items-center justify-center text-[#851C35] shrink-0">
              <FileText className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-white">Eğitmen Gelişim Notları ve Gözlemler</h3>
              <p className="text-sm text-white/60 mt-1">
                Bu alanda üyenin antrenman adaptasyonu, form durumu, seans geri bildirimleri ve gelişim değerlendirmeleri yönetilir.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
            <div className="bg-white/[0.03] border border-white/5 rounded-lg p-4 space-y-2">
              <div className="flex items-center gap-2 text-white/90 text-sm font-medium">
                <Calendar className="w-4 h-4 text-[#851C35]" />
                Tarihli Seans Notları
              </div>
              <p className="text-xs text-white/50 leading-relaxed">
                Her antrenman veya değerlendirme seansına ait tarihsel gözlemler ve performans kayıtları.
              </p>
            </div>

            <div className="bg-white/[0.03] border border-white/5 rounded-lg p-4 space-y-2">
              <div className="flex items-center gap-2 text-white/90 text-sm font-medium">
                <Sparkles className="w-4 h-4 text-[#851C35]" />
                Form & Adaptasyon
              </div>
              <p className="text-xs text-white/50 leading-relaxed">
                Hareket formları, kondisyon düzeyi ve program adaptasyonuna ilişkin eğitmen değerlendirmeleri.
              </p>
            </div>

            <div className="bg-white/[0.03] border border-white/5 rounded-lg p-4 space-y-2">
              <div className="flex items-center gap-2 text-white/90 text-sm font-medium">
                <TrendingUp className="w-4 h-4 text-[#851C35]" />
                Hedef ve Süreç Takibi
              </div>
              <p className="text-xs text-white/50 leading-relaxed">
                Belirlenen bireysel hedeflere yönelik gelişim seyri ve bir sonraki aşama planlama notları.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
