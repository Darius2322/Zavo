import React, { useState, useMemo, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";
import { X, Search as SearchIcon } from "lucide-react";
import { C } from "../lib/constants";

// A static index of PUBLIC site content only. Deliberately does not touch
// Supabase/customer/admin/worker data — see spec: search must never expose
// customer records, admin info, worker info, or private requests.
const INDEX = [
  { title: "Laundry Washing", section: "Services", path: "/services", desc: "Everyday washing for clothes, bedding and more." },
  { title: "Dry Cleaning", section: "Services", path: "/services", desc: "Gentle solvent cleaning for delicate and structured garments." },
  { title: "Ironing", section: "Services", path: "/services", desc: "Crisp, neatly pressed clothes ready to wear." },
  { title: "Folding", section: "Services", path: "/services", desc: "Neatly folded and organized laundry." },
  { title: "Deep Cleaning", section: "Services", path: "/services", desc: "Thorough cleaning for heavily soiled items." },
  { title: "Carpet Cleaning", section: "Services", path: "/services", desc: "Professional cleaning for carpets and rugs." },
  { title: "Shoe Cleaning", section: "Services", path: "/services", desc: "Cleaning and care for shoes and sneakers." },
  { title: "Book a Service", section: "Booking", path: "/booking", desc: "Start a new laundry or dry cleaning request." },
  { title: "Track My Request", section: "Tracking", path: "/track", desc: "Check the status of an existing request." },
  { title: "Gallery", section: "Gallery", path: "/gallery", desc: "Photos of our work and facility." },
  { title: "About Us", section: "About", path: "/about", desc: "Learn about Nyota Dry Cleaners & Laundry." },
  { title: "Reviews", section: "Reviews", path: "/reviews", desc: "What our customers say about us." },
  { title: "Contact & Location", section: "Contact", path: "/contact", desc: "Phone, WhatsApp, email and our location in Kisii, Nyanchwa." },
  { title: "Pickup & Delivery", section: "Info", path: "/pickup-delivery", desc: "How pickup and delivery works." },
  { title: "FAQ", section: "Info", path: "/faq", desc: "Frequently asked questions." },
];

export function SearchOverlay({ open, onClose }) {
  const [q, setQ] = useState("");
  const inputRef = useRef(null);
  const nav = useNavigate();

  useEffect(() => {
    if (open) {
      setQ("");
      setTimeout(() => inputRef.current?.focus(), 30);
      const onKey = (e) => { if (e.key === "Escape") onClose(); };
      document.addEventListener("keydown", onKey);
      return () => document.removeEventListener("keydown", onKey);
    }
  }, [open]);

  const results = useMemo(() => {
    if (!q.trim()) return INDEX;
    const needle = q.trim().toLowerCase();
    return INDEX.filter((r) => `${r.title} ${r.section} ${r.desc}`.toLowerCase().includes(needle));
  }, [q]);

  if (!open) return null;

  return createPortal(
    <div
      role="presentation"
      onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}
      style={{ position: "fixed", inset: 0, background: "rgba(16,42,114,0.4)", zIndex: 1000, display: "flex", alignItems: "flex-start", justifyContent: "center", padding: "10vh 16px" }}
    >
      <div role="dialog" aria-modal="true" aria-label="Search the site" style={{ background: "#fff", borderRadius: 16, width: "100%", maxWidth: 480, boxShadow: "0 20px 60px rgba(16,42,114,0.3)", overflow: "hidden", maxHeight: "70vh", display: "flex", flexDirection: "column" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "14px 16px", borderBottom: "1px solid #EDF1F8" }}>
          <SearchIcon size={18} color="#8792A8" />
          <input
            ref={inputRef}
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search services, gallery, contact info…"
            style={{ flex: 1, border: "none", outline: "none", fontSize: 15, color: C.navy, fontFamily: "'Inter', sans-serif" }}
          />
          <button onClick={onClose} aria-label="Close search" style={{ background: "none", border: "none", cursor: "pointer", padding: 4 }}>
            <X size={18} color="#8792A8" />
          </button>
        </div>
        <div style={{ overflowY: "auto", padding: 8 }}>
          {results.length === 0 ? (
            <div style={{ padding: 24, textAlign: "center", fontSize: 13.5, color: "#8792A8" }}>No matches — try Services, Gallery, or Contact.</div>
          ) : results.map((r) => (
            <button
              key={r.title}
              onClick={() => { onClose(); nav(r.path); }}
              style={{ display: "block", width: "100%", textAlign: "left", background: "none", border: "none", cursor: "pointer", padding: "12px 14px", borderRadius: 10 }}
              onMouseEnter={(e) => (e.currentTarget.style.background = C.paleBlue)}
              onMouseLeave={(e) => (e.currentTarget.style.background = "none")}
            >
              <div style={{ fontSize: 11, fontWeight: 700, color: C.royal, textTransform: "uppercase", letterSpacing: 0.4 }}>{r.section}</div>
              <div style={{ fontSize: 14.5, fontWeight: 700, color: C.navy }}>{r.title}</div>
              <div style={{ fontSize: 12.5, color: "#8792A8" }}>{r.desc}</div>
            </button>
          ))}
        </div>
      </div>
    </div>,
    document.body
  );
}
