import React from "react";
import { useNavigate } from "react-router-dom";
import { Droplets, Wind, Layers, Truck, MessageCircle, ArrowRight, ClipboardList, Search, Check, ChevronRight, Sparkles } from "lucide-react";
import { C, WA_BASE } from "../lib/constants";
import { Button, Section, Eyebrow, H2 } from "../components/UI";
import { HeroSlideshow } from "../components/HeroSlideshow";
import { SERVICES } from "./Services";

export default function Home() {
  const nav = useNavigate();
  const startBooking = (id) => nav(id ? `/booking?service=${id}` : "/booking");

  return (
    <div>
      <HeroSlideshow>
        <div style={{ maxWidth: 1080, margin: "0 auto", padding: "84px 20px" }}>
          <div style={{ maxWidth: 560 }}>
            <Eyebrow style={{ color: "#DCE6FF" }}>Laundry & Dry Cleaning · Kisii, Nyanchwa</Eyebrow>
            <h1 style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 800, fontSize: "clamp(34px,5.5vw,54px)", color: "#fff", lineHeight: 1.06, letterSpacing: -1, margin: "0 0 16px", textShadow: "0 2px 24px rgba(0,0,0,0.25)" }}>
              Fresh. Clean. <span style={{ color: "#FFD873" }}>Perfect.</span>
            </h1>
            <p style={{ fontSize: 17, color: "#EAF0FF", lineHeight: 1.6, marginBottom: 14, maxWidth: 480 }}>
              Professional laundry & dry-cleaning services in Kisii. We clean, dry, fold and care for your clothes with the attention they deserve.
            </p>
            <div style={{ display: "flex", gap: 8, alignItems: "center", color: "#FFD873", fontWeight: 700, fontSize: 13.5, marginBottom: 28 }}>
              <Truck size={17} /> Pickup & Delivery Available
            </div>
            <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
              <Button variant="primary" onClick={() => startBooking()}>Book a Laundry Service <ArrowRight size={16} /></Button>
              <Button variant="whatsapp" onClick={() => window.open(WA_BASE, "_blank")}><MessageCircle size={16} /> WhatsApp Us</Button>
            </div>
          </div>
        </div>
      </HeroSlideshow>

      <Section>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))", gap: 16 }}>
          {[
            { icon: ClipboardList, title: "Book a Service", desc: "Start a new laundry request in minutes.", action: () => startBooking() },
            { icon: Search, title: "Track My Request", desc: "Check the status of laundry you've already sent.", action: () => nav("/track") },
            { icon: Truck, title: "Pickup & Delivery", desc: "See how collection and delivery works.", action: () => nav("/pickup-delivery") },
          ].map(({ icon: Icon, title, desc, action }, i) => (
            <div key={i} onClick={action} style={{ cursor: "pointer", background: "#fff", border: "1px solid #E7ECF6", borderRadius: 14, padding: 22 }}>
              <div style={{ width: 42, height: 42, borderRadius: 10, background: C.paleBlue, display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 12 }}><Icon size={20} color={C.royal} /></div>
              <div style={{ fontWeight: 700, color: C.navy, marginBottom: 4 }}>{title}</div>
              <div style={{ fontSize: 13.5, color: "#6B7695" }}>{desc}</div>
            </div>
          ))}
        </div>
      </Section>

      <Section bg={C.paleBlue}>
        <Eyebrow>What We Offer</Eyebrow>
        <H2>Services built around your laundry</H2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(210px,1fr))", gap: 14, marginTop: 24 }}>
          {SERVICES.map((s) => (
            <div key={s.id} onClick={() => startBooking(s.id)} style={{ cursor: "pointer", background: "#fff", borderRadius: 14, padding: 20, border: "1px solid #E7ECF6" }}>
              <s.icon size={24} color={C.royal} style={{ marginBottom: 10 }} />
              <div style={{ fontWeight: 700, color: C.navy, fontSize: 14.5, marginBottom: 4 }}>{s.name}</div>
              <div style={{ fontSize: 12.5, color: "#6B7695", lineHeight: 1.5 }}>{s.desc}</div>
            </div>
          ))}
        </div>
        <div style={{ marginTop: 22 }}><Button variant="secondary" onClick={() => nav("/services")}>See All Services <ChevronRight size={16} /></Button></div>
      </Section>

      <Section>
        <Eyebrow>How It Works</Eyebrow>
        <H2>From basket to done</H2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(150px,1fr))", gap: 16, marginTop: 24 }}>
          {["Choose a service", "Tell us the details", "Drop off or request pickup", "Get your request number", "Track progress online", "Collect, fresh & folded"].map((t, i) => (
            <div key={i} style={{ background: "#fff", border: "1px solid #E7ECF6", borderRadius: 14, padding: 18 }}>
              <div style={{ width: 30, height: 30, borderRadius: "50%", background: C.royal, color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: 13, marginBottom: 10 }}>{i + 1}</div>
              <div style={{ fontSize: 13.5, fontWeight: 600, color: C.navy }}>{t}</div>
            </div>
          ))}
        </div>
      </Section>

      <Section bg={C.paleBlue}>
        <Eyebrow>Why Nyota</Eyebrow>
        <H2>Care you can see in every load</H2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(210px,1fr))", gap: 16, marginTop: 20 }}>
          {[["Deep Cleaning", "Removes dirt, stains & odors"], ["Safe on All Fabrics", "Gentle care for every fabric"], ["Quick Turnaround", "Fast service, always on time"], ["Quality You Can See", "Spotless results every time"]].map(([t, d], i) => (
            <div key={i} style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
              <div style={{ width: 38, height: 38, borderRadius: "50%", background: C.royal, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}><Check size={18} color="#fff" /></div>
              <div><div style={{ fontWeight: 700, color: C.navy, fontSize: 14.5 }}>{t}</div><div style={{ fontSize: 13, color: "#6B7695" }}>{d}</div></div>
            </div>
          ))}
        </div>
      </Section>

      <Section>
        <div style={{ background: `linear-gradient(135deg, ${C.royal}, ${C.navy})`, borderRadius: 20, padding: "36px 30px", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 20 }}>
          <div>
            <div style={{ color: C.gold, fontWeight: 700, fontSize: 13, marginBottom: 6 }}>PICKUP & DELIVERY AVAILABLE</div>
            <div style={{ color: "#fff", fontWeight: 800, fontSize: 22, fontFamily: "'Plus Jakarta Sans', sans-serif" }}>We'll collect and deliver — you don't have to leave home.</div>
          </div>
          <Button variant="gold" onClick={() => nav("/pickup-delivery")}>Learn More <ChevronRight size={16} /></Button>
        </div>
      </Section>

      <Section bg={C.paleBlue}>
        <div style={{ textAlign: "center", maxWidth: 520, margin: "0 auto" }}>
          <Eyebrow>No Account Needed</Eyebrow>
          <H2>Track your laundry with just your phone number</H2>
          <p style={{ color: "#6B7695", fontSize: 14.5, marginBottom: 20 }}>Enter your request number and phone to see real-time status — no sign-up required.</p>
          <Button variant="primary" onClick={() => nav("/track")}>Track My Request <Search size={16} /></Button>
        </div>
      </Section>
    </div>
  );
}
