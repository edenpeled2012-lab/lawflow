"use client";

import { useEffect, useState } from "react";
import { useSession, signOut } from "next-auth/react";
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

const STATUS_LABELS: Record<string, string> = {
  PENDING: "Pending",
  IN_REVIEW: "In Review",
  ACTIVE: "Active",
  CLOSED: "Closed",
};

const URGENCY_COLORS: Record<string, string> = {
  URGENT: "bg-red-100 text-red-700",
  HIGH: "bg-orange-100 text-orange-700",
  NORMAL: "bg-slate-100 text-slate-600",
  LOW: "bg-green-100 text-green-700",
};

const STATUS_COLORS: Record<string, string> = {
  PENDING: "bg-yellow-100 text-yellow-700",
  IN_REVIEW: "bg-blue-100 text-blue-700",
  ACTIVE: "bg-green-100 text-green-700",
  CLOSED: "bg-slate-100 text-slate-500",
};

interface Client {
  id: string;
  fullName: string | null;
  idNumber: string | null;
  phone: string | null;
  caseType: string | null;
  caseSummary: string | null;
  urgency: string;
  status: string;
  createdAt: string;
}

export default function DashboardPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState("");
  const [filterCase, setFilterCase] = useState("");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (status === "unauthenticated") router.push("/login");
  }, [status, router]);

  useEffect(() => {
    if (status === "authenticated") fetchClients();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, filterStatus, filterCase]);

  async function fetchClients() {
    setLoading(true);
    const params = new URLSearchParams();
    if (filterStatus) params.set("status", filterStatus);
    if (filterCase) params.set("caseType", filterCase);
    const res = await fetch(`/api/clients?${params}`);
    const data = await res.json();
    setClients(data);
    setLoading(false);
  }

  function copyIntakeLink() {
    const url = `${window.location.origin}/intake?lawyer=${session?.user.id}`;
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  const stats = {
    total: clients.length,
    pending: clients.filter((c) => c.status === "PENDING").length,
    urgent: clients.filter((c) => c.urgency === "URGENT" || c.urgency === "HIGH").length,
  };

  if (status === "loading") return null;

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Navbar */}
      <nav className="bg-white border-b border-slate-200 px-6 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-sm">L</span>
            </div>
            <span className="font-semibold text-slate-900">LawFlow</span>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-slate-500">{session?.user.name}</span>
            <button
              onClick={() => signOut({ callbackUrl: "/login" })}
              className="text-sm text-slate-500 hover:text-slate-700"
            >
              Sign out
            </button>
          </div>
        </div>
      </nav>

      <main className="max-w-6xl mx-auto px-6 py-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Client Dashboard</h1>
            <p className="text-slate-500 text-sm mt-1">
              {session?.user.firmName || "Your Law Firm"}
            </p>
          </div>
          <button
            onClick={copyIntakeLink}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
            </svg>
            {copied ? "Copied!" : "Copy Intake Link"}
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <p className="text-sm text-slate-500">Total Clients</p>
            <p className="text-3xl font-bold text-slate-900 mt-1">{stats.total}</p>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <p className="text-sm text-slate-500">Awaiting Review</p>
            <p className="text-3xl font-bold text-yellow-600 mt-1">{stats.pending}</p>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <p className="text-sm text-slate-500">Urgent</p>
            <p className="text-3xl font-bold text-red-600 mt-1">{stats.urgent}</p>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-3 mb-6">
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
          >
            <option value="">All Statuses</option>
            {Object.entries(STATUS_LABELS).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </select>
          <select
            value={filterCase}
            onChange={(e) => setFilterCase(e.target.value)}
            className="border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
          >
            <option value="">All Case Types</option>
            {Object.entries(CASE_LABELS).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </select>
        </div>

        {/* Client list */}
        {loading ? (
          <div className="text-center py-16 text-slate-400">Loading...</div>
        ) : clients.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-slate-500 text-lg">No clients yet.</p>
            <p className="text-slate-400 text-sm mt-2">
              Share your intake link to start collecting clients.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {clients.map((client) => (
              <Link
                key={client.id}
                href={`/dashboard/clients/${client.id}`}
                className="bg-white border border-slate-200 rounded-xl p-5 flex items-start justify-between hover:border-blue-300 hover:shadow-sm transition-all block"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-semibold text-slate-900">
                      {client.fullName || "Name pending..."}
                    </h3>
                    {client.urgency !== "NORMAL" && (
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${URGENCY_COLORS[client.urgency]}`}>
                        {client.urgency}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                    {client.caseType && (
                      <span className="text-xs text-blue-600 font-medium">
                        {CASE_LABELS[client.caseType]}
                      </span>
                    )}
                    {client.phone && (
                      <span className="text-xs text-slate-400">{client.phone}</span>
                    )}
                    <span className="text-xs text-slate-400">
                      {new Date(client.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                  {client.caseSummary && (
                    <p className="text-sm text-slate-500 mt-2 line-clamp-1">
                      {client.caseSummary}
                    </p>
                  )}
                </div>
                <span className={`ml-4 text-xs px-2.5 py-1 rounded-full font-medium flex-shrink-0 ${STATUS_COLORS[client.status]}`}>
                  {STATUS_LABELS[client.status]}
                </span>
              </Link>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
