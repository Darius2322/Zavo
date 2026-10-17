import { useEffect, useState } from "react";
import { supabase } from "./supabaseClient";
import { PHONE_DISPLAY, PHONE_INTL, WA_BASE } from "./constants";

const DAY_KEYS = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"];
const DAY_LABELS = { mon: "Monday", tue: "Tuesday", wed: "Wednesday", thu: "Thursday", fri: "Friday", sat: "Saturday", sun: "Sunday" };

// Sensible fallback so the site still renders correctly before the
// business_settings row loads, or if it's ever missing.
const FALLBACK = {
  business_name: "Nyota Dry Cleaners & Laundry",
  tagline: "Fresh. Clean. Perfect.",
  phone: PHONE_DISPLAY,
  whatsapp_number: PHONE_INTL,
  address: "Kisii, Nyanchwa, near Kisii Eye Hospital",
  maps_url: null,
  email: null,
  business_hours: null,
};

export function useBusinessSettings() {
  const [settings, setSettings] = useState(FALLBACK);
  const [socials, setSocials] = useState([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    (async () => {
      const [{ data: bs }, { data: sl }] = await Promise.all([
        supabase.from("business_settings").select("*").eq("id", 1).single(),
        supabase.from("social_links").select("*").eq("is_active", true),
      ]);
      if (bs) setSettings(bs);
      if (sl) setSocials(sl);
      setLoaded(true);
    })();
  }, []);

  const waBase = settings.whatsapp_number ? `https://wa.me/${settings.whatsapp_number}` : WA_BASE;

  return { settings, socials, loaded, waBase, DAY_KEYS, DAY_LABELS };
}

export function formatHoursLine(hours, dayKey) {
  const d = hours?.[dayKey];
  if (!d || d.closed) return "Closed";
  if (!d.open || !d.close) return "—";
  return `${d.open} – ${d.close}`;
}
