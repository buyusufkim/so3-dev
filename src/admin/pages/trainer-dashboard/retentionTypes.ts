/**
 * SO3 PT - Trainer Retention Attention Read Model Types and Validator
 * Dedicated bounded types for GET /api/trainer/retention-attention
 */

export interface TrainerRetentionAttentionItem {
  member: {
    id: number;
    uuid: string;
    first_name: string;
    last_name: string;
    phone: string | null;
  };
  last_completed_at: string;
  inactivity_days: number;
}

export interface TrainerRetentionAttentionResponse {
  timezone: 'Europe/Istanbul';
  business_date: string;
  generated_at: string;
  threshold_days: 14;
  items: TrainerRetentionAttentionItem[];
}

export function validateTrainerRetentionAttention(data: unknown): TrainerRetentionAttentionResponse {
  if (!data || typeof data !== 'object') {
    throw new Error('Invalid retention attention response: Expected non-null object');
  }

  const d = data as Record<string, unknown>;

  if (d.timezone !== 'Europe/Istanbul') {
    throw new Error(`Invalid timezone: Expected 'Europe/Istanbul', received ${String(d.timezone)}`);
  }

  if (typeof d.business_date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(d.business_date)) {
    throw new Error(`Invalid business_date format: Expected 'YYYY-MM-DD', received ${String(d.business_date)}`);
  }

  if (typeof d.generated_at !== 'string' || !/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(d.generated_at)) {
    throw new Error(`Invalid generated_at format: Expected 'YYYY-MM-DD HH:mm:ss', received ${String(d.generated_at)}`);
  }

  if (d.threshold_days !== 14) {
    throw new Error(`Invalid threshold_days: Expected exactly 14, received ${String(d.threshold_days)}`);
  }

  if (!Array.isArray(d.items)) {
    throw new Error('Invalid items: Expected array');
  }

  if (d.items.length > 20) {
    throw new Error(`Items limit exceeded: Maximum allowed is 20, received ${d.items.length}`);
  }

  const validatedItems: TrainerRetentionAttentionItem[] = d.items.map((itemRaw: unknown, idx: number) => {
    if (!itemRaw || typeof itemRaw !== 'object') {
      throw new Error(`Invalid item at index ${idx}: Expected object`);
    }

    const item = itemRaw as Record<string, unknown>;

    if (!item.member || typeof item.member !== 'object') {
      throw new Error(`Invalid member object at item ${idx}`);
    }

    const m = item.member as Record<string, unknown>;

    if (typeof m.id !== 'number' || !Number.isInteger(m.id) || m.id <= 0) {
      throw new Error(`Invalid member.id at item ${idx}: Expected positive integer`);
    }

    if (typeof m.uuid !== 'string' || m.uuid.trim().length === 0) {
      throw new Error(`Invalid member.uuid at item ${idx}: Expected non-empty string`);
    }

    if (typeof m.first_name !== 'string' || m.first_name.trim().length === 0) {
      throw new Error(`Invalid member.first_name at item ${idx}: Expected non-empty string`);
    }

    if (typeof m.last_name !== 'string' || m.last_name.trim().length === 0) {
      throw new Error(`Invalid member.last_name at item ${idx}: Expected non-empty string`);
    }

    if (m.phone !== null) {
      if (typeof m.phone !== 'string' || m.phone.trim().length === 0) {
        throw new Error(`Invalid member.phone at item ${idx}: Expected non-empty string or null`);
      }
    }

    if (typeof item.last_completed_at !== 'string' || !/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(item.last_completed_at)) {
      throw new Error(`Invalid last_completed_at at item ${idx}: Expected 'YYYY-MM-DD HH:mm:ss'`);
    }

    if (typeof item.inactivity_days !== 'number' || !Number.isInteger(item.inactivity_days) || item.inactivity_days < 14) {
      throw new Error(`Invalid inactivity_days at item ${idx}: Expected integer >= 14, received ${String(item.inactivity_days)}`);
    }

    return {
      member: {
        id: m.id,
        uuid: m.uuid,
        first_name: m.first_name,
        last_name: m.last_name,
        phone: m.phone
      },
      last_completed_at: item.last_completed_at,
      inactivity_days: item.inactivity_days
    };
  });

  // Verify deterministic ordering: oldest last_completed_at first (ASC), tie-break by member.id ASC
  for (let i = 1; i < validatedItems.length; i++) {
    const prev = validatedItems[i - 1];
    const curr = validatedItems[i];

    if (prev.last_completed_at > curr.last_completed_at) {
      throw new Error(`Deterministic ordering violation at index ${i}: items must be ordered by last_completed_at ASC`);
    }

    if (prev.last_completed_at === curr.last_completed_at && prev.member.id >= curr.member.id) {
      throw new Error(`Deterministic ordering violation at index ${i}: tie-break must be member.id ASC`);
    }
  }

  return {
    timezone: 'Europe/Istanbul',
    business_date: d.business_date,
    generated_at: d.generated_at,
    threshold_days: 14,
    items: validatedItems
  };
}

export function isTrainerRetentionAttention(data: unknown): data is TrainerRetentionAttentionResponse {
  try {
    validateTrainerRetentionAttention(data);
    return true;
  } catch {
    return false;
  }
}
