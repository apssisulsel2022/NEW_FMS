export type CompetitionDraftInput = {
  eventOrganizerId: string;
  templatePayload?: Record<string, unknown> | null;
  payload: Record<string, unknown>;
};

export function mergeDraftPayload(input: CompetitionDraftInput) {
  return {
    ...(input.templatePayload ?? {}),
    ...(input.payload ?? {}),
    eventOrganizerId: input.eventOrganizerId
  } as Record<string, unknown> & { eventOrganizerId: string };
}

export function validateCompetitionPayload(payload: Record<string, unknown>) {
  const name = typeof payload.name === "string" ? payload.name.trim() : "";
  const slug = typeof payload.slug === "string" ? payload.slug.trim() : "";
  if (!name) return { ok: false as const, message: "name is required" };
  if (!slug) return { ok: false as const, message: "slug is required" };
  return { ok: true as const };
}
