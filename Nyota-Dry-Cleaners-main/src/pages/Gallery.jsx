import React, { useEffect, useState } from "react";
import { Image as ImageIcon, X, ChevronLeft, ChevronRight } from "lucide-react";
import { supabase } from "../lib/supabaseClient";
import { C } from "../lib/constants";
import { Section, Eyebrow, H2, Spinner, EmptyState, Chip } from "../components/UI";

const CATEGORIES = ["All", "Laundry", "Dry Cleaning", "Washing", "Ironing", "Folding", "Pickup & Delivery", "Location", "Behind the Scenes"];

export default function GalleryPage() {
  const [images, setImages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [cat, setCat] = useState("All");
  const [lightboxIdx, setLightboxIdx] = useState(null); // index into `filtered`

  useEffect(() => {
    (async () => {
      const { data, error } = await supabase
        .from("gallery")
        .select("id, storage_path, category, caption, is_featured")
        .eq("is_published", true)
        .order("sort_order");
      if (!error && data) {
        setImages(
          data.map((row) => ({
            ...row,
            url: supabase.storage.from("gallery").getPublicUrl(row.storage_path).data.publicUrl,
          }))
        );
      }
      setLoading(false);
    })();
  }, []);

  const filtered = cat === "All" ? images : images.filter((i) => i.category === cat);

  useEffect(() => {
    if (lightboxIdx === null) return;
    function onKey(e) {
      if (e.key === "Escape") setLightboxIdx(null);
      if (e.key === "ArrowRight") setLightboxIdx((i) => (i + 1) % filtered.length);
      if (e.key === "ArrowLeft") setLightboxIdx((i) => (i - 1 + filtered.length) % filtered.length);
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [lightboxIdx, filtered.length]);

  return (
    <Section>
      <Eyebrow>Gallery</Eyebrow>
      <H2>A look at our work</H2>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", margin: "16px 0 24px" }}>
        {CATEGORIES.map((c) => <Chip key={c} active={cat === c} onClick={() => setCat(c)}>{c}</Chip>)}
      </div>
      {loading ? (
        <Spinner label="Loading photos…" />
      ) : filtered.length === 0 ? (
        <EmptyState icon={ImageIcon} title="No photos published yet" desc="Check back soon — the Nyota team updates this regularly." />
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))", gap: 14 }}>
          {filtered.map((img, idx) => (
            <button
              key={img.id}
              onClick={() => setLightboxIdx(idx)}
              style={{ borderRadius: 14, overflow: "hidden", border: "1px solid #E7ECF6", aspectRatio: "1/1", position: "relative", padding: 0, cursor: "pointer", background: "none" }}
            >
              <img src={img.url} alt={img.caption || img.category} style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} loading="lazy" />
              {img.caption && <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, background: "rgba(16,42,114,0.75)", color: "#fff", fontSize: 11.5, padding: "6px 8px", textAlign: "left" }}>{img.caption}</div>}
            </button>
          ))}
        </div>
      )}

      {lightboxIdx !== null && filtered[lightboxIdx] && (
        <div
          role="presentation"
          onMouseDown={(e) => e.target === e.currentTarget && setLightboxIdx(null)}
          style={{ position: "fixed", inset: 0, background: "rgba(8,16,40,0.92)", zIndex: 300, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}
        >
          <button onClick={() => setLightboxIdx(null)} aria-label="Close" style={{ position: "absolute", top: 20, right: 20, background: "rgba(255,255,255,0.15)", border: "none", borderRadius: 8, width: 38, height: 38, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
            <X size={20} color="#fff" />
          </button>
          {filtered.length > 1 && (
            <button onClick={() => setLightboxIdx((i) => (i - 1 + filtered.length) % filtered.length)} aria-label="Previous" style={{ position: "absolute", left: 12, background: "rgba(255,255,255,0.15)", border: "none", borderRadius: 8, width: 42, height: 42, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
              <ChevronLeft size={22} color="#fff" />
            </button>
          )}
          <div style={{ maxWidth: "90vw", maxHeight: "82vh", display: "flex", flexDirection: "column", alignItems: "center" }}>
            <img src={filtered[lightboxIdx].url} alt={filtered[lightboxIdx].caption || ""} style={{ maxWidth: "100%", maxHeight: "72vh", borderRadius: 12, objectFit: "contain" }} />
            {filtered[lightboxIdx].caption && <div style={{ color: "#fff", fontSize: 14, marginTop: 14, textAlign: "center" }}>{filtered[lightboxIdx].caption}</div>}
          </div>
          {filtered.length > 1 && (
            <button onClick={() => setLightboxIdx((i) => (i + 1) % filtered.length)} aria-label="Next" style={{ position: "absolute", right: 12, background: "rgba(255,255,255,0.15)", border: "none", borderRadius: 8, width: 42, height: 42, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
              <ChevronRight size={22} color="#fff" />
            </button>
          )}
        </div>
      )}
    </Section>
  );
}
