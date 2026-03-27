"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";

const CASE_LABELS: Record<string, string> = {
  FAMILY: "Family Law",
  CRIMINAL: "Criminal",
  TORT: "Tort / Injury",
  REAL_ESTATE: "Real Estate",
  LABOR: "Labor Law",
  CONTRACT: "Contract",
};

const STATUS_OPTIONS = ["PENDING", "IN_REVIEW", "ACTIVE", "CLOSED"];

interface Message {
  role: string;
  content: string;
  createdAt: string;
}

interface Client {
  id: string;
  fullName: string | null;
  idNumber: string | null;
  phone: string | null;
  email: string | null;
  caseType: string | null;
  caseSummary: string | null;
  urgency: string;
  status: string;
  createdAt: string;
  conversation: {
    messages: Message[];
    completed: boolean;
  } | null;
}

export default function ClientDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { status } = useSession();
  const router = useRouter();
  const [client, setClient] = useState<Client | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [clientStatus, setClientStatus] = useState("");
  const [id, setId] = useState("");

  useEffect(() => {
    params.then((p) => setId(p.id));
  }, [params]);

  useEffect(() => {
    if (status === "unauthenticated") router.push("/login");
  }, [status, router]);

  useEffect(() => {
    if (id && status === "authenticated") fetchClient();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, status]);

  async function fetchClient() {
    const res = await fetch(`/api/clients/${id}`);
    if (!res.ok) { router.push("/dashboard"); return; }
    const data = await res.json();
    setClient(data);
    setClientStatus(data.status);
    setLoading(false);
  }

  async function updateStatus(newStatus: string) {
    setSaving(true);
    setClientStatus(newStatus);
    await fetch(`/api/clients/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: newStatus }),
    });
    setSaving(false);
  }

  if (loading) return null;
  if (!client) return null;

  const infoRows = [
    { label: "Full Name", value: client.fullName },
    { label: "ID Number", value: client.idNumber },
    { label: "Phone", value: client.phone },
    { label: "Email", value: client.email },
    { label: "Case Type", value: client.caseType ? CASE_LABELS[client.caseType] : null },
    { label: "Urgency", value: client.urgency },
    {
      label: "Received",
      value: new Date(client.createdAt).toLocaleDateString("en-US", {
        year: "numeric", month: "long", day: "numeric",
      }),
    },
  ];

  return (
    <div className="min-h-screen bg-slate-50">
      <nav className="bg-white border-b border-slate-200 px-6 py-4">
        <div className="max-w-4xl mx-auto flex items-center gap-4">
          <Link href="/dashboard" className="text-blue-600 hover:underline text-sm flex items-center gap-1">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Dashboard
          </Link>
          <span className="text-slate-300">/</span>
          <span className="text-sm text-slate-500">{client.fullName || "New Client"}</span>
        </div>
      </nav>

      <main className="max-w-4xl mx-auto px-6 py-8">
        <div className="flex items-start justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">
              {client.fullName || "Name not yet collected"}
            </h1>
            {client.caseType && (
              <p className="text-blue-600 font-medium mt-1">{CASE_LABELS[client.caseType]}</p>
            )}
          </div>
          <div className="flex items-center gap-3">
            <select
              value={clientStatus}
              onChange={(e) => updateStatus(e.target.value)}
              disabled={saving}
              className="border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
            >
              {STATUS_OPTIONS.map((s) => (
                <option key={s} value={s}>{s.replace("_", " ")}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Client info */}
          <div className="bg-white rounded-xl border border-slate-200 p-6">
            <h2 className="font-semibold text-slate-900 mb-4">Client Information</h2>
            <dl className="space-y-3">
              {infoRows.map(({ label, value }) => (
                <div key={label} className="flex justify-between text-sm">
                  <dt className="text-slate-500">{label}</dt>
                  <dd className="text-slate-900 font-medium text-right">
                    {value || <span className="text-slate-300 font-normal">—</span>}
                  </dd>
                </div>
              ))}
            </dl>
          </div>

          {/* Case summary */}
          <div className="bg-white rounded-xl border border-slate-200 p-6">
            <h2 className="font-semibold text-slate-900 mb-4">Case Summary</h2>
            {client.caseSummary ? (
              <p className="text-sm text-slate-700 leading-relaxed">{client.caseSummary}</p>
            ) : (
              <p className="text-sm text-slate-400">
                Intake conversation is still in progress.
              </p>
            )}
          </div>

          {/* Conversation transcript */}
          {client.conversation && client.conversation.messages.length > 0 && (
            <div className="md:col-span-2 bg-white rounded-xl border border-slate-200 p-6">
              <h2 className="font-semibold text-slate-900 mb-4">
                Intake Conversation
                {client.conversation.completed && (
                  <span className="ml-2 text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">
                    Completed
                  </span>
                )}
              </h2>
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {client.conversation.messages.map((msg, i) => (
                  <div
                    key={i}
                    className={`flex ${msg.role === "USER" ? "justify-end" : "justify-start"}`}
                  >
                    <div
                      className={`max-w-[80%] rounded-xl px-4 py-2.5 text-sm ${
                        msg.role === "USER"
                          ? "bg-blue-600 text-white"
                          : "bg-slate-100 text-slate-800"
                      }`}
                    >
                      {msg.content}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
