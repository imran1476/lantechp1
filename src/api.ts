import type { LandRecord } from './types';

export type ApiFn = (input: string, init?: RequestInit) => Promise<Response>;

export interface ApiResult<T = unknown> {
  ok: boolean;
  status: number;
  data?: T;
  message?: string;
  issues?: Array<{ rule: number; severity: string; field: string; message: string }>;
}

async function call<T>(api: ApiFn, url: string, method: string, body?: unknown): Promise<ApiResult<T>> {
  try {
    const res = await api(url, {
      method,
      headers: body === undefined ? undefined : { 'Content-Type': 'application/json' },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    const json = await res.json().catch(() => ({}));
    return { ok: res.ok && json.success !== false, status: res.status, data: json as T, message: json.message, issues: json.issues };
  } catch {
    return { ok: false, status: 0, message: 'সার্ভারে সংযোগ করা যায়নি।' };
  }
}

export const listRecords = (api: ApiFn) => call<{ records: LandRecord[] }>(api, '/api/records', 'GET');
export const createRecord = (api: ApiFn, record: Partial<LandRecord>, imageBase64?: string, mimeType?: string) =>
  call<{ record: LandRecord }>(api, '/api/records', 'POST', { record, imageBase64, mimeType });
export const updateRecord = (api: ApiFn, id: string, patch: Partial<LandRecord>, confirmFields: string[]) =>
  call<{ record: LandRecord }>(api, `/api/records/${encodeURIComponent(id)}`, 'PUT', { patch, confirmFields });
export const approveRecord = (api: ApiFn, id: string) =>
  call<{ record: LandRecord }>(api, `/api/records/${encodeURIComponent(id)}/approve`, 'POST', {});
export const rejectRecord = (api: ApiFn, id: string, reason: string) =>
  call<{ record: LandRecord }>(api, `/api/records/${encodeURIComponent(id)}/reject`, 'POST', { reason });
export const verifyRecordIntegrity = (api: ApiFn, id: string) =>
  call<{ result: { ok: boolean; entries: number; chainOk: boolean; contentOk: boolean; headHash: string; problems: string[] } }>(
    api, `/api/records/${encodeURIComponent(id)}/verify`, 'GET');
