import React, { useState } from "react";
import { supabase } from "../lib/supabaseClient";
import { Button, Field, TextInput, PasswordInput, H2 } from "./UI";

// Any logged-in staff member (worker, manager, admin) can change their own
// password this way — it only needs their existing session, no service-role
// key or Edge Function involved.
export function ChangePasswordModal({ onClose }) {
  const [pwd, setPwd] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [done, setDone] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setErr("");
    if (pwd.length < 8) { setErr("Password must be at least 8 characters."); return; }
    if (pwd !== confirm) { setErr("Passwords don't match."); return; }
    setBusy(true);
    const { error } = await supabase.auth.updateUser({ password: pwd });
    setBusy(false);
    if (error) { setErr(error.message); return; }
    setDone(true);
  }

  return (
    <div role="presentation" onMouseDown={(e) => e.target === e.currentTarget && onClose()} style={{ position: "fixed", inset: 0, background: "rgba(16,42,114,0.4)", zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
      {done ? (
        <div role="dialog" aria-modal="true" style={{ background: "#fff", borderRadius: 16, width: "100%", maxWidth: 360, padding: 22, textAlign: "center" }}>
          <div style={{ fontSize: 15, fontWeight: 800, color: "#0C7A3D", marginBottom: 14 }}>✓ Password updated</div>
          <Button variant="primary" full onClick={onClose}>Done</Button>
        </div>
      ) : (
        <form onSubmit={submit} role="dialog" aria-modal="true" style={{ background: "#fff", borderRadius: 16, width: "100%", maxWidth: 360, padding: 22 }}>
          <H2>Change Password</H2>
          {err && <div style={{ background: "#FCE8E8", color: "#B23131", padding: 10, borderRadius: 8, fontSize: 13, marginBottom: 12 }}>{err}</div>}
          <Field label="New password" required hint="At least 8 characters"><PasswordInput value={pwd} onChange={(e) => setPwd(e.target.value)} /></Field>
          <Field label="Confirm new password" required><PasswordInput value={confirm} onChange={(e) => setConfirm(e.target.value)} /></Field>
          <div style={{ display: "flex", gap: 10, marginTop: 18 }}>
            <Button type="button" variant="secondary" full onClick={onClose} disabled={busy}>Cancel</Button>
            <Button type="submit" variant="primary" full disabled={busy}>{busy ? "Saving…" : "Save"}</Button>
          </div>
        </form>
      )}
    </div>
  );
}
