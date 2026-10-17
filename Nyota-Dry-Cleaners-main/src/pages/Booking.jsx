import React, { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Check, ChevronLeft, ChevronRight, Loader2, AlertCircle, Phone, MessageCircle, MapPin, Zap, LocateFixed } from "lucide-react";
import { supabase } from "../lib/supabaseClient";
import { C, PHONE_DISPLAY, PHONE_INTL, WA_BASE, ITEM_TYPES, STAIN_TYPES, MATERIAL_TYPES, KENYA_COUNTIES, normalizeKenyanPhone } from "../lib/constants";
import { Button, Chip, Field, TextInput, TextArea, Select, SearchableSelect, Section, Eyebrow, H2, Spinner } from "../components/UI";
import { SERVICES as SERVICE_ICONS } from "./Services";

const STEP_LABELS = ["Service", "Details", "Fulfillment", "Contact", "Review"];

function SectionHeading({ children }) {
  return (
    <div style={{ fontSize: 12.5, fontWeight: 800, color: C.royal, textTransform: "uppercase", letterSpacing: 0.6, margin: "26px 0 14px", paddingBottom: 8, borderBottom: "1px solid #EDF1F8" }}>
      {children}
    </div>
  );
}

function StepProgress({ step }) {
  return (
    <div style={{ display: "flex", alignItems: "flex-start", marginBottom: 30, overflowX: "auto", padding: "2px 0 4px" }}>
      {STEP_LABELS.map((l, i) => (
        <React.Fragment key={l}>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", minWidth: 56, position: "relative", zIndex: 1 }}>
            <div style={{ width: 28, height: 28, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", background: i < step ? C.royal : i === step ? C.bright : "#E7ECF6", color: i <= step ? "#fff" : "#8792A8", fontWeight: 700, fontSize: 12.5, boxShadow: "0 0 0 4px #fff" }}>
              {i < step ? <Check size={14} /> : i + 1}
            </div>
            <div style={{ fontSize: 10, color: i <= step ? C.navy : "#A6AFC6", marginTop: 5, fontWeight: 600, textAlign: "center", maxWidth: 60, lineHeight: 1.15 }}>{l}</div>
          </div>
          {i < STEP_LABELS.length - 1 && (
            <div style={{ flex: 1, height: 2, background: i < step ? C.royal : "#E7ECF6", margin: "13px -6px 0", minWidth: 14, position: "relative", zIndex: 0 }} />
          )}
        </React.Fragment>
      ))}
    </div>
  );
}

const DRAFT_KEY = "nyota-booking-draft"; // sessionStorage only — survives an accidental refresh, cleared on submit

export default function Booking() {
  const nav = useNavigate();
  const [params] = useSearchParams();
  const preselect = params.get("service");

  const [services, setServices] = useState([]);
  const [loadingServices, setLoadingServices] = useState(true);
  const [step, setStep] = useState(0);

  // The wizard is a single page (no route change between steps), so the
  // route-level ScrollToTop in App.jsx never fires here — each step change
  // needs its own scroll-to-top so "Continue" doesn't leave the customer
  // wherever the previous step's page happened to end.
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [step]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const [data, setData] = useState(() => {
    try {
      const saved = sessionStorage.getItem(DRAFT_KEY);
      if (saved) return JSON.parse(saved);
    } catch {}
    return {
      serviceSlug: preselect || "",
      customService: "",
      quantityApprox: "",
      quantityUnsure: false,
      items: [], // [{name, quantity, isCustom, notes}]
      customItemText: "",
      weightApprox: "",
      weightUnsure: false,
      specialCare: "",
      stains: [],
      stainOther: "",
      generalNotes: "",
      fulfillment: "dropoff",
      pickupArea: "",
      pickupLocation: "",
      pickupDirections: "",
      pickupDate: "",
      pickupTime: "",
      pickupNow: false,
      pickupCounty: "",
      pickupConstituency: "",
      pickupWard: "",
      pickupLat: null,
      pickupLng: null,
      pickupAccuracy: null,
      name: "",
      phone: "",
      email: "",
      material: "",
      customMaterial: "",
      hasCollector: false,
      collectorName: "",
      collectorPhone: "",
      collectorRelationship: "",
      collectorNote: "",
    };
  });

  // Generated once per booking attempt and sent with the submission so a
  // retry (network blip, double-tap) can never create a duplicate request —
  // the server-side RPC treats a repeated id as "already submitted" and
  // just returns the original request instead of inserting a new one.
  const [submissionId] = useState(() => {
    try {
      const saved = sessionStorage.getItem(DRAFT_KEY + "-submission-id");
      if (saved) return saved;
    } catch {}
    const id = crypto.randomUUID();
    try { sessionStorage.setItem(DRAFT_KEY + "-submission-id", id); } catch {}
    return id;
  });

  const [locating, setLocating] = useState(false);
  const [locationError, setLocationError] = useState("");

  function useMyLocation() {
    if (!navigator.geolocation) {
      setLocationError("Location isn't supported on this device/browser.");
      return;
    }
    setLocating(true);
    setLocationError("");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setData((d) => ({
          ...d,
          pickupLat: pos.coords.latitude,
          pickupLng: pos.coords.longitude,
          pickupAccuracy: pos.coords.accuracy,
        }));
        setLocating(false);
      },
      () => {
        setLocationError("We couldn't get your location. You can still enter it manually below.");
        setLocating(false);
      },
      { enableHighAccuracy: true, timeout: 12000 }
    );
  }

  useEffect(() => {
    sessionStorage.setItem(DRAFT_KEY, JSON.stringify(data));
  }, [data]);

  useEffect(() => {
    (async () => {
      const { data: rows, error } = await supabase.from("services").select("id,slug,name").eq("is_active", true).order("sort_order");
      if (!error && rows) setServices(rows);
      setLoadingServices(false);
    })();
  }, []);

  const set = (k, v) => setData((d) => ({ ...d, [k]: v }));
  const toggleItemType = (name) =>
    setData((d) => {
      const exists = d.items.find((i) => i.name === name);
      return { ...d, items: exists ? d.items.filter((i) => i.name !== name) : [...d.items, { name, quantity: "", isCustom: false }] };
    });
  const setItemQty = (name, qty) => setData((d) => ({ ...d, items: d.items.map((i) => (i.name === name ? { ...i, quantity: qty } : i)) }));
  const addCustomItem = () => {
    if (!data.customItemText.trim()) return;
    setData((d) => ({ ...d, items: [...d.items, { name: d.customItemText.trim(), quantity: "", isCustom: true }], customItemText: "" }));
  };
  const removeItem = (idx) => setData((d) => ({ ...d, items: d.items.filter((_, i) => i !== idx) }));
  const toggleStain = (s) => setData((d) => ({ ...d, stains: d.stains.includes(s) ? d.stains.filter((x) => x !== s) : [...d.stains, s] }));

  const service = services.find((s) => s.slug === data.serviceSlug);
  const normalizedPhone = normalizeKenyanPhone(data.phone);

  function canNext() {
    if (step === 0) return !!data.serviceSlug && (data.serviceSlug !== "other" || data.customService.trim().length > 2);
    if (step === 2) {
      if (data.fulfillment === "dropoff") return true;
      const hasTiming = data.pickupNow || (data.pickupDate && data.pickupTime.trim());
      return data.pickupArea.trim() && data.pickupLocation.trim() && hasTiming;
    }
    if (step === 3) return data.name.trim().length > 1 && normalizedPhone.length >= 12;
    return true;
  }

  async function submit() {
    if (submitting) return; // guards against a double-tap firing two submits before state updates
    setSubmitting(true);
    setError("");
    try {
      const stainNotes = [...data.stains, data.stainOther.trim()].filter(Boolean).join(", ");
      const isPickup = data.fulfillment === "pickup";

      let preferredDateTime = null;
      if (isPickup && data.pickupNow) {
        preferredDateTime = new Date().toISOString();
      } else if (isPickup && data.pickupDate && data.pickupTime.trim()) {
        // pickupTime is a free-text HH:MM from a <input type="time">
        const [h, m] = data.pickupTime.trim().split(":").map(Number);
        const dt = new Date(`${data.pickupDate}T00:00:00`);
        if (!Number.isNaN(h)) dt.setHours(h, m || 0, 0, 0);
        preferredDateTime = dt.toISOString();
      }

      // Submits through a single SECURITY DEFINER RPC (see migration 002)
      // instead of insert().select() — anonymous customers have no SELECT
      // policy on service_requests, so selecting the row back after an
      // insert used to fail even though the insert itself had succeeded.
      // This also makes the whole submission one transaction and makes
      // retries safe via submissionId.
      const { data: rows, error: rpcErr } = await supabase.rpc("submit_service_request", {
        p_customer_name: data.name.trim(),
        p_phone_display: data.phone.trim(),
        p_email: data.email.trim() || null,
        p_service_id: service ? service.id : null,
        p_custom_service: data.serviceSlug === "other" ? data.customService.trim() : null,
        p_quantity_approx: data.quantityUnsure ? "Not sure" : data.quantityApprox.trim() || null,
        p_weight_approx: data.weightUnsure ? "Not sure" : data.weightApprox.trim() || null,
        p_special_care: data.specialCare.trim() || null,
        p_stain_notes: stainNotes || null,
        p_general_notes: data.generalNotes.trim() || null,
        p_fulfillment_type: data.fulfillment,
        p_pickup_area: isPickup ? data.pickupArea.trim() : null,
        p_pickup_location: isPickup ? data.pickupLocation.trim() : null,
        p_pickup_directions: isPickup ? data.pickupDirections.trim() : null,
        p_pickup_date: isPickup && !data.pickupNow ? data.pickupDate : null,
        p_pickup_time: isPickup && !data.pickupNow ? data.pickupTime.trim() : null,
        p_pickup_now: isPickup ? !!data.pickupNow : false,
        p_preferred_pickup_datetime: preferredDateTime,
        p_pickup_lat: isPickup ? data.pickupLat : null,
        p_pickup_lng: isPickup ? data.pickupLng : null,
        p_pickup_accuracy_m: isPickup ? data.pickupAccuracy : null,
        p_pickup_county: isPickup ? data.pickupCounty || null : null,
        p_pickup_constituency: isPickup ? data.pickupConstituency.trim() || null : null,
        p_pickup_ward: isPickup ? data.pickupWard.trim() || null : null,
        p_material: data.material === "Other" ? "Other" : data.material || null,
        p_custom_material: data.material === "Other" ? data.customMaterial.trim() || null : null,
        p_collector_name: data.hasCollector ? data.collectorName.trim() || null : null,
        p_collector_phone: data.hasCollector ? data.collectorPhone.trim() || null : null,
        p_collector_relationship: data.hasCollector ? data.collectorRelationship.trim() || null : null,
        p_collector_note: data.hasCollector ? data.collectorNote.trim() || null : null,
        p_items: data.items.map((i) => ({ name: i.name, quantity: i.quantity || null, isCustom: i.isCustom })),
        p_client_submission_id: submissionId,
      });

      if (rpcErr) throw rpcErr;
      const inserted = rows && rows[0];
      if (!inserted) throw new Error("No request returned from submission.");

      sessionStorage.removeItem(DRAFT_KEY);
      sessionStorage.removeItem(DRAFT_KEY + "-submission-id");
      nav(`/confirmation/${inserted.public_request_number}`, {
        state: { requestNumber: inserted.public_request_number, phone: data.phone.trim() },
      });
    } catch (e) {
      console.error(e);
      setError("We couldn't submit your request. Please check your connection and try again, or WhatsApp us directly.");
    } finally {
      setSubmitting(false);
    }
  }

  if (loadingServices) return <Spinner label="Loading services…" />;

  return (
    <div style={{ position: "relative" }}>
      {/* Subtle blurred photography behind the booking panel — heavily
          blurred and low-opacity so it reads as ambience, never competing
          with the sharp white form panel sitting on top of it. */}
      <div aria-hidden="true" style={{
        position: "absolute", inset: 0, backgroundImage: "url(/images/laundromat-wide.jpg)",
        backgroundSize: "cover", backgroundPosition: "center", filter: "blur(18px)",
        transform: "scale(1.1)", opacity: 0.22, zIndex: 0,
      }} />
      <Section style={{ position: "relative", zIndex: 1 }}>
      <div style={{ maxWidth: 640, margin: "0 auto", background: "#fff", borderRadius: 20, padding: "32px 28px", boxShadow: "0 10px 40px rgba(16,42,114,0.08)" }}>
        {step === 0 && (
          <div className="nyota-fade-in" style={{ borderRadius: 16, overflow: "hidden", marginBottom: 22, maxHeight: 200 }}>
            <img src="/images/hotel-cleaning-cart.jpg" alt="Professional cleaning service" style={{ width: "100%", height: 200, objectFit: "cover", objectPosition: "center 30%", display: "block" }} />
          </div>
        )}
        <Eyebrow>Book a Service</Eyebrow>
        <H2>Let's get your laundry sorted</H2>
        <StepProgress step={step} />

        {step === 0 && (
          <div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(150px,1fr))", gap: 12 }}>
              {services.map((s) => {
                const meta = SERVICE_ICONS.find((x) => x.id === s.slug) || {};
                const Icon = meta.icon;
                return (
                  <div key={s.id} onClick={() => set("serviceSlug", s.slug)} style={{ cursor: "pointer", borderRadius: 12, padding: 16, border: `2px solid ${data.serviceSlug === s.slug ? C.royal : "#E7ECF6"}`, background: data.serviceSlug === s.slug ? C.paleBlue : "#fff", textAlign: "center" }}>
                    {Icon && <Icon size={22} color={C.royal} style={{ marginBottom: 8 }} />}
                    <div style={{ fontSize: 13, fontWeight: 700, color: C.navy }}>{s.name}</div>
                  </div>
                );
              })}
            </div>
            {data.serviceSlug === "other" && (
              <div style={{ marginTop: 18 }}>
                <Field label="Tell us what service you need" required>
                  <TextArea value={data.customService} onChange={(e) => set("customService", e.target.value)} placeholder="Describe the laundry service you need..." />
                </Field>
              </div>
            )}
          </div>
        )}

        {step === 1 && (
          <div>
            <SectionHeading>Item Details</SectionHeading>
            <Field label="Material / Fabric" hint="Optional — helps us clean it correctly">
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 10 }}>
                {MATERIAL_TYPES.map((m) => <Chip key={m} active={data.material === m} onClick={() => set("material", data.material === m ? "" : m)}>{m}</Chip>)}
                <Chip active={data.material === "Other"} onClick={() => set("material", data.material === "Other" ? "" : "Other")}>Other</Chip>
              </div>
              {data.material === "Other" && (
                <TextInput value={data.customMaterial} onChange={(e) => set("customMaterial", e.target.value)} placeholder="Describe the material" />
              )}
            </Field>

            <Field label={data.serviceSlug === "carpet-cleaning" ? "Approximate carpet size" : "Approximate quantity"} hint={data.serviceSlug === "carpet-cleaning" ? 'e.g. "Large living room rug, about 3x4m"' : 'Rough numbers are fine, e.g. "17" or "a basketful"'}>
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <TextInput value={data.quantityApprox} disabled={data.quantityUnsure} onChange={(e) => set("quantityApprox", e.target.value)} placeholder="e.g. 17" />
                <Chip active={data.quantityUnsure} onClick={() => set("quantityUnsure", !data.quantityUnsure)}>Not sure</Chip>
              </div>
            </Field>

            <Field label="Type of clothing / items" hint="Select all that apply, or add your own">
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 10 }}>
                {ITEM_TYPES.map((t) => <Chip key={t} active={!!data.items.find((i) => i.name === t)} onClick={() => toggleItemType(t)}>{t}</Chip>)}
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <TextInput value={data.customItemText} onChange={(e) => set("customItemText", e.target.value)} placeholder="Other item — e.g. 2 school sweaters" />
                <Button variant="subtle" onClick={addCustomItem}>Add</Button>
              </div>
              {data.items.length > 0 && (
                <div style={{ marginTop: 12, display: "flex", flexDirection: "column", gap: 6 }}>
                  {data.items.map((it, idx) => (
                    <div key={idx} style={{ display: "flex", gap: 8, alignItems: "center" }}>
                      <div style={{ flex: 1, fontSize: 13, color: C.navy, fontWeight: 600 }}>{it.name}</div>
                      <TextInput value={it.quantity} onChange={(e) => setItemQty(it.name, e.target.value)} placeholder="qty" style={{ width: 90 }} />
                      <button onClick={() => removeItem(idx)} style={{ background: "none", border: "none", color: "#B23131", cursor: "pointer", fontSize: 12 }}>Remove</button>
                    </div>
                  ))}
                </div>
              )}
            </Field>

            <Field label="Approximate weight" hint='Optional — e.g. "4.5 kg"'>
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <TextInput value={data.weightApprox} disabled={data.weightUnsure} onChange={(e) => set("weightApprox", e.target.value)} placeholder="e.g. 4.5 kg" />
                <Chip active={data.weightUnsure} onClick={() => set("weightUnsure", !data.weightUnsure)}>Not sure</Chip>
              </div>
            </Field>

            <SectionHeading>Additional Details</SectionHeading>
            <Field label="Special care instructions" hint="Optional">
              <TextArea value={data.specialCare} onChange={(e) => set("specialCare", e.target.value)} placeholder="e.g. Please handle the white dress separately." />
            </Field>

            <Field label="Any stains or special concerns?" hint="Select any that apply, or describe below">
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 10 }}>
                {STAIN_TYPES.map((s) => <Chip key={s} active={data.stains.includes(s)} onClick={() => toggleStain(s)}>{s}</Chip>)}
              </div>
              <TextInput value={data.stainOther} onChange={(e) => set("stainOther", e.target.value)} placeholder="Describe — e.g. red wine stain on the front" />
            </Field>

            <Field label="Anything else we should know?" hint="Optional">
              <TextArea value={data.generalNotes} onChange={(e) => set("generalNotes", e.target.value)} />
            </Field>
          </div>
        )}

        {step === 2 && (
          <div>
            <SectionHeading>Pickup / Delivery Information</SectionHeading>
            <Field label="How would you like to get your laundry to us?" required>
              <div style={{ display: "flex", gap: 10 }}>
                <Chip active={data.fulfillment === "dropoff"} onClick={() => set("fulfillment", "dropoff")}>I'll Drop It Off</Chip>
                <Chip active={data.fulfillment === "pickup"} onClick={() => set("fulfillment", "pickup")}>I Need Pickup</Chip>
              </div>
            </Field>
            {data.fulfillment === "dropoff" ? (
              <div style={{ background: C.paleBlue, borderRadius: 12, padding: 18 }}>
                <div style={{ display: "flex", gap: 10, marginBottom: 12 }}>
                  <MapPin size={18} color={C.royal} style={{ flexShrink: 0, marginTop: 2 }} />
                  <div style={{ fontSize: 13.5, color: "#4A5578" }}>Bring your laundry to Nyota Dry Cleaners, Kisii, Nyanchwa, near Kisii Eye Hospital.</div>
                </div>
                <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                  <Button variant="secondary" onClick={() => window.open(`tel:${PHONE_INTL}`)}><Phone size={15} /> Call for Directions</Button>
                  <Button variant="whatsapp" onClick={() => window.open(`${WA_BASE}?text=${encodeURIComponent("Hello Nyota Dry Cleaners, could you send me directions to your shop?")}`, "_blank")}><MessageCircle size={15} /> WhatsApp for Directions</Button>
                </div>
              </div>
            ) : (
              <>
                <Field label="County" hint="Search and select — helps us route your pickup correctly">
                  <SearchableSelect value={data.pickupCounty} onChange={(v) => set("pickupCounty", v)} options={KENYA_COUNTIES} placeholder="Search county…" />
                </Field>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                  <Field label="Constituency" hint="Optional">
                    <TextInput value={data.pickupConstituency} onChange={(e) => set("pickupConstituency", e.target.value)} placeholder="e.g. Kitutu Chache South" />
                  </Field>
                  <Field label="Ward" hint="Optional">
                    <TextInput value={data.pickupWard} onChange={(e) => set("pickupWard", e.target.value)} placeholder="e.g. Nyaribari" />
                  </Field>
                </div>
                <Field label="Pickup area / estate" required hint='e.g. "Nyanchwa" or "Daraja Mbili"'>
                  <TextInput value={data.pickupArea} onChange={(e) => set("pickupArea", e.target.value)} placeholder="Area" />
                </Field>
                <Field label="Specific pickup location" required hint="Landmark or detailed place name">
                  <TextInput value={data.pickupLocation} onChange={(e) => set("pickupLocation", e.target.value)} placeholder="e.g. Near Kisii Eye Hospital, blue gate" />
                </Field>
                <Field label="Additional pickup directions" hint="Optional — anything that helps our team find you">
                  <TextArea value={data.pickupDirections} onChange={(e) => set("pickupDirections", e.target.value)} placeholder="e.g. Call me when you reach the main road. The house has a blue gate." />
                </Field>

                <Field label="Precise location" hint="Optional — helps our rider find you faster">
                  {data.pickupLat != null ? (
                    <div style={{ background: "#E4F9EC", border: "1px solid #BFEAD0", borderRadius: 10, padding: 12, fontSize: 13, color: "#0C7A3D", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8 }}>
                      <span>📍 Location detected{data.pickupAccuracy ? ` — accuracy: approximately ${Math.round(data.pickupAccuracy)}m` : ""}</span>
                      <button type="button" onClick={useMyLocation} style={{ background: "none", border: "none", color: "#0C7A3D", fontWeight: 700, fontSize: 12.5, cursor: "pointer", textDecoration: "underline" }}>Try Again</button>
                    </div>
                  ) : (
                    <Button variant="secondary" onClick={useMyLocation} disabled={locating}>
                      {locating ? <><Loader2 size={15} className="spin" /> Getting location…</> : <><LocateFixed size={15} /> Use My Current Location</>}
                    </Button>
                  )}
                  {locationError && <div style={{ fontSize: 12, color: "#B23131", marginTop: 6 }}>{locationError}</div>}
                  {data.pickupLat == null && !locationError && (
                    <div style={{ fontSize: 12, color: "#8792A8", marginTop: 6 }}>Allow location access to help us find your pickup location more accurately. We only ask when you tap the button above.</div>
                  )}
                </Field>

                <Field label="When should we pick up?" required>
                  <div style={{ display: "flex", gap: 10, marginBottom: 12 }}>
                    <button type="button" onClick={() => set("pickupNow", true)} style={{
                      flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 8, padding: "13px 16px", borderRadius: 10, cursor: "pointer",
                      border: `2px solid ${data.pickupNow ? "#B23131" : "#E7ECF6"}`, background: data.pickupNow ? "#FCE8E8" : "#fff", color: data.pickupNow ? "#B23131" : C.navy, fontWeight: 700, fontSize: 14,
                    }}><Zap size={16} /> Pick Now</button>
                    <button type="button" onClick={() => set("pickupNow", false)} style={{
                      flex: 1, padding: "13px 16px", borderRadius: 10, cursor: "pointer",
                      border: `2px solid ${!data.pickupNow ? C.royal : "#E7ECF6"}`, background: !data.pickupNow ? C.paleBlue : "#fff", color: C.navy, fontWeight: 700, fontSize: 14,
                    }}>Schedule a Time</button>
                  </div>
                  {data.pickupNow ? (
                    <div style={{ background: "#FCE8E8", color: "#B23131", borderRadius: 10, padding: 12, fontSize: 13.5, fontWeight: 600 }}>🔴 Pickup requested now — as soon as our team can get to you.</div>
                  ) : (
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                      <Field label="Preferred date" required>
                        <TextInput type="date" value={data.pickupDate} min={new Date().toISOString().slice(0, 10)} onChange={(e) => set("pickupDate", e.target.value)} />
                      </Field>
                      <Field label="Preferred time" required hint="Any time that works for you">
                        <TextInput type="time" value={data.pickupTime} onChange={(e) => set("pickupTime", e.target.value)} />
                      </Field>
                    </div>
                  )}
                </Field>
                <div style={{ fontSize: 12.5, color: "#8792A8", marginTop: -6 }}>We'll contact you to confirm the pickup details.</div>
              </>
            )}
          </div>
        )}

        {step === 3 && (
          <div>
            <SectionHeading>Customer Details</SectionHeading>
            <Field label="Full name" required><TextInput value={data.name} onChange={(e) => set("name", e.target.value)} placeholder="e.g. Jane Wanjiru" /></Field>
            <Field label="Phone number" required hint={normalizedPhone.length >= 12 ? `We'll reach you (and WhatsApp you) at +${normalizedPhone}` : "Used to verify your request when tracking"}>
              <TextInput value={data.phone} onChange={(e) => set("phone", e.target.value)} placeholder="07XX XXX XXX" />
            </Field>
            <Field label="Email" hint="Optional"><TextInput type="email" value={data.email} onChange={(e) => set("email", e.target.value)} placeholder="you@example.com" /></Field>

            <div style={{ marginTop: 24, paddingTop: 20, borderTop: "1px solid #EDF1F8" }}>
              <Chip active={data.hasCollector} onClick={() => set("hasCollector", !data.hasCollector)}>Someone Else Will Hand Over / Collect</Chip>
              {data.hasCollector && (
                <div style={{ marginTop: 14 }}>
                  <div style={{ fontSize: 12.5, color: "#8792A8", marginBottom: 12 }}>
                    Your details above stay the ones we use to verify and track this request — this is just so our team knows who to expect in person.
                  </div>
                  <Field label="Their name"><TextInput value={data.collectorName} onChange={(e) => set("collectorName", e.target.value)} placeholder="e.g. John Otieno" /></Field>
                  <Field label="Their phone number" hint="Optional"><TextInput value={data.collectorPhone} onChange={(e) => set("collectorPhone", e.target.value)} placeholder="07XX XXX XXX" /></Field>
                  <Field label="Relationship" hint='Optional — e.g. "Brother", "Colleague"'><TextInput value={data.collectorRelationship} onChange={(e) => set("collectorRelationship", e.target.value)} /></Field>
                  <Field label="Note" hint="Optional"><TextArea value={data.collectorNote} onChange={(e) => set("collectorNote", e.target.value)} placeholder="e.g. John will hand over the clothes for me." /></Field>
                </div>
              )}
            </div>
          </div>
        )}

        {step === 4 && (
          <div>
            <div style={{ background: "#fff", border: "1px solid #E7ECF6", borderRadius: 14, padding: 22 }}>
              {[
                ["Service", data.serviceSlug === "other" ? `Other — ${data.customService}` : service?.name],
                ["Quantity", data.quantityUnsure ? "Not sure" : data.quantityApprox || "—"],
                ["Items", data.items.map((i) => `${i.name}${i.quantity ? ` (${i.quantity})` : ""}`).join(", ") || "—"],
                ["Weight", data.weightUnsure ? "Not sure" : data.weightApprox || "—"],
                ["Special care", data.specialCare || "—"],
                ["Stains", [...data.stains, data.stainOther].filter(Boolean).join(", ") || "—"],
                ["Notes", data.generalNotes || "—"],
                ["Fulfillment", data.fulfillment === "dropoff" ? "Drop-off at shop" : "Pickup"],
                ...(data.fulfillment === "pickup" ? [
                  ...(data.pickupCounty ? [["County", [data.pickupCounty, data.pickupConstituency, data.pickupWard].filter(Boolean).join(" / ")]] : []),
                  ["Pickup area", data.pickupArea], ["Pickup location", data.pickupLocation],
                  ["Directions", data.pickupDirections || "—"],
                  ["Pickup timing", data.pickupNow ? "🔴 As soon as possible (Pick Now)" : `${data.pickupDate} ${data.pickupTime}`],
                  ...(data.pickupLat != null ? [["Precise location", "Captured ✓"]] : []),
                ] : []),
                ["Material", data.material === "Other" ? data.customMaterial || "—" : data.material || "—"],
                ["Name", data.name], ["Phone", data.phone], ["Email", data.email || "—"],
                ...(data.hasCollector ? [["Collector", [data.collectorName, data.collectorRelationship].filter(Boolean).join(" — ") || "—"]] : []),
              ].map(([label, val], i) => (
                <div key={i} style={{ display: "flex", justifyContent: "space-between", gap: 12, padding: "9px 0", borderBottom: "1px solid #F0F3FA" }}>
                  <div style={{ fontSize: 12.5, color: "#8792A8", fontWeight: 600, flexShrink: 0, width: 130 }}>{label}</div>
                  <div style={{ fontSize: 13.5, color: C.navy, flex: 1, textAlign: "right" }}>{val}</div>
                </div>
              ))}
              <div style={{ textAlign: "right", marginTop: 14 }}>
                <button onClick={() => setStep(0)} style={{ background: "none", border: "none", color: C.bright, fontWeight: 600, fontSize: 13, cursor: "pointer" }}>Edit request</button>
              </div>
            </div>
            {error && (
              <div style={{ marginTop: 14, background: "#FCE8E8", color: "#B23131", padding: 14, borderRadius: 10, fontSize: 13.5 }}>
                <div style={{ display: "flex", gap: 8, marginBottom: 10 }}><AlertCircle size={17} style={{ flexShrink: 0 }} />{error}</div>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  <Button variant="secondary" style={{ padding: "8px 14px", fontSize: 13 }} onClick={submit} disabled={submitting}>Try Again</Button>
                  <Button variant="whatsapp" style={{ padding: "8px 14px", fontSize: 13 }} onClick={() => window.open(`${WA_BASE}?text=${encodeURIComponent("Hello Nyota Dry Cleaners, I'm having trouble submitting my laundry request on the site.")}`, "_blank")}><MessageCircle size={14} /> WhatsApp Us</Button>
                </div>
              </div>
            )}
          </div>
        )}

        <div style={{ display: "flex", justifyContent: "space-between", marginTop: 28 }}>
          <Button variant="ghost" onClick={() => setStep((s) => Math.max(0, s - 1))} style={{ visibility: step === 0 ? "hidden" : "visible" }}><ChevronLeft size={16} /> Back</Button>
          {step < 4 ? (
            <Button variant="primary" disabled={!canNext()} onClick={() => setStep((s) => s + 1)}>Continue <ChevronRight size={16} /></Button>
          ) : (
            <Button variant="primary" disabled={submitting} onClick={submit}>{submitting ? <><Loader2 size={16} className="spin" /> Submitting…</> : "Submit Laundry Request"}</Button>
          )}
        </div>
      </div>
      </Section>
    </div>
  );
}
