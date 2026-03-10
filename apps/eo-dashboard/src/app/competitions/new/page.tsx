"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";

import { useActiveEventOrganizer } from "@/lib/useActiveEventOrganizer";
import { useEventOrganizers } from "@/lib/useEventOrganizers";
import { useSession } from "@/lib/useSession";

type CompetitionFormat = {
  id: string;
  event_organizer_id: string | null;
  code: string;
  name: string;
  format_type: string;
};

type CompetitionTemplate = {
  id: string;
  event_organizer_id: string | null;
  code: string;
  name: string;
  description: string | null;
  payload: any;
};

type Draft = {
  id: string;
  event_organizer_id: string;
  template_id: string | null;
  step: number;
  payload: any;
};

function parseJsonSafe(input: string) {
  const trimmed = input.trim();
  if (!trimmed) return {};
  return JSON.parse(trimmed);
}

export default function NewCompetitionWizardPage() {
  const session = useSession();
  const { eventOrganizerId, setEventOrganizerId } = useActiveEventOrganizer();
  const eventOrganizers = useEventOrganizers();

  const [step, setStep] = useState(1);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [formats, setFormats] = useState<CompetitionFormat[]>([]);
  const [templates, setTemplates] = useState<CompetitionTemplate[]>([]);

  const [templateId, setTemplateId] = useState<string>("");
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [description, setDescription] = useState("");
  const [season, setSeason] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const [registrationOpensAt, setRegistrationOpensAt] = useState("");
  const [registrationClosesAt, setRegistrationClosesAt] = useState("");
  const [participantLimit, setParticipantLimit] = useState("");
  const [allowPublicRegistration, setAllowPublicRegistration] = useState(false);
  const [entryFeeCents, setEntryFeeCents] = useState("");
  const [currency, setCurrency] = useState("IDR");

  const [competitionFormatId, setCompetitionFormatId] = useState("");
  const [prizeStructureJson, setPrizeStructureJson] = useState("");
  const [eligibilityCriteriaJson, setEligibilityCriteriaJson] = useState("");
  const [judgingCriteriaJson, setJudgingCriteriaJson] = useState("");

  const [preview, setPreview] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const authHeader = useMemo(() => {
    if (!session.accessToken) return "";
    return `Bearer ${session.accessToken}`;
  }, [session.accessToken]);

  useEffect(() => {
    if (eventOrganizerId) return;
    if (eventOrganizers.loading) return;
    if (eventOrganizers.data.length === 0) return;
    setEventOrganizerId(eventOrganizers.data[0].id);
  }, [eventOrganizerId, eventOrganizers.data, eventOrganizers.loading, setEventOrganizerId]);

  const loadRefs = useCallback(async () => {
    if (!eventOrganizerId) return;
    setError(null);
    const [tplRes, fmtRes] = await Promise.all([
      fetch(`/api/v1/competition-templates?eventOrganizerId=${encodeURIComponent(eventOrganizerId)}`, {
        headers: { Authorization: authHeader }
      }),
      fetch(`/api/v1/competition-formats?eventOrganizerId=${encodeURIComponent(eventOrganizerId)}`, {
        headers: { Authorization: authHeader }
      })
    ]);

    const tplBody = await tplRes.json();
    const fmtBody = await fmtRes.json();

    if (!tplRes.ok) setError(tplBody?.error?.message ?? "Failed to load templates");
    if (!fmtRes.ok) setError(fmtBody?.error?.message ?? "Failed to load formats");

    setTemplates(tplBody?.data ?? []);
    setFormats(fmtBody?.data ?? []);
  }, [authHeader, eventOrganizerId]);

  useEffect(() => {
    if (!session.accessToken || !eventOrganizerId) return;
    void loadRefs();
  }, [eventOrganizerId, loadRefs, session.accessToken]);

  const ensureDraft = useCallback(async () => {
    if (!eventOrganizerId) return null;
    if (draft) return draft;
    setLoading(true);
    setError(null);
    const res = await fetch("/api/v1/competition-drafts", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: authHeader },
      body: JSON.stringify({ eventOrganizerId, templateId: templateId || null, step: 1, payload: {} })
    });
    const body = await res.json();
    setLoading(false);
    if (!res.ok) {
      setError(body?.error?.message ?? "Failed to create draft");
      return null;
    }
    setDraft(body.data);
    return body.data as Draft;
  }, [authHeader, draft, eventOrganizerId, templateId]);

  const saveStep = useCallback(
    async (nextStep: number) => {
      const d = await ensureDraft();
      if (!d) return;
      setLoading(true);
      setError(null);
      setSuccess(null);

      const payload = {
        name,
        slug,
        description: description || null,
        season: season || null,
        startDate: startDate || null,
        endDate: endDate || null,
        registrationOpensAt: registrationOpensAt || null,
        registrationClosesAt: registrationClosesAt || null,
        participantLimit: participantLimit ? Number(participantLimit) : null,
        allowPublicRegistration,
        entryFeeCents: entryFeeCents ? Number(entryFeeCents) : null,
        currency: currency || null,
        competitionFormatId: competitionFormatId || null,
        prizeStructure: parseJsonSafe(prizeStructureJson),
        eligibilityCriteria: parseJsonSafe(eligibilityCriteriaJson),
        judgingCriteria: parseJsonSafe(judgingCriteriaJson)
      };

      const res = await fetch(`/api/v1/competition-drafts/${encodeURIComponent(d.id)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: authHeader },
        body: JSON.stringify({ templateId: templateId || null, step: nextStep, payload })
      });
      const body = await res.json();
      setLoading(false);
      if (!res.ok) {
        setError(body?.error?.message ?? "Failed to save draft");
        return;
      }
      setDraft(body.data);
      setStep(nextStep);
      setSuccess("Draft saved");
    },
    [
      allowPublicRegistration,
      authHeader,
      competitionFormatId,
      currency,
      description,
      eligibilityCriteriaJson,
      endDate,
      entryFeeCents,
      ensureDraft,
      judgingCriteriaJson,
      name,
      participantLimit,
      prizeStructureJson,
      registrationClosesAt,
      registrationOpensAt,
      season,
      slug,
      startDate,
      templateId
    ]
  );

  const loadPreview = useCallback(async () => {
    const d = await ensureDraft();
    if (!d) return;
    setLoading(true);
    setError(null);
    const res = await fetch(`/api/v1/competition-drafts/${encodeURIComponent(d.id)}/preview`, {
      headers: { Authorization: authHeader }
    });
    const body = await res.json();
    setLoading(false);
    if (!res.ok) {
      setError(body?.error?.message ?? "Failed to load preview");
      return;
    }
    setPreview(body.data?.preview ?? null);
  }, [authHeader, ensureDraft]);

  const publish = useCallback(async () => {
    const d = await ensureDraft();
    if (!d) return;
    setLoading(true);
    setError(null);
    setSuccess(null);
    const res = await fetch(`/api/v1/competition-drafts/${encodeURIComponent(d.id)}/publish`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: authHeader },
      body: JSON.stringify({ publish: true })
    });
    const body = await res.json();
    setLoading(false);
    if (!res.ok) {
      setError(body?.error?.message ?? "Failed to publish");
      return;
    }
    setSuccess("Competition published");
  }, [authHeader, ensureDraft]);

  const selectedTemplate = templates.find((t) => t.id === templateId) ?? null;

  useEffect(() => {
    if (!selectedTemplate) return;
    const p = selectedTemplate.payload ?? {};
    if (typeof p.name === "string" && !name) setName(p.name);
    if (typeof p.slug === "string" && !slug) setSlug(p.slug);
    if (typeof p.description === "string" && !description) setDescription(p.description);
    if (typeof p.season === "string" && !season) setSeason(p.season);
    if (typeof p.competitionFormatId === "string" && !competitionFormatId) setCompetitionFormatId(p.competitionFormatId);
  }, [competitionFormatId, description, name, season, selectedTemplate, slug]);

  return (
    <main>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Create Competition</h1>
          <p className="mt-2 text-sm text-zinc-300">Multi-step wizard with draft saving and preview.</p>
        </div>
        <Link className="text-sm underline" href="/competitions">
          Back
        </Link>
      </div>

      <div className="mt-6 rounded border border-zinc-800 p-4">
        <div className="grid gap-4 md:grid-cols-2">
          <label className="block">
            <div className="text-sm text-zinc-300">Event Organizer</div>
            {eventOrganizers.data.length > 0 ? (
              <select
                className="mt-1 w-full rounded border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm"
                value={eventOrganizerId}
                onChange={(e) => {
                  setDraft(null);
                  setPreview(null);
                  setSuccess(null);
                  setError(null);
                  setStep(1);
                  setEventOrganizerId(e.target.value);
                }}
              >
                <option value="" disabled>
                  Select tenant…
                </option>
                {eventOrganizers.data.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name} ({t.slug})
                  </option>
                ))}
              </select>
            ) : (
              <input
                className="mt-1 w-full rounded border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm"
                value={eventOrganizerId}
                onChange={(e) => setEventOrganizerId(e.target.value)}
                placeholder="uuid"
              />
            )}
          </label>

          <label className="block">
            <div className="text-sm text-zinc-300">Template (optional)</div>
            <select
              className="mt-1 w-full rounded border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm"
              value={templateId}
              onChange={(e) => setTemplateId(e.target.value)}
              disabled={!session.accessToken || !eventOrganizerId || loading}
            >
              <option value="">None</option>
              {templates.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name} ({t.event_organizer_id ? "tenant" : "global"})
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="mt-4 text-sm text-zinc-300">Step {step}/4</div>
      </div>

      {step === 1 ? (
        <div className="mt-6 grid gap-4 rounded border border-zinc-800 p-4 md:grid-cols-2">
          <label className="block md:col-span-2">
            <div className="text-sm text-zinc-300">Name</div>
            <input
              className="mt-1 w-full rounded border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="National League 2026"
            />
          </label>

          <label className="block">
            <div className="text-sm text-zinc-300">Slug</div>
            <input
              className="mt-1 w-full rounded border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm"
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
              placeholder="national-league-2026"
            />
          </label>

          <label className="block">
            <div className="text-sm text-zinc-300">Season (optional)</div>
            <input
              className="mt-1 w-full rounded border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm"
              value={season}
              onChange={(e) => setSeason(e.target.value)}
              placeholder="2026"
            />
          </label>

          <label className="block md:col-span-2">
            <div className="text-sm text-zinc-300">Description</div>
            <textarea
              className="mt-1 w-full rounded border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
            />
          </label>

          <label className="block">
            <div className="text-sm text-zinc-300">Start date (YYYY-MM-DD)</div>
            <input
              className="mt-1 w-full rounded border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              placeholder="2026-01-10"
            />
          </label>

          <label className="block">
            <div className="text-sm text-zinc-300">End date (YYYY-MM-DD)</div>
            <input
              className="mt-1 w-full rounded border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              placeholder="2026-03-10"
            />
          </label>

          <div className="flex items-end justify-between md:col-span-2">
            <div className="text-xs text-zinc-400">{draft ? `Draft: ${draft.id}` : "Draft not created yet"}</div>
            <button
              className="rounded bg-zinc-100 px-3 py-2 text-sm font-medium text-zinc-900"
              onClick={() => saveStep(2)}
              disabled={loading || !session.accessToken || !eventOrganizerId || !name || !slug}
            >
              Next
            </button>
          </div>
        </div>
      ) : null}

      {step === 2 ? (
        <div className="mt-6 grid gap-4 rounded border border-zinc-800 p-4 md:grid-cols-2">
          <label className="block">
            <div className="text-sm text-zinc-300">Registration opens at (ISO)</div>
            <input
              className="mt-1 w-full rounded border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm"
              value={registrationOpensAt}
              onChange={(e) => setRegistrationOpensAt(e.target.value)}
              placeholder="2026-01-01T00:00:00Z"
            />
          </label>

          <label className="block">
            <div className="text-sm text-zinc-300">Registration closes at (ISO)</div>
            <input
              className="mt-1 w-full rounded border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm"
              value={registrationClosesAt}
              onChange={(e) => setRegistrationClosesAt(e.target.value)}
              placeholder="2026-01-05T00:00:00Z"
            />
          </label>

          <label className="block">
            <div className="text-sm text-zinc-300">Participant limit</div>
            <input
              className="mt-1 w-full rounded border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm"
              value={participantLimit}
              onChange={(e) => setParticipantLimit(e.target.value)}
              placeholder="16"
              inputMode="numeric"
            />
          </label>

          <label className="block">
            <div className="text-sm text-zinc-300">Entry fee (cents)</div>
            <input
              className="mt-1 w-full rounded border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm"
              value={entryFeeCents}
              onChange={(e) => setEntryFeeCents(e.target.value)}
              placeholder="0"
              inputMode="numeric"
            />
          </label>

          <label className="block">
            <div className="text-sm text-zinc-300">Currency</div>
            <input
              className="mt-1 w-full rounded border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm"
              value={currency}
              onChange={(e) => setCurrency(e.target.value)}
              placeholder="IDR"
            />
          </label>

          <label className="flex items-center gap-2 text-sm text-zinc-300">
            <input
              type="checkbox"
              checked={allowPublicRegistration}
              onChange={(e) => setAllowPublicRegistration(e.target.checked)}
            />
            Allow public registration
          </label>

          <div className="flex items-end justify-between md:col-span-2">
            <button
              className="rounded border border-zinc-700 px-3 py-2 text-sm"
              onClick={() => setStep(1)}
              disabled={loading}
            >
              Back
            </button>
            <button
              className="rounded bg-zinc-100 px-3 py-2 text-sm font-medium text-zinc-900"
              onClick={() => saveStep(3)}
              disabled={loading || !session.accessToken || !eventOrganizerId || !name || !slug}
            >
              Next
            </button>
          </div>
        </div>
      ) : null}

      {step === 3 ? (
        <div className="mt-6 grid gap-4 rounded border border-zinc-800 p-4">
          <label className="block">
            <div className="text-sm text-zinc-300">Competition format</div>
            <select
              className="mt-1 w-full rounded border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm"
              value={competitionFormatId}
              onChange={(e) => setCompetitionFormatId(e.target.value)}
              disabled={!session.accessToken || !eventOrganizerId || loading}
            >
              <option value="">None</option>
              {formats.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.name} ({f.format_type}) {f.event_organizer_id ? "" : "(global)"}
                </option>
              ))}
            </select>
          </label>

          <label className="block">
            <div className="text-sm text-zinc-300">Prize structure (JSON)</div>
            <textarea
              className="mt-1 w-full rounded border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm"
              value={prizeStructureJson}
              onChange={(e) => setPrizeStructureJson(e.target.value)}
              rows={4}
              placeholder='{"first": {"amount": 1000000, "currency": "IDR"}}'
            />
          </label>

          <label className="block">
            <div className="text-sm text-zinc-300">Eligibility criteria (JSON)</div>
            <textarea
              className="mt-1 w-full rounded border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm"
              value={eligibilityCriteriaJson}
              onChange={(e) => setEligibilityCriteriaJson(e.target.value)}
              rows={4}
              placeholder='{"ageMin": 12, "nationality": ["ID"]}'
            />
          </label>

          <label className="block">
            <div className="text-sm text-zinc-300">Judging criteria (JSON)</div>
            <textarea
              className="mt-1 w-full rounded border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm"
              value={judgingCriteriaJson}
              onChange={(e) => setJudgingCriteriaJson(e.target.value)}
              rows={4}
              placeholder='{"rules": [{"key":"goals","weight":1}]}'
            />
          </label>

          <div className="flex items-end justify-between">
            <button
              className="rounded border border-zinc-700 px-3 py-2 text-sm"
              onClick={() => setStep(2)}
              disabled={loading}
            >
              Back
            </button>
            <button
              className="rounded bg-zinc-100 px-3 py-2 text-sm font-medium text-zinc-900"
              onClick={() => saveStep(4)}
              disabled={loading || !session.accessToken || !eventOrganizerId || !name || !slug}
            >
              Next
            </button>
          </div>
        </div>
      ) : null}

      {step === 4 ? (
        <div className="mt-6 rounded border border-zinc-800 p-4">
          <div className="flex items-center justify-between">
            <div className="text-sm text-zinc-300">Preview</div>
            <button
              className="rounded border border-zinc-700 px-3 py-2 text-sm"
              onClick={loadPreview}
              disabled={loading || !session.accessToken || !eventOrganizerId}
            >
              Refresh preview
            </button>
          </div>

          <pre className="mt-4 overflow-x-auto rounded bg-zinc-950 p-3 text-xs text-zinc-200">
            {JSON.stringify(preview ?? {}, null, 2)}
          </pre>

          <div className="mt-4 flex items-center justify-between">
            <button className="rounded border border-zinc-700 px-3 py-2 text-sm" onClick={() => setStep(3)} disabled={loading}>
              Back
            </button>
            <button
              className="rounded bg-zinc-100 px-3 py-2 text-sm font-medium text-zinc-900"
              onClick={publish}
              disabled={loading || !session.accessToken || !eventOrganizerId}
            >
              Publish
            </button>
          </div>
        </div>
      ) : null}

      {error ? <div className="mt-4 text-sm text-red-400">{error}</div> : null}
      {success ? <div className="mt-4 text-sm text-emerald-300">{success}</div> : null}
      {loading ? <div className="mt-4 text-sm text-zinc-400">Loading…</div> : null}
    </main>
  );
}

