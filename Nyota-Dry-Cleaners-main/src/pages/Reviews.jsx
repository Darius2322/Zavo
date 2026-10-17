import React, { useEffect, useState } from "react";
import { Star, MessageSquareText } from "lucide-react";
import { supabase } from "../lib/supabaseClient";
import { C, fmtDate } from "../lib/constants";
import { Section, Eyebrow, H2, Field, TextInput, TextArea, Button, Spinner, EmptyState } from "../components/UI";

function Stars({ value, onChange }) {
  return (
    <div style={{ display: "flex", gap: 4 }}>
      {[1, 2, 3, 4, 5].map((n) => (
        <button key={n} type="button" onClick={() => onChange && onChange(n)} style={{ background: "none", border: "none", cursor: onChange ? "pointer" : "default", padding: 0 }}>
          <Star size={onChange ? 26 : 15} color={C.gold} fill={n <= value ? C.gold : "none"} />
        </button>
      ))}
    </div>
  );
}

export default function ReviewsPage() {
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ name: "", contact: "", rating: 5, text: "" });
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");

  async function load() {
    const { data, error } = await supabase
      .from("reviews")
      .select("id, customer_name, rating, review_text, created_at")
      .eq("status", "published")
      .order("created_at", { ascending: false })
      .limit(30);
    if (!error && data) setReviews(data);
    setLoading(false);
  }
  useEffect(() => { load(); }, []);

  async function submit() {
    if (!form.name.trim() || !form.text.trim()) return;
    setSubmitting(true);
    setError("");
    const isEmail = form.contact.includes("@");
    const { error: err } = await supabase.from("reviews").insert({
      customer_name: form.name.trim(),
      phone: isEmail ? null : form.contact.trim() || null,
      email: isEmail ? form.contact.trim() : null,
      rating: form.rating,
      review_text: form.text.trim(),
    });
    setSubmitting(false);
    if (err) { setError("We couldn't submit your review right now. Please try again."); return; }
    setDone(true);
    setForm({ name: "", contact: "", rating: 5, text: "" });
    load();
  }

  return (
    <Section>
      <Eyebrow>Reviews</Eyebrow>
      <H2>What customers say</H2>

      <div style={{ background: "#fff", border: "1px solid #E7ECF6", borderRadius: 16, padding: 24, marginBottom: 30, maxWidth: 480 }}>
        {done ? (
          <div style={{ textAlign: "center", padding: 10 }}>
            <MessageSquareText size={26} color="#0C7A3D" style={{ marginBottom: 8 }} />
            <div style={{ fontWeight: 700, color: C.navy }}>Thanks for your review!</div>
            <div style={{ fontSize: 13, color: "#6B7695", marginTop: 4 }}>It's now visible below.</div>
            <Button variant="ghost" onClick={() => setDone(false)} style={{ marginTop: 10 }}>Leave another</Button>
          </div>
        ) : (
          <>
            <div style={{ fontWeight: 700, color: C.navy, marginBottom: 14 }}>Leave a review</div>
            <Field label="Your name" required><TextInput value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} /></Field>
            <Field label="Phone or email" hint="Optional"><TextInput value={form.contact} onChange={(e) => setForm((f) => ({ ...f, contact: e.target.value }))} /></Field>
            <Field label="Rating" required><Stars value={form.rating} onChange={(n) => setForm((f) => ({ ...f, rating: n }))} /></Field>
            <Field label="Your review" required><TextArea value={form.text} onChange={(e) => setForm((f) => ({ ...f, text: e.target.value }))} placeholder="Tell us about your experience..." /></Field>
            {error && <div style={{ color: "#B23131", fontSize: 13, marginBottom: 10 }}>{error}</div>}
            <Button variant="primary" full disabled={submitting} onClick={submit}>{submitting ? "Submitting…" : "Submit Review"}</Button>
          </>
        )}
      </div>

      {loading ? <Spinner /> : reviews.length === 0 ? (
        <EmptyState title="No reviews yet" desc="Be the first to share your experience." />
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(260px,1fr))", gap: 14 }}>
          {reviews.map((r) => (
            <div key={r.id} style={{ background: "#fff", border: "1px solid #E7ECF6", borderRadius: 14, padding: 18 }}>
              <Stars value={r.rating} />
              <div style={{ fontSize: 13.5, color: "#4A5578", margin: "10px 0", lineHeight: 1.55 }}>{r.review_text}</div>
              <div style={{ fontSize: 12, color: "#8792A8", fontWeight: 600 }}>{r.customer_name} · {fmtDate(r.created_at)}</div>
            </div>
          ))}
        </div>
      )}
    </Section>
  );
}
