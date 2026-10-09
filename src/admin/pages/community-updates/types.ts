export type CommunityUpdateStatus = 'draft' | 'published';

export interface CommunityUpdateListItem {
  id: number;
  uuid: string;
  title: string;
  status: CommunityUpdateStatus;
  published_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface CommunityUpdateDetail {
  id: number;
  uuid: string;
  title: string;
  body: string;
  status: CommunityUpdateStatus;
  published_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface CommunityUpdateListMeta {
  total: number;
  page: number;
  per_page: number;
  last_page: number;
}

export interface CommunityUpdateListResponse {
  items: CommunityUpdateListItem[];
  meta: CommunityUpdateListMeta;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isValidDateTimeString(val: unknown): val is string {
  if (typeof val !== 'string') return false;
  return /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(val);
}

function isValidStatus(val: unknown): val is CommunityUpdateStatus {
  return val === 'draft' || val === 'published';
}

const FORBIDDEN_ACTOR_KEYS = [
  'created_by_admin_id',
  'updated_by_admin_id',
  'creator_display_name',
  'deleted_at'
];

export function validateCommunityUpdateListItem(raw: unknown): CommunityUpdateListItem {
  if (!isRecord(raw)) {
    throw new Error('Community update list item must be an object');
  }

  const allowedKeys = ['id', 'uuid', 'title', 'status', 'published_at', 'created_at', 'updated_at'];
  const keys = Object.keys(raw);

  for (const k of keys) {
    if (!allowedKeys.includes(k)) {
      throw new Error(`Unexpected key in community update list item: ${k}`);
    }
  }

  for (const k of allowedKeys) {
    if (!(k in raw)) {
      throw new Error(`Missing key in community update list item: ${k}`);
    }
  }

  for (const forbidden of FORBIDDEN_ACTOR_KEYS) {
    if (forbidden in raw) {
      throw new Error(`Forbidden actor/internal key exposed in list item: ${forbidden}`);
    }
  }

  if (typeof raw.id !== 'number' || !Number.isInteger(raw.id) || raw.id <= 0) {
    throw new Error('id must be a positive integer');
  }

  if (typeof raw.uuid !== 'string' || !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(raw.uuid)) {
    throw new Error('uuid must be a valid UUID string');
  }

  if (typeof raw.title !== 'string' || raw.title.trim().length === 0 || raw.title.length > 160) {
    throw new Error('title must be a non-empty string with max 160 characters');
  }

  if (!isValidStatus(raw.status)) {
    throw new Error('status must be "draft" or "published"');
  }

  if (raw.published_at !== null && !isValidDateTimeString(raw.published_at)) {
    throw new Error('published_at must be null or valid datetime string');
  }

  if (raw.status === 'published' && raw.published_at === null) {
    throw new Error('published update must have non-null published_at');
  }

  if (!isValidDateTimeString(raw.created_at)) {
    throw new Error('created_at must be valid datetime string');
  }

  if (!isValidDateTimeString(raw.updated_at)) {
    throw new Error('updated_at must be valid datetime string');
  }

  return {
    id: raw.id,
    uuid: raw.uuid,
    title: raw.title,
    status: raw.status,
    published_at: raw.published_at,
    created_at: raw.created_at,
    updated_at: raw.updated_at
  };
}

export function validateCommunityUpdateDetail(raw: unknown): CommunityUpdateDetail {
  if (!isRecord(raw)) {
    throw new Error('Community update detail must be an object');
  }

  // If wrapped in { update: ... }
  let target = raw;
  if ('update' in raw && isRecord(raw.update)) {
    target = raw.update;
  }

  const allowedKeys = ['id', 'uuid', 'title', 'body', 'status', 'published_at', 'created_at', 'updated_at'];
  const keys = Object.keys(target);

  for (const k of keys) {
    if (!allowedKeys.includes(k)) {
      throw new Error(`Unexpected key in community update detail: ${k}`);
    }
  }

  for (const k of allowedKeys) {
    if (!(k in target)) {
      throw new Error(`Missing key in community update detail: ${k}`);
    }
  }

  for (const forbidden of FORBIDDEN_ACTOR_KEYS) {
    if (forbidden in target) {
      throw new Error(`Forbidden actor/internal key exposed in detail: ${forbidden}`);
    }
  }

  if (typeof target.id !== 'number' || !Number.isInteger(target.id) || target.id <= 0) {
    throw new Error('id must be a positive integer');
  }

  if (typeof target.uuid !== 'string' || !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(target.uuid)) {
    throw new Error('uuid must be a valid UUID string');
  }

  if (typeof target.title !== 'string' || target.title.trim().length === 0 || target.title.length > 160) {
    throw new Error('title must be a non-empty string with max 160 characters');
  }

  if (typeof target.body !== 'string' || target.body.trim().length === 0 || target.body.length > 5000) {
    throw new Error('body must be a non-empty string with max 5000 characters');
  }

  if (!isValidStatus(target.status)) {
    throw new Error('status must be "draft" or "published"');
  }

  if (target.published_at !== null && !isValidDateTimeString(target.published_at)) {
    throw new Error('published_at must be null or valid datetime string');
  }

  if (target.status === 'published' && target.published_at === null) {
    throw new Error('published update must have non-null published_at');
  }

  if (!isValidDateTimeString(target.created_at)) {
    throw new Error('created_at must be valid datetime string');
  }

  if (!isValidDateTimeString(target.updated_at)) {
    throw new Error('updated_at must be valid datetime string');
  }

  return {
    id: target.id,
    uuid: target.uuid,
    title: target.title,
    body: target.body,
    status: target.status,
    published_at: target.published_at,
    created_at: target.created_at,
    updated_at: target.updated_at
  };
}

export function validateCommunityUpdateListResponse(raw: unknown): CommunityUpdateListResponse {
  if (!isRecord(raw)) {
    throw new Error('Response must be an object');
  }

  const allowedKeys = ['items', 'meta'];
  const keys = Object.keys(raw);

  for (const k of keys) {
    if (!allowedKeys.includes(k)) {
      throw new Error(`Unexpected key in list response: ${k}`);
    }
  }

  for (const k of allowedKeys) {
    if (!(k in raw)) {
      throw new Error(`Missing key in list response: ${k}`);
    }
  }

  if (!Array.isArray(raw.items)) {
    throw new Error('items must be an array');
  }

  if (!isRecord(raw.meta)) {
    throw new Error('meta must be an object');
  }

  const metaKeys = Object.keys(raw.meta);
  const allowedMetaKeys = ['total', 'page', 'per_page', 'last_page'];
  for (const mk of metaKeys) {
    if (!allowedMetaKeys.includes(mk)) {
      throw new Error(`Unexpected key in meta: ${mk}`);
    }
  }
  for (const mk of allowedMetaKeys) {
    if (!(mk in raw.meta)) {
      throw new Error(`Missing key in meta: ${mk}`);
    }
  }

  const total = raw.meta.total;
  const page = raw.meta.page;
  const perPage = raw.meta.per_page;
  const lastPage = raw.meta.last_page;

  if (typeof total !== 'number' || !Number.isInteger(total) || total < 0) {
    throw new Error('meta.total must be a non-negative integer');
  }
  if (typeof page !== 'number' || !Number.isInteger(page) || page < 1) {
    throw new Error('meta.page must be a positive integer');
  }
  if (typeof perPage !== 'number' || !Number.isInteger(perPage) || perPage < 1 || perPage > 50) {
    throw new Error('meta.per_page must be an integer between 1 and 50');
  }
  if (typeof lastPage !== 'number' || !Number.isInteger(lastPage) || lastPage < 1) {
    throw new Error('meta.last_page must be a positive integer');
  }

  const items = raw.items.map(validateCommunityUpdateListItem);

  return {
    items,
    meta: {
      total,
      page,
      per_page: perPage,
      last_page: lastPage
    }
  };
}
