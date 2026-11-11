import { lazy, Suspense, useEffect } from "react";
import { BrowserRouter, Navigate, Outlet, Route, Routes, useLocation, useParams } from "react-router-dom";
import { BookingSearchWithQuery } from "./booking/BookingSearch";
import { BookingByParam } from "./booking/BookingView";
import { ManageClient } from "./booking/ManageClient";
import { MyBookings } from "./booking/MyBookings";
import { GatewayClient, PayClient } from "./booking/PayClients";
import { ResultsClient } from "./booking/ResultsClient";
import { SeatsClient } from "./booking/SeatsClient";
import { BookShell } from "./booking/Shell";
import { Footer, Header, LangDialog, StickyBar, TopBar, WhatsappFloat } from "./components/Chrome";
import { dirOf, isLang, u } from "./lib/i18n";
import { useLang } from "./lib/useLang";
import { usePageMeta } from "./components/parts";
import { Toaster } from "./components/Toast";
import About from "./pages/About";
import { Cargo, Charter } from "./pages/Enquiries";
import Fleet from "./pages/Fleet";
import Home from "./pages/Home";
import { NotFound } from "./pages/NotFound";
import Policies, { Privacy, Terms } from "./pages/Policies";
import { BusToPage, RoutePage } from "./pages/RoutePages";
import Terminals from "./pages/Terminals";
import AuthCallback from "./pages/AuthCallback";
import Account from "./pages/Account";

/** Admin panel: a separate bundle, downloaded only when /admin is opened. */
const AdminApp = lazy(() => import("./admin/AdminApp"));
/** Round Trip Report opened by a voucher QR code (/r/<token>): its own bundle and print styles. */
const ScanPage = lazy(() => import("./report/ScanPage"));

/** Sets <html lang/dir>, scrolls to the top (or the #hash) on navigation, and draws the site chrome. */
function Layout() {
  const { lang: param } = useParams();
  const { pathname, hash } = useLocation();
  const lang = useLang();

  useEffect(() => {
    document.documentElement.lang = lang;
    document.documentElement.dir = dirOf(lang);
  }, [lang]);

  useEffect(() => {
    if (hash) document.getElementById(hash.slice(1))?.scrollIntoView();
    else window.scrollTo(0, 0);
  }, [pathname, hash]);

  if (!isLang(param)) return <Navigate to={`/en${pathname}`} replace />;

  return (
    <>
      <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:z-50 focus:bg-gold focus:p-3 focus:text-black">{u("skip", lang)}</a>
      <TopBar lang={lang} />
      <Header lang={lang} />
      <main id="main" className="pk-main">
        <Outlet />
      </main>
      <Footer lang={lang} />
      <StickyBar lang={lang} />
      <WhatsappFloat lang={lang} />
      <LangDialog lang={lang} />
      <Toaster lang={lang} />
    </>
  );
}

/** /auth/callback -> /en/auth/callback, keeping "?..." and "#..." (the email link's result). */
function ToLang() {
  const { pathname, search, hash } = useLocation();
  return <Navigate to={`/en${pathname}${search}${hash}`} replace />;
}

/** One booking screen inside the common booking frame. */
function Book({ title, Screen }) {
  const lang = useLang();
  usePageMeta();
  return (
    <BookShell lang={lang} title={title}>
      {Screen === BookingSearchWithQuery ? (
        <div className="mt-6">
          <Screen lang={lang} />
        </div>
      ) : (
        <Screen lang={lang} />
      )}
    </BookShell>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/en" replace />} />
        {/* Email links (confirm account, reset password) land here; keep what Supabase put after # and ?. */}
        <Route path="/auth/callback" element={<ToLang />} />
        <Route
          path="/admin/*"
          element={
            <Suspense fallback={<p className="p-6 text-mute">Loading admin…</p>}>
              <AdminApp />
            </Suspense>
          }
        />
        <Route
          path="/r/:token"
          element={
            <Suspense fallback={<p className="p-6 text-mute">Opening the report…</p>}>
              <ScanPage />
            </Suspense>
          }
        />
        <Route path="/:lang" element={<Layout />}>
          <Route index element={<Home />} />
          <Route path="about" element={<About />} />
          <Route path="fleet" element={<Fleet />} />
          <Route path="routes" element={<Fleet />} />
          <Route path="routes/to/:city" element={<BusToPage />} />
          <Route path="routes/:slug" element={<RoutePage />} />
          <Route path="terminals" element={<Terminals />} />
          <Route path="auth/callback" element={<AuthCallback />} />
          <Route path="account" element={<Account />} />
          <Route path="policies" element={<Policies />} />
          <Route path="privacy" element={<Privacy />} />
          <Route path="terms" element={<Terms />} />
          <Route path="cargo" element={<Cargo />} />
          <Route path="charter" element={<Charter />} />
          <Route path="book" element={<Book title="bookTitle" Screen={BookingSearchWithQuery} />} />
          <Route path="book/results" element={<Book title="resultsTitle" Screen={ResultsClient} />} />
          <Route path="book/seats" element={<Book title="seatsTitle" Screen={SeatsClient} />} />
          <Route path="book/reserved" element={<Book title="statusHELD" Screen={BookingByParam} />} />
          <Route path="book/pay" element={<Book title="payTitle" Screen={PayClient} />} />
          <Route path="book/gateway" element={<Book title="payTitle" Screen={GatewayClient} />} />
          <Route path="book/confirmed" element={<Book title="statusCONFIRMED" Screen={BookingByParam} />} />
          <Route path="book/booking" element={<Book title="bookingDetailsTitle" Screen={BookingByParam} />} />
          <Route path="book/manage" element={<Book title="manageTitle" Screen={ManageClient} />} />
          <Route path="book/my-bookings" element={<Book title="myBookingsTitle" Screen={MyBookings} />} />
          <Route path="*" element={<NotFound />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
