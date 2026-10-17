import { jsPDF } from "jspdf";
import QRCode from "qrcode";
import { PHONE_DISPLAY, fmtDate, STATUS_LABEL } from "./constants";
import { trackingUrl } from "../components/RequestQR";

// Converts /logo-lockup.png into a data URL jsPDF can embed. Falls back to
// a plain text header if the fetch ever fails (e.g. offline) rather than
// blocking the whole download.
async function loadLogoDataUrl() {
  try {
    const res = await fetch("/logo-lockup.png");
    const blob = await res.blob();
    return await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

export async function downloadTicketPdf(req, kind = "ticket") {
  const [logoDataUrl, qrDataUrl] = await Promise.all([
    loadLogoDataUrl(),
    QRCode.toDataURL(trackingUrl(req.public_request_number), { width: 220, margin: 2, color: { dark: "#102A72", light: "#FFFFFF" } }),
  ]);

  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const marginX = 56;
  let y = 56;

  if (logoDataUrl) {
    try { doc.addImage(logoDataUrl, "PNG", marginX, y, 110, 40); } catch { /* corrupted/unsupported image — skip, header text still prints */ }
  }
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(7, 95, 229);
  doc.text(kind === "receipt" ? "SERVICE RECEIPT" : "SERVICE TICKET", pageWidth - marginX, y + 20, { align: "right" });
  y += 70;

  doc.setDrawColor(16, 42, 114);
  doc.setLineWidth(1.2);
  doc.roundedRect(marginX, y, pageWidth - marginX * 2, 56, 8, 8);
  doc.setTextColor(107, 118, 149);
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.text("REQUEST NUMBER", pageWidth / 2, y + 20, { align: "center" });
  doc.setTextColor(16, 42, 114);
  doc.setFontSize(18);
  doc.setFont("helvetica", "bold");
  doc.text(req.public_request_number, pageWidth / 2, y + 42, { align: "center" });
  y += 80;

  const serviceName = req.custom_service ? `Other — ${req.custom_service}` : req.service_name;
  const rows = [
    ["Customer", req.customer_name],
    ["Service", serviceName],
    ["Quantity", req.quantity_approx || "—"],
    ["Pickup / Drop-off", req.fulfillment_type === "pickup" ? `Pickup — ${req.pickup_area || ""}` : "Drop-off at shop"],
    ["Date", fmtDate(req.created_at)],
    ["Status", STATUS_LABEL[req.status] || req.status],
    ...(kind === "receipt" ? [
      ["Amount", req.amount ? `KES ${req.amount}` : "To Be Confirmed"],
      ["Payment Status", req.payment_status === "paid" ? "Paid" : "Unpaid"],
    ] : []),
  ];
  doc.setFontSize(11);
  rows.forEach(([label, value]) => {
    doc.setTextColor(135, 146, 168);
    doc.setFont("helvetica", "normal");
    doc.text(label, marginX, y);
    doc.setTextColor(16, 42, 114);
    doc.setFont("helvetica", "bold");
    doc.text(String(value), pageWidth - marginX, y, { align: "right" });
    doc.setDrawColor(231, 236, 246);
    doc.setLineWidth(0.5);
    doc.line(marginX, y + 8, pageWidth - marginX, y + 8);
    y += 26;
  });

  y += 20;
  const qrSize = 130;
  doc.addImage(qrDataUrl, "PNG", pageWidth / 2 - qrSize / 2, y, qrSize, qrSize);
  y += qrSize + 20;
  doc.setFontSize(9);
  doc.setTextColor(135, 146, 168);
  doc.setFont("helvetica", "normal");
  doc.text("Scan to track your laundry", pageWidth / 2, y, { align: "center" });
  y += 24;
  doc.text(`${PHONE_DISPLAY} · Kisii, Nyanchwa, near Kisii Eye Hospital`, pageWidth / 2, y, { align: "center" });

  doc.save(`${req.public_request_number}-${kind}.pdf`);
}
