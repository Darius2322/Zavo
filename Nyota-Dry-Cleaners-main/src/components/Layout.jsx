import React, { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  Menu, X, MessageCircle, Phone, MapPin, Home as HomeIcon, Sparkles,
  CalendarPlus, Search, ClipboardCheck, Image as ImageIcon, Info, Star,
  Facebook, Instagram, Mail, Share2,
} from "lucide-react";
import { C, PHONE_DISPLAY, PHONE_INTL, WA_BASE } from "../lib/constants";
import { useBusinessSettings, formatHoursLine } from "../lib/useBusinessSettings";
import { SOCIAL_ICON_COMPONENTS } from "./SocialIcons";
import { Button } from "./UI";
import { SearchOverlay } from "./SearchOverlay";

export function Logo({ height = 40 }) {
  return <img src="/logo-lockup.png" alt="Nyota Dry Cleaners & Laundry" style={{ height, width: "auto", display: "block" }} />;
}

const NAV_LINKS = [
  ["/", "Home", HomeIcon], ["/services", "Services", Sparkles], ["/booking", "Book", CalendarPlus],
  ["/track", "Track Request", ClipboardCheck], ["/gallery", "Gallery", ImageIcon], ["/about", "About", Info],
  ["/reviews", "Reviews", Star], ["/contact", "Contact", Phone],
];

// Locks the page behind the drawer without losing scroll position, and
// restores it exactly where the customer was when the drawer closes.
function useBodyScrollLock(locked) {
  useEffect(() => {
    if (!locked) return;
    const scrollY = window.scrollY;
    const { body } = document;
    const prev = { position: body.style.position, top: body.style.top, left: body.style.left, right: body.style.right, width: body.style.width };
    body.style.position = "fixed";
    body.style.top = `-${scrollY}px`;
    body.style.left = "0";
    body.style.right = "0";
    body.style.width = "100%";
    return () => {
      body.style.position = prev.position;
      body.style.top = prev.top;
      body.style.left = prev.left;
      body.style.right = prev.right;
      body.style.width = prev.width;
      window.scrollTo(0, scrollY); // restore exactly where the customer was — no jump to top
    };
  }, [locked]);
}

export function NavBar() {
  const [open, setOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const loc = useLocation();
  const nav = useNavigate();
  const toggleBtnRef = useRef(null);
  const closeBtnRef = useRef(null);
  const drawerRef = useRef(null);

  useBodyScrollLock(open);

  // Close automatically on any route change (also covers back/forward nav).
  useEffect(() => { setOpen(false); }, [loc.pathname]);

  // Focus management: move focus into the drawer on open, return it to the
  // hamburger button on close. Also close on Escape.
  useEffect(() => {
    if (open) {
      closeBtnRef.current?.focus();
      const onKey = (e) => { if (e.key === "Escape") setOpen(false); };
      document.addEventListener("keydown", onKey);
      return () => {
        document.removeEventListener("keydown", onKey);
        toggleBtnRef.current?.focus();
      };
    }
  }, [open]);

  function onOverlayClick(e) {
    if (drawerRef.current && !drawerRef.current.contains(e.target)) setOpen(false);
  }

  async function shareThisSite() {
    const shareData = { title: "Nyota Dry Cleaners & Laundry", text: "Fresh, clean, perfect laundry in Kisii — check out Nyota Dry Cleaners.", url: window.location.origin };
    if (navigator.share) {
      try { await navigator.share(shareData); } catch { /* user cancelled the native share sheet — not an error */ }
      return;
    }
    // No native Web Share support (mostly desktop browsers) — fall back to
    // copying the link so the person can paste it wherever they like.
    try {
      await navigator.clipboard.writeText(shareData.url);
      alert("Link copied — paste it anywhere to share Nyota Dry Cleaners.");
    } catch {
      window.open(`${WA_BASE.split("?")[0]}?text=${encodeURIComponent(`${shareData.text} ${shareData.url}`)}`, "_blank");
    }
  }

  // Desktop nav omits "Book" — the "Book Now" button just to its right is
  // the single primary CTA; having both was the duplicate-button issue.
  const desktopLinks = NAV_LINKS.filter(([path]) => path !== "/booking");

  return (
    <header style={{ position: "sticky", top: 0, zIndex: 50, background: "rgba(255,255,255,0.96)", backdropFilter: "blur(6px)", borderBottom: "1px solid #EDF1F8" }}>
      <div style={{ maxWidth: 1200, margin: "0 auto", padding: "8px 14px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
        <Link to="/" style={{ flexShrink: 0 }}><Logo height={36} /></Link>
        <nav className="desktop-nav" style={{ display: "none" }}>
          {desktopLinks.map(([path, label]) => (
            <Link key={path} to={path} style={{
              fontFamily: "'Inter', sans-serif", fontWeight: 600, fontSize: 14.5,
              color: loc.pathname === path ? C.royal : C.navy, padding: "8px 12px", textDecoration: "none",
              borderBottom: loc.pathname === path ? `2px solid ${C.royal}` : "2px solid transparent",
            }}>{label}</Link>
          ))}
        </nav>
        <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
          <div className="desktop-nav" style={{ display: "none", gap: 10, marginRight: 4 }}>
            <button
              onClick={() => setSearchOpen(true)}
              aria-label="Search the site"
              title="Search"
              style={{ background: C.paleBlue, border: "none", cursor: "pointer", width: 38, height: 38, borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center" }}
            >
              <Search size={18} color={C.royal} />
            </button>
            <Button variant="whatsapp" onClick={() => window.open(`${WA_BASE}?text=${encodeURIComponent("Hello Nyota Dry Cleaners, I would like to ask about laundry services.")}`, "_blank")}><MessageCircle size={16} /> WhatsApp</Button>
            <Button variant="primary" onClick={() => nav("/booking")}>Book Now</Button>
          </div>

          {/* Four distinct, always-reachable mobile actions: Book, Track,
              Search, Menu — each with its own unambiguous icon per the
              "don't use a magnifying glass for Track" requirement. */}
          <button
            onClick={() => nav("/booking")}
            className="mobile-toggle"
            aria-label="Book a Laundry Service"
            title="Book a Laundry Service"
            style={{ background: C.paleBlue, border: "none", cursor: "pointer", width: 34, height: 34, borderRadius: 9, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}
          >
            <CalendarPlus size={17} color={C.royal} />
          </button>
          <button
            onClick={() => nav("/track")}
            className="mobile-toggle"
            aria-label="Track My Request"
            title="Track My Request"
            style={{ background: C.paleBlue, border: "none", cursor: "pointer", width: 34, height: 34, borderRadius: 9, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}
          >
            <ClipboardCheck size={17} color={C.royal} />
          </button>
          <button
            onClick={() => setSearchOpen(true)}
            className="mobile-toggle"
            aria-label="Search the site"
            title="Search"
            style={{ background: C.paleBlue, border: "none", cursor: "pointer", width: 34, height: 34, borderRadius: 9, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}
          >
            <Search size={17} color={C.royal} />
          </button>
          <button
            ref={toggleBtnRef}
            onClick={() => setOpen(true)}
            className="mobile-toggle"
            aria-label="Open menu"
            aria-expanded={open}
            style={{
              background: `linear-gradient(135deg, ${C.bright}, ${C.navy})`, border: "none", cursor: "pointer",
              width: 34, height: 34, borderRadius: 9, display: "flex", alignItems: "center", justifyContent: "center",
              boxShadow: "0 3px 10px rgba(16,42,114,0.3)", flexShrink: 0,
            }}
          >
            <Menu size={18} color="#fff" />
          </button>
        </div>
      </div>

      {/* Overlay + slide-in drawer — portaled straight to <body> rather than
          rendered inside this sticky <header>. Nesting a `position: fixed`
          element inside a `position: sticky` ancestor is a known source of
          mobile-browser compositing bugs (the "fixed" element can end up
          confined to the sticky element's box instead of the real
          viewport, which is exactly the half-rendered/overlapping drawer
          reported). Portaling sidesteps that entirely. */}
      {open && createPortal(
        <div
          onMouseDown={onOverlayClick}
          onTouchStart={onOverlayClick}
          role="presentation"
          style={{ position: "fixed", inset: 0, background: "rgba(16,42,114,0.35)", zIndex: 1000, animation: "nyota-fade .2s ease" }}
        >
          <div
            ref={drawerRef}
            role="dialog"
            aria-modal="true"
            aria-label="Site menu"
            style={{
              position: "absolute", top: 0, right: 0, height: "100%", width: "min(84vw, 340px)", maxWidth: "min(84vw, 340px)",
              background: "#fff", boxShadow: "-8px 0 30px rgba(16,42,114,0.2)", display: "flex", flexDirection: "column",
              animation: "nyota-slide-in .25s ease", overflow: "hidden",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 18px", borderBottom: "1px solid #EDF1F8", background: `linear-gradient(135deg, ${C.navy}, ${C.royal})` }}>
              <div style={{ background: "#fff", borderRadius: 8, padding: "4px 8px", display: "inline-block" }}><Logo height={26} /></div>
              <button ref={closeBtnRef} onClick={() => setOpen(false)} aria-label="Close menu" style={{ background: "rgba(255,255,255,0.15)", border: "none", cursor: "pointer", width: 32, height: 32, borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center" }}>
                <X size={18} color="#fff" />
              </button>
            </div>
            <nav style={{ padding: 12, display: "flex", flexDirection: "column", gap: 2, overflowY: "auto", flex: 1 }}>
              {NAV_LINKS.map(([path, label, Icon]) => (
                <Link key={path} to={path} onClick={() => setOpen(false)} style={{
                  display: "flex", alignItems: "center", gap: 12, textAlign: "left",
                  background: loc.pathname === path ? C.paleBlue : "none", textDecoration: "none",
                  fontFamily: "'Inter', sans-serif", fontWeight: 600, fontSize: 15,
                  color: loc.pathname === path ? C.royal : C.navy, padding: "13px 14px", borderRadius: 10,
                }}>
                  <Icon size={18} color={loc.pathname === path ? C.royal : "#8792A8"} />
                  {label}
                </Link>
              ))}
            </nav>
            <div style={{ padding: 14, borderTop: "1px solid #EDF1F8", display: "flex", flexDirection: "column", gap: 8 }}>
              <button
                onClick={shareThisSite}
                style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, padding: "11px 0", borderRadius: 10, border: "1.5px solid #DDE4F0", background: "#fff", color: C.navy, fontWeight: 700, fontSize: 14, cursor: "pointer" }}
              >
                <Share2 size={16} /> Share This Site
              </button>
              <Button variant="whatsapp" full onClick={() => window.open(`${WA_BASE}?text=${encodeURIComponent("Hello Nyota Dry Cleaners, I would like to ask about laundry services.")}`, "_blank")}><MessageCircle size={16} /> WhatsApp</Button>
              <Button variant="primary" full onClick={() => { setOpen(false); nav("/booking"); }}>Book Now</Button>
            </div>
          </div>
        </div>,
        document.body
      )}

      <SearchOverlay open={searchOpen} onClose={() => setSearchOpen(false)} />

      <style>{`
        @media (min-width: 900px) { .desktop-nav { display: flex !important; align-items: center; } .mobile-toggle { display: none !important; } }
        @media (max-width: 359px) { .mobile-toggle { width: 30px !important; height: 30px !important; } }
        @media (prefers-reduced-motion: reduce) {
          [role="dialog"], [role="presentation"] { animation: none !important; }
        }
        @keyframes nyota-fade { from { opacity: 0; } to { opacity: 1; } }
        @keyframes nyota-slide-in { from { transform: translateX(100%); } to { transform: translateX(0); } }
      `}</style>
    </header>
  );
}

export function Footer() {
  // NOTE: no Admin/Worker/Staff link here on purpose — those portals are
  // reached only via their direct URLs (/admin, /worker/login), never from
  // public navigation, per the spec.
  const { settings, socials, waBase } = useBusinessSettings();
  const [showCredit, setShowCredit] = useState(false);
  const hours = settings.business_hours;

  const SOCIAL_ICONS = SOCIAL_ICON_COMPONENTS;

  return (
    <footer style={{ background: C.navy, color: "#D8E1F5", padding: "44px 20px 26px" }}>
      <div style={{ maxWidth: 1080, margin: "0 auto", display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(200px,1fr))", gap: 28 }}>
        <div>
          <div style={{ marginBottom: 10, background: "#fff", display: "inline-block", padding: "6px 10px", borderRadius: 8 }}><Logo height={34} /></div>
          <p style={{ fontSize: 13.5, lineHeight: 1.6, color: "#AEBBDC", maxWidth: 260 }}>{settings.tagline ? `${settings.tagline} — right here in ${settings.address}.` : `Fresh, clean and neatly prepared laundry — right here in ${settings.address}.`}</p>
          {socials.length > 0 && (
            <div style={{ display: "flex", gap: 10, marginTop: 12 }}>
              {socials.map((s) => {
                const Icon = SOCIAL_ICONS[s.platform];
                return (
                  <a key={s.platform} href={s.url} target="_blank" rel="noreferrer" aria-label={s.platform}
                    style={{ width: 32, height: 32, borderRadius: 8, background: "rgba(255,255,255,0.1)", display: "flex", alignItems: "center", justifyContent: "center", textDecoration: "none" }}>
                    {Icon ? <Icon size={15} color="#fff" /> : <span style={{ color: "#fff", fontSize: 11, fontWeight: 800, textTransform: "uppercase" }}>{s.platform.slice(0, 2)}</span>}
                  </a>
                );
              })}
            </div>
          )}
        </div>
        <div>
          <div style={{ fontWeight: 700, color: "#fff", marginBottom: 12, fontSize: 14 }}>Quick Links</div>
          {[["/services", "Services"], ["/booking", "Book"], ["/track", "Track Request"], ["/gallery", "Gallery"], ["/faq", "FAQ"]].map(([p, l]) => (
            <Link key={p} to={p} style={{ display: "block", fontSize: 13.5, marginBottom: 9, color: "#AEBBDC", textDecoration: "none" }}>{l}</Link>
          ))}
        </div>
        <div>
          <div style={{ fontWeight: 700, color: "#fff", marginBottom: 12, fontSize: 14 }}>Contact</div>
          <a href={`tel:${PHONE_INTL}`} style={{ fontSize: 13.5, marginBottom: 9, color: "#AEBBDC", display: "flex", gap: 8, textDecoration: "none" }}><Phone size={15} /> {settings.phone || PHONE_DISPLAY}</a>
          {settings.email && <a href={`mailto:${settings.email}`} style={{ fontSize: 13.5, marginBottom: 9, color: "#AEBBDC", display: "flex", gap: 8, textDecoration: "none" }}><Mail size={15} /> {settings.email}</a>}
          <div style={{ fontSize: 13.5, marginBottom: 9, color: "#AEBBDC", display: "flex", gap: 8 }}><MapPin size={15} /> {settings.address}</div>
          {hours && (
            <div style={{ marginTop: 8 }}>
              <div style={{ fontSize: 11, color: "#8395C2", fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.4, marginBottom: 6 }}>Hours</div>
              {["mon", "tue", "wed", "thu", "fri", "sat", "sun"].map((d) => (
                <div key={d} style={{ fontSize: 12, color: "#AEBBDC", display: "flex", justifyContent: "space-between", maxWidth: 200 }}>
                  <span style={{ textTransform: "capitalize" }}>{d}</span><span>{formatHoursLine(hours, d)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
        <div>
          <div style={{ fontWeight: 700, color: "#fff", marginBottom: 12, fontSize: 14 }}>Legal</div>
          <Link to="/privacy" style={{ display: "block", fontSize: 13.5, marginBottom: 9, color: "#AEBBDC", textDecoration: "none" }}>Privacy Policy</Link>
          <Link to="/terms" style={{ display: "block", fontSize: 13.5, marginBottom: 9, color: "#AEBBDC", textDecoration: "none" }}>Terms & Conditions</Link>
        </div>
      </div>
      <div style={{ textAlign: "center", marginTop: 32, fontSize: 12, color: "#6C7CA6" }}>
        © {new Date().getFullYear()} {settings.business_name || "Nyota Dry Cleaners & Laundry"}. We care for every step.
        {" · "}
        <button onClick={() => setShowCredit(true)} style={{ background: "none", border: "none", color: "#6C7CA6", fontSize: 12, cursor: "pointer", textDecoration: "underline", padding: 0 }}>Built by Darius</button>
      </div>

      {showCredit && (
        <div role="presentation" onMouseDown={(e) => e.target === e.currentTarget && setShowCredit(false)} style={{ position: "fixed", inset: 0, background: "rgba(16,42,114,0.4)", zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
          <div role="dialog" aria-modal="true" style={{ background: "#fff", borderRadius: 16, width: "100%", maxWidth: 320, padding: 22, textAlign: "center" }}>
            <div style={{ fontWeight: 800, fontSize: 16, color: C.navy, marginBottom: 4 }}>Darius</div>
            <div style={{ fontSize: 13, color: "#6B7695", marginBottom: 18 }}>Built this site</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <Button variant="primary" full onClick={() => window.open("tel:0110554040")}><Phone size={15} /> Call — 0110554040</Button>
              <Button variant="secondary" full onClick={() => window.open("mailto:dariusmomanyi678@gmail.com")}><Mail size={15} /> Email</Button>
              <button onClick={() => setShowCredit(false)} style={{ marginTop: 6, background: "none", border: "none", color: "#8792A8", fontSize: 13, cursor: "pointer" }}>Close</button>
            </div>
          </div>
        </div>
      )}
    </footer>
  );
}

export function WhatsAppFloat({ message }) {
  const href = `${WA_BASE}?text=${encodeURIComponent(message || "Hello Nyota Dry Cleaners, I would like to ask about laundry services.")}`;
  return (
    <a href={href} target="_blank" rel="noreferrer" style={{
      position: "fixed", bottom: 22, right: 22, zIndex: 60, width: 58, height: 58, borderRadius: "50%",
      background: C.whatsapp, display: "flex", alignItems: "center", justifyContent: "center",
      boxShadow: "0 6px 20px rgba(37,211,102,0.45)", textDecoration: "none",
    }} aria-label="Chat on WhatsApp">
      <MessageCircle size={28} color="#fff" fill="#fff" />
    </a>
  );
}
