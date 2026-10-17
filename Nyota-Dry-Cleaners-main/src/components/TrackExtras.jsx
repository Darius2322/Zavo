import React, { useState } from "react";
import { Truck, User, Send, Star, X } from "lucide-react";
import { supabase } from "../lib/supabaseClient";
import { C } from "../lib/constants";
import { Button, Field, TextInput, TextArea } from "./UI";

const METHODS = [
  { key: "customer_pickup", label: "I'm Picking It Up", icon: User },
  { key: "delivery", label: "Deliver It To Me", icon: Truck },
  { key: "send_someone", label: "I'm Sending Someone", icon: Send },
];

export function ReturnPreferencePicker({ requestNumber, phone, current, onSet }) {
  const [method, setMethod] = useState(current || "");
  const [collectorName, setCollectorName] = useState("");
  const [collectorPhone, setCollectorPhone] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [done, setDone] = useState(!!current);

  async function submit() {
    if (!method) return;
    if (method === "send_someone" && !collectorName.trim()) {
      setErr("Please tell us who will collect it.");
      return;
    }
    setErr("");
    setBusy(true);
    const { data, error } = await supabase.rpc("set_return_preference", {
      p_request_number: requestNumber,
      p_phone: phone,
      p_method: method,
      p_collector_name: method === "send_someone" ? collectorName.trim() : null,
      p_collector_phone: method === "send_someone" ? collectorPhone.trim() : null,
    });
    setBusy(false);
    if (error || data === false) {
      setErr("Something went wrong. Please try again or WhatsApp us.");
      return;
    }
    setDone(true);
    onSet?.(method);
  }

  if (done) {
    const chosen = METHODS.find((m) => m.key === (current || method));
    return (
      <div className="no-print" style={{ background: "#E4F9EC", border: "1px solid #BFEAD0", borderRadius: 12, padding: 14, marginBottom: 18, fontSize: 13.5, color: "#0C7A3D", fontWeight: 600 }}>
        ✓ You chose: {chosen?.label || "your collection preference"}. We'll take it from here.
      </div>
    );
  }

  return (
    <div className="no-print" style={{ background: C.paleBlue, borderRadius: 12, padding: 16, marginBottom: 18 }}>
      <div style={{ fontWeight: 700, color: C.navy, marginBottom: 10, fontSize: 14 }}>Your laundry is ready! How would you like it back?</div>
      <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 12 }}>
        {METHODS.map((m) => (
          <button key={m.key} onClick={() => setMethod(m.key)} style={{
            display: "flex", alignItems: "center", gap: 10, padding: "12px 14px", borderRadius: 10, cursor: "pointer",
            border: `2px solid ${method === m.key ? C.royal : "#DDE4F0"}`, background: method === m.key ? "#fff" : "#fff",
            color: C.navy, fontWeight: 600, fontSize: 13.5, textAlign: "left",
          }}>
            <m.icon size={17} color={method === m.key ? C.royal : "#8792A8"} /> {m.label}
          </button>
        ))}
      </div>
      {method === "send_someone" && (
        <div style={{ marginBottom: 12 }}>
          <Field label="Their name" required><TextInput value={collectorName} onChange={(e) => setCollectorName(e.target.value)} /></Field>
          <Field label="Their phone number" hint="Optional"><TextInput value={collectorPhone} onChange={(e) => setCollectorPhone(e.target.value)} /></Field>
        </div>
      )}
      {err && <div style={{ color: "#B23131", fontSize: 12.5, marginBottom: 10 }}>{err}</div>}
      <Button variant="primary" full disabled={!method || busy} onClick={submit}>{busy ? "Saving…" : "Confirm"}</Button>
    </div>
  );
}

export function ReviewModal({ requestNumber, serviceName, onClose }) {
  const [name, setName] = useState("");
  const [rating, setRating] = useState(5);
  const [reviewText, setReviewText] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [done, setDone] = useState(false);

  async function submit(e) {
    e.preventDefault();
    if (!name.trim() || !reviewText.trim()) {
      setErr("Please add your name and a short review.");
      return;
    }
    setErr("");
    setBusy(true);
    const { error } = await supabase.from("reviews").insert({
      customer_name: name.trim(),
      rating,
      review_text: reviewText.trim(),
    });
    setBusy(false);
    if (error) { setErr("Couldn't submit your review. Please try again."); return; }
    setDone(true);
  }

  return (
    <div role="presentation" onMouseDown={(e) => e.target === e.currentTarget && onClose()} style={{ position: "fixed", inset: 0, background: "rgba(16,42,114,0.4)", zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
      <div role="dialog" aria-modal="true" style={{ background: "#fff", borderRadius: 16, width: "100%", maxWidth: 400, padding: 22, maxHeight: "88vh", overflowY: "auto", position: "relative" }}>
        <button onClick={onClose} aria-label="Close" style={{ position: "absolute", top: 14, right: 14, background: "none", border: "none", cursor: "pointer" }}><X size={18} color="#8792A8" /></button>
        {done ? (
          <div style={{ textAlign: "center", padding: "10px 0" }}>
            <div style={{ fontSize: 15, fontWeight: 800, color: "#0C7A3D", marginBottom: 14 }}>✓ Thank you for your feedback!</div>
            <Button variant="primary" full onClick={onClose}>Close</Button>
          </div>
        ) : (
          <form onSubmit={submit}>
            <div style={{ fontWeight: 800, fontSize: 17, color: "#102A72", marginBottom: 4 }}>How was your experience?</div>
            <div style={{ fontSize: 12.5, color: "#8792A8", marginBottom: 16 }}>{serviceName ? `Request for ${serviceName}` : "Your recent request"}</div>
            <div style={{ display: "flex", gap: 6, justifyContent: "center", marginBottom: 16 }}>
              {[1, 2, 3, 4, 5].map((n) => (
                <button key={n} type="button" onClick={() => setRating(n)} style={{ background: "none", border: "none", cursor: "pointer", padding: 2 }}>
                  <Star size={28} color={n <= rating ? "#F5B301" : "#DDE4F0"} fill={n <= rating ? "#F5B301" : "none"} />
                </button>
              ))}
            </div>
            <Field label="Your name" required><TextInput value={name} onChange={(e) => setName(e.target.value)} /></Field>
            <Field label="Your review" required><TextArea value={reviewText} onChange={(e) => setReviewText(e.target.value)} placeholder="Tell us how it went…" /></Field>
            {err && <div style={{ color: "#B23131", fontSize: 12.5, marginBottom: 10 }}>{err}</div>}
            <Button type="submit" variant="primary" full disabled={busy}>{busy ? "Submitting…" : "Submit Review"}</Button>
          </form>
        )}
      </div>
    </div>
  );
}
