import { createSupabaseClient } from "@backend/services/supabase";

import { getSupabaseEnv } from "@/app/api/v1/_lib/env";
import { getAccessToken, getClientIp } from "@/app/api/v1/_lib/http";
import { checkRateLimit } from "@/app/api/v1/_lib/rateLimit";

export async function requireAuth(req: Request, options?: { rateLimit?: { limit: number; windowMs: number } }) {
  const accessToken = getAccessToken(req);
  if (!accessToken) return { ok: false as const, status: 401, message: "Unauthorized" };

  const supabase = createSupabaseClient(getSupabaseEnv(), accessToken);
  const { data, error } = await supabase.auth.getUser();
  if (error || !data?.user) return { ok: false as const, status: 401, message: "Unauthorized" };

  const userId = data.user.id;

  if (options?.rateLimit) {
    const ip = getClientIp(req) ?? "unknown";
    const key = `${userId}:${ip}:${options.rateLimit.limit}:${options.rateLimit.windowMs}:${req.method}:${new URL(
      req.url
    ).pathname}`;
    const res = checkRateLimit({ key, limit: options.rateLimit.limit, windowMs: options.rateLimit.windowMs });
    if (!res.allowed) {
      return {
        ok: false as const,
        status: 429,
        message: "Too Many Requests",
        rateLimit: { limit: options.rateLimit.limit, remaining: res.remaining, resetAt: res.resetAt }
      };
    }

    return {
      ok: true as const,
      supabase,
      userId,
      rateLimit: { limit: options.rateLimit.limit, remaining: res.remaining, resetAt: res.resetAt }
    };
  }

  return { ok: true as const, supabase, userId };
}
