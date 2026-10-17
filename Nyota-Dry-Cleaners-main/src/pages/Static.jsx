import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Phone, MapPin, MessageCircle, ArrowRight, Mail, Facebook, Instagram } from "lucide-react";
import { PHONE_DISPLAY, PHONE_INTL, WA_BASE, fmtDateTime } from "../lib/constants";
import { useBusinessSettings, formatHoursLine } from "../lib/useBusinessSettings";
import { supabase } from "../lib/supabaseClient";
import { SOCIAL_ICON_COMPONENTS } from "../components/SocialIcons";
import { Section, Eyebrow, H2, Button, Spinner } from "../components/UI";

export function AboutPage() {
  return (
    <Section>
      <Eyebrow>About Us</Eyebrow>
      <H2>Who We Are</H2>
      <p style={{ color: "#4A5578", lineHeight: 1.7, maxWidth: 640, fontSize: 15, marginBottom: 30 }}>
        Nyota Dry Cleaners & Laundry serves the Kisii Nyanchwa community, based near Kisii Eye Hospital.
        We handle washing, dry cleaning, ironing, folding and deep cleaning — with care for every step,
        from the moment your laundry reaches us to the moment it's back in your hands, fresh and neatly folded.
      </p>

      {/* Alternating image/text blocks tell the story rather than stacking
          photos vertically — each row flips text/image sides on desktop and
          collapses to image-then-text on mobile. */}
      <div className="about-row nyota-fade-in" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 30, alignItems: "center", marginBottom: 46 }}>
        <div className="about-row-img" style={{ borderRadius: 16, overflow: "hidden" }}>
          <img src="/images/family-trust.jpg" alt="A family trusting us with their laundry" style={{ width: "100%", height: 280, objectFit: "cover", display: "block" }} />
        </div>
        <div>
          <H2>Trusted with what matters</H2>
          <p style={{ color: "#4A5578", lineHeight: 1.7, fontSize: 15 }}>
            Families across Nyanchwa trust us with everyday essentials — from baby clothes to bedsheets. We treat
            every load the way we'd want our own handled: carefully, and on time.
          </p>
        </div>
      </div>

      <div className="about-row about-row-reverse nyota-fade-in" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 30, alignItems: "center", marginBottom: 46 }}>
        <div className="about-row-img" style={{ borderRadius: 16, overflow: "hidden" }}>
          <img src="/images/carpet-steam-cleaning.jpg" alt="Deep steam cleaning in progress" style={{ width: "100%", height: 280, objectFit: "cover", objectPosition: "center 20%", display: "block" }} />
        </div>
        <div>
          <H2>What We Do</H2>
          <p style={{ color: "#4A5578", lineHeight: 1.7, fontSize: 15 }}>
            Laundry washing, dry cleaning, ironing, folding, deep cleaning for heavily soiled items, carpet and
            shoe cleaning, plus pickup & delivery for customers who'd rather not make the trip.
          </p>
        </div>
      </div>

      <div className="about-row nyota-fade-in" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 30, alignItems: "center", marginBottom: 30 }}>
        <div className="about-row-img" style={{ borderRadius: 16, overflow: "hidden" }}>
          <img src="/images/sweaters-closeup.jpg" alt="Freshly folded sweaters" style={{ width: "100%", height: 280, objectFit: "cover", display: "block" }} />
        </div>
        <div>
          <H2>Our Approach</H2>
          <p style={{ color: "#4A5578", lineHeight: 1.7, fontSize: 15, marginBottom: 20 }}>
            Every load is treated according to its fabric and the instructions you give us at booking. We aim for
            quick, reliable turnaround without cutting corners on cleanliness.
          </p>
          <div style={{ fontWeight: 700, color: "#102A72", marginBottom: 4 }}>Our Location</div>
          <p style={{ color: "#4A5578", fontSize: 14 }}>Kisii, Nyanchwa, near Kisii Eye Hospital.</p>
        </div>
      </div>

      <Button variant="primary" onClick={() => (window.location.href = "/booking")}>Book Your Laundry <ArrowRight size={16} /></Button>
      <style>{`
        @media (max-width: 720px) {
          .about-row { grid-template-columns: 1fr !important; }
          .about-row-reverse .about-row-img { order: -1; }
        }
        @media (min-width: 721px) {
          .about-row-reverse .about-row-img { order: 2; }
        }
      `}</style>
    </Section>
  );
}

export function PickupDeliveryPage() {
  const nav = useNavigate();
  return (
    <Section>
      <Eyebrow>Pickup & Delivery</Eyebrow>
      <H2>We come to you</H2>
      <p style={{ color: "#4A5578", lineHeight: 1.7, maxWidth: 640, fontSize: 15, marginBottom: 20 }}>
        Choose "I Need Pickup" during booking and tell us your area, location and preferred date/time. We'll
        confirm the details with you, collect your laundry, clean it with care, and deliver it back.
      </p>
      <div style={{ borderRadius: 16, overflow: "hidden", maxWidth: 640, marginBottom: 24 }}>
        <img src="/images/dryer-fun.jpg" alt="Laundry day, sorted" style={{ width: "100%", display: "block", objectFit: "cover", maxHeight: 320 }} />
      </div>
      <Button variant="primary" onClick={() => nav("/booking")}>Book a Pickup <ArrowRight size={16} /></Button>
    </Section>
  );
}

export function ContactPage() {
  const { settings, socials } = useBusinessSettings();
  const hours = settings.business_hours;
  const SOCIAL_ICONS = SOCIAL_ICON_COMPONENTS;
  const [fb, setFb] = useState({ name: "", contact: "", type: "feedback", request_number: "", message: "" });
  const [fbBusy, setFbBusy] = useState(false);
  const [fbDone, setFbDone] = useState(false);
  const [fbErr, setFbErr] = useState("");

  async function submitFeedback(e) {
    e.preventDefault();
    if (!fb.name.trim() || !fb.message.trim()) { setFbErr("Please add your name and a message."); return; }
    setFbErr("");
    setFbBusy(true);
    const isEmail = fb.contact.includes("@");
    const { error } = await supabase.from("feedback_messages").insert({
      name: fb.name.trim(),
      phone: isEmail ? null : fb.contact.trim() || null,
      email: isEmail ? fb.contact.trim() : null,
      message_type: fb.type,
      related_request_number: fb.request_number.trim() || null,
      message: fb.message.trim(),
    });
    setFbBusy(false);
    if (error) { setFbErr("Couldn't send your message. Please try again or WhatsApp us directly."); return; }
    setFbDone(true);
  }

  return (
    <div>
      {/* Full-section background treatment — a soft overlay keeps the photo
          as scenery rather than the focus, and the heading sits directly
          on it the same way the Home hero does; the actual contact info
          and form live in the solid card just below so they stay crisp
          and easy to read regardless of what's happening in the photo. */}
      <div className="nyota-fade-in" style={{
        position: "relative", minHeight: 260, display: "flex", alignItems: "center",
        backgroundImage: "url(/images/contact-support.jpg)", backgroundSize: "cover",
        backgroundPosition: "center 25%",
      }}>
        <div style={{ position: "absolute", inset: 0, background: "linear-gradient(115deg, rgba(9,20,56,0.68) 0%, rgba(9,20,56,0.38) 55%, rgba(9,20,56,0.15) 100%)" }} />
        <div style={{ position: "relative", maxWidth: 1080, margin: "0 auto", padding: "48px 20px", width: "100%" }}>
          <Eyebrow style={{ color: "#DCE6FF" }}>Contact</Eyebrow>
          <h1 style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 800, fontSize: "clamp(28px,4.5vw,42px)", color: "#fff", margin: 0, textShadow: "0 2px 20px rgba(0,0,0,0.25)" }}>Get in touch</h1>
        </div>
        <style>{`@media (max-width: 640px) { .contact-hero-bg { background-position: center 15% !important; } }`}</style>
      </div>

      <Section>
        <div style={{ display: "flex", gap: 24, flexWrap: "wrap", alignItems: "flex-start" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 12, maxWidth: 420, flex: 1, minWidth: 280 }}>
        <div style={{ display: "flex", gap: 10, alignItems: "center" }}><Phone size={18} color="#0638B8" /><a href={`tel:${PHONE_INTL}`} style={{ color: "#102A72", fontWeight: 600, textDecoration: "none" }}>{settings.phone || PHONE_DISPLAY}</a></div>
        {settings.email && <div style={{ display: "flex", gap: 10, alignItems: "center" }}><Mail size={18} color="#0638B8" /><a href={`mailto:${settings.email}`} style={{ color: "#102A72", fontWeight: 600, textDecoration: "none" }}>{settings.email}</a></div>}
        <div style={{ display: "flex", gap: 10, alignItems: "center" }}><MapPin size={18} color="#0638B8" /><span style={{ color: "#102A72" }}>{settings.address}</span></div>
        {settings.maps_url && <a href={settings.maps_url} target="_blank" rel="noreferrer" style={{ color: "#075FE5", fontWeight: 600, fontSize: 13.5 }}>Open in Google Maps →</a>}
        <Button variant="whatsapp" onClick={() => window.open(WA_BASE, "_blank")}><MessageCircle size={16} /> Message Us on WhatsApp</Button>

        {hours && (
          <div style={{ marginTop: 10, background: "#F4F7FD", borderRadius: 12, padding: 16 }}>
            <div style={{ fontWeight: 700, color: "#102A72", marginBottom: 10, fontSize: 14 }}>Operating Hours</div>
            {["mon", "tue", "wed", "thu", "fri", "sat", "sun"].map((d) => (
              <div key={d} style={{ display: "flex", justifyContent: "space-between", fontSize: 13.5, color: "#4A5578", padding: "4px 0" }}>
                <span style={{ textTransform: "capitalize", fontWeight: 600 }}>{d}</span>
                <span>{formatHoursLine(hours, d)}</span>
              </div>
            ))}
          </div>
        )}

        {socials.length > 0 && (
          <div style={{ display: "flex", gap: 10, marginTop: 6 }}>
            {socials.map((s) => {
              const Icon = SOCIAL_ICONS[s.platform];
              return (
                <a key={s.platform} href={s.url} target="_blank" rel="noreferrer" aria-label={s.platform}
                  style={{ width: 36, height: 36, borderRadius: 9, background: "#F4F7FD", display: "flex", alignItems: "center", justifyContent: "center", textDecoration: "none" }}>
                  {Icon ? <Icon size={16} color="#0638B8" /> : <span style={{ color: "#0638B8", fontSize: 11, fontWeight: 800, textTransform: "uppercase" }}>{s.platform.slice(0, 2)}</span>}
                </a>
              );
            })}
          </div>
        )}

        <div style={{ marginTop: 26, borderTop: "1px solid #E7ECF6", paddingTop: 22 }}>
          <div style={{ fontWeight: 700, color: "#102A72", marginBottom: 4, fontSize: 15 }}>Feedback & Complaints</div>
          <p style={{ fontSize: 13, color: "#8792A8", marginBottom: 14 }}>Something we could do better, or a compliment for the team? Let us know directly — our staff reads every message.</p>
          {fbDone ? (
            <div style={{ background: "#E4F9EC", color: "#0C7A3D", padding: 14, borderRadius: 10, fontSize: 13.5, fontWeight: 600 }}>✓ Thank you — your message has been sent to our team.</div>
          ) : (
            <form onSubmit={submitFeedback} style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <div style={{ display: "flex", gap: 8 }}>
                <button type="button" onClick={() => setFb((f) => ({ ...f, type: "feedback" }))} style={{ flex: 1, padding: "9px 0", borderRadius: 8, border: `2px solid ${fb.type === "feedback" ? "#075FE5" : "#DDE4F0"}`, background: fb.type === "feedback" ? "#EAF1FF" : "#fff", fontWeight: 700, fontSize: 13, cursor: "pointer", color: "#102A72" }}>Feedback</button>
                <button type="button" onClick={() => setFb((f) => ({ ...f, type: "complaint" }))} style={{ flex: 1, padding: "9px 0", borderRadius: 8, border: `2px solid ${fb.type === "complaint" ? "#B23131" : "#DDE4F0"}`, background: fb.type === "complaint" ? "#FCE8E8" : "#fff", fontWeight: 700, fontSize: 13, cursor: "pointer", color: "#102A72" }}>Complaint</button>
              </div>
              <input value={fb.name} onChange={(e) => setFb((f) => ({ ...f, name: e.target.value }))} placeholder="Your name" style={inputStyle} />
              <input value={fb.contact} onChange={(e) => setFb((f) => ({ ...f, contact: e.target.value }))} placeholder="Phone or email (optional)" style={inputStyle} />
              <input value={fb.request_number} onChange={(e) => setFb((f) => ({ ...f, request_number: e.target.value }))} placeholder="Request number (optional)" style={inputStyle} />
              <textarea value={fb.message} onChange={(e) => setFb((f) => ({ ...f, message: e.target.value }))} placeholder="Your message" rows={4} style={{ ...inputStyle, resize: "vertical", fontFamily: "inherit" }} />
              {fbErr && <div style={{ color: "#B23131", fontSize: 12.5 }}>{fbErr}</div>}
              <Button type="submit" variant="primary" disabled={fbBusy}>{fbBusy ? "Sending…" : "Send Message"}</Button>
            </form>
          )}
        </div>
          </div>
        </div>
      </Section>
    </div>
  );
}

const inputStyle = { padding: "11px 14px", borderRadius: 10, border: "1.5px solid #DDE4F0", fontSize: 14, color: "#102A72", fontFamily: "'Inter', sans-serif" };

export function FAQPage() {
  const faqs = [
    ["What services do you offer?", "Laundry washing, dry cleaning, ironing, folding, deep cleaning, and anything you describe under Other."],
    ["Where are you located?", "Kisii, Nyanchwa, near Kisii Eye Hospital."],
    ["Do you offer pickup and delivery?", "Yes — choose \"I Need Pickup\" during booking and tell us your area, location and preferred date/time."],
    ["How do I book?", "Use the Book a Service page to complete a short, step-by-step request."],
    ["Do I need an account?", "No. You do not need to create an account to book or track a request."],
    ["How do I track my request?", "Go to Track My Request and enter your request number and phone number."],
    ["What happens after I submit a request?", "You'll receive a unique request number, and our team will confirm and process it."],
    ["Can I download my ticket?", "Yes — a printable ticket and receipt are available on the confirmation page and tracking page."],
    ["How do I contact Nyota?", `Call or WhatsApp ${PHONE_DISPLAY}.`],
    ["How do I know when my laundry is ready?", "Track your request online — status updates to Ready for Collection when it's done."],
  ];
  return (
    <Section>
      <Eyebrow>FAQ</Eyebrow>
      <H2>Frequently Asked Questions</H2>
      <img src="/images/phone-call-illustration.jpg" alt="" style={{ width: 160, display: "block", margin: "10px 0 20px" }} />
      <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 10 }}>
        {faqs.map(([q, a], i) => (
          <details key={i} style={{ background: "#fff", border: "1px solid #E7ECF6", borderRadius: 12, padding: "14px 18px" }}>
            <summary style={{ fontWeight: 700, color: "#102A72", cursor: "pointer", fontSize: 14.5 }}>{q}</summary>
            <p style={{ marginTop: 8, fontSize: 13.5, color: "#6B7695", lineHeight: 1.6 }}>{a}</p>
          </details>
        ))}
      </div>
    </Section>
  );
}

function LegalPage({ slug, fallbackTitle, fallbackContent }) {
  const [page, setPage] = useState(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    (async () => {
      const { data } = await supabase.from("legal_pages").select("*").eq("slug", slug).not("published_at", "is", null).single();
      setPage(data);
      setLoading(false);
    })();
  }, [slug]);
  if (loading) return <Spinner />;
  return (
    <Section>
      <Eyebrow>Legal</Eyebrow>
      <H2>{page?.title || fallbackTitle}</H2>
      <p style={{ color: "#6B7695", fontSize: 14, maxWidth: 640, lineHeight: 1.7, whiteSpace: "pre-wrap" }}>{page?.content || fallbackContent}</p>
      {page?.published_at && <div style={{ fontSize: 12, color: "#A6AFC6", marginTop: 18 }}>Last published {fmtDateTime(page.published_at)}</div>}
    </Section>
  );
}

export function PrivacyPage() {
  return <LegalPage slug="privacy" fallbackTitle="Privacy Policy" fallbackContent="We collect only the information needed to process your laundry request — your name, phone number, and service details. This information is used solely to fulfill your request and is not shared with third parties." />;
}
export function TermsPage() {
  return <LegalPage slug="terms" fallbackTitle="Terms & Conditions" fallbackContent="By submitting a laundry request, you agree to provide accurate contact details and to collect or receive your items within a reasonable time of completion. Nyota Dry Cleaners handles all garments with care but recommends disclosing any special fabric requirements at booking." />;
}
