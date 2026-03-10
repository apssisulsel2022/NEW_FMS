export function rateLimitHeaders(params: { limit: number; remaining: number; resetAt: number } | null) {
  if (!params) return undefined;
  return {
    "x-ratelimit-limit": `${params.limit}`,
    "x-ratelimit-remaining": `${params.remaining}`,
    "x-ratelimit-reset": `${Math.floor(params.resetAt / 1000)}`
  };
}

