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
    typeof data.id === 'number' && data.id > 0 &&
    typeof data.uuid === 'string' && data.uuid.trim() !== '' &&
    typeof data.name === 'string' &&
    typeof data.session_count === 'number' && data.session_count > 0 &&
    (data.validity_days === null || (typeof data.validity_days === 'number' && data.validity_days > 0)) &&
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
    typeof pag.current_page === 'number' &&
    typeof pag.per_page === 'number' &&
    typeof pag.total_items === 'number' &&
    typeof pag.total_pages === 'number'
  );
}
