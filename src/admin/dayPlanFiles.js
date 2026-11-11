/**
 * Day plan files: the CSV (office) and the PDF (WhatsApp group, notice board), made in the browser from the
 * day plan the backend returns (GET /admin/day-plan). No JSX, so it can also be checked in Node.
 */
export const TZ = "Asia/Karachi";
export const time = (v) => new Date(v).toLocaleTimeString("en-GB", { timeZone: TZ, hour: "numeric", minute: "2-digit", hour12: true }).toLowerCase();
export const longDate = (d) => new Date(`${d}T12:00:00+05:00`).toLocaleDateString("en-GB", { timeZone: TZ, weekday: "long", day: "numeric", month: "long", year: "numeric" });
export const stamp = (v) => new Date(v).toLocaleString("en-GB", { timeZone: TZ, day: "2-digit", month: "short", hour: "numeric", minute: "2-digit", hour12: true });
export const addDays = (iso, n) => new Date(Date.parse(`${iso}T00:00:00Z`) + n * 86_400_000).toISOString().slice(0, 10);
export const stopsText = (t) => t.stops.map((s) => `${s.city} ${time(s.at)}`).join(" → ");
export const crew = (name, phone) => (name ? `${name}${phone ? ` (${phone})` : ""}` : "—");
export const byTerminal = (trips) => {
  const m = new Map();
  for (const t of trips) m.set(t.terminal, [...(m.get(t.terminal) ?? []), t]);
  return [...m.entries()].sort(([a], [b]) => a.localeCompare(b));
};

/* ------------------------------------------------------------------ files */

export function downloadBlob(blob, name) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}

export function makeCsv(plan) {
  const head = ["Date", "Departure terminal", "Departure", "Delay (min)", "Route", "Stops and times", "Bus", "Fleet no.", "Driver", "Driver phone", "Conductor", "Conductor phone", "Hostess", "Seats sold", "Seats", "Status"];
  const q = (v) => {
    const s = v === null || v === undefined ? "" : String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const rows = plan.days.flatMap((d) =>
    d.trips.map((t) => [d.date, t.terminal, time(t.stops[0]?.at ?? t.departureAt), t.delayMinutes || "", t.routeName, stopsText(t), t.busNo, t.fleetNo ?? "", t.driverName ?? "", t.driverPhone ?? "", t.conductorName ?? "", t.conductorPhone ?? "", t.hostessName ?? "", t.seatsSold, t.totalSeats, t.status]),
  );
  // BOM so Excel opens the file as UTF-8 (arrows and names show correctly).
  return new Blob(["﻿" + [head, ...rows].map((r) => r.map(q).join(",")).join("\r\n")], { type: "text/csv;charset=utf-8" });
}

export async function makePdf(plan) {
  // Loaded only when a file is downloaded. Either export form works (browser bundle or Node).
  const [pdfMod, tableMod] = await Promise.all([import("jspdf"), import("jspdf-autotable")]);
  const jsPDF = pdfMod.jsPDF ?? pdfMod.default?.jsPDF ?? pdfMod.default;
  const autoTable = tableMod.autoTable ?? tableMod.default?.autoTable ?? tableMod.default?.default ?? tableMod.default;
  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
  const W = doc.internal.pageSize.getWidth();
  plan.days.forEach((d, i) => {
    if (i > 0) doc.addPage();
    doc.setFillColor(24, 33, 43);
    doc.rect(0, 0, W, 18, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    doc.text("NEW KHAN ROAD RUNNERS · Day plan", 10, 8);
    doc.setFontSize(11);
    doc.text(longDate(d.date), 10, 14);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.5);
    const pub = d.published ? `Published v${d.published.version} · ${stamp(d.published.publishedAt)} by ${d.published.publishedByName}` : "NOT PUBLISHED (draft)";
    doc.text(pub, W - 10, 8, { align: "right" });
    doc.text(`${d.trips.filter((t) => t.status !== "cancelled").length} departures`, W - 10, 14, { align: "right" });
    doc.setTextColor(0, 0, 0);
    let y = 24;
    if (!d.trips.length) {
      doc.setFontSize(11);
      doc.text("No trips on this day.", 10, y + 4);
      return;
    }
    for (const [terminal, trips] of byTerminal(d.trips)) {
      doc.setFont("helvetica", "bold");
      doc.setFontSize(11);
      if (y > 180) { doc.addPage(); y = 14; }
      doc.text(`Departing from ${terminal}`, 10, y);
      autoTable(doc, {
        startY: y + 2,
        margin: { left: 10, right: 10 },
        head: [["Time", "Route", "Stops and times", "Bus", "Driver", "Conductor", "Hostess", "Seats"]],
        body: trips.map((t) => [
          `${time(t.stops[0]?.at ?? t.departureAt)}${t.delayMinutes ? `\n(+${t.delayMinutes} min)` : ""}${t.status === "cancelled" ? "\nCANCELLED" : ""}`,
          t.routeName.replace("→", "-"),
          stopsText(t).replace(/→/g, "-"),
          `${t.busNo}${t.fleetNo ? `\n${t.fleetNo}` : ""}`,
          crew(t.driverName, t.driverPhone),
          crew(t.conductorName, t.conductorPhone),
          t.hostessName ?? "—",
          `${t.seatsSold}/${t.totalSeats}`,
        ]),
        styles: { fontSize: 8, cellPadding: 1.6, valign: "top" },
        headStyles: { fillColor: [238, 241, 244], textColor: 20, fontStyle: "bold" },
        columnStyles: { 0: { cellWidth: 20, fontStyle: "bold" }, 1: { cellWidth: 42 }, 2: { cellWidth: 70 }, 3: { cellWidth: 24 }, 7: { cellWidth: 14, halign: "right" } },
        didParseCell: (c) => {
          if (c.section === "body" && trips[c.row.index]?.status === "cancelled") c.cell.styles.textColor = [150, 150, 150];
        },
      });
      y = doc.lastAutoTable.finalY + 8;
    }
  });
  const pages = doc.getNumberOfPages();
  for (let p = 1; p <= pages; p++) {
    doc.setPage(p);
    doc.setFontSize(7.5);
    doc.setTextColor(110, 110, 110);
    doc.text(`Page ${p} of ${pages} · downloaded ${stamp(new Date())}`, W / 2, doc.internal.pageSize.getHeight() - 5, { align: "center" });
  }
  return doc;
}

