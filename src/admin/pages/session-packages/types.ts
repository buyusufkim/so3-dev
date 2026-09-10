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
    typeof data.created_at === 'string' &&
    typeof data.updated_at === 'string'
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
