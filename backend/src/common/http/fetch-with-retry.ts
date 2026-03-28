const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export async function fetchWithRetry(
  url: string,
  init: RequestInit,
  options?: { attempts?: number; timeoutMs?: number; baseDelayMs?: number },
): Promise<Response> {
  const attempts = options?.attempts ?? 3;
  const timeoutMs = options?.timeoutMs ?? 12_000;
  const baseDelayMs = options?.baseDelayMs ?? 400;
  let last: unknown;
  for (let i = 0; i < attempts; i++) {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), timeoutMs);
    try {
      const res = await fetch(url, { ...init, signal: ctrl.signal });
      clearTimeout(timer);
      return res;
    } catch (e) {
      clearTimeout(timer);
      last = e;
      if (i < attempts - 1) {
        await sleep(baseDelayMs * (i + 1));
      }
    }
  }
  throw last;
}
