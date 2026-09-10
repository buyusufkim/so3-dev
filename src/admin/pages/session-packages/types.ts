export interface SessionPackage {
  id: number;
  uuid: string;
  name: string;
  session_count: number;
  validity_days: number | null;
  status: 'active' | 'inactive';
  created_at: string;
  updated_at: string;
}

export interface SessionPackageListResponse {
  items: SessionPackage[];
  pagination: {
    current_page: number;
    per_page: number;
    total_items: number;
    total_pages: number;
  };
}

export function validateSessionPackage(data: any): data is SessionPackage {
  return (
    typeof data === 'object' && data !== null &&
    typeof data.id === 'number' && Number.isFinite(data.id) && Number.isInteger(data.id) && data.id > 0 &&
    typeof data.uuid === 'string' && data.uuid.trim() !== '' &&
    typeof data.name === 'string' &&
    typeof data.session_count === 'number' && Number.isFinite(data.session_count) && Number.isInteger(data.session_count) && data.session_count > 0 &&
    (data.validity_days === null || (typeof data.validity_days === 'number' && Number.isFinite(data.validity_days) && Number.isInteger(data.validity_days) && data.validity_days > 0)) &&
    (data.status === 'active' || data.status === 'inactive') &&
    isValidCanonicalDateTime(data.created_at) &&
    isValidCanonicalDateTime(data.updated_at)
  );
}

export function validateSessionPackageListResponse(data: any): data is SessionPackageListResponse {
  if (typeof data !== 'object' || data === null) return false;
  if (!Array.isArray(data.items)) return false;
  for (const item of data.items) {
    if (!validateSessionPackage(item)) return false;
  }
  const pag = data.pagination;
  if (typeof pag !== 'object' || pag === null) return false;
  return (
    typeof pag.current_page === 'number' && Number.isFinite(pag.current_page) && Number.isInteger(pag.current_page) && pag.current_page >= 1 &&
    typeof pag.per_page === 'number' && Number.isFinite(pag.per_page) && Number.isInteger(pag.per_page) && pag.per_page >= 1 && pag.per_page <= 100 &&
    typeof pag.total_items === 'number' && Number.isFinite(pag.total_items) && Number.isInteger(pag.total_items) && pag.total_items >= 0 &&
    typeof pag.total_pages === 'number' && Number.isFinite(pag.total_pages) && Number.isInteger(pag.total_pages) && pag.total_pages >= 0
  );
}

export function isValidCanonicalDate(dateStr: string | null | undefined): boolean {
  if (!dateStr) return false;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return false;
  const [y, m, d] = dateStr.split('-').map(Number);
  if (y < 2000 || y > 2100 || m < 1 || m > 12 || d < 1 || d > 31) return false;
  const daysInMonth = new Date(y, m, 0).getDate();
  return d <= daysInMonth;
}

export function isValidCanonicalDateTime(dateTimeStr: string | null | undefined): boolean {
  if (!dateTimeStr) return false;
  if (!/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(dateTimeStr)) return false;
  const [datePart, timePart] = dateTimeStr.split(' ');
  if (!isValidCanonicalDate(datePart)) return false;
  const [hr, min, sec] = timePart.split(':').map(Number);
  return hr >= 0 && hr < 24 && min >= 0 && min < 60 && sec >= 0 && sec < 60;
}
