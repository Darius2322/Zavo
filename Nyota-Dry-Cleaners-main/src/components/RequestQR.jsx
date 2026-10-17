import React, { useEffect, useRef } from "react";
import QRCode from "qrcode";
import { C } from "../lib/constants";

// The QR encodes ONLY the secure tracking URL — never customer name, phone,
// or any other private detail. Scanning it opens /track with the request
// number prefilled; the customer must still enter their phone/email to see
// anything sensitive (see Track.jsx + track_request() RPC).
export function trackingUrl(requestNumber) {
  return `${window.location.origin}/track?request=${encodeURIComponent(requestNumber)}`;
}

export function RequestQR({ requestNumber, size = 132, caption = "Scan to track your laundry" }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    if (!canvasRef.current || !requestNumber) return;
    QRCode.toCanvas(canvasRef.current, trackingUrl(requestNumber), {
      width: size,
      margin: 2, // quiet zone so it stays scannable when printed
      color: { dark: "#102A72", light: "#FFFFFF" },
    }).catch(() => {});
  }, [requestNumber, size]);

  if (!requestNumber) return null;

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6, padding: 10, background: "#fff", borderRadius: 12, border: "1px solid #E7ECF6" }}>
      <canvas ref={canvasRef} width={size} height={size} style={{ display: "block" }} />
      <div style={{ fontSize: 12, fontWeight: 700, color: C.navy, letterSpacing: 0.3 }}>{requestNumber}</div>
      <div style={{ fontSize: 10.5, color: "#8792A8" }}>{caption}</div>
    </div>
  );
}
