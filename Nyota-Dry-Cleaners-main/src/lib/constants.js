export const C = {
  royal: "#0638B8",
  bright: "#075FE5",
  navy: "#102A72",
  white: "#FFFFFF",
  paleBlue: "#F5F8FF",
  softGray: "#EEF2F7",
  whatsapp: "#25D366",
  gold: "#FFD83D",
};

export const PHONE_DISPLAY = "0742 178 765";
export const PHONE_INTL = "254742178765";
export const WA_BASE = `https://wa.me/${PHONE_INTL}`;

// Mirrors public.normalize_kenyan_phone() in the SQL schema, so the UI can
// preview the normalized number before it ever reaches the database.
export function normalizeKenyanPhone(raw) {
  const digits = (raw || "").replace(/\D/g, "");
  if (digits.startsWith("254")) return digits;
  if (digits.startsWith("0")) return "254" + digits.slice(1);
  if (digits.length === 9) return "254" + digits;
  return digits;
}

export const STATUS_FLOW = [
  { key: "submitted", label: "Request Received" },
  { key: "confirmed", label: "Confirmed" },
  { key: "picked_up", label: "Clothes Received" },
  { key: "processing", label: "Cleaning" },
  { key: "ready", label: "Ready for Collection" },
  { key: "completed", label: "Completed" },
];
export const STATUS_LABEL = Object.fromEntries(STATUS_FLOW.map((s) => [s.key, s.label]));
STATUS_LABEL.cancelled = "Cancelled";

// The 47 Kenyan counties (2013 devolution boundaries) — used for the pickup
// location selector. NOTE: constituency and ward are deliberately kept as
// free-text fields rather than dependent dropdowns. A complete, accurate
// county → constituency → ward dataset (290 constituencies, ~1,450 wards)
// should be sourced from IEBC's official delimitation data before that
// level is turned into dropdowns — shipping a guessed/incomplete mapping
// would silently corrupt real pickup addresses, which is worse than a
// plain text field. Swap KENYA_COUNTIES/constituency logic out once that
// dataset is available; the Booking UI is already structured to take it.
export const KENYA_COUNTIES = [
  "Mombasa", "Kwale", "Kilifi", "Tana River", "Lamu", "Taita Taveta",
  "Garissa", "Wajir", "Mandera", "Marsabit", "Isiolo", "Meru",
  "Tharaka-Nithi", "Embu", "Kitui", "Machakos", "Makueni", "Nyandarua",
  "Nyeri", "Kirinyaga", "Murang'a", "Kiambu", "Turkana", "West Pokot",
  "Samburu", "Trans Nzoia", "Uasin Gishu", "Elgeyo-Marakwet", "Nandi",
  "Baringo", "Laikipia", "Nakuru", "Narok", "Kajiado", "Kericho", "Bomet",
  "Kakamega", "Vihiga", "Bungoma", "Busia", "Siaya", "Kisumu", "Homa Bay",
  "Migori", "Kisii", "Nyamira", "Nairobi",
].sort();

export const ITEM_TYPES = ["Shirts", "T-shirts", "Trousers", "Dresses", "Suits", "Jackets", "Bedsheets", "Blankets", "Curtains", "Towels", "Shoes", "Carpets", "Duvets"];
export const STAIN_TYPES = ["Oil", "Mud", "Food", "Ink", "Odour", "Unknown"];
export const MATERIAL_TYPES = ["Cotton", "Wool", "Silk", "Linen", "Leather", "Suede", "Polyester", "Mixed fabric", "Unknown"];

export function fmtDate(iso) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}
export function fmtDateTime(iso) {
  if (!iso) return "—";
  // Always shown in East Africa Time regardless of the viewer's own device
  // timezone, since the business and its customers operate in Kenya.
  return new Date(iso).toLocaleString("en-GB", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit", timeZone: "Africa/Nairobi" });
}
