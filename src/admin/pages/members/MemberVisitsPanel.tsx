import { useState, useEffect } from "react";
import { apiClient, ApiError } from "../../api/client";
import { MemberVisit } from "./types";

interface MemberVisitsPanelProps {
  memberId: string;
}

export function MemberVisitsPanel({ memberId }: MemberVisitsPanelProps) {
  const [visits, setVisits] = useState<MemberVisit[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchVisits();
  }, [memberId]);

  const fetchVisits = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = (await apiClient.get(`/admin/members/${memberId}/visits`)) as MemberVisit[];
      setVisits(data);
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError("Ziyaret geçmişi yüklenirken beklenmeyen bir hata oluştu.");
      }
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="p-6 text-center text-white/50">Yükleniyor...</div>;
  }

  if (error) {
    return <div className="p-6 text-center text-red-500">{error}</div>;
  }

  if (visits.length === 0) {
    return <div className="p-6 text-center text-white/50">Ziyaret kaydı bulunamadı.</div>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left border-collapse">
        <thead>
          <tr className="border-b border-white/10 text-white/50 text-xs uppercase tracking-wider">
            <th className="p-4 font-medium">Giriş Zamanı</th>
            <th className="p-4 font-medium">Giriş İşlemi (Personel)</th>
            <th className="p-4 font-medium">Çıkış Zamanı</th>
            <th className="p-4 font-medium">Çıkış İşlemi (Personel)</th>
            <th className="p-4 font-medium">Durum</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-white/10 text-sm">
          {visits.map((visit) => (
            <tr key={visit.id} className="hover:bg-white/5 transition-colors">
              <td className="p-4 whitespace-nowrap text-white">
                {new Date(visit.checked_in_at).toLocaleString("tr-TR")}
              </td>
              <td className="p-4 whitespace-nowrap text-white/70">
                {visit.checked_in_by_name || "-"}
              </td>
              <td className="p-4 whitespace-nowrap text-white">
                {visit.checked_out_at ? new Date(visit.checked_out_at).toLocaleString("tr-TR") : "-"}
              </td>
              <td className="p-4 whitespace-nowrap text-white/70">
                {visit.checked_out_by_name || "-"}
              </td>
              <td className="p-4 whitespace-nowrap">
                {visit.checked_out_at ? (
                  <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-white/10 text-white/70">
                    Tamamlandı
                  </span>
                ) : (
                  <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-500/10 text-green-500">
                    Aktif
                  </span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
