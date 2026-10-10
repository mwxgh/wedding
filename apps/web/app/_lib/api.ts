export const PUBLIC_API_URL =
  process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';
// Server components can reach the API over an internal address (e.g. inside Docker)
const SERVER_API_URL = process.env.API_URL ?? PUBLIC_API_URL;

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

async function parse<T>(res: Response): Promise<T> {
  const body = await res.json().catch(() => null);
  if (!res.ok) {
    const msg = body?.message;
    throw new ApiError(
      res.status,
      Array.isArray(msg) ? msg.join(', ') : msg || res.statusText,
    );
  }
  return body as T;
}

/** Fetch from a server component. Returns null when the API is unreachable or 404. */
export async function serverGet<T>(path: string): Promise<T | null> {
  try {
    const res = await fetch(`${SERVER_API_URL}${path}`, { cache: 'no-store' });
    if (res.status === 404) return null;
    return await parse<T>(res);
  } catch (err) {
    console.error(`[api] GET ${path} failed:`, (err as Error).message);
    return null;
  }
}

/** Fetch from the browser. Pass `body` as an object (JSON) or FormData. */
export async function clientFetch<T>(
  path: string,
  init: { method?: string; body?: unknown; token?: string | null } = {},
): Promise<T> {
  const headers: Record<string, string> = {};
  let body: BodyInit | undefined;
  if (init.body instanceof FormData) body = init.body;
  else if (init.body !== undefined) {
    headers['Content-Type'] = 'application/json';
    body = JSON.stringify(init.body);
  }
  if (init.token) headers.Authorization = `Bearer ${init.token}`;
  const res = await fetch(`${PUBLIC_API_URL}${path}`, {
    method: init.method ?? (body ? 'POST' : 'GET'),
    headers,
    body,
  });
  return parse<T>(res);
}
