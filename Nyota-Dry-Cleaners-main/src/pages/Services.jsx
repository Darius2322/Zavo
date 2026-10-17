import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Droplets, Shirt, Wind, Layers, Sparkles, HelpCircle, Square, Footprints } from "lucide-react";
import { supabase } from "../lib/supabaseClient";
import { C } from "../lib/constants";
import { Button, Section, Eyebrow, H2, Spinner } from "../components/UI";

// Icon + marketing copy per slug — kept as static metadata since these
// aren't stored in the database. Booking.jsx also imports this (as
// SERVICE_ICONS) purely to look up an icon by slug for its service picker.
// The actual name/description/price/image now come live from Supabase
// (via ServicesPage below) so admin's Services tab edits show up here.
export const SERVICES = [
  { id: "laundry", name: "Laundry Washing", desc: "Professional washing to remove dirt, stains and odors.", icon: Droplets,
    benefits: ["Deep-cleans everyday wear", "Safe on all fabrics", "Fresh, neutral scent"] },
  { id: "dry-cleaning", name: "Dry Cleaning", desc: "Specialized care for garments requiring dry cleaning.", icon: Shirt,
    benefits: ["Gentle on suits & delicates", "No shrinkage or fading", "Crisp, pressed finish"] },
  { id: "ironing", name: "Ironing", desc: "Clean and professionally pressed clothing.", icon: Wind,
    benefits: ["Sharp, wrinkle-free results", "Careful heat control", "Ready to wear or hang"] },
  { id: "folding", name: "Folding", desc: "Neatly folded clothing ready for storage or use.", icon: Layers,
    benefits: ["Tidy, uniform folds", "Saves you time at home", "Great for bulk laundry"] },
  { id: "deep-cleaning", name: "Deep Cleaning", desc: "Care for heavily soiled garments and difficult stains.", icon: Sparkles,
    benefits: ["Tackles tough stains", "Extra wash & rinse cycles", "Restores heavily used items"] },
  { id: "carpet-cleaning", name: "Carpet Cleaning", desc: "Professional cleaning for carpets and rugs.", icon: Square,
    benefits: ["Removes deep dirt & odour", "Safe for most carpet materials", "Fast, thorough drying"] },
  { id: "shoe-cleaning", name: "Shoe Cleaning", desc: "Cleaning and care for shoes and sneakers.", icon: Footprints,
    benefits: ["Restores shoes and sneakers", "Careful material-specific cleaning", "Great before big events"] },
  { id: "other", name: "Other", desc: "Tell us exactly what you need — we'll take it from there.", icon: HelpCircle,
    benefits: ["Describe your request in your own words", "No need to fit a fixed category", "Our team will confirm details with you"] },
];

export default function ServicesPage() {
  const nav = useNavigate();
  const [services, setServices] = useState(null);

  useEffect(() => {
    (async () => {
      // Only active services show publicly — matches admin's Enable/Disable
      // toggle in the Services tab.
      const { data } = await supabase.from("services").select("*").eq("is_active", true).order("sort_order");
      setServices(data || []);
    })();
  }, []);

  if (services === null) return <Spinner label="Loading services…" />;

  return (
    <Section>
      <Eyebrow>Our Services</Eyebrow>
      <H2>Everything your laundry needs, handled with care</H2>
      <div className="services-grid" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(280px,1fr))", gap: 20, marginTop: 28 }}>
        {services.map((s) => {
          const meta = SERVICES.find((m) => m.id === s.slug) || {};
          const Icon = meta.icon || HelpCircle;
          return (
            <div key={s.id} className="service-card" style={{ background: "#fff", border: "1px solid #E7ECF6", borderRadius: 16, overflow: "hidden" }}>
              {s.image_url ? (
                <img src={s.image_url} alt={s.name} style={{ width: "100%", height: 140, objectFit: "cover", display: "block" }} />
              ) : null}
              <div style={{ padding: 26 }}>
                {!s.image_url && (
                  <div style={{ width: 48, height: 48, borderRadius: 12, background: C.paleBlue, display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 14 }}>
                    <Icon size={24} color={C.royal} />
                  </div>
                )}
                <div style={{ fontWeight: 800, color: C.navy, fontSize: 18, marginBottom: 6, fontFamily: "'Plus Jakarta Sans', sans-serif" }}>{s.name}</div>
                <div className="service-desc" style={{ fontSize: 14, color: "#6B7695", marginBottom: 8, lineHeight: 1.55 }}>{s.description || meta.desc}</div>
                <div style={{ fontSize: 13, fontWeight: 700, color: C.royal, marginBottom: 14 }}>
                  {s.price_type === "fixed" && s.price_amount ? `KES ${s.price_amount}` : "Price on request"}
                </div>
                <ul className="service-benefits" style={{ margin: "0 0 18px", paddingLeft: 18 }}>
                  {(meta.benefits || []).map((b, i) => <li key={i} style={{ fontSize: 13, color: "#4A5578", marginBottom: 5 }}>{b}</li>)}
                </ul>
                {/* Prefills the booking wizard's service step — see Booking.jsx,
                    which reads ?service= via useSearchParams and preselects it,
                    including opening the custom-text field when slug is "other". */}
                <Button variant="primary" full onClick={() => nav(`/booking?service=${s.slug}`)}>Request This Service</Button>
              </div>
            </div>
          );
        })}
      </div>
      <style>{`
        /* Mobile: a tidy 2-column grid rather than one long vertical stack.
           Trim padding/typography slightly so two cards fit without feeling cramped. */
        @media (max-width: 640px) {
          .services-grid { grid-template-columns: repeat(2, 1fr) !important; gap: 12px !important; }
          .services-grid .service-card > div { padding: 14px !important; }
          .services-grid .service-card { border-radius: 12px !important; }
          .services-grid .service-desc {
            display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;
            font-size: 12.5px !important; margin-bottom: 8px !important;
          }
          .services-grid .service-benefits { display: none; }
        }
        @media (min-width: 641px) and (max-width: 1023px) {
          .services-grid { grid-template-columns: repeat(3, 1fr) !important; }
        }
        @media (min-width: 1024px) {
          .services-grid { grid-template-columns: repeat(4, 1fr) !important; }
        }
      `}</style>
    </Section>
  );
}
