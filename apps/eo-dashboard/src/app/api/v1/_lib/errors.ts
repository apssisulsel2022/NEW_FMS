type PostgrestishError = {
  message?: string;
  details?: unknown;
  hint?: unknown;
  code?: string;
};

function normalizeError(e: unknown): PostgrestishError {
  if (typeof e === "object" && e) return e as PostgrestishError;
  return { message: typeof e === "string" ? e : "Unknown error" };
}

export function mapToHttpError(e: unknown) {
  const err = normalizeError(e);
  const code = err.code ?? "UNKNOWN";

  if (code === "23505") {
    return {
      status: 409,
      error: { code: "CONFLICT", message: err.message ?? "Conflict", details: err.details ?? err.hint }
    };
  }

  if (code === "42501") {
    return {
      status: 403,
      error: { code: "FORBIDDEN", message: err.message ?? "Forbidden", details: err.details ?? err.hint }
    };
  }

  if (code === "PGRST116") {
    return {
      status: 404,
      error: { code: "NOT_FOUND", message: err.message ?? "Not found", details: err.details ?? err.hint }
    };
  }

  return {
    status: 500,
    error: { code: "INTERNAL_ERROR", message: err.message ?? "Internal error", details: err.details ?? err.hint }
  };
}

