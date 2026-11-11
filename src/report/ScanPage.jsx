/**
 * /r/:token: the page a voucher's QR code opens. Always fetched fresh from the server (no cached copy), so it
 * shows the trip's current figures, status and "last updated" time, with the scanned voucher's row highlighted.
 * Staff must sign in unless the backend runs with PUBLIC_TRIP_REPORT=true.
 */
import { useCallback, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { IS_LIVE } from "../booking/api";
import { useSession } from "../booking/auth";
import { AuthDialog } from "../booking/AuthDialog";
import { apiRequest } from "../booking/live/liveApi";
import { RoundTripSheet } from "./RoundTripSheet";
import { stamp } from "./format";
import "./report.css";

export default function ScanPage() {
  const { token } = useParams();
  const session = useSession();
  const [state, setState] = useState({ kind: "loading" });
  const [authOpen, setAuthOpen] = useState(false);

  const load = useCallback(async () => {
    setState((s) => (s.kind === "ok" ? { ...s, refreshing: true } : { kind: "loading" }));
    try {
      const { data } = await apiRequest(`/reports/r/${encodeURIComponent(token)}`, { auth: Boolean(session) });
      setState({ kind: "ok", report: data, loadedAt: new Date() });
    } catch (e) {
      const msg = e.message || "";
      if (e.code === "AUTH_REQUIRED") setState({ kind: "signin", msg });
      else if (e.code === "NOT_FOUND") setState({ kind: "notfound", msg });
      else if (/staff/i.test(msg)) setState({ kind: "forbidden", msg });
      else setState({ kind: "error", msg: msg || "The report could not be loaded." });
    }
  }, [token, session?.accessToken]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    document.documentElement.lang = "en";
    document.documentElement.dir = "ltr";
    if (IS_LIVE) load();
  }, [load]);

  useEffect(() => {
    if (state.kind === "ok") document.title = `Round Trip Report – Trip ${state.report.trip.id}`;
  }, [state]);

  const notice = (title, body, actions) => (
    <div className="rtr">
      <div className="notice" role={state.kind === "loading" ? "status" : "alert"}>
        <h1>{title}</h1>
        <p>{body}</p>
        {actions && <div className="buttons">{actions}</div>}
      </div>
      <AuthDialog lang="en" open={authOpen} onClose={() => setAuthOpen(false)} onSuccess={() => setAuthOpen(false)} />
    </div>
  );

  if (!IS_LIVE) return notice("Reports need the live system", "This website is running in demo mode (VITE_API_MODE=mock).");
  if (state.kind === "loading") return notice("Opening the report…", "One moment.");
  if (state.kind === "signin")
    return notice("Sign in to see this report", "Trip reports contain financial figures, so only New Khan staff can open them.", <button type="button" onClick={() => setAuthOpen(true)}>Sign in</button>);
  if (state.kind === "forbidden") return notice("Staff only", state.msg, <Link to="/en">Back to website</Link>);
  if (state.kind === "notfound")
    return notice("This link is not valid", "The QR code may have been replaced by a new one. Ask the office for the current voucher or report.");
  if (state.kind === "error") return notice("Could not load the report", state.msg, <button type="button" onClick={load}>Try again</button>);

  const { report, loadedAt, refreshing } = state;
  const scanned = report.scannedVoucherId
    ? report.legs.flatMap((l) => l.rows).find((r) => r.voucherId === report.scannedVoucherId)
    : null;
  return (
    <div className="rtr">
      <div className="toolbar no-print">
        <span className="live" aria-live="polite">
          {report.trip.status === "finalized" ? "Finalized" : "Draft"} · last updated {stamp(report.trip.updatedAt)}
          {scanned ? ` · scanned voucher ${scanned.voucherNo} (${scanned.terminal})` : ""}
          {` · loaded ${stamp(loadedAt)}`}
        </span>
        <span className="buttons">
          <button type="button" onClick={load} disabled={refreshing}>{refreshing ? "Refreshing…" : "Refresh"}</button>
          <button type="button" onClick={() => window.print()}>Download PDF</button>
        </span>
      </div>
      <RoundTripSheet report={report} printedAt={loadedAt} />
    </div>
  );
}
