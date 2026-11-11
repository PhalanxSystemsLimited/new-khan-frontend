/**
 * Day plan (managers and admins), /admin/day-plan.
 * The day's (or week's) trips as a timetable: time, route and stop times, bus, driver, conductor, hostess, seats.
 * Publish it the day before, then download the PDF (WhatsApp group, notice board) and CSV (office) together.
 * Anything changed after publishing is marked, so the admin knows to publish and share again.
 */
import { useState } from "react";
import { Link } from "react-router-dom";
import { adminApi } from "../api";
import { act, Badge, Btn, ErrorNote, Filters, Input, Label, Page, pkDate, Section, Select, StatusBadge, Table, useConfirm, useLoad } from "../ui";

import { addDays, byTerminal, downloadBlob, longDate, makeCsv, makePdf, stamp, stopsText, time } from "../dayPlanFiles";

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
    if (!(await ask(again ? "Publish again?" : "Publish this plan?", `${span === "week" ? `The 7 days from ${longDate(date)}` : longDate(date)} will be marked published${again ? " as a new version" : ""}. Then download the PDF and CSV and share them.`, { danger: false, confirm: "Publish" }))) return false;
    setBusy(true);
    const ok = await act(() => adminApi.publishDayPlan(date, to), "Plan published");
    setBusy(false);
    if (ok) await plan.reload();
    return ok;
  }

  async function download() {
    setBusy(true);
    try {
      const fresh = await adminApi.dayPlan(date, to); // the latest figures, not what the page loaded earlier
      downloadBlob(makeCsv(fresh), `${fileName}.csv`);
      const doc = await makePdf(fresh);
      doc.save(`${fileName}.pdf`);
      act(async () => {}, "PDF and CSV downloaded", "Post the PDF in the WhatsApp group; the CSV is for the office.");
    } catch (e) {
      act(() => Promise.reject(e));
    }
    setBusy(false);
  }

  return (
    <Page
      title="Day plan"
      intro="Every departure with its bus and crew, to share with all staff. Publish the plan the day before, then download the PDF (WhatsApp group, notice board) and the CSV (office)."
      actions={
        <>
          {upToDate ? (
            <Btn kind="primary" disabled={busy} onClick={download}>Download PDF + CSV</Btn>
          ) : (
            <Btn kind="primary" disabled={busy || !days.length} onClick={async () => { if (await publish()) download(); }}>
              {unpublished === days.length ? "Publish & download" : "Publish again & download"}
            </Btn>
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
