import React, { useState } from "react";
import { Printer, Download, Loader2 } from "lucide-react";
import { C, PHONE_DISPLAY, fmtDate, STATUS_LABEL } from "../lib/constants";
import { Button } from "./UI";
import { RequestQR } from "./RequestQR";
import { downloadTicketPdf } from "../lib/generatePdf";

// `req` here is the customer-safe shape returned by the track_request() RPC,
// or the equivalent fields from a freshly-created request. It intentionally
// never includes internal_notes, assigned_worker_id, or raw ids.
export function TicketCard({ req, kind = "ticket" }) {
  const serviceName = req.custom_service ? `Other — ${req.custom_service}` : req.service_name;
  return (
    <div className="printable-ticket" style={{ background: "#fff", border: `2px solid ${C.royal}`, borderRadius: 16, padding: 26, maxWidth: 440, margin: "0 auto" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <img src="/logo-lockup.png" alt="Nyota Dry Cleaners" style={{ height: 30 }} />
        <div style={{ fontSize: 11, fontWeight: 700, color: C.bright, textTransform: "uppercase", letterSpacing: 1 }}>
          {kind === "receipt" ? "Service Receipt" : "Service Ticket"}
        </div>
      </div>
      <div style={{ background: C.paleBlue, borderRadius: 10, padding: "10px 14px", textAlign: "center", marginBottom: 16 }}>
        <div style={{ fontSize: 11, color: "#6B7695", fontWeight: 600 }}>REQUEST NUMBER</div>
        <div style={{ fontSize: 20, fontWeight: 800, color: C.navy, letterSpacing: 0.5 }}>{req.public_request_number}</div>
      </div>
      {[
        ["Customer", req.customer_name], ["Service", serviceName],
        ["Quantity", req.quantity_approx || "—"],
        ["Pickup / Drop-off", req.fulfillment_type === "pickup" ? `Pickup — ${req.pickup_area || ""}` : "Drop-off at shop"],
        ["Date", fmtDate(req.created_at)], ["Status", STATUS_LABEL[req.status] || req.status],
        ...(kind === "receipt" ? [["Amount", req.amount ? `KES ${req.amount}` : "To Be Confirmed"], ["Payment Status", req.payment_status === "paid" ? "Paid" : "Unpaid"]] : []),
      ].map(([l, v], i) => (
        <div key={i} style={{ display: "flex", justifyContent: "space-between", fontSize: 13, padding: "7px 0", borderBottom: "1px dashed #E7ECF6" }}>
          <span style={{ color: "#8792A8", fontWeight: 600 }}>{l}</span><span style={{ color: C.navy, fontWeight: 600 }}>{v}</span>
        </div>
      ))}
      <div style={{ display: "flex", justifyContent: "center", margin: "16px 0" }}>
        <RequestQR requestNumber={req.public_request_number} />
      </div>
      <div style={{ marginTop: 4, textAlign: "center", fontSize: 11.5, color: "#8792A8" }}>
        {PHONE_DISPLAY} · Kisii, Nyanchwa, near Kisii Eye Hospital<br />Track anytime under Track Request on our site.
      </div>
      {kind === "receipt" && req.payment_status !== "paid" && (
        <div style={{ marginTop: 10, fontSize: 10.5, color: "#B23131", textAlign: "center" }}>This is not proof of payment.</div>
      )}
    </div>
  );
}

export function DocumentActions({ req, kind }) {
  const [downloading, setDownloading] = useState(false);

  async function download() {
    setDownloading(true);
    try {
      await downloadTicketPdf(req, kind);
    } catch {
      alert("Couldn't generate the PDF. Please try again, or use Print instead.");
    } finally {
      setDownloading(false);
    }
  }

  return (
    <div className="no-print" style={{ display: "flex", gap: 10, justifyContent: "center", flexWrap: "wrap", marginTop: 16 }}>
      {req && (
        <Button variant="primary" onClick={download} disabled={downloading}>
          {downloading ? <Loader2 size={16} className="spin" /> : <Download size={16} />} Download PDF
        </Button>
      )}
      <Button variant="secondary" onClick={() => window.print()}><Printer size={16} /> Print</Button>
    </div>
  );
}
