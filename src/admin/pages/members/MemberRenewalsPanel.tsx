import { useState, useEffect } from "react";
import { apiClient, ApiError } from "../../api/client";
import { MembershipRenewal } from "./types";

interface MemberRenewalsPanelProps {
  memberId: string;
}

function formatSafeDate(dateString: string | null | undefined): string {
  if (!dateString) return "-";
  
  const dateRegex = /^(\d{4})-(\d{2})-(\d{2})$/;
  const dateMatch = dateString.match(dateRegex);
  if (dateMatch) {
    const [, y, m, d] = dateMatch;
    if (Number(m) < 1 || Number(m) > 12 || Number(d) < 1 || Number(d) > 31) return "-";
    return `${d}.${m}.${y}`;
  }

  const datetimeRegex = /^(\d{4})-(\d{2})-(\d{2}) (\d{2}):(\d{2}):(\d{2})$/;
  const datetimeMatch = dateString.match(datetimeRegex);
  if (datetimeMatch) {
    const [, y, m, d, hh, mm, ss] = datetimeMatch;
    if (Number(m) < 1 || Number(m) > 12 || Number(d) < 1 || Number(d) > 31) return "-";
    if (Number(hh) > 23 || Number(mm) > 59 || Number(ss) > 59) return "-";
    return `${d}.${m}.${y} ${hh}:${mm}:${ss}`;
  }

  return "-";
}

export function MemberRenewalsPanel({ memberId }: MemberRenewalsPanelProps) {
  const [renewals, setRenewals] = useState<MembershipRenewal[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchRenewals();
  }, [memberId]);

  const fetchRenewals = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = (await apiClient.get(`/api/admin/members/${memberId}/renewals`)) as MembershipRenewal[];
      setRenewals(data);
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError("Yenileme geçmişi yüklenirken beklenmeyen bir hata oluştu.");
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

  if (renewals.length === 0) {
    return <div className="p-6 text-center text-white/50">Yenileme kaydı bulunamadı.</div>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left border-collapse">
        <thead>
          <tr className="border-b border-white/10 text-white/50 text-xs uppercase tracking-wider">
            <th className="p-4 font-medium">İşlem Zamanı</th>
            <th className="p-4 font-medium">Eski Başlangıç</th>
            <th className="p-4 font-medium">Eski Bitiş</th>
            <th className="p-4 font-medium">Yeni Başlangıç</th>
            <th className="p-4 font-medium">Yeni Bitiş</th>
            <th className="p-4 font-medium">İşlemi Yapan</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-white/10 text-sm">
          {renewals.map((renewal) => (
            <tr key={renewal.id} className="hover:bg-white/5 transition-colors">
              <td className="p-4 whitespace-nowrap text-white">
                {formatSafeDate(renewal.created_at)}
              </td>
              <td className="p-4 whitespace-nowrap text-white/70">
                {formatSafeDate(renewal.previous_start_date)}
              </td>
              <td className="p-4 whitespace-nowrap text-white/70">
                {formatSafeDate(renewal.previous_end_date)}
              </td>
              <td className="p-4 whitespace-nowrap text-white">
                {formatSafeDate(renewal.new_start_date)}
              </td>
              <td className="p-4 whitespace-nowrap text-white font-medium">
                {formatSafeDate(renewal.new_end_date)}
              </td>
              <td className="p-4 whitespace-nowrap text-white/70">
                {renewal.renewed_by_name || "-"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
