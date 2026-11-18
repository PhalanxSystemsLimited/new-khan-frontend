/**
 * "Download PDF" on the e-ticket: a picture of the ticket as it is on screen (so Urdu comes out exactly as
 * shown), put on A4 pages. Everything happens in the browser; the two libraries load only when the button is
 * pressed. Parts marked .no-print (buttons, notices) are left out, as when printing.
 */
export async function downloadTicketPdf(el, fileName) {
  const [h2cMod, pdfMod] = await Promise.all([import("html2canvas-pro"), import("jspdf")]);
  const html2canvas = h2cMod.default ?? h2cMod;
  const jsPDF = pdfMod.jsPDF ?? pdfMod.default?.jsPDF ?? pdfMod.default;

  const canvas = await html2canvas(el, {
    scale: 2,
    backgroundColor: "#ffffff",
    useCORS: true,
    logging: false,
    // Laid out as on a laptop whatever the device, so a phone gives the same one-page A4 ticket as a computer.
    windowWidth: 900,
    // Buttons and notices are left out, and so is the animated tick (the "Confirmed" badge says it).
    ignoreElements: (node) => node.classList?.contains("no-print") || node.classList?.contains("tick-wrap"),
    // The website is scaled with CSS zoom on large screens; capture it at its natural size.
    onclone: (doc) => {
      const r = doc.getElementById("root");
      if (r) r.style.zoom = "";
    },
  });

  const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const margin = 10;
  const pageW = pdf.internal.pageSize.getWidth() - margin * 2;
  const pageH = pdf.internal.pageSize.getHeight() - margin * 2;
  const mmPerPx = pageW / canvas.width;
  const pxPerPage = Math.floor(pageH / mmPerPx);

  // Long tickets (several passengers or legs) continue on the next page.
  for (let y = 0, page = 0; y < canvas.height; y += pxPerPage, page += 1) {
    const h = Math.min(pxPerPage, canvas.height - y);
    const part = document.createElement("canvas");
    part.width = canvas.width;
    part.height = h;
    part.getContext("2d").drawImage(canvas, 0, y, canvas.width, h, 0, 0, canvas.width, h);
    if (page > 0) pdf.addPage();
    pdf.addImage(part.toDataURL("image/jpeg", 0.92), "JPEG", margin, margin, pageW, h * mmPerPx);
  }
  pdf.save(fileName);
}
