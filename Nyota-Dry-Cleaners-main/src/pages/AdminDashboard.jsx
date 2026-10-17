import React, { useEffect, useState, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
  LayoutDashboard, ClipboardList, Users, Image as ImageIcon, Star, Truck,
  Settings, FileClock, LogOut, MessageCircle, ShieldCheck, Loader2, Menu, X, Bell,
  Sparkles, Inbox, FileText, Copy,
} from "lucide-react";
import { supabase } from "../lib/supabaseClient";
import { useStaffSession, signOut } from "../lib/auth";
import { C, STATUS_FLOW, WA_BASE, fmtDate, fmtDateTime, normalizeKenyanPhone } from "../lib/constants";
import { Button, Section, H2, Badge, Select, TextInput, TextArea, Spinner, EmptyState, Field } from "../components/UI";
import { Logo } from "../components/Layout";
import { ChangePasswordModal } from "../components/ChangePasswordModal";

const NAV = [
  ["dashboard", "Dashboard", LayoutDashboard],
  ["requests", "Requests", ClipboardList],
  ["pickups", "Pickup & Delivery", Truck],
  ["workers", "Workers", Users],
  ["services", "Services", Sparkles],
  ["gallery", "Gallery", ImageIcon],
  ["reviews", "Reviews", Star],
  ["feedback", "Feedback", Inbox],
  ["settings", "Business Profile", Settings],
  ["legal", "Legal Pages", FileText],
  ["activity", "Activity Log", FileClock],
];

// Same body-scroll-lock technique as the public site's drawer (see
// Layout.jsx) — locks the page behind the admin drawer without losing
// scroll position, restoring it exactly on close.
function useBodyScrollLock(locked) {
  useEffect(() => {
    if (!locked) return;
    const scrollY = window.scrollY;
    const { body } = document;
    const prev = { position: body.style.position, top: body.style.top, left: body.style.left, right: body.style.right, width: body.style.width };
    body.style.position = "fixed";
    body.style.top = `-${scrollY}px`;
    body.style.left = "0"; body.style.right = "0"; body.style.width = "100%";
    return () => {
      body.style.position = prev.position; body.style.top = prev.top;
      body.style.left = prev.left; body.style.right = prev.right; body.style.width = prev.width;
      window.scrollTo(0, scrollY);
    };
  }, [locked]);
}

export default function AdminDashboard() {
  const nav = useNavigate();
  const { loading, session, profile } = useStaffSession();
  const [tab, setTab] = useState("dashboard");
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [newFeedbackCount, setNewFeedbackCount] = useState(0);
  const [showChangePwd, setShowChangePwd] = useState(false);
  const drawerRef = useRef(null);

  useBodyScrollLock(drawerOpen);

  useEffect(() => {
    if (!loading && (!session || !profile || profile.role !== "admin")) {
      nav("/admin");
    }
  }, [loading, session, profile, nav]);

  // Real unread count from the notifications table, kept live via realtime
  // subscription rather than a manual refresh.
  useEffect(() => {
    if (!profile) return;
    async function loadCount() {
      const { count } = await supabase.from("notifications").select("id", { count: "exact", head: true }).eq("is_read", false);
      setUnreadCount(count || 0);
    }
    loadCount();
    const channel = supabase.channel("admin-notif-badge").on("postgres_changes", { event: "*", schema: "public", table: "notifications" }, loadCount).subscribe();
    return () => supabase.removeChannel(channel);
  }, [profile]);

  useEffect(() => {
    if (!profile) return;
    async function loadFeedbackCount() {
      const { count } = await supabase.from("feedback_messages").select("id", { count: "exact", head: true }).eq("status", "new");
      setNewFeedbackCount(count || 0);
    }
    loadFeedbackCount();
    const channel = supabase.channel("admin-feedback-badge").on("postgres_changes", { event: "*", schema: "public", table: "feedback_messages" }, loadFeedbackCount).subscribe();
    return () => supabase.removeChannel(channel);
  }, [profile]);

  useEffect(() => {
    if (!drawerOpen) return;
    function onKey(e) { if (e.key === "Escape") setDrawerOpen(false); }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [drawerOpen]);

  if (loading || !profile) return <Spinner label="Checking your access…" />;

  const navItems = (closeAfter) => NAV.map(([key, label, Icon]) => (
    <button key={key} onClick={() => { setTab(key); if (closeAfter) setDrawerOpen(false); }} style={{
      display: "flex", alignItems: "center", gap: 10, width: "100%", padding: "10px 12px", borderRadius: 8,
      background: tab === key ? C.paleBlue : "none", border: "none", cursor: "pointer", textAlign: "left",
      color: tab === key ? C.royal : C.navy, fontWeight: 600, fontSize: 13.5, marginBottom: 2, position: "relative",
    }}>
      <Icon size={16} /> <span>{label}</span>
      {key === "pickups" && unreadCount > 0 && (
        <span style={{ marginLeft: "auto", background: "#B23131", color: "#fff", fontSize: 10.5, fontWeight: 800, borderRadius: 999, padding: "1px 7px" }}>{unreadCount}</span>
      )}
      {key === "feedback" && newFeedbackCount > 0 && (
        <span style={{ marginLeft: "auto", background: "#B23131", color: "#fff", fontSize: 10.5, fontWeight: 800, borderRadius: 999, padding: "1px 7px" }}>{newFeedbackCount}</span>
      )}
    </button>
  ));

  return (
    <div style={{ height: "100vh", display: "flex", flexDirection: "column" }}>
      {/* Mobile-only top bar with hamburger — the always-visible sidebar
          below is desktop-only (hidden under 900px via the style block). */}
      <div className="admin-mobile-bar" style={{ display: "none", alignItems: "center", justifyContent: "space-between", padding: "10px 16px", borderBottom: "1px solid #E7ECF6", background: "#fff", flexShrink: 0, zIndex: 40 }}>
        <div style={{ fontWeight: 800, color: C.navy, fontSize: 15 }}>{profile.role === "admin" ? "Admin" : "Manager"}</div>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          {unreadCount > 0 && (
            <div style={{ position: "relative" }}>
              <Bell size={18} color={C.royal} />
              <span style={{ position: "absolute", top: -6, right: -6, background: "#B23131", color: "#fff", fontSize: 9, fontWeight: 800, borderRadius: 999, padding: "1px 5px" }}>{unreadCount}</span>
            </div>
          )}
          <button onClick={() => setDrawerOpen(true)} aria-label="Open admin menu" style={{ background: `linear-gradient(135deg, ${C.bright}, ${C.navy})`, border: "none", width: 36, height: 36, borderRadius: 9, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
            <Menu size={18} color="#fff" />
          </button>
        </div>
      </div>

      {/* Sidebar and content each scroll independently — choosing a tab
          and scrolling its content never moves the nav list, and vice
          versa, the same way most production admin dashboards behave. */}
      <div style={{ display: "flex", flex: 1, minHeight: 0 }}>
        <aside className="admin-sidebar" style={{ width: 220, background: "#fff", borderRight: "1px solid #E7ECF6", padding: "20px 12px", flexShrink: 0, overflowY: "auto" }}>
          <div style={{ padding: "0 10px 16px", fontSize: 12, color: "#8792A8", fontWeight: 700, textTransform: "uppercase" }}>
            {profile.role === "admin" ? "Admin" : "Manager"}
          </div>
          {navItems(false)}
          <div style={{ borderTop: "1px solid #EEF2F7", marginTop: 14, paddingTop: 14 }}>
            <button onClick={() => setShowChangePwd(true)} style={{ display: "flex", alignItems: "center", gap: 10, width: "100%", padding: "10px 12px", borderRadius: 8, background: "none", border: "none", cursor: "pointer", color: C.navy, fontWeight: 600, fontSize: 13.5 }}>
              <Settings size={16} /> Change Password
            </button>
            <button onClick={async () => { await signOut(); nav("/admin"); }} style={{ display: "flex", alignItems: "center", gap: 10, width: "100%", padding: "10px 12px", borderRadius: 8, background: "none", border: "none", cursor: "pointer", color: "#B23131", fontWeight: 600, fontSize: 13.5 }}>
              <LogOut size={16} /> Logout
            </button>
          </div>
        </aside>
        <div style={{ flex: 1, minWidth: 0, overflowY: "auto" }}>
          {tab === "dashboard" && <DashboardTab profile={profile} />}
          {tab === "requests" && <RequestsTab profile={profile} />}
          {tab === "pickups" && <PickupsTab profile={profile} />}
          {tab === "workers" && <WorkersTab profile={profile} />}
          {tab === "services" && <ServicesTab />}
          {tab === "gallery" && <GalleryTab profile={profile} />}
          {tab === "reviews" && <ReviewsTab profile={profile} />}
          {tab === "feedback" && <FeedbackTab />}
          {tab === "settings" && <SettingsTab profile={profile} />}
          {tab === "legal" && <LegalPagesTab />}
          {tab === "activity" && <ActivityTab profile={profile} />}
        </div>
      </div>

      {/* Off-canvas drawer for mobile — fully opaque (solid white), scroll-locked,
          closes on nav select / outside tap / Escape / close button. */}
      {drawerOpen && (
        <div role="presentation" onMouseDown={(e) => { if (drawerRef.current && !drawerRef.current.contains(e.target)) setDrawerOpen(false); }} style={{ position: "fixed", inset: 0, background: "rgba(16,42,114,0.35)", zIndex: 100 }}>
          <div ref={drawerRef} role="dialog" aria-modal="true" aria-label="Admin menu" style={{ position: "absolute", top: 0, left: 0, height: "100%", width: "min(84vw,300px)", background: "#fff", boxShadow: "8px 0 30px rgba(16,42,114,0.2)", display: "flex", flexDirection: "column", overflow: "hidden" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 18px", borderBottom: "1px solid #EDF1F8", background: `linear-gradient(135deg, ${C.navy}, ${C.royal})` }}>
              <div style={{ background: "#fff", borderRadius: 8, padding: "4px 8px" }}><Logo height={24} /></div>
              <button onClick={() => setDrawerOpen(false)} aria-label="Close menu" style={{ background: "rgba(255,255,255,0.15)", border: "none", width: 30, height: 30, borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
                <X size={16} color="#fff" />
              </button>
            </div>
            <nav style={{ padding: 12, overflowY: "auto", flex: 1 }}>{navItems(true)}</nav>
            <div style={{ borderTop: "1px solid #EEF2F7", padding: 12 }}>
              <button onClick={async () => { await signOut(); nav("/admin"); }} style={{ display: "flex", alignItems: "center", gap: 10, width: "100%", padding: "10px 12px", borderRadius: 8, background: "none", border: "none", cursor: "pointer", color: "#B23131", fontWeight: 600, fontSize: 13.5 }}>
                <LogOut size={16} /> Logout
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @media (max-width: 899px) {
          .admin-sidebar { display: none !important; }
          .admin-mobile-bar { display: flex !important; }
        }
      `}</style>
      {showChangePwd && <ChangePasswordModal onClose={() => setShowChangePwd(false)} />}
    </div>
  );
}

/* ---------------- DASHBOARD ---------------- */
function DashboardTab() {
  const [counts, setCounts] = useState(null);
  const [recent, setRecent] = useState([]);
  const [urgent, setUrgent] = useState([]);

  const load = useCallback(async () => {
    const { data } = await supabase.from("service_requests").select("status").limit(2000);
    const c = {};
    (data || []).forEach((r) => (c[r.status] = (c[r.status] || 0) + 1));
    setCounts(c);
    const { data: recentRows } = await supabase
      .from("service_requests")
      .select("id,public_request_number,customer_name,status,created_at")
      .order("created_at", { ascending: false })
      .limit(8);
    setRecent(recentRows || []);
    const { data: urgentRows } = await supabase
      .from("service_requests")
      .select("id,public_request_number,customer_name,pickup_area,pickup_location,created_at")
      .eq("pickup_now", true)
      .not("status", "in", "(completed,cancelled)")
      .order("created_at", { ascending: true });
    setUrgent(urgentRows || []);
  }, []);

  useEffect(() => {
    load();
    const channel = supabase
      .channel("admin-requests-feed")
      .on("postgres_changes", { event: "*", schema: "public", table: "service_requests" }, load)
      .subscribe();
    return () => supabase.removeChannel(channel);
  }, [load]);

  if (!counts) return <Spinner />;

  return (
    <Section>
      <H2>Business Overview</H2>
      {urgent.length > 0 && (
        <div style={{ background: "#FCE8E8", border: "1.5px solid #B23131", borderRadius: 12, padding: 16, marginBottom: 22 }}>
          <div style={{ fontWeight: 800, color: "#B23131", fontSize: 14, marginBottom: 10 }}>🔴 {urgent.length} Pickup{urgent.length > 1 ? "s" : ""} Requested Now</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {urgent.map((r) => (
              <div key={r.id} style={{ display: "flex", justifyContent: "space-between", fontSize: 13, color: "#7A1F1F" }}>
                <span><b>{r.public_request_number}</b> · {r.customer_name} — {r.pickup_area || "—"}</span>
                <span>{fmtDateTime(r.created_at)}</span>
              </div>
            ))}
          </div>
        </div>
      )}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(120px,1fr))", gap: 10, marginBottom: 26 }}>
        {[...STATUS_FLOW, { key: "cancelled", label: "Cancelled" }].map((s) => (
          <div key={s.key} style={{ background: "#fff", border: "1px solid #E7ECF6", borderRadius: 12, padding: 14, textAlign: "center" }}>
            <div style={{ fontSize: 22, fontWeight: 800, color: C.navy }}>{counts[s.key] || 0}</div>
            <div style={{ fontSize: 11, fontWeight: 600, color: "#8792A8" }}>{s.label}</div>
          </div>
        ))}
      </div>
      <div style={{ fontWeight: 700, color: C.navy, marginBottom: 10 }}>Recent Requests</div>
      {recent.length === 0 ? <EmptyState title="No requests yet" /> : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {recent.map((r) => (
            <div key={r.id} style={{ background: "#fff", border: "1px solid #E7ECF6", borderRadius: 10, padding: 12, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: C.navy }}>{r.public_request_number} · {r.customer_name}</div>
              <Badge status={r.status} />
            </div>
          ))}
        </div>
      )}
    </Section>
  );
}

/* ---------------- REQUESTS ---------------- */
function RequestsTab({ profile }) {
  const [requests, setRequests] = useState([]);
  const [items, setItems] = useState({});
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const [q, setQ] = useState("");
  const [openId, setOpenId] = useState(null);
  const [workers, setWorkers] = useState([]);

  const load = useCallback(async () => {
    const { data } = await supabase.from("service_requests").select("*, services(name)").order("created_at", { ascending: false });
    setRequests(data || []);
    setLoading(false);
    const { data: w } = await supabase.from("profiles").select("id,full_name").eq("role", "worker").eq("is_active", true);
    setWorkers(w || []);
  }, []);

  useEffect(() => {
    load();
    const channel = supabase.channel("admin-requests-list").on("postgres_changes", { event: "*", schema: "public", table: "service_requests" }, load).subscribe();
    return () => supabase.removeChannel(channel);
  }, [load]);

  async function loadItems(requestId) {
    if (items[requestId]) return;
    const { data } = await supabase.from("request_items").select("*").eq("request_id", requestId);
    setItems((prev) => ({ ...prev, [requestId]: data || [] }));
  }

  async function updateStatus(id, status) {
    setRequests((rs) => rs.map((r) => (r.id === id ? { ...r, status } : r)));
    await supabase.from("service_requests").update({ status }).eq("id", id);
    await supabase.from("activity_logs").insert({ actor_id: profile.id, actor_label: profile.full_name, action: "request_status_changed", target_table: "service_requests", target_id: id, metadata: { status } });
  }
  async function assignWorker(id, workerId) {
    const worker = workers.find((w) => w.id === workerId);
    setRequests((rs) => rs.map((r) => (r.id === id ? { ...r, assigned_worker_id: workerId || null, workers: worker ? { full_name: worker.full_name } : null } : r)));
    await supabase.from("service_requests").update({ assigned_worker_id: workerId || null }).eq("id", id);
    await supabase.from("activity_logs").insert({ actor_id: profile.id, actor_label: profile.full_name, action: "worker_assigned", target_table: "service_requests", target_id: id, metadata: { workerId } });
    if (workerId) {
      await supabase.from("notifications").insert({ recipient_id: workerId, type: "pickup_assigned", title: "New request assigned to you", related_request_id: id });
    }
  }
  // Payment can happen before or after cleaning — this only ever gates the
  // Receipt (see Track.jsx); the Ticket stays available regardless.
  async function setPaid(id, isPaid) {
    await supabase.from("service_requests").update({ payment_status: isPaid ? "paid" : "unpaid" }).eq("id", id);
    await supabase.from("activity_logs").insert({ actor_id: profile.id, actor_label: profile.full_name, action: isPaid ? "payment_marked_paid" : "payment_marked_unpaid", target_table: "service_requests", target_id: id });
    setRequests((rs) => rs.map((r) => (r.id === id ? { ...r, payment_status: isPaid ? "paid" : "unpaid" } : r)));
  }

  const filtered = requests
    .filter((r) => {
      if (filter !== "all" && r.status !== filter) return false;
      if (q && !`${r.customer_name} ${r.phone_display} ${r.public_request_number}`.toLowerCase().includes(q.toLowerCase())) return false;
      return true;
    })
    // Active "Pick Now" requests always float to the top so they can't get
    // lost among normally-scheduled pickups.
    .sort((a, b) => {
      const aUrgent = a.pickup_now && a.status !== "completed" && a.status !== "cancelled";
      const bUrgent = b.pickup_now && b.status !== "completed" && b.status !== "cancelled";
      if (aUrgent !== bUrgent) return aUrgent ? -1 : 1;
      return 0;
    });

  if (loading) return <Spinner />;

  return (
    <Section>
      <H2>Requests</H2>
      <div style={{ display: "flex", gap: 10, marginBottom: 16, flexWrap: "wrap" }}>
        <TextInput placeholder="Search name, phone, request number…" value={q} onChange={(e) => setQ(e.target.value)} style={{ maxWidth: 300 }} />
        <Select value={filter} onChange={(e) => setFilter(e.target.value)} style={{ maxWidth: 200 }}>
          <option value="all">All Statuses</option>
          {[...STATUS_FLOW, { key: "cancelled", label: "Cancelled" }].map((s) => <option key={s.key} value={s.key}>{s.label}</option>)}
        </Select>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {filtered.length === 0 && <EmptyState title="No requests match this view" />}
        {filtered.map((r) => {
          const open = openId === r.id;
          return (
            <div key={r.id} style={{ background: "#fff", border: "1px solid #E7ECF6", borderRadius: 12, overflow: "hidden" }}>
              <div onClick={() => { setOpenId(open ? null : r.id); loadItems(r.id); }} style={{ padding: 16, display: "flex", justifyContent: "space-between", alignItems: "center", cursor: "pointer", flexWrap: "wrap", gap: 10 }}>
                <div>
                  <div style={{ fontWeight: 700, color: C.navy, fontSize: 14, display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                    {r.pickup_now && r.status !== "completed" && r.status !== "cancelled" && (
                      <span style={{ background: "#FCE8E8", color: "#B23131", fontSize: 11, fontWeight: 800, padding: "3px 8px", borderRadius: 999 }}>🔴 PICKUP NOW</span>
                    )}
                    {r.public_request_number} · {r.customer_name}
                    <button onClick={(e) => { e.stopPropagation(); navigator.clipboard?.writeText(r.public_request_number); }} title="Copy request number" style={{ background: "none", border: "none", cursor: "pointer", color: "#8792A8", display: "flex", padding: 2 }}>
                      <Copy size={13} />
                    </button>
                    <button onClick={(e) => { e.stopPropagation(); window.open(`https://wa.me/${normalizeKenyanPhone(r.phone_display)}?text=${encodeURIComponent(`Hello ${r.customer_name}, your Nyota Dry Cleaners request ${r.public_request_number} — track it here: ${window.location.origin}/track?request=${r.public_request_number}`)}`, "_blank"); }} title="Send tracking link to customer via WhatsApp" style={{ background: "none", border: "none", cursor: "pointer", color: "#25D366", display: "flex", padding: 2 }}>
                      <MessageCircle size={14} />
                    </button>
                  </div>
                  <div style={{ fontSize: 12.5, color: "#8792A8" }}>{r.services?.name || `Other — ${r.custom_service}`} · {r.phone_display} · {fmtDate(r.created_at)}</div>
                </div>
                <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  {r.payment_status === "paid" && <span style={{ fontSize: 11, fontWeight: 800, color: "#0C7A3D", background: "#E4F9EC", padding: "3px 8px", borderRadius: 999 }}>Paid</span>}
                  <Badge status={r.status} />
                </div>
              </div>
              {open && (
                <div style={{ borderTop: "1px solid #F0F3FA", padding: 16, background: C.paleBlue }}>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))", gap: 10, fontSize: 13, marginBottom: 14 }}>
                    <div><b>Quantity:</b> {r.quantity_approx || "—"}</div>
                    <div><b>Weight:</b> {r.weight_approx || "—"}</div>
                    <div><b>Items:</b> {(items[r.id] || []).map((i) => `${i.item_name}${i.quantity ? ` (${i.quantity})` : ""}`).join(", ") || "—"}</div>
                    <div><b>Special care:</b> {r.special_care || "—"}</div>
                    <div><b>Stains:</b> {r.stain_notes || "—"}</div>
                    <div><b>Notes:</b> {r.general_notes || "—"}</div>
                    <div><b>Fulfillment:</b> {r.fulfillment_type === "pickup" ? `Pickup — ${r.pickup_area}` : "Drop-off"}</div>
                    {r.fulfillment_type === "pickup" && <>
                      <div><b>Location:</b> {r.pickup_location}</div>
                      <div><b>Directions:</b> {r.pickup_directions || "—"}</div>
                      {(r.pickup_county || r.pickup_constituency || r.pickup_ward) && (
                        <div><b>Admin area:</b> {[r.pickup_county, r.pickup_constituency, r.pickup_ward].filter(Boolean).join(" / ")}</div>
                      )}
                      <div>
                        <b>{r.pickup_now ? "Requested:" : "Preferred:"}</b>{" "}
                        {r.pickup_now ? "As soon as possible (Pick Now)" : `${r.pickup_date || ""} ${r.pickup_time || ""}`}
                      </div>
                      {r.pickup_lat != null && r.pickup_lng != null && (
                        <div>
                          <b>Coordinates:</b> {r.pickup_lat.toFixed(5)}, {r.pickup_lng.toFixed(5)}
                          {r.pickup_accuracy_m != null && ` (±${Math.round(r.pickup_accuracy_m)}m)`}
                          {" — "}
                          <a href={`https://www.google.com/maps?q=${r.pickup_lat},${r.pickup_lng}`} target="_blank" rel="noreferrer" style={{ color: C.bright, fontWeight: 700 }}>Open in Maps</a>
                        </div>
                      )}
                    </>}
                    <div><b>Email:</b> {r.email || "—"}</div>
                    {(r.material || r.custom_material) && <div><b>Material:</b> {r.material === "Other" ? r.custom_material : r.material}</div>}
                    {r.collector_name && (
                      <div><b>Collector:</b> {r.collector_name}{r.collector_relationship ? ` (${r.collector_relationship})` : ""}{r.collector_phone ? ` — ${r.collector_phone}` : ""}{r.collector_note ? ` · ${r.collector_note}` : ""}</div>
                    )}
                    {r.return_method && (
                      <div>
                        <b>Return preference:</b>{" "}
                        {r.return_method === "customer_pickup" ? "Customer will pick up" : r.return_method === "delivery" ? "Deliver to customer" : "Someone else will collect"}
                        {r.return_method === "send_someone" && r.return_collector_name ? ` — ${r.return_collector_name}${r.return_collector_phone ? ` (${r.return_collector_phone})` : ""}` : ""}
                        {r.return_set_at ? ` · Chosen ${fmtDateTime(r.return_set_at)}` : ""}
                      </div>
                    )}
                  </div>
                  <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
                    <Select value={r.status} onChange={(e) => updateStatus(r.id, e.target.value)} style={{ width: 190 }}>
                      {[...STATUS_FLOW, { key: "cancelled", label: "Cancelled" }].map((s) => <option key={s.key} value={s.key}>{s.label}</option>)}
                    </Select>
                    <Select value={r.assigned_worker_id || ""} onChange={(e) => assignWorker(r.id, e.target.value)} style={{ width: 180 }}>
                      <option value="">Unassigned</option>
                      {workers.map((w) => <option key={w.id} value={w.id}>{w.full_name}</option>)}
                    </Select>
                    <Button variant={r.payment_status === "paid" ? "secondary" : "primary"} onClick={() => setPaid(r.id, r.payment_status !== "paid")}>
                      {r.payment_status === "paid" ? "✓ Paid — Undo" : "Mark Paid"}
                    </Button>
                    <Button variant="whatsapp" onClick={() => window.open(`https://wa.me/${normalizeKenyanPhone(r.phone_display)}`, "_blank")}><MessageCircle size={14} /> WhatsApp</Button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </Section>
  );
}

/* ---------------- PICKUPS ---------------- */
function PickupsTab({ profile }) {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [subTab, setSubTab] = useState("pickup"); // "pickup" | "delivery" — proper submenus under the shared Pickup & Delivery section
  const [pickNowOnly, setPickNowOnly] = useState(false);

  const load = useCallback(async () => {
    // Pulls both directions in one query: pickup (collecting FROM the
    // customer) and delivery (returning cleaned laundry TO the customer,
    // set via the customer's own return-preference choice on the tracking
    // page — see set_return_preference() in migration 004).
    const { data } = await supabase
      .from("service_requests")
      .select("*")
      .or("fulfillment_type.eq.pickup,return_method.eq.delivery")
      .order("created_at", { ascending: false });
    setRows(data || []);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
    const channel = supabase.channel("admin-pickup-delivery").on("postgres_changes", { event: "*", schema: "public", table: "service_requests" }, load).subscribe();
    return () => supabase.removeChannel(channel);
  }, [load]);

  async function markCollected(r) {
    const now = new Date().toISOString();
    setRows((rs) => rs.map((x) => (x.id === r.id ? { ...x, status: "picked_up", collected_at: now, collected_by: profile.id } : x)));
    await supabase.from("service_requests").update({ status: "picked_up", collected_at: now, collected_by: profile.id }).eq("id", r.id);
    await supabase.from("activity_logs").insert({ actor_id: profile.id, actor_label: profile.full_name, action: "marked_collected", target_table: "service_requests", target_id: r.id });
    // Clears the badge for this request's own notifications now that it's
    // been actioned — the count only reflects genuinely unaddressed items.
    await supabase.from("notifications").update({ is_read: true }).eq("related_request_id", r.id);
  }

  async function markDelivered(r) {
    const now = new Date().toISOString();
    setRows((rs) => rs.map((x) => (x.id === r.id ? { ...x, status: "completed", delivered_at: now, delivered_by: profile.id } : x)));
    await supabase.from("service_requests").update({ status: "completed", delivered_at: now, delivered_by: profile.id }).eq("id", r.id);
    await supabase.from("activity_logs").insert({ actor_id: profile.id, actor_label: profile.full_name, action: "marked_delivered", target_table: "service_requests", target_id: r.id });
    await supabase.from("notifications").update({ is_read: true }).eq("related_request_id", r.id);
  }

  if (loading) return <Spinner />;

  const pickups = rows.filter((r) => r.fulfillment_type === "pickup" && r.status !== "completed" && r.status !== "cancelled" && (!pickNowOnly || r.pickup_now))
    .sort((a, b) => {
      const aUrgent = a.pickup_now, bUrgent = b.pickup_now;
      return aUrgent === bUrgent ? 0 : aUrgent ? -1 : 1;
    });
  // Only requests the CUSTOMER explicitly asked to have delivered back —
  // chosen via the "Deliver It To Me" option once their laundry is ready.
  // Anything else (customer picking up themselves, or not yet decided)
  // never lands in this admin-only queue.
  const deliveries = rows.filter((r) => r.return_method === "delivery" && r.status !== "completed" && r.status !== "cancelled");

  return (
    <Section>
      <H2>Pickup & Delivery</H2>
      <div style={{ display: "flex", gap: 8, marginBottom: 20, borderBottom: "1px solid #E7ECF6" }}>
        <button onClick={() => setSubTab("pickup")} style={{
          padding: "10px 6px", background: "none", border: "none", cursor: "pointer",
          borderBottom: subTab === "pickup" ? `2px solid ${C.royal}` : "2px solid transparent",
          color: subTab === "pickup" ? C.royal : "#8792A8", fontWeight: 700, fontSize: 14, display: "flex", alignItems: "center", gap: 8,
        }}>
          Pickup {pickups.length > 0 && <span style={{ background: subTab === "pickup" ? C.royal : "#E7ECF6", color: subTab === "pickup" ? "#fff" : "#8792A8", fontSize: 11, fontWeight: 800, borderRadius: 999, padding: "1px 8px" }}>{pickups.length}</span>}
        </button>
        <button onClick={() => setSubTab("delivery")} style={{
          padding: "10px 6px", background: "none", border: "none", cursor: "pointer",
          borderBottom: subTab === "delivery" ? `2px solid ${C.royal}` : "2px solid transparent",
          color: subTab === "delivery" ? C.royal : "#8792A8", fontWeight: 700, fontSize: 14, display: "flex", alignItems: "center", gap: 8,
        }}>
          Delivery {deliveries.length > 0 && <span style={{ background: subTab === "delivery" ? C.royal : "#E7ECF6", color: subTab === "delivery" ? "#fff" : "#8792A8", fontSize: 11, fontWeight: 800, borderRadius: 999, padding: "1px 8px" }}>{deliveries.length}</span>}
        </button>
      </div>

      {subTab === "pickup" && (
      <>
      <div style={{ marginBottom: 14 }}>
        <button onClick={() => setPickNowOnly((v) => !v)} style={{ padding: "7px 14px", borderRadius: 999, border: `1.5px solid ${pickNowOnly ? "#B23131" : "#DDE4F0"}`, background: pickNowOnly ? "#FCE8E8" : "#fff", color: pickNowOnly ? "#B23131" : "#8792A8", fontWeight: 700, fontSize: 12.5, cursor: "pointer" }}>
          🔴 Pick Now only
        </button>
      </div>
      {pickups.length === 0 ? <EmptyState title="No pickup requests right now" /> : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 30 }}>
          {pickups.map((r) => (
            <div key={r.id} style={{ background: "#fff", border: r.pickup_now ? "1.5px solid #B23131" : "1px solid #E7ECF6", borderRadius: 12, padding: 16 }}>
              <div style={{ fontWeight: 700, color: C.navy, fontSize: 14, marginBottom: 4, display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
                {r.pickup_now && <span style={{ background: "#FCE8E8", color: "#B23131", fontSize: 11, fontWeight: 800, padding: "3px 8px", borderRadius: 999 }}>🔴 PICKUP NOW</span>}
                {r.public_request_number} · {r.customer_name}
              </div>
              <div style={{ fontSize: 12.5, color: "#8792A8" }}>
                {r.pickup_area} — {r.pickup_location} · {r.pickup_now ? "As soon as possible" : `${r.pickup_date || ""} ${r.pickup_time || ""}`}
              </div>
              {r.pickup_directions && <div style={{ fontSize: 12.5, color: "#4A5578", marginTop: 4 }}>Directions: {r.pickup_directions}</div>}
              {r.pickup_lat != null && r.pickup_lng != null && (
                <div style={{ fontSize: 12.5, marginTop: 4 }}>
                  <a href={`https://www.google.com/maps?q=${r.pickup_lat},${r.pickup_lng}`} target="_blank" rel="noreferrer" style={{ color: C.bright, fontWeight: 700 }}>Open in Maps</a>
                </div>
              )}
              <div style={{ marginTop: 10, display: "flex", gap: 10, alignItems: "center" }}>
                <Badge status={r.status} />
                {r.status !== "picked_up" && (
                  <Button variant="primary" style={{ padding: "7px 14px", fontSize: 12.5 }} onClick={() => markCollected(r)}>Mark Collected</Button>
                )}
                {r.collected_at && <span style={{ fontSize: 11.5, color: "#0C7A3D" }}>✓ Collected {fmtDateTime(r.collected_at)}</span>}
              </div>
            </div>
          ))}
        </div>
      )}
      </>
      )}

      {subTab === "delivery" && (
      <>
      {deliveries.length === 0 ? <EmptyState title="No delivery requests right now" desc="Requests appear here once a customer chooses “Deliver It To Me” on their tracking page." /> : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {deliveries.map((r) => (
            <div key={r.id} style={{ background: "#fff", border: "1px solid #E7ECF6", borderRadius: 12, padding: 16 }}>
              <div style={{ fontWeight: 700, color: C.navy, fontSize: 14, marginBottom: 4 }}>{r.public_request_number} · {r.customer_name}</div>
              <div style={{ fontSize: 12.5, color: "#8792A8" }}>{r.pickup_area || r.phone_display}{r.return_set_at ? ` · Requested ${fmtDateTime(r.return_set_at)}` : ""}</div>
              <div style={{ marginTop: 10, display: "flex", gap: 10, alignItems: "center" }}>
                <Badge status={r.status} />
                {r.status === "ready" && (
                  <Button variant="primary" style={{ padding: "7px 14px", fontSize: 12.5 }} onClick={() => markDelivered(r)}>Mark Delivered</Button>
                )}
                {r.status !== "ready" && r.status !== "completed" && <span style={{ fontSize: 11.5, color: "#8792A8" }}>Waiting until ready</span>}
              </div>
            </div>
          ))}
        </div>
      )}
      </>
      )}
    </Section>
  );
}

/* ---------------- WORKERS ---------------- */

// Shared caller for the create-worker Edge Function's two actions (create /
// reset_password) — one place to keep the auth-header plumbing consistent.
// Shared caller for the create-worker Edge Function's two actions (create /
// reset_password). Deliberately wraps the whole request — including the
// fetch() call itself — in one try/catch: a raw network/CORS failure
// throws a bare browser TypeError whose message is literally "Failed to
// fetch", and previously that text leaked straight to the user unfiltered
// because only the "request succeeded but returned an error" branch below
// was being caught. This turns every failure mode into one clear message.
async function callWorkerFunction(payload) {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error("Your session has expired. Please log out and log back in.");

  const baseUrl = (import.meta.env.VITE_SUPABASE_URL || "").replace(/\/+$/, ""); // trim any trailing slash before appending the path
  let res;
  try {
    res = await fetch(`${baseUrl}/functions/v1/create-worker`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.access_token}` },
      body: JSON.stringify(payload),
    });
  } catch {
    // The fetch() call itself failed — a network problem, a CORS
    // rejection, or the function not existing/being deployed at all.
    throw new Error("Couldn't reach the worker-management service. Please check your connection, or confirm the create-worker Edge Function is deployed with CORS enabled.");
  }

  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(body.error || `The server rejected the request (status ${res.status}). Please try again.`);
  }
  return body;
}

function AddWorkerModal({ onClose, onCreated }) {
  const [form, setForm] = useState({ full_name: "", email: "", phone: "", role: "worker", temp_password: "" });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  function set(k, v) { setForm((f) => ({ ...f, [k]: v })); }

  async function submit(e) {
    e.preventDefault();
    setErr("");
    if (!form.full_name.trim() || !form.email.trim() || form.temp_password.length < 8) {
      setErr("Full name, email, and a temporary password of at least 8 characters are required.");
      return;
    }
    setBusy(true);
    try {
      await callWorkerFunction({
        action: "create",
        full_name: form.full_name.trim(),
        email: form.email.trim(),
        phone: form.phone.trim() || null,
        role: form.role,
        temp_password: form.temp_password,
      });
      onCreated();
      onClose();
    } catch (e2) {
      setErr(e2.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div role="presentation" onMouseDown={(e) => e.target === e.currentTarget && onClose()} style={{ position: "fixed", inset: 0, background: "rgba(16,42,114,0.4)", zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
      <form onSubmit={submit} role="dialog" aria-modal="true" style={{ background: "#fff", borderRadius: 16, width: "100%", maxWidth: 420, padding: 22, maxHeight: "88vh", overflowY: "auto" }}>
        <H2>Add Worker</H2>
        {err && <div style={{ background: "#FCE8E8", color: "#B23131", padding: 10, borderRadius: 8, fontSize: 13, marginBottom: 12 }}>{err}</div>}
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <Field label="Full name" required><TextInput value={form.full_name} onChange={(e) => set("full_name", e.target.value)} /></Field>
          <Field label="Email" required hint="Used to log in"><TextInput type="email" value={form.email} onChange={(e) => set("email", e.target.value)} /></Field>
          <Field label="Phone" hint="Optional"><TextInput value={form.phone} onChange={(e) => set("phone", e.target.value)} /></Field>
          <Field label="Role" required>
            <Select value={form.role} onChange={(e) => set("role", e.target.value)}>
              <option value="worker">Worker</option>
              <option value="manager">Manager</option>
            </Select>
          </Field>
          <Field label="Temporary password" required hint="At least 8 characters — share it with the worker to log in. They can change it after logging in.">
            <TextInput value={form.temp_password} onChange={(e) => set("temp_password", e.target.value)} />
          </Field>
        </div>
        <div style={{ display: "flex", gap: 10, marginTop: 20 }}>
          <Button type="button" variant="secondary" full onClick={onClose} disabled={busy}>Cancel</Button>
          <Button type="submit" variant="primary" full disabled={busy}>{busy ? "Creating…" : "Create Worker"}</Button>
        </div>
      </form>
    </div>
  );
}

function ResetPasswordModal({ worker, onClose, onDone }) {
  const [pwd, setPwd] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  async function submit(e) {
    e.preventDefault();
    setErr("");
    if (pwd.length < 8) { setErr("Password must be at least 8 characters."); return; }
    setBusy(true);
    try {
      await callWorkerFunction({ action: "reset_password", worker_id: worker.id, temp_password: pwd });
      onDone();
      onClose();
    } catch (e2) {
      setErr(e2.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div role="presentation" onMouseDown={(e) => e.target === e.currentTarget && onClose()} style={{ position: "fixed", inset: 0, background: "rgba(16,42,114,0.4)", zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
      <form onSubmit={submit} role="dialog" aria-modal="true" style={{ background: "#fff", borderRadius: 16, width: "100%", maxWidth: 380, padding: 22 }}>
        <H2>Reset Password</H2>
        <div style={{ fontSize: 13, color: "#6B7695", marginBottom: 14 }}>Set a new temporary password for {worker.full_name}. Share it with them directly — they should change it after logging in.</div>
        {err && <div style={{ background: "#FCE8E8", color: "#B23131", padding: 10, borderRadius: 8, fontSize: 13, marginBottom: 12 }}>{err}</div>}
        <Field label="New temporary password" required hint="At least 8 characters">
          <TextInput value={pwd} onChange={(e) => setPwd(e.target.value)} />
        </Field>
        <div style={{ display: "flex", gap: 10, marginTop: 20 }}>
          <Button type="button" variant="secondary" full onClick={onClose} disabled={busy}>Cancel</Button>
          <Button type="submit" variant="primary" full disabled={busy}>{busy ? "Resetting…" : "Reset Password"}</Button>
        </div>
      </form>
    </div>
  );
}

function ConfirmDialog({ title, body, confirmLabel, onCancel, onConfirm, busy }) {
  return (
    <div role="presentation" onMouseDown={(e) => e.target === e.currentTarget && onCancel()} style={{ position: "fixed", inset: 0, background: "rgba(16,42,114,0.4)", zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
      <div role="dialog" aria-modal="true" style={{ background: "#fff", borderRadius: 16, width: "100%", maxWidth: 360, padding: 22 }}>
        <div style={{ fontWeight: 800, fontSize: 16, color: C.navy, marginBottom: 8 }}>{title}</div>
        <div style={{ fontSize: 13.5, color: "#6B7695", marginBottom: 20 }}>{body}</div>
        <div style={{ display: "flex", gap: 10 }}>
          <Button variant="secondary" full onClick={onCancel} disabled={busy}>Cancel</Button>
          <Button variant="danger" full onClick={onConfirm} disabled={busy}>{busy ? "Working…" : confirmLabel}</Button>
        </div>
      </div>
    </div>
  );
}

function WorkersTab({ profile }) {
  const [workers, setWorkers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [confirmTarget, setConfirmTarget] = useState(null); // { worker, action: 'pause'|'reactivate' }
  const [resetTarget, setResetTarget] = useState(null); // worker
  const [busyId, setBusyId] = useState(null);

  const load = useCallback(async () => {
    const { data } = await supabase.from("profiles").select("*").in("role", ["worker", "manager"]).order("full_name");
    setWorkers(data || []);
    setLoading(false);
  }, []);
  useEffect(() => { load(); }, [load]);

  // Deactivating never deletes the row — history (past requests, activity
  // log entries referencing this worker) stays intact; only is_active flips,
  // which RLS/dashboards use to stop new assignments and logins.
  async function setActive(worker, isActive) {
    setBusyId(worker.id);
    const { error } = await supabase.from("profiles").update({ is_active: isActive }).eq("id", worker.id);
    setBusyId(null);
    setConfirmTarget(null);
    if (!error) load();
  }

  if (loading) return <Spinner />;
  return (
    <Section>
      <H2>Workers</H2>
      {profile.role === "admin" && <Button variant="primary" style={{ marginBottom: 16 }} onClick={() => setShowAdd(true)}>+ Add Worker</Button>}
      {workers.length === 0 ? (
        <EmptyState title="No workers yet" desc="Add your first worker to start assigning pickup and laundry tasks." />
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {workers.map((w) => (
            <div key={w.id} style={{ background: "#fff", border: "1px solid #E7ECF6", borderRadius: 10, padding: 14, display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10 }}>
              <div>
                <div style={{ fontWeight: 700, color: C.navy, fontSize: 14 }}>{w.full_name} <span style={{ fontWeight: 500, fontSize: 12, color: "#8792A8" }}>({w.role})</span></div>
                <div style={{ fontSize: 12, color: "#8792A8" }}>{w.phone || "No phone on file"} · Last login {fmtDateTime(w.last_login_at)}</div>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                <Badge status={w.is_active ? "confirmed" : "cancelled"} label={w.is_active ? "Active" : "Paused"} />
                {profile.role === "admin" && (
                  <>
                    <Button variant="secondary" style={{ padding: "7px 12px", fontSize: 12.5 }} onClick={() => setResetTarget(w)}>Reset Password</Button>
                    {w.is_active ? (
                      <Button variant="secondary" style={{ padding: "7px 12px", fontSize: 12.5 }} disabled={busyId === w.id} onClick={() => setConfirmTarget({ worker: w, action: "pause" })}>Pause</Button>
                    ) : (
                      <Button variant="primary" style={{ padding: "7px 12px", fontSize: 12.5 }} disabled={busyId === w.id} onClick={() => setConfirmTarget({ worker: w, action: "reactivate" })}>Reactivate</Button>
                    )}
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
      {showAdd && <AddWorkerModal onClose={() => setShowAdd(false)} onCreated={load} />}
      {resetTarget && <ResetPasswordModal worker={resetTarget} onClose={() => setResetTarget(null)} onDone={load} />}
      {confirmTarget && (
        <ConfirmDialog
          title={confirmTarget.action === "pause" ? "Pause Worker?" : "Reactivate Worker?"}
          body={confirmTarget.action === "pause"
            ? `${confirmTarget.worker.full_name} will no longer be able to log in or receive new assignments. Their account and history are kept.`
            : `${confirmTarget.worker.full_name} will regain access to log in and receive assignments.`}
          confirmLabel={confirmTarget.action === "pause" ? "Pause" : "Reactivate"}
          busy={busyId === confirmTarget.worker.id}
          onCancel={() => setConfirmTarget(null)}
          onConfirm={() => setActive(confirmTarget.worker, confirmTarget.action === "reactivate")}
        />
      )}
    </Section>
  );
}

/* ---------------- GALLERY ---------------- */
function GalleryTab({ profile }) {
  const [images, setImages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [category, setCategory] = useState("Laundry");
  const [caption, setCaption] = useState("");
  const [editingId, setEditingId] = useState(null);
  const [editCaption, setEditCaption] = useState("");

  const load = useCallback(async () => {
    const { data } = await supabase.from("gallery").select("*").order("sort_order");
    setImages(data || []);
    setLoading(false);
  }, []);
  useEffect(() => { load(); }, [load]);

  async function upload(e) {
    const file = e.target.files[0];
    if (!file) return;
    if (!file.type.startsWith("image/") || file.size > 8 * 1024 * 1024) {
      alert("Please upload an image under 8MB.");
      return;
    }
    setUploading(true);
    const path = `${category.replace(/\s+/g, "-").toLowerCase()}/${Date.now()}-${file.name}`;
    const { error } = await supabase.storage.from("gallery").upload(path, file);
    if (!error) {
      // Caption is optional — an image with no caption still displays
      // normally on the public page (see Gallery.jsx).
      await supabase.from("gallery").insert({ storage_path: path, category, caption: caption.trim() || null, uploaded_by: profile.id });
      setCaption("");
      load();
    } else {
      alert("Upload failed. Please try again.");
    }
    setUploading(false);
    e.target.value = ""; // lets the same file be re-selected if needed
  }

  async function togglePublish(img) {
    await supabase.from("gallery").update({ is_published: !img.is_published }).eq("id", img.id);
    load();
  }
  async function remove(img) {
    await supabase.storage.from("gallery").remove([img.storage_path]);
    await supabase.from("gallery").delete().eq("id", img.id);
    load();
  }
  async function saveCaption(img) {
    await supabase.from("gallery").update({ caption: editCaption.trim() || null }).eq("id", img.id);
    setEditingId(null);
    load();
  }
  async function replaceImage(img, file) {
    if (!file) return;
    if (!file.type.startsWith("image/") || file.size > 8 * 1024 * 1024) {
      alert("Please upload an image under 8MB.");
      return;
    }
    const newPath = `${img.category.replace(/\s+/g, "-").toLowerCase()}/${Date.now()}-${file.name}`;
    const { error } = await supabase.storage.from("gallery").upload(newPath, file);
    if (!error) {
      await supabase.storage.from("gallery").remove([img.storage_path]);
      await supabase.from("gallery").update({ storage_path: newPath }).eq("id", img.id);
      load();
    } else {
      alert("Replace failed. Please try again.");
    }
  }

  if (loading) return <Spinner />;
  return (
    <Section>
      <H2>Gallery</H2>
      <div style={{ display: "flex", gap: 10, alignItems: "flex-start", marginBottom: 20, flexWrap: "wrap" }}>
        <Select value={category} onChange={(e) => setCategory(e.target.value)} style={{ width: 200 }}>
          {["Laundry", "Dry Cleaning", "Washing", "Ironing", "Folding", "Pickup & Delivery", "Location", "Behind the Scenes"].map((c) => <option key={c}>{c}</option>)}
        </Select>
        <TextInput value={caption} onChange={(e) => setCaption(e.target.value)} placeholder="Optional caption for the next upload" style={{ width: 240 }} />
        <label style={{ background: C.royal, color: "#fff", padding: "10px 16px", borderRadius: 10, fontSize: 13.5, fontWeight: 700, cursor: "pointer" }}>
          {uploading ? <Loader2 size={14} className="spin" /> : "Upload Image"}
          <input type="file" accept="image/*" onChange={upload} style={{ display: "none" }} disabled={uploading} />
        </label>
      </div>
      {images.length === 0 ? <EmptyState icon={ImageIcon} title="No photos uploaded yet" /> : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))", gap: 12 }}>
          {images.map((img) => (
            <div key={img.id} style={{ borderRadius: 12, overflow: "hidden", border: "1px solid #E7ECF6" }}>
              <img src={supabase.storage.from("gallery").getPublicUrl(img.storage_path).data.publicUrl} alt={img.caption || img.category} style={{ width: "100%", aspectRatio: "1/1", objectFit: "cover" }} />
              <div style={{ padding: 8, fontSize: 11.5 }}>
                <div style={{ fontWeight: 700, color: C.navy, marginBottom: 4 }}>{img.category}</div>
                {editingId === img.id ? (
                  <div style={{ display: "flex", gap: 4, marginBottom: 6 }}>
                    <TextInput value={editCaption} onChange={(e) => setEditCaption(e.target.value)} placeholder="Caption" style={{ fontSize: 11.5, padding: "5px 8px" }} />
                    <button onClick={() => saveCaption(img)} style={{ fontSize: 11, padding: "5px 8px", borderRadius: 6, border: "1px solid #DDE4F0", background: "#E4F9EC", cursor: "pointer" }}>Save</button>
                  </div>
                ) : (
                  <div onClick={() => { setEditingId(img.id); setEditCaption(img.caption || ""); }} style={{ color: img.caption ? "#4A5578" : "#A6AFC6", marginBottom: 6, cursor: "pointer", fontStyle: img.caption ? "normal" : "italic" }}>
                    {img.caption || "Add caption…"}
                  </div>
                )}
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                  <button onClick={() => togglePublish(img)} style={{ flex: 1, fontSize: 11, padding: "5px 0", borderRadius: 6, border: "1px solid #DDE4F0", background: img.is_published ? "#E4F9EC" : "#fff", cursor: "pointer" }}>{img.is_published ? "Published" : "Hidden"}</button>
                  <label style={{ fontSize: 11, padding: "5px 8px", borderRadius: 6, border: "1px solid #DDE4F0", background: "#fff", cursor: "pointer" }}>
                    Replace
                    <input type="file" accept="image/*" onChange={(e) => replaceImage(img, e.target.files[0])} style={{ display: "none" }} />
                  </label>
                  <button onClick={() => remove(img)} style={{ fontSize: 11, padding: "5px 8px", borderRadius: 6, border: "1px solid #F3C7C7", background: "#FCE8E8", color: "#B23131", cursor: "pointer" }}>Delete</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </Section>
  );
}

/* ---------------- REVIEWS MODERATION ---------------- */
function ReviewsTab() {
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const load = useCallback(async () => {
    const { data } = await supabase.from("reviews").select("*").order("created_at", { ascending: false });
    setReviews(data || []);
    setLoading(false);
  }, []);
  useEffect(() => { load(); }, [load]);

  async function setStatus(id, status) {
    await supabase.from("reviews").update({ status, moderated_at: new Date().toISOString() }).eq("id", id);
    load();
  }

  const filtered = filter === "all" ? reviews : reviews.filter((r) => r.status === filter);
  if (loading) return <Spinner />;
  return (
    <Section>
      <H2>Reviews</H2>
      <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
        {["all", "published", "hidden", "removed"].map((f) => (
          <button key={f} onClick={() => setFilter(f)} style={{ padding: "7px 14px", borderRadius: 999, border: `1.5px solid ${filter === f ? C.royal : "#DDE4F0"}`, background: filter === f ? C.royal : "#fff", color: filter === f ? "#fff" : C.navy, fontWeight: 600, fontSize: 12.5, cursor: "pointer", textTransform: "capitalize" }}>{f}</button>
        ))}
      </div>
      {filtered.length === 0 ? <EmptyState title="No reviews here" /> : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {filtered.map((r) => (
            <div key={r.id} style={{ background: "#fff", border: "1px solid #E7ECF6", borderRadius: 12, padding: 16 }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                <div style={{ fontWeight: 700, color: C.navy, fontSize: 13.5 }}>{r.customer_name} · {r.rating}★</div>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ fontSize: 11, color: "#A6AFC6" }}>{fmtDateTime(r.created_at)}</span>
                  <Badge status={r.status === "published" ? "completed" : r.status === "hidden" ? "processing" : "cancelled"} />
                </div>
              </div>
              <div style={{ fontSize: 13, color: "#4A5578", marginBottom: 10 }}>{r.review_text}</div>
              <div style={{ display: "flex", gap: 8 }}>
                {r.status !== "published" && <Button variant="secondary" style={{ padding: "6px 12px", fontSize: 12 }} onClick={() => setStatus(r.id, "published")}>Restore</Button>}
                {r.status !== "hidden" && <Button variant="subtle" style={{ padding: "6px 12px", fontSize: 12 }} onClick={() => setStatus(r.id, "hidden")}>Hide</Button>}
                {r.status !== "removed" && <Button variant="danger" style={{ padding: "6px 12px", fontSize: 12 }} onClick={() => setStatus(r.id, "removed")}>Remove</Button>}
              </div>
            </div>
          ))}
        </div>
      )}
    </Section>
  );
}

/* ---------------- SERVICES ---------------- */
function ServicesTab() {
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null); // service row being edited, or {} for new
  const [uploading, setUploading] = useState(false);

  const load = useCallback(async () => {
    const { data } = await supabase.from("services").select("*").order("sort_order");
    setServices(data || []);
    setLoading(false);
  }, []);
  useEffect(() => { load(); }, [load]);

  async function save(form) {
    const payload = {
      name: form.name.trim(),
      slug: form.slug.trim().toLowerCase().replace(/\s+/g, "-"),
      description: form.description?.trim() || null,
      price_type: form.price_type,
      price_amount: form.price_type === "fixed" ? Number(form.price_amount) || null : null,
      is_active: form.is_active,
      image_url: form.image_url || null,
    };
    if (form.id) {
      await supabase.from("services").update(payload).eq("id", form.id);
    } else {
      await supabase.from("services").insert(payload);
    }
    setEditing(null);
    load();
  }

  async function toggleActive(s) {
    await supabase.from("services").update({ is_active: !s.is_active }).eq("id", s.id);
    load();
  }

  async function deleteService(s) {
    if (!window.confirm(`Delete "${s.name}"? This can't be undone. Past requests that used this service keep their history — only the service listing itself is removed.`)) return;
    const { error } = await supabase.from("services").delete().eq("id", s.id);
    if (error) {
      alert("Couldn't delete this service. It may still be referenced by existing requests — try disabling it instead.");
      return;
    }
    load();
  }

  async function uploadImage(file, onDone) {
    if (!file) return;
    setUploading(true);
    const path = `services/${Date.now()}-${file.name}`;
    const { error } = await supabase.storage.from("gallery").upload(path, file);
    if (!error) {
      const url = supabase.storage.from("gallery").getPublicUrl(path).data.publicUrl;
      onDone(url);
    } else {
      alert("Image upload failed. Please try again.");
    }
    setUploading(false);
  }

  if (loading) return <Spinner />;
  return (
    <Section>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18 }}>
        <H2>Services</H2>
        <Button variant="primary" onClick={() => setEditing({})}>+ Add Service</Button>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {services.map((s) => (
          <div key={s.id} style={{ background: "#fff", border: "1px solid #E7ECF6", borderRadius: 12, padding: 14, display: "flex", gap: 14, alignItems: "center", flexWrap: "wrap" }}>
            {s.image_url ? (
              <img src={s.image_url} alt={s.name} style={{ width: 56, height: 56, borderRadius: 10, objectFit: "cover" }} />
            ) : (
              <div style={{ width: 56, height: 56, borderRadius: 10, background: C.paleBlue, display: "flex", alignItems: "center", justifyContent: "center" }}><Sparkles size={22} color={C.royal} /></div>
            )}
            <div style={{ flex: 1, minWidth: 160 }}>
              <div style={{ fontWeight: 700, color: C.navy, fontSize: 14.5 }}>{s.name}</div>
              <div style={{ fontSize: 12, color: "#8792A8" }}>
                {s.price_type === "fixed" ? `KES ${s.price_amount}` : "Price on request"}
              </div>
            </div>
            <Badge status={s.is_active ? "confirmed" : "cancelled"} label={s.is_active ? "Active" : "Disabled"} />
            <Button variant="secondary" style={{ padding: "7px 12px", fontSize: 12.5 }} onClick={() => setEditing(s)}>Edit</Button>
            <Button variant="secondary" style={{ padding: "7px 12px", fontSize: 12.5 }} onClick={() => toggleActive(s)}>{s.is_active ? "Disable" : "Enable"}</Button>
            <Button variant="danger" style={{ padding: "7px 12px", fontSize: 12.5 }} onClick={() => deleteService(s)}>Delete</Button>
          </div>
        ))}
      </div>

      {editing && (
        <ServiceEditModal
          service={editing}
          uploading={uploading}
          onUploadImage={uploadImage}
          onClose={() => setEditing(null)}
          onSave={save}
        />
      )}
    </Section>
  );
}

function ServiceEditModal({ service, onClose, onSave, onUploadImage, uploading }) {
  const [form, setForm] = useState({
    id: service.id, name: service.name || "", slug: service.slug || "",
    description: service.description || "", price_type: service.price_type || "on_request",
    price_amount: service.price_amount || "", is_active: service.is_active !== false, image_url: service.image_url || "",
  });
  function set(k, v) { setForm((f) => ({ ...f, [k]: v })); }

  return (
    <div role="presentation" onMouseDown={(e) => e.target === e.currentTarget && onClose()} style={{ position: "fixed", inset: 0, background: "rgba(16,42,114,0.4)", zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
      <div role="dialog" aria-modal="true" style={{ background: "#fff", borderRadius: 16, width: "100%", maxWidth: 420, padding: 22, maxHeight: "88vh", overflowY: "auto" }}>
        <H2>{service.id ? "Edit Service" : "Add Service"}</H2>
        <Field label="Name" required><TextInput value={form.name} onChange={(e) => set("name", e.target.value)} /></Field>
        <Field label="URL slug" required hint="Used in links, e.g. carpet-cleaning"><TextInput value={form.slug} onChange={(e) => set("slug", e.target.value)} /></Field>
        <Field label="Description"><TextArea value={form.description} onChange={(e) => set("description", e.target.value)} /></Field>
        <Field label="Pricing">
          <Select value={form.price_type} onChange={(e) => set("price_type", e.target.value)}>
            <option value="on_request">Price on request</option>
            <option value="fixed">Fixed price (KES)</option>
          </Select>
        </Field>
        {form.price_type === "fixed" && (
          <Field label="Price (KES)"><TextInput type="number" value={form.price_amount} onChange={(e) => set("price_amount", e.target.value)} /></Field>
        )}
        <Field label="Image">
          {form.image_url && <img src={form.image_url} alt="" style={{ width: "100%", height: 120, objectFit: "cover", borderRadius: 10, marginBottom: 8 }} />}
          <label style={{ display: "inline-block", background: C.paleBlue, color: C.royal, padding: "9px 14px", borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: "pointer" }}>
            {uploading ? "Uploading…" : form.image_url ? "Replace Image" : "Upload Image"}
            <input type="file" accept="image/*" style={{ display: "none" }} disabled={uploading} onChange={(e) => onUploadImage(e.target.files[0], (url) => set("image_url", url))} />
          </label>
        </Field>
        <div style={{ display: "flex", gap: 10, marginTop: 18 }}>
          <Button variant="secondary" full onClick={onClose}>Cancel</Button>
          <Button variant="primary" full onClick={() => onSave(form)}>Save</Button>
        </div>
      </div>
    </div>
  );
}

/* ---------------- FEEDBACK & COMPLAINTS ---------------- */
function FeedbackTab() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");

  const load = useCallback(async () => {
    const { data } = await supabase.from("feedback_messages").select("*").order("created_at", { ascending: false });
    setItems(data || []);
    setLoading(false);
  }, []);
  useEffect(() => { load(); }, [load]);

  async function setStatus(id, status) {
    await supabase.from("feedback_messages").update({ status }).eq("id", id);
    load();
  }

  const filtered = filter === "all" ? items : items.filter((i) => i.status === filter);
  if (loading) return <Spinner />;
  return (
    <Section>
      <H2>Feedback & Complaints</H2>
      <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
        {["all", "new", "read", "resolved"].map((f) => (
          <button key={f} onClick={() => setFilter(f)} style={{ padding: "7px 14px", borderRadius: 999, border: `1.5px solid ${filter === f ? C.royal : "#DDE4F0"}`, background: filter === f ? C.royal : "#fff", color: filter === f ? "#fff" : C.navy, fontWeight: 600, fontSize: 12.5, cursor: "pointer", textTransform: "capitalize" }}>{f}</button>
        ))}
      </div>
      {filtered.length === 0 ? <EmptyState icon={Inbox} title="No messages here" /> : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {filtered.map((f) => (
            <div key={f.id} style={{ background: "#fff", border: f.message_type === "complaint" ? "1.5px solid #F3C7C7" : "1px solid #E7ECF6", borderRadius: 12, padding: 16 }}>
              <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 8, marginBottom: 8 }}>
                <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  <span style={{ fontSize: 11, fontWeight: 800, textTransform: "uppercase", padding: "3px 8px", borderRadius: 999, background: f.message_type === "complaint" ? "#FCE8E8" : "#E4ECFF", color: f.message_type === "complaint" ? "#B23131" : C.royal }}>{f.message_type}</span>
                  <span style={{ fontWeight: 700, color: C.navy, fontSize: 14 }}>{f.name}</span>
                </div>
                <span style={{ fontSize: 11.5, color: "#A6AFC6" }}>{fmtDateTime(f.created_at)}</span>
              </div>
              {(f.phone || f.email) && <div style={{ fontSize: 12.5, color: "#8792A8", marginBottom: 6 }}>{f.phone || f.email}</div>}
              {f.related_request_number && <div style={{ fontSize: 12.5, color: "#8792A8", marginBottom: 6 }}>Re: {f.related_request_number}</div>}
              <p style={{ fontSize: 13.5, color: "#4A5578", marginBottom: 10 }}>{f.message}</p>
              <div style={{ display: "flex", gap: 8 }}>
                {f.status !== "read" && <Button variant="secondary" style={{ padding: "6px 12px", fontSize: 12 }} onClick={() => setStatus(f.id, "read")}>Mark Read</Button>}
                {f.status !== "resolved" && <Button variant="primary" style={{ padding: "6px 12px", fontSize: 12 }} onClick={() => setStatus(f.id, "resolved")}>Mark Resolved</Button>}
              </div>
            </div>
          ))}
        </div>
      )}
    </Section>
  );
}

/* ---------------- LEGAL PAGES (Terms & Conditions, Privacy) ---------------- */
function LegalPagesTab() {
  const [pages, setPages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [draft, setDraft] = useState({});
  const [saving, setSaving] = useState(null);

  const load = useCallback(async () => {
    const { data } = await supabase.from("legal_pages").select("*").order("slug");
    setPages(data || []);
    const d = {};
    (data || []).forEach((p) => { d[p.slug] = p.content; });
    setDraft(d);
    setLoading(false);
  }, []);
  useEffect(() => { load(); }, [load]);

  async function publish(slug) {
    setSaving(slug);
    await supabase.from("legal_pages").update({ content: draft[slug], published_at: new Date().toISOString(), updated_at: new Date().toISOString() }).eq("slug", slug);
    setSaving(null);
    load();
  }
  async function saveDraftOnly(slug) {
    setSaving(slug);
    await supabase.from("legal_pages").update({ content: draft[slug], updated_at: new Date().toISOString() }).eq("slug", slug);
    setSaving(null);
    load();
  }

  if (loading) return <Spinner />;
  return (
    <Section>
      <H2>Legal Pages</H2>
      {pages.map((p) => (
        <div key={p.slug} style={{ marginBottom: 30 }}>
          <div style={{ fontWeight: 700, color: C.navy, fontSize: 15, marginBottom: 4 }}>{p.title}</div>
          <div style={{ fontSize: 12, color: "#8792A8", marginBottom: 10 }}>
            {p.published_at ? `Published ${fmtDateTime(p.published_at)}` : "Not published yet"}
          </div>
          <TextArea value={draft[p.slug] ?? ""} onChange={(e) => setDraft((d) => ({ ...d, [p.slug]: e.target.value }))} style={{ minHeight: 160 }} />
          <div style={{ display: "flex", gap: 10, marginTop: 10 }}>
            <Button variant="secondary" disabled={saving === p.slug} onClick={() => saveDraftOnly(p.slug)}>Save Draft</Button>
            <Button variant="primary" disabled={saving === p.slug} onClick={() => publish(p.slug)}>Publish Now</Button>
          </div>
        </div>
      ))}
    </Section>
  );
}

/* ---------------- BUSINESS SETTINGS ---------------- */
const DAY_KEYS = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"];
const DAY_LABELS = { mon: "Monday", tue: "Tuesday", wed: "Wednesday", thu: "Thursday", fri: "Friday", sat: "Saturday", sun: "Sunday" };
const SOCIAL_PLATFORMS = ["facebook", "instagram", "tiktok", "whatsapp"];

function SettingsTab() {
  const [settings, setSettings] = useState(null);
  const [socials, setSocials] = useState({}); // platform -> { url, is_active }
  const [saving, setSaving] = useState(false);
  const [savedFlash, setSavedFlash] = useState(false);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from("business_settings").select("*").eq("id", 1).single();
      setSettings({ ...data, business_hours: data.business_hours || Object.fromEntries(DAY_KEYS.map((d) => [d, { closed: false, open: "08:00", close: "18:00" }])) });
      const { data: sl } = await supabase.from("social_links").select("*");
      const map = {};
      (sl || []).forEach((row) => { map[row.platform] = { url: row.url, is_active: row.is_active }; });
      setSocials(map);
    })();
  }, []);
  if (!settings) return <Spinner />;

  function setHour(day, field, value) {
    setSettings((s) => ({ ...s, business_hours: { ...s.business_hours, [day]: { ...s.business_hours[day], [field]: value } } }));
  }

  async function save() {
    setSaving(true);
    await supabase.from("business_settings").update({
      business_name: settings.business_name, tagline: settings.tagline, phone: settings.phone,
      whatsapp_number: settings.whatsapp_number, address: settings.address, maps_url: settings.maps_url,
      email: settings.email, business_hours: settings.business_hours,
    }).eq("id", 1);

    // Upsert each configured social link; platforms left blank are simply
    // not written (the public page hides any icon with no row/URL).
    for (const platform of SOCIAL_PLATFORMS) {
      const entry = socials[platform];
      if (entry && entry.url && entry.url.trim()) {
        await supabase.from("social_links").upsert({ platform, url: entry.url.trim(), is_active: entry.is_active !== false });
      }
    }
    setSaving(false);
    setSavedFlash(true);
    setTimeout(() => setSavedFlash(false), 2000);
  }

  return (
    <Section>
      <H2>Business Profile</H2>
      <div style={{ maxWidth: 480 }}>
        {[["business_name", "Business name"], ["tagline", "Tagline"], ["phone", "Phone"], ["whatsapp_number", "WhatsApp number (2547XXXXXXXX)"], ["address", "Address"], ["maps_url", "Google Maps URL"], ["email", "Email"]].map(([k, label]) => (
          <Field label={label} key={k}>
            <TextInput value={settings[k] || ""} onChange={(e) => setSettings((s) => ({ ...s, [k]: e.target.value }))} />
          </Field>
        ))}

        <div style={{ fontWeight: 700, color: C.navy, margin: "22px 0 10px", fontSize: 14.5 }}>Operating Hours</div>
        {DAY_KEYS.map((d) => {
          const day = settings.business_hours[d] || {};
          return (
            <div key={d} style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
              <div style={{ width: 90, fontSize: 13, fontWeight: 600, color: C.navy }}>{DAY_LABELS[d]}</div>
              <button
                onClick={() => setHour(d, "closed", !day.closed)}
                style={{ fontSize: 11.5, fontWeight: 700, padding: "5px 10px", borderRadius: 999, border: "none", cursor: "pointer", background: day.closed ? "#FCE8E8" : "#E4F9EC", color: day.closed ? "#B23131" : "#0C7A3D" }}
              >
                {day.closed ? "Closed" : "Open"}
              </button>
              {!day.closed && (
                <>
                  <TextInput type="time" value={day.open || "08:00"} onChange={(e) => setHour(d, "open", e.target.value)} style={{ width: 110 }} />
                  <span style={{ fontSize: 12, color: "#8792A8" }}>to</span>
                  <TextInput type="time" value={day.close || "18:00"} onChange={(e) => setHour(d, "close", e.target.value)} style={{ width: 110 }} />
                </>
              )}
            </div>
          );
        })}

        <div style={{ fontWeight: 700, color: C.navy, margin: "22px 0 10px", fontSize: 14.5 }}>Social Media</div>
        {SOCIAL_PLATFORMS.map((platform) => (
          <Field label={platform[0].toUpperCase() + platform.slice(1)} key={platform} hint="Leave blank to hide this icon on the site">
            <TextInput
              value={socials[platform]?.url || ""}
              onChange={(e) => setSocials((s) => ({ ...s, [platform]: { ...s[platform], url: e.target.value, is_active: true } }))}
              placeholder="https://..."
            />
          </Field>
        ))}

        <Button variant="primary" disabled={saving} onClick={save}>{saving ? "Saving…" : savedFlash ? "✓ Saved" : "Save Changes"}</Button>
      </div>
    </Section>
  );
}

/* ---------------- ACTIVITY LOG ---------------- */
const ACTIVITY_CATEGORIES = {
  "Requests": ["request_status_changed", "marked_collected", "marked_delivered"],
  "Payments": ["payment_marked_paid", "payment_marked_unpaid"],
  "Workers": ["worker_created", "worker_password_reset", "reset_password", "worker_assigned", "pause", "reactivate"],
  "Other": [], // catch-all for anything not in the lists above
};
function categoryOf(action) {
  for (const [cat, actions] of Object.entries(ACTIVITY_CATEGORIES)) {
    if (actions.includes(action)) return cat;
  }
  return "Other";
}

function ActivityTab() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [category, setCategory] = useState("all");
  useEffect(() => {
    (async () => {
      const { data } = await supabase.from("activity_logs").select("*").order("created_at", { ascending: false }).limit(200);
      setLogs(data || []);
      setLoading(false);
    })();
  }, []);
  if (loading) return <Spinner />;
  const filtered = category === "all" ? logs : logs.filter((l) => categoryOf(l.action) === category);
  return (
    <Section>
      <H2>Activity Log</H2>
      <div style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap" }}>
        {["all", ...Object.keys(ACTIVITY_CATEGORIES)].map((c) => (
          <button key={c} onClick={() => setCategory(c)} style={{ padding: "7px 14px", borderRadius: 999, border: `1.5px solid ${category === c ? C.royal : "#DDE4F0"}`, background: category === c ? C.royal : "#fff", color: category === c ? "#fff" : C.navy, fontWeight: 600, fontSize: 12.5, cursor: "pointer", textTransform: "capitalize" }}>{c}</button>
        ))}
      </div>
      {filtered.length === 0 ? <EmptyState title="No activity recorded here" /> : (
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {filtered.map((l) => (
            <div key={l.id} style={{ fontSize: 13, color: "#4A5578", padding: "8px 0", borderBottom: "1px solid #F0F3FA", display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
              <span style={{ fontSize: 10.5, fontWeight: 800, color: C.royal, background: C.paleBlue, padding: "2px 8px", borderRadius: 999, textTransform: "uppercase" }}>{categoryOf(l.action)}</span>
              <span style={{ fontWeight: 700, color: C.navy }}>{l.actor_label || "System"}</span> — {l.action.replace(/_/g, " ")}
              <span style={{ color: "#8792A8", marginLeft: "auto", fontSize: 11.5 }}>{fmtDateTime(l.created_at)}</span>
            </div>
          ))}
        </div>
      )}
    </Section>
  );
}
