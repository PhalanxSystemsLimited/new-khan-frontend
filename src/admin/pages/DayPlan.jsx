/**
 * Day plan (managers and admins), /admin/day-plan.
 * The day's (or week's) trips as a timetable: time, route and stop times, bus, driver, conductor, hostess, seats.
 * Publish it the day before, then download it: PDF (WhatsApp group, notice board), CSV (office), or both.
 * Anything changed after publishing is marked, so the admin knows to publish and share again.
 */
import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { adminApi } from "../api";
import { act, Badge, Btn, ErrorNote, Filters, Input, Label, Page, pkDate, Section, Select, StatusBadge, Table, useConfirm, useLoad } from "../ui";

import { addDays, byTerminal, downloadBlob, longDate, makeCsv, makePdf, stamp, stopsText, time } from "../dayPlanFiles";

/* ------------------------------------------------------------------ download menu */

const FORMATS = [
  { kind: "pdf", label: "PDF", hint: "For the WhatsApp group and notice board" },
  { kind: "csv", label: "CSV", hint: "Opens in Excel, for the office" },
  { kind: "both", label: "Both (PDF + CSV)", hint: "If your browser asks, choose Allow" },
];

/**
 * A button that opens a small menu: PDF, CSV or both. Closes on a choice, Escape or a click elsewhere;
 * arrow keys move between the choices.
 */
function DownloadMenu({ label, disabled, onPick }) {
  const [open, setOpen] = useState(false);
  const [toRight, setToRight] = useState(true); // open rightwards from the button when there is room, else leftwards
  const box = useRef(null);
  const items = () => [...(box.current?.querySelectorAll('[role="menuitem"]') ?? [])];

  useEffect(() => {
    if (!open) return undefined;
    items()[0]?.focus();
    const away = (e) => box.current && !box.current.contains(e.target) && setOpen(false);
    document.addEventListener("mousedown", away);
    document.addEventListener("touchstart", away);
    return () => {
      document.removeEventListener("mousedown", away);
      document.removeEventListener("touchstart", away);
    };
  }, [open]);

  function onKey(e) {
    if (e.key === "Escape") {
      setOpen(false);
      box.current?.querySelector("button")?.focus();
      return;
    }
    if (e.key !== "ArrowDown" && e.key !== "ArrowUp") return;
    e.preventDefault();
    const list = items();
    const at = list.indexOf(document.activeElement);
    const next = e.key === "ArrowDown" ? (at + 1) % list.length : (at - 1 + list.length) % list.length;
    list[next]?.focus();
  }

  return (
    <div className="relative inline-block" ref={box} onKeyDown={onKey}>
      <Btn kind="primary" disabled={disabled} aria-haspopup="menu" aria-expanded={open} onClick={() => {
          const r = box.current?.getBoundingClientRect();
          if (r) setToRight(r.left + 288 <= window.innerWidth - 8);
          setOpen((o) => !o);
        }}>
        {label}
        <svg aria-hidden viewBox="0 0 12 12" width="12" height="12" className={`ms-1 transition-transform ${open ? "rotate-180" : ""}`}>
          <path d="M2.5 4.5 6 8l3.5-3.5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </Btn>
      {open && (
        <div role="menu" aria-label="Download as" className={`absolute top-full z-30 mt-2 w-72 max-w-[calc(100vw-2rem)] rounded-xl border-2 border-black bg-white p-1 shadow-lg ${toRight ? "left-0" : "right-0"}`}>
          <p className="px-3 pb-1 pt-2 text-xs font-bold uppercase tracking-wide text-neutral-500">Download as</p>
          {FORMATS.map((f) => (
            <button
              key={f.kind}
              type="button"
              role="menuitem"
              className="flex w-full flex-col items-start rounded-lg px-3 py-2 text-start hover:bg-neutral-100 focus:bg-neutral-100 focus:outline-none"
              onClick={() => {
                setOpen(false);
                onPick(f.kind);
              }}
            >
              <span className="text-sm font-bold text-black">{f.label}</span>
              <span className="text-xs text-neutral-600">{f.hint}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ page */

export function DayPlan() {
  const [date, setDate] = useState(pkDate(1)); // the plan is usually made the day before
  const [span, setSpan] = useState("day");
  const to = span === "week" ? addDays(date, 6) : date;
  const plan = useLoad(() => adminApi.dayPlan(date, to), [date, to]);
  const [ask, confirmNode] = useConfirm();
  const [busy, setBusy] = useState(false);
  const days = plan.data?.days ?? [];
  const unpublished = days.filter((d) => !d.published).length;
  const changed = days.filter((d) => d.changedSincePublished).length;
  const upToDate = days.length > 0 && !unpublished && !changed;
  const fileName = `New-Khan-plan-${date}${span === "week" ? `-to-${to}` : ""}`;

  async function publish() {
    const again = days.some((d) => d.published);
    if (!(await ask(again ? "Publish again?" : "Publish this plan?", `${span === "week" ? `The 7 days from ${longDate(date)}` : longDate(date)} will be marked published${again ? " as a new version" : ""}. Then download it and share it.`, { danger: false, confirm: "Publish" }))) return false;
    setBusy(true);
    const ok = await act(() => adminApi.publishDayPlan(date, to), "Plan published");
    setBusy(false);
    if (ok) await plan.reload();
    return ok;
  }

  /** kind: "pdf" | "csv" | "both". Only the chosen file(s) are made. */
  async function download(kind) {
    setBusy(true);
    try {
      const fresh = await adminApi.dayPlan(date, to); // the latest figures, not what the page loaded earlier
      if (kind === "pdf" || kind === "both") {
        const doc = await makePdf(fresh);
        doc.save(`${fileName}.pdf`);
      }
      if (kind === "csv" || kind === "both") downloadBlob(makeCsv(fresh), `${fileName}.csv`);
      const done = { pdf: ["PDF downloaded", "Post it in the WhatsApp group or print it for the notice board."], csv: ["CSV downloaded", "Open it in Excel."], both: ["PDF and CSV downloaded", "Post the PDF in the WhatsApp group; the CSV is for the office."] }[kind];
      act(async () => {}, done[0], done[1]);
    } catch (e) {
      act(() => Promise.reject(e));
    }
    setBusy(false);
  }

  return (
    <Page
      title="Day plan"
      intro="Every departure with its bus and crew, to share with all staff. Publish the plan the day before, then download it as a PDF (WhatsApp group, notice board), a CSV (office), or both."
      actions={
        <>
          {upToDate ? (
            <DownloadMenu label="Download" disabled={busy} onPick={download} />
          ) : (
            <DownloadMenu
              label={unpublished === days.length ? "Publish & download" : "Publish again & download"}
              disabled={busy || !days.length}
              onPick={async (kind) => { if (await publish()) download(kind); }}
            />
          )}
          {upToDate && <Btn disabled={busy} onClick={publish}>Publish again</Btn>}
        </>
      }
    >
      <Filters>
        <div>
          <Label htmlFor="dp-d">{span === "week" ? "Week starting" : "Date"}</Label>
          <Input id="dp-d" type="date" value={date} onChange={(e) => setDate(e.target.value || pkDate(1))} />
        </div>
        <div>
          <Label htmlFor="dp-s">Plan for</Label>
          <Select id="dp-s" value={span} onChange={(e) => setSpan(e.target.value)} options={[{ value: "day", label: "One day" }, { value: "week", label: "7 days (week)" }]} />
        </div>
        <Btn onClick={() => setDate(pkDate())}>Today</Btn>
        <Btn onClick={() => setDate(pkDate(1))}>Tomorrow</Btn>
        <Btn onClick={plan.reload}>Refresh</Btn>
      </Filters>
      <ErrorNote err={plan.err} onRetry={plan.reload} />
      {plan.loading && !plan.data && <p className="text-sm text-mute">Loading…</p>}

      {days.map((d) => (
        <Section
          key={d.date}
          title={longDate(d.date)}
          actions={
            <>
              {d.published ? <Badge tone="green">Published v{d.published.version} · {stamp(d.published.publishedAt)} · {d.published.publishedByName}</Badge> : <Badge tone="amber">Not published</Badge>}
              {d.changedSincePublished && <Badge tone="red">Changed since published</Badge>}
              {d.missingCrew > 0 && <Badge tone="red">{d.missingCrew} without driver or conductor</Badge>}
            </>
          }
        >
          {d.trips.length === 0 && <p className="text-sm text-mute">No trips on this day.</p>}
          {byTerminal(d.trips).map(([terminal, trips]) => (
            <div key={terminal} className="mb-4">
              <h3 className="mb-2 font-bold">Departing from {terminal} <span className="font-normal text-mute">· {trips.length}</span></h3>
              <Table
                rows={trips}
                cols={[
                  { key: "t", label: "Time", render: (t) => <><b>{time(t.stops[0]?.at ?? t.departureAt)}</b>{t.delayMinutes ? <div><Badge tone="amber">+{t.delayMinutes} min</Badge></div> : null}</> },
                  { key: "route", label: "Route and stops", render: (t) => <><b>{t.routeName}</b><div className="text-xs text-mute">{stopsText(t)}</div></> },
                  { key: "bus", label: "Bus", render: (t) => <>{t.busNo}{t.fleetNo && <div className="text-xs text-mute">{t.fleetNo}</div>}</> },
                  { key: "driver", label: "Driver", render: (t) => (t.driverName ? <>{t.driverName}<div className="text-xs text-mute">{t.driverPhone}</div></> : <Badge tone="red">none</Badge>) },
                  { key: "conductor", label: "Conductor", render: (t) => (t.conductorName ? <>{t.conductorName}<div className="text-xs text-mute">{t.conductorPhone}</div></> : <Badge tone="red">none</Badge>) },
                  { key: "hostess", label: "Hostess", render: (t) => t.hostessName ?? "–" },
                  { key: "seats", label: "Seats", className: "text-right", render: (t) => `${t.seatsSold}/${t.totalSeats}` },
                  { key: "status", label: "Status", render: (t) => <StatusBadge s={t.status} /> },
                  {
                    key: "change",
                    label: "",
                    render: (t) =>
                      t.change ? <Badge tone="red">{t.change.kind === "added" ? "added after publishing" : `changed: ${t.change.fields.join(", ")}`}</Badge> : null,
                  },
                ]}
              />
            </div>
          ))}
          {d.removed.length > 0 && (
            <p className="text-sm text-red-900">
              <b>No longer on this day since publishing:</b> {d.removed.map((r) => `${r.routeName} (${time(r.departureAt)}, ${r.busNo})`).join(" · ")}
            </p>
          )}
        </Section>
      ))}
      {days.length > 0 && (
        <p className="mt-4 text-sm text-mute">
          To change a bus or crew, use <Link to="/admin/trips">Trips &amp; boarding</Link> (Bus &amp; crew). Changes made after publishing are marked here in red.
        </p>
      )}
      {confirmNode}
    </Page>
  );
}
