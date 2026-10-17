import React, { useLayoutEffect } from "react";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import { NavBar, Footer, WhatsAppFloat } from "./components/Layout";

import Home from "./pages/Home";
import ServicesPage from "./pages/Services";
import Booking from "./pages/Booking";
import Confirmation from "./pages/Confirmation";
import TrackPage from "./pages/Track";
import GalleryPage from "./pages/Gallery";
import ReviewsPage from "./pages/Reviews";
import { AboutPage, PickupDeliveryPage, ContactPage, FAQPage, PrivacyPage, TermsPage } from "./pages/Static";
import AdminLogin from "./pages/AdminLogin";
import AdminDashboard from "./pages/AdminDashboard";
import WorkerLogin from "./pages/WorkerLogin";
import WorkerDashboard from "./pages/WorkerDashboard";

function PublicLayout({ children }) {
  return (
    <>
      <NavBar />
      {children}
      <Footer />
      <WhatsAppFloat />
    </>
  );
}

// Route-level scroll restoration: every navigation scrolls to the top of
// the new page. This runs independently of the mobile drawer's own
// scroll-lock/restore (see Layout.jsx), which only concerns itself with
// putting the customer back where they were on the *same* page when the
// menu closes without navigating anywhere.
function ScrollToTop() {
  const { pathname } = useLocation();
  useLayoutEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  return null;
}

// Subtle fade+slide on every route change — short enough (220ms) to feel
// fast rather than decorative.
function PageTransition({ children }) {
  const { pathname } = useLocation();
  return (
    <div key={pathname} style={{ animation: "nyota-page-in .22s ease" }}>
      {children}
      <style>{`
        @keyframes nyota-page-in { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: translateY(0); } }
        @media (prefers-reduced-motion: reduce) {
          @keyframes nyota-page-in { from { opacity: 1; } to { opacity: 1; } }
        }
      `}</style>
    </div>
  );
}

function Shell() {
  const loc = useLocation();
  const isStaff = loc.pathname.startsWith("/admin") || loc.pathname.startsWith("/worker");

  const routes = (
    <PageTransition>
      <Routes location={loc}>
        <Route path="/" element={<Home />} />
        <Route path="/services" element={<ServicesPage />} />
        <Route path="/booking" element={<Booking />} />
        <Route path="/confirmation/:requestNumber" element={<Confirmation />} />
        <Route path="/track" element={<TrackPage />} />
        <Route path="/gallery" element={<GalleryPage />} />
        <Route path="/reviews" element={<ReviewsPage />} />
        <Route path="/about" element={<AboutPage />} />
        <Route path="/pickup-delivery" element={<PickupDeliveryPage />} />
        <Route path="/contact" element={<ContactPage />} />
        <Route path="/faq" element={<FAQPage />} />
        <Route path="/privacy" element={<PrivacyPage />} />
        <Route path="/terms" element={<TermsPage />} />

        {/* Staff routes: reachable only by direct URL, never linked from public nav/footer. */}
        <Route path="/admin" element={<AdminLogin />} />
        <Route path="/admin/dashboard" element={<AdminDashboard />} />
        <Route path="/worker/login" element={<WorkerLogin />} />
        <Route path="/worker/dashboard" element={<WorkerDashboard />} />
      </Routes>
    </PageTransition>
  );

  return (
    <>
      <ScrollToTop />
      {isStaff ? routes : <PublicLayout>{routes}</PublicLayout>}
    </>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <Shell />
    </BrowserRouter>
  );
}
