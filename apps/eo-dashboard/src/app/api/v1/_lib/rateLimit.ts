type WindowState = {
  resetAt: number;
  count: number;
};

const windows = new Map<string, WindowState>();

export function checkRateLimit(params: {
  key: string;
  limit: number;
  windowMs: number;
  now?: number;
}) {
  const now = params.now ?? Date.now();
  const existing = windows.get(params.key);

  if (!existing || now >= existing.resetAt) {
    const next: WindowState = { count: 1, resetAt: now + params.windowMs };
    windows.set(params.key, next);
    return { allowed: true as const, remaining: params.limit - 1, resetAt: next.resetAt };
  }

  if (existing.count >= params.limit) {
    return { allowed: false as const, remaining: 0, resetAt: existing.resetAt };
  }

  existing.count += 1;
  return { allowed: true as const, remaining: Math.max(0, params.limit - existing.count), resetAt: existing.resetAt };
}

