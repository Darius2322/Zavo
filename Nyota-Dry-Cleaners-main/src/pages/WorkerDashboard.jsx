import React, { useEffect, useState, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { LogOut, ClipboardList, KeyRound } from "lucide-react";
import { supabase } from "../lib/supabaseClient";
import { useStaffSession, signOut } from "../lib/auth";
import { C, STATUS_LABEL } from "../lib/constants";
import { Button, Section, H2, Eyebrow, Badge, Select, Spinner, EmptyState } from "../components/UI";
import { ChangePasswordModal } from "../components/ChangePasswordModal";

const ALLOWED_NEXT = { confirmed: "picked_up", picked_up: "processing", processing: "ready", ready: "completed" };

// Best-effort local alert for a newly-assigned "Pick Now" job — vibration
// and sound only fire with the device/browser's own permission model, and
// silently no-op where unsupported.
function alertUrgentPickup() {
  try {
    if (navigator.vibrate) navigator.vibrate([200, 100, 200, 100, 200]);
  } catch {}
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.value = 880;
    gain.gain.value = 0.15;
    osc.connect(gain).connect(ctx.destination);
    osc.start();
    setTimeout(() => { osc.stop(); ctx.close(); }, 400);
  } catch {}
  try {
    if (window.Notification && Notification.permission === "granted") {
      new Notification("Urgent — Pickup Now", { body: "A customer needs pickup right away." });
    }
  } catch {}
}

export default function WorkerDashboard() {
  const nav = useNavigate();
  const { loading, session, profile } = useStaffSession();
  const [requests, setRequests] = useState([]);
  const [busyId, setBusyId] = useState(null);
  const [showChangePwd, setShowChangePwd] = useState(false);
  const [teammates, setTeammates] = useState([]); // for managers: other workers to assign to
  const knownUrgentIds = useRef(new Set());
  const isManager = profile?.role === "manager";

  const load = useCallback(async () => {
    if (!session) return;
    let query = supabase.from("service_requests").select("*, services(name)").not("status", "in", "(completed,cancelled)");
    // Managers see every active request so they can triage and assign;
    // workers only see what's been assigned to them.
    query = isManager ? query : query.eq("assigned_worker_id", session.user.id);
    const { data } = await query.order("created_at", { ascending: true });
    const rows = data || [];
    const newUrgent = rows.filter((r) => r.pickup_now && !knownUrgentIds.current.has(r.id));
    if (newUrgent.length > 0 && knownUrgentIds.current.size > 0) alertUrgentPickup();
    knownUrgentIds.current = new Set(rows.filter((r) => r.pickup_now).map((r) => r.id));
    setRequests(rows);
  }, [session, isManager]);

  useEffect(() => {
    if (!isManager || !session) return;
    (async () => {
      const { data } = await supabase.from("profiles").select("id,full_name").eq("role", "worker").eq("is_active", true);
      setTeammates(data || []);
    })();
  }, [isManager, session]);

  useEffect(() => {
    if (window.Notification && Notification.permission === "default") {
      Notification.requestPermission().catch(() => {});
    }
  }, []);

  useEffect(() => {
    if (!loading && (!session || !profile)) nav("/worker/login");
  }, [loading, session, profile, nav]);

  useEffect(() => {
    if (session) {
      load();
      const channel = supabase.channel("worker-tasks").on("postgres_changes", { event: "*", schema: "public", table: "service_requests" }, load).subscribe();
      return () => supabase.removeChannel(channel);
    }
  }, [session, load]);

  if (loading || !profile) return <Spinner label="Loading your dashboard…" />;

  async function advance(r) {
    const next = ALLOWED_NEXT[r.status];
    if (!next) return;
    setBusyId(r.id);
    await supabase.from("service_requests").update({ status: next }).eq("id", r.id);
    await supabase.from("activity_logs").insert({ actor_id: profile.id, actor_label: profile.full_name, action: "request_status_changed", target_table: "service_requests", target_id: r.id, metadata: { status: next } });
    setBusyId(null);
  }

  async function assignWorker(r, workerId) {
    await supabase.from("service_requests").update({ assigned_worker_id: workerId || null }).eq("id", r.id);
    await supabase.from("activity_logs").insert({ actor_id: profile.id, actor_label: profile.full_name, action: "worker_assigned", target_table: "service_requests", target_id: r.id, metadata: { workerId } });
    if (workerId) await supabase.from("notifications").insert({ recipient_id: workerId, type: "pickup_assigned", title: "New request assigned to you", related_request_id: r.id });
    setRequests((rs) => rs.map((x) => (x.id === r.id ? { ...x, assigned_worker_id: workerId || null } : x)));
  }

  return (
    <Section>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 22, flexWrap: "wrap", gap: 12 }}>
        <div><Eyebrow>Worker Dashboard</Eyebrow><H2>Good day, {profile.full_name.split(" ")[0]}</H2></div>
        <div style={{ display: "flex", gap: 8 }}>
          <Button variant="secondary" onClick={() => setShowChangePwd(true)}><KeyRound size={16} /> Change Password</Button>
          <Button variant="ghost" onClick={async () => { await signOut(); nav("/worker/login"); }}><LogOut size={16} /> Log Out</Button>
        </div>
      </div>
      <div style={{ fontWeight: 700, color: C.navy, marginBottom: 12 }}>{isManager ? `All Active Requests (${requests.length})` : `My Assigned Requests (${requests.length})`}</div>
      {requests.length === 0 ? (
        <EmptyState icon={ClipboardList} title={isManager ? "No active requests right now" : "No tasks assigned to you right now"} />
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {[...requests].sort((a, b) => (a.pickup_now === b.pickup_now ? 0 : a.pickup_now ? -1 : 1)).map((r) => {
            const next = ALLOWED_NEXT[r.status];
            return (
              <div key={r.id} style={{ background: "#fff", border: r.pickup_now ? "1.5px solid #B23131" : "1px solid #E7ECF6", borderRadius: 12, padding: 16, display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10 }}>
                <div>
                  <div style={{ fontWeight: 700, color: C.navy, fontSize: 14, display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
                    {r.pickup_now && <span style={{ background: "#FCE8E8", color: "#B23131", fontSize: 11, fontWeight: 800, padding: "3px 8px", borderRadius: 999 }}>URGENT — PICKUP NOW</span>}
                    {r.public_request_number} · {r.services?.name || `Other — ${r.custom_service}`}
                  </div>
                  <div style={{ fontSize: 12.5, color: "#8792A8" }}>{r.customer_name} · {r.fulfillment_type === "pickup" ? `Pickup — ${r.pickup_area}` : "Drop-off"}</div>
                  {r.pickup_lat != null && r.pickup_lng != null && (
                    <a href={`https://www.google.com/maps?q=${r.pickup_lat},${r.pickup_lng}`} target="_blank" rel="noreferrer" style={{ fontSize: 12, color: C.bright, fontWeight: 700 }}>Open in Maps</a>
                  )}
                </div>
                <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
                  {isManager && (
                    <Select value={r.assigned_worker_id || ""} onChange={(e) => assignWorker(r, e.target.value)} style={{ width: 160 }}>
                      <option value="">Unassigned</option>
                      {teammates.map((w) => <option key={w.id} value={w.id}>{w.full_name}</option>)}
                    </Select>
                  )}
                  <Badge status={r.status} />
                  {next && <Button variant="primary" disabled={busyId === r.id} style={{ padding: "8px 14px", fontSize: 13 }} onClick={() => advance(r)}>Mark {STATUS_LABEL[next]}</Button>}
                </div>
              </div>
            );
          })}
        </div>
      )}
      {showChangePwd && <ChangePasswordModal onClose={() => setShowChangePwd(false)} />}
    </Section>
  );
}
