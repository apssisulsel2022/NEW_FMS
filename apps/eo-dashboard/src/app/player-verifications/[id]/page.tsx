"use client";

import Link from "next/link";
import Image from "next/image";
import { useCallback, useEffect, useMemo, useState } from "react";

import { useSession } from "@/lib/useSession";

type Verification = any;
type VerificationDoc = {
  id: string;
  created_at: string;
  doc_type: string;
  mime_type: string | null;
  file_name: string | null;
  file_size_bytes: number | null;
  captured_at: string | null;
};

export default function PlayerVerificationDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const session = useSession();
  const [requestId, setRequestId] = useState("");
  const [request, setRequest] = useState<Verification | null>(null);
  const [docs, setDocs] = useState<VerificationDoc[]>([]);
  const [events, setEvents] = useState<any[]>([]);

  const [docType, setDocType] = useState("government_id_front");
  const [docFile, setDocFile] = useState<File | null>(null);

  const [decision, setDecision] = useState<"approved" | "rejected">("approved");
  const [decisionReason, setDecisionReason] = useState("");
  const [decisionNotes, setDecisionNotes] = useState("");

  const [viewDocId, setViewDocId] = useState<string | null>(null);
  const [viewDocUrl, setViewDocUrl] = useState<string | null>(null);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    void params.then((p) => setRequestId(p.id));
  }, [params]);

  const authHeader = useMemo(() => {
    if (!session.accessToken) return "";
    return `Bearer ${session.accessToken}`;
  }, [session.accessToken]);

  const load = useCallback(async () => {
    if (!session.accessToken || !requestId) return;
    setLoading(true);
    setError(null);
    setSuccess(null);
    const [rRes, dRes, eRes] = await Promise.all([
      fetch(`/api/v1/player-verifications/${encodeURIComponent(requestId)}`, { headers: { Authorization: authHeader } }),
      fetch(`/api/v1/player-verifications/${encodeURIComponent(requestId)}/documents`, { headers: { Authorization: authHeader } }),
      fetch(`/api/v1/player-verifications/${encodeURIComponent(requestId)}/events`, { headers: { Authorization: authHeader } })
    ]);
    const [rBody, dBody, eBody] = await Promise.all([rRes.json(), dRes.json(), eRes.json()]);
    setLoading(false);
    if (!rRes.ok) {
      setError(rBody?.error?.message ?? "Failed to load request");
      return;
    }
    if (!dRes.ok) {
      setError(dBody?.error?.message ?? "Failed to load documents");
      return;
    }
    if (!eRes.ok) {
      setError(eBody?.error?.message ?? "Failed to load history");
      return;
    }
    setRequest(rBody.data ?? null);
    setDocs(dBody.data ?? []);
    setEvents(eBody.data ?? []);
  }, [authHeader, requestId, session.accessToken]);

  const uploadDoc = useCallback(async () => {
    if (!docFile || !requestId) return;
    setLoading(true);
    setError(null);
    setSuccess(null);
    const buffer = await docFile.arrayBuffer();
    const base64 = btoa(String.fromCharCode(...new Uint8Array(buffer)));
    const dataBase64 = `data:${docFile.type || "application/octet-stream"};base64,${base64}`;
    const res = await fetch(`/api/v1/player-verifications/${encodeURIComponent(requestId)}/documents`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: authHeader },
      body: JSON.stringify({ docType, dataBase64, fileName: docFile.name, mimeType: docFile.type || null })
    });
    const body = await res.json();
    setLoading(false);
    if (!res.ok) {
      setError(body?.error?.message ?? "Failed to upload document");
      return;
    }
    setDocFile(null);
    setSuccess("Document uploaded");
    await load();
  }, [authHeader, docFile, docType, load, requestId]);

  const submit = useCallback(async () => {
    setLoading(true);
    setError(null);
    setSuccess(null);
    const res = await fetch(`/api/v1/player-verifications/${encodeURIComponent(requestId)}/submit`, {
      method: "POST",
      headers: { Authorization: authHeader }
    });
    const body = await res.json();
    setLoading(false);
    if (!res.ok) {
      setError(body?.error?.message ?? "Failed to submit");
      return;
    }
    setSuccess("Submitted for review");
    await load();
  }, [authHeader, load, requestId]);

  const decide = useCallback(async () => {
    setLoading(true);
    setError(null);
    setSuccess(null);
    const res = await fetch(`/api/v1/player-verifications/${encodeURIComponent(requestId)}/decision`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: authHeader },
      body: JSON.stringify({ decision, reason: decisionReason || null, notes: decisionNotes || null })
    });
    const body = await res.json();
    setLoading(false);
    if (!res.ok) {
      setError(body?.error?.message ?? "Failed to decide");
      return;
    }
    setSuccess("Decision saved");
    await load();
  }, [authHeader, decision, decisionNotes, decisionReason, load, requestId]);

  const viewDoc = useCallback(
    async (docId: string) => {
      setViewDocId(docId);
      setViewDocUrl(null);
      setLoading(true);
      setError(null);
      const res = await fetch(
        `/api/v1/player-verifications/${encodeURIComponent(requestId)}/documents/${encodeURIComponent(docId)}`,
        { headers: { Authorization: authHeader } }
      );
      const body = await res.json();
      setLoading(false);
      if (!res.ok) {
        setError(body?.error?.message ?? "Failed to load document");
        return;
      }
      const mimeType = body.data?.mimeType ?? "application/octet-stream";
      const dataBase64 = body.data?.dataBase64 ?? "";
      setViewDocUrl(`data:${mimeType};base64,${dataBase64}`);
    },
    [authHeader, requestId]
  );

  useEffect(() => {
    if (!session.accessToken || !requestId) return;
    void load();
  }, [load, requestId, session.accessToken]);

  const player = request?.players ?? null;

  return (
    <main>
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Verification Request</h1>
          <p className="mt-2 text-sm text-zinc-300">Upload documents, submit for review, and record approval/rejection decisions.</p>
        </div>
        <Link className="text-sm underline" href="/player-verifications">
          Back
        </Link>
      </div>

      <div className="mt-6 rounded border border-zinc-800 p-4">
        <div className="grid gap-2 md:grid-cols-2">
          <div className="text-sm text-zinc-300">
            <div className="text-xs text-zinc-500">Player</div>
            <div className="text-zinc-100">{player ? `${player.first_name} ${player.last_name}` : "-"}</div>
            <div className="text-xs text-zinc-500">{player?.player_code ?? ""}</div>
            <div className="text-xs text-zinc-500">{player?.email ?? ""}</div>
          </div>

          <div className="text-sm text-zinc-300">
            <div className="text-xs text-zinc-500">Workflow</div>
            <div className="text-zinc-100">{request?.workflow_status ?? "-"}</div>
            <div className="text-xs text-zinc-500">AI: {request?.ai_status ?? "-"}</div>
          </div>
        </div>

        <pre className="mt-4 overflow-x-auto rounded bg-zinc-950 p-3 text-xs text-zinc-200">{JSON.stringify(request?.ai_result ?? {}, null, 2)}</pre>

        <div className="mt-4 flex flex-wrap items-center gap-3">
          <button className="rounded border border-zinc-700 px-3 py-2 text-sm" onClick={load} disabled={loading || !session.accessToken}>
            Refresh
          </button>
          <button className="rounded bg-zinc-100 px-3 py-2 text-sm font-medium text-zinc-900" onClick={submit} disabled={loading || !session.accessToken}>
            Submit for review
          </button>
        </div>
      </div>

      <div className="mt-6 grid gap-6 md:grid-cols-2">
        <section className="rounded border border-zinc-800 p-4">
          <h2 className="text-sm font-semibold">Documents</h2>
          <div className="mt-3 grid gap-3">
            <label className="block">
              <div className="text-sm text-zinc-300">Type</div>
              <select className="mt-1 w-full rounded border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm" value={docType} onChange={(e) => setDocType(e.target.value)}>
                <option value="government_id_front">government_id_front</option>
                <option value="government_id_back">government_id_back</option>
                <option value="selfie">selfie</option>
                <option value="live_capture">live_capture</option>
              </select>
            </label>

            <label className="block">
              <div className="text-sm text-zinc-300">File</div>
              <input
                className="mt-1 w-full rounded border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm"
                type="file"
                accept="image/*"
                onChange={(e) => setDocFile(e.target.files?.[0] ?? null)}
              />
            </label>

            <div className="flex justify-end">
              <button className="rounded bg-zinc-100 px-3 py-2 text-sm font-medium text-zinc-900" onClick={uploadDoc} disabled={loading || !session.accessToken || !docFile}>
                Upload
              </button>
            </div>
          </div>

          <div className="mt-4 overflow-x-auto rounded border border-zinc-800">
            <table className="min-w-full text-sm">
              <thead className="bg-zinc-900 text-zinc-200">
                <tr>
                  <th className="px-3 py-2 text-left">Type</th>
                  <th className="px-3 py-2 text-left">File</th>
                  <th className="px-3 py-2 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-900">
                {docs.map((d) => (
                  <tr key={d.id}>
                    <td className="px-3 py-2 text-zinc-300">{d.doc_type}</td>
                    <td className="px-3 py-2 text-zinc-300">{d.file_name ?? d.id}</td>
                    <td className="px-3 py-2 text-right">
                      <button className="rounded border border-zinc-700 px-2 py-1 text-xs" onClick={() => viewDoc(d.id)} disabled={loading}>
                        View
                      </button>
                    </td>
                  </tr>
                ))}
                {docs.length === 0 ? (
                  <tr>
                    <td className="px-3 py-4 text-zinc-400" colSpan={3}>
                      No documents.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>

          {viewDocId && viewDocUrl ? (
            <div className="mt-4 rounded border border-zinc-800 bg-zinc-950 p-3">
              <div className="text-xs text-zinc-400">Preview: {viewDocId}</div>
              <div className="mt-3">
                <Image
                  className="max-h-[360px] w-auto rounded"
                  src={viewDocUrl}
                  alt="Verification document preview"
                  width={800}
                  height={600}
                  unoptimized
                />
              </div>
            </div>
          ) : null}
        </section>

        <section className="rounded border border-zinc-800 p-4">
          <h2 className="text-sm font-semibold">Decision (Organizer)</h2>
          <div className="mt-3 grid gap-3">
            <label className="block">
              <div className="text-sm text-zinc-300">Decision</div>
              <select className="mt-1 w-full rounded border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm" value={decision} onChange={(e) => setDecision(e.target.value as any)}>
                <option value="approved">approved</option>
                <option value="rejected">rejected</option>
              </select>
            </label>
            <label className="block">
              <div className="text-sm text-zinc-300">Reason</div>
              <input className="mt-1 w-full rounded border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm" value={decisionReason} onChange={(e) => setDecisionReason(e.target.value)} />
            </label>
            <label className="block">
              <div className="text-sm text-zinc-300">Notes</div>
              <textarea className="mt-1 w-full rounded border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm" rows={4} value={decisionNotes} onChange={(e) => setDecisionNotes(e.target.value)} />
            </label>
            <div className="flex justify-end">
              <button className="rounded bg-zinc-100 px-3 py-2 text-sm font-medium text-zinc-900" onClick={decide} disabled={loading || !session.accessToken}>
                Save decision
              </button>
            </div>
          </div>

          <div className="mt-6">
            <h3 className="text-sm font-semibold">History</h3>
            <pre className="mt-3 max-h-[360px] overflow-auto rounded bg-zinc-950 p-3 text-xs text-zinc-200">{JSON.stringify(events, null, 2)}</pre>
          </div>
        </section>
      </div>

      {error ? <div className="mt-4 text-sm text-red-400">{error}</div> : null}
      {success ? <div className="mt-4 text-sm text-emerald-300">{success}</div> : null}
      {loading ? <div className="mt-4 text-sm text-zinc-400">Loading…</div> : null}
    </main>
  );
}
