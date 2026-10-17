import React from "react";
import { Eye, EyeOff } from "lucide-react";
import { C, STATUS_LABEL } from "../lib/constants";

export function Button({ children, variant = "primary", onClick, style, type = "button", disabled, full }) {
  const base = {
    fontFamily: "'Inter', sans-serif", fontWeight: 700, fontSize: 15, borderRadius: 10,
    padding: "13px 22px", border: "none", cursor: disabled ? "not-allowed" : "pointer",
    display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 8,
    transition: "transform .15s ease, box-shadow .15s ease, opacity .15s ease",
    width: full ? "100%" : "auto", opacity: disabled ? 0.6 : 1,
  };
  const variants = {
    primary: { background: `linear-gradient(135deg, ${C.bright}, ${C.royal})`, color: "#fff", boxShadow: "0 4px 14px rgba(7,95,229,0.3)" },
    secondary: { background: C.white, color: C.royal, border: `2px solid ${C.royal}` },
    whatsapp: { background: C.whatsapp, color: "#fff", boxShadow: "0 4px 14px rgba(37,211,102,0.35)" },
    ghost: { background: "transparent", color: C.navy },
    subtle: { background: C.softGray, color: C.navy },
    gold: { background: C.gold, color: C.navy },
    danger: { background: "#FCE8E8", color: "#B23131" },
  };
  return (
    <button type={type} disabled={disabled} onClick={onClick}
      onMouseEnter={(e) => !disabled && (e.currentTarget.style.transform = "translateY(-1px)")}
      onMouseLeave={(e) => (e.currentTarget.style.transform = "translateY(0)")}
      style={{ ...base, ...variants[variant], ...style }}>
      {children}
    </button>
  );
}

export function Chip({ active, onClick, children, disabled }) {
  return (
    <button onClick={onClick} type="button" disabled={disabled} style={{
      padding: "9px 15px", borderRadius: 999, border: `2px solid ${active ? C.royal : "#DDE4F0"}`,
      background: active ? C.royal : "#fff", color: disabled ? "#B7BFD4" : active ? "#fff" : C.navy,
      fontFamily: "'Inter', sans-serif", fontWeight: 600, fontSize: 13.5, cursor: disabled ? "not-allowed" : "pointer",
      opacity: disabled ? 0.7 : 1,
    }}>{children}</button>
  );
}

export function Field({ label, required, children, hint }) {
  return (
    <div style={{ marginBottom: 18 }}>
      <label style={{ display: "block", fontFamily: "'Inter', sans-serif", fontWeight: 600, fontSize: 13.5, color: C.navy, marginBottom: 7 }}>
        {label} {required && <span style={{ color: "#D64545" }}>*</span>}
      </label>
      {children}
      {hint && <div style={{ fontSize: 12, color: "#8792A8", marginTop: 5 }}>{hint}</div>}
    </div>
  );
}

const inputStyle = {
  width: "100%", padding: "12px 14px", borderRadius: 10, border: "1.5px solid #DDE4F0",
  fontFamily: "'Inter', sans-serif", fontSize: 14.5, color: C.navy, background: "#fff", boxSizing: "border-box", outline: "none",
};
export function TextInput(props) {
  return <input {...props} style={{ ...inputStyle, ...(props.style || {}) }} onFocus={(e) => (e.target.style.borderColor = C.bright)} onBlur={(e) => (e.target.style.borderColor = "#DDE4F0")} />;
}
export function TextArea(props) {
  return <textarea {...props} style={{ ...inputStyle, resize: "vertical", minHeight: 90, ...(props.style || {}) }} onFocus={(e) => (e.target.style.borderColor = C.bright)} onBlur={(e) => (e.target.style.borderColor = "#DDE4F0")} />;
}
export function Select(props) {
  return <select {...props} style={{ ...inputStyle, ...(props.style || {}) }} />;
}

// A password field with a show/hide toggle — used anywhere staff type or
// set a password (login, change password, add worker, reset password).
export function PasswordInput(props) {
  const [visible, setVisible] = React.useState(false);
  return (
    <div style={{ position: "relative" }}>
      <input
        {...props}
        type={visible ? "text" : "password"}
        style={{ ...inputStyle, paddingRight: 42, ...(props.style || {}) }}
        onFocus={(e) => (e.target.style.borderColor = C.bright)}
        onBlur={(e) => (e.target.style.borderColor = "#DDE4F0")}
      />
      <button
        type="button"
        onClick={() => setVisible((v) => !v)}
        aria-label={visible ? "Hide password" : "Show password"}
        tabIndex={-1}
        style={{ position: "absolute", right: 4, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", padding: 8, color: "#8792A8", display: "flex" }}
      >
        {visible ? <EyeOff size={17} /> : <Eye size={17} />}
      </button>
    </div>
  );
}

// A searchable dropdown for long lists (e.g. Kenya's 47 counties) — a plain
// <select> is painful to use on mobile once it has more than a handful of
// options, so this pairs a text filter with a scrollable option list.
export function SearchableSelect({ value, onChange, options, placeholder }) {
  const [open, setOpen] = React.useState(false);
  const [query, setQuery] = React.useState("");
  const boxRef = React.useRef(null);

  React.useEffect(() => {
    function onDocClick(e) {
      if (boxRef.current && !boxRef.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener("mousedown", onDocClick);
    document.addEventListener("touchstart", onDocClick);
    return () => {
      document.removeEventListener("mousedown", onDocClick);
      document.removeEventListener("touchstart", onDocClick);
    };
  }, []);

  const filtered = options.filter((o) => o.toLowerCase().includes(query.toLowerCase()));

  return (
    <div ref={boxRef} style={{ position: "relative" }}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        style={{ ...inputStyle, textAlign: "left", cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "center", color: value ? C.navy : "#8792A8" }}
      >
        {value || placeholder || "Select…"}
        <span style={{ fontSize: 11, color: "#8792A8" }}>▼</span>
      </button>
      {open && (
        <div style={{ position: "absolute", zIndex: 30, top: "calc(100% + 4px)", left: 0, right: 0, background: "#fff", border: "1.5px solid #DDE4F0", borderRadius: 10, boxShadow: "0 10px 30px rgba(16,42,114,0.15)", overflow: "hidden" }}>
          <input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={`Search…`}
            style={{ ...inputStyle, border: "none", borderBottom: "1px solid #EDF1F8", borderRadius: 0 }}
          />
          <div style={{ maxHeight: 220, overflowY: "auto" }}>
            {filtered.length === 0 && <div style={{ padding: 12, fontSize: 13, color: "#8792A8" }}>No matches</div>}
            {filtered.map((o) => (
              <div
                key={o}
                onClick={() => { onChange(o); setOpen(false); setQuery(""); }}
                style={{ padding: "10px 14px", fontSize: 14, cursor: "pointer", color: C.navy, background: o === value ? C.paleBlue : "#fff" }}
              >
                {o}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export function Badge({ status, label }) {
  const map = {
    submitted: ["#EEF2F7", C.navy], confirmed: ["#E4ECFF", C.royal], picked_up: ["#E4ECFF", C.royal],
    processing: ["#FFF6D8", "#8A6D00"], ready: ["#E4F9EC", "#0C7A3D"], completed: ["#E4F9EC", "#0C7A3D"],
    cancelled: ["#FCE8E8", "#B23131"],
  };
  const [bg, fg] = map[status] || ["#EEF2F7", C.navy];
  return <span style={{ background: bg, color: fg, fontSize: 12.5, fontWeight: 700, padding: "5px 12px", borderRadius: 999, fontFamily: "'Inter', sans-serif" }}>{label || STATUS_LABEL[status] || status}</span>;
}

export function Section({ children, bg, style }) {
  return <section style={{ padding: "56px 20px", background: bg || "transparent", ...style }}><div style={{ maxWidth: 1080, margin: "0 auto" }}>{children}</div></section>;
}
export function Eyebrow({ children, style }) {
  return <div style={{ color: C.bright, fontWeight: 800, fontSize: 13, letterSpacing: 1.2, textTransform: "uppercase", marginBottom: 10, fontFamily: "'Inter', sans-serif", ...style }}>{children}</div>;
}
export function H2({ children }) {
  return <h2 style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 800, fontSize: "clamp(26px,4vw,36px)", color: C.navy, margin: "0 0 14px", letterSpacing: -0.5 }}>{children}</h2>;
}

export function EmptyState({ icon: Icon, title, desc }) {
  return (
    <div style={{ textAlign: "center", padding: "48px 20px", color: "#8792A8" }}>
      {Icon && <Icon size={32} style={{ marginBottom: 10, opacity: 0.6 }} />}
      <div style={{ fontWeight: 700, color: C.navy, marginBottom: 4 }}>{title}</div>
      {desc && <div style={{ fontSize: 13.5 }}>{desc}</div>}
    </div>
  );
}

export function Spinner({ label }) {
  return (
    <div style={{ padding: 60, textAlign: "center", color: "#8792A8" }}>
      <div className="spin" style={{ display: "inline-block", width: 22, height: 22, border: "3px solid #DDE4F0", borderTopColor: C.royal, borderRadius: "50%" }} />
      {label && <div style={{ marginTop: 10, fontSize: 13.5 }}>{label}</div>}
    </div>
  );
}
