import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { ShieldCheck, Lock } from "lucide-react";
import { supabase } from "../lib/supabaseClient";
import { Section, H2, Field, TextInput, PasswordInput, Button } from "../components/UI";

export default function AdminLogin() {
  const nav = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);

  async function login() {
    setLoading(true);
    setErr("");
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) { setErr(error.message); setLoading(false); return; }

    const { data: profile } = await supabase.from("profiles").select("role,is_active").eq("id", data.user.id).single();
    if (!profile || !profile.is_active) {
      setErr("This account isn't set up for admin access.");
      await supabase.auth.signOut();
      setLoading(false);
      return;
    }
    if (profile.role !== "admin") {
      setErr("This account doesn't have admin access. Managers and workers should use Worker login instead.");
      await supabase.auth.signOut();
      setLoading(false);
      return;
    }
    await supabase.from("profiles").update({ last_login_at: new Date().toISOString() }).eq("id", data.user.id);
    nav("/admin/dashboard");
  }

  return (
    <Section>
      <div style={{ maxWidth: 380, margin: "0 auto", textAlign: "center" }}>
        <ShieldCheck size={34} color="#0638B8" style={{ marginBottom: 10 }} />
        <H2>Admin Login</H2>
        <p style={{ color: "#6B7695", fontSize: 13, marginBottom: 18 }}>Sign in with the email and password set up for your Nyota staff account.</p>
        <Field label="Email" required><TextInput type="email" value={email} onChange={(e) => setEmail(e.target.value)} /></Field>
        <Field label="Password" required><PasswordInput value={password} onChange={(e) => setPassword(e.target.value)} onKeyDown={(e) => e.key === "Enter" && login()} /></Field>
        {err && <div style={{ color: "#B23131", fontSize: 13, marginBottom: 12 }}>{err}</div>}
        <Button variant="primary" full disabled={loading} onClick={login}><Lock size={16} /> {loading ? "Signing in…" : "Log In"}</Button>
        <div style={{ marginTop: 14 }}><Link to="/worker/login" style={{ color: "#075FE5", fontSize: 13, fontWeight: 600, textDecoration: "none" }}>Staff member? Worker login →</Link></div>
      </div>
    </Section>
  );
}
