import React, { useEffect, useState } from "react";
import { useParams, useLocation, useNavigate } from "react-router-dom";
import { CheckCircle2, MessageCircle, Copy, Check } from "lucide-react";
import { supabase } from "../lib/supabaseClient";
import { WA_BASE } from "../lib/constants";
import { Button, Section, H2, Chip, Spinner, EmptyState } from "../components/UI";
import { Badge } from "../components/UI";
import { TicketCard, DocumentActions } from "../components/Ticket";

export default function Confirmation() {
  const { requestNumber } = useParams();
  const location = useLocation();
  const nav = useNavigate();
  const phone = location.state?.phone || "";
  const [tab, setTab] = useState("ticket");
  const [record, setRecord] = useState(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    (async () => {
      const { data, error } = await supabase.rpc("track_request", {
        p_request_number: requestNumber,
        p_phone: phone || null,
      });
      if (!error && data && data.length > 0) setRecord(data[0]);
      setLoading(false);
    })();
  }, [requestNumber, phone]);

  async function copyRequestNumber() {
    try { await navigator.clipboard.writeText(record.public_request_number); } catch {}
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  }

  if (loading) return <Spinner label="Loading your confirmation…" />;
  if (!record) return <EmptyState title="We couldn't load that confirmation" desc="Try tracking your request instead using your request number and phone." />;

  return (
    <Section>
      <div className="no-print" style={{ textAlign: "center", marginBottom: 26 }}>
        <div style={{ width: 56, height: 56, borderRadius: "50%", background: "#E4F9EC", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 14px" }}>
          <CheckCircle2 size={30} color="#0C7A3D" />
        </div>
        <H2>Request Received ✓</H2>
        <p style={{ color: "#6B7695" }}>Thank you, {record.customer_name}. Your laundry request has been successfully received.</p>
        <button onClick={copyRequestNumber} style={{ display: "inline-flex", alignItems: "center", gap: 6, background: "none", border: "none", cursor: "pointer", fontSize: 13, fontWeight: 700, color: copied ? "#0C7A3D" : "#075FE5", margin: "6px 0" }}>
          {copied ? <><Check size={14} /> Copied!</> : <><Copy size={14} /> {record.public_request_number}</>}
        </button>
        <div style={{ marginTop: 6 }}><Badge status={record.status} /></div>
      </div>
      <div className="no-print" style={{ display: "flex", justifyContent: "center", gap: 8, marginBottom: 6 }}>
        <Chip active={tab === "ticket"} onClick={() => setTab("ticket")}>Ticket</Chip>
        <Chip active={tab === "receipt"} onClick={() => record.payment_status === "paid" && setTab("receipt")} disabled={record.payment_status !== "paid"}>
          Receipt{record.payment_status !== "paid" ? " 🔒" : ""}
        </Chip>
      </div>
      {record.payment_status !== "paid" && tab === "receipt" ? (
        <div className="no-print" style={{ textAlign: "center", color: "#8792A8", fontSize: 13, marginBottom: 14 }}>
          The receipt becomes available once payment is confirmed. Your ticket is available now below.
        </div>
      ) : null}
      <TicketCard req={record} kind={record.payment_status !== "paid" && tab === "receipt" ? "ticket" : tab} />
      <DocumentActions req={record} kind={record.payment_status !== "paid" && tab === "receipt" ? "ticket" : tab} />
      <div className="no-print" style={{ display: "flex", gap: 10, justifyContent: "center", flexWrap: "wrap", marginTop: 20 }}>
        <Button variant="primary" onClick={() => nav("/track")}>Track My Request</Button>
        <Button variant="whatsapp" onClick={() => window.open(`${WA_BASE}?text=${encodeURIComponent(`Hello Nyota Dry Cleaners, I am asking about request ${record.public_request_number}.`)}`, "_blank")}><MessageCircle size={16} /> WhatsApp Nyota</Button>
        <Button variant="ghost" onClick={() => nav("/")}>Back to Home</Button>
      </div>
    </Section>
  );
}
