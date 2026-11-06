import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { company } from "../data/site";
import { ui } from "../lib/i18n";
import { whatsappLink } from "../lib/links";
import { DatePicker } from "./pickers";

const todayISO = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

/** Route-page booking box. The date comes from ?date= (set by the search form) or the picker. */
export function RouteBookBox({ lang, from, to, fromId, toId }) {
  const [date, setDate] = useState("");
  const [seats, setSeats] = useState(1);
  const [min, setMin] = useState();

  useEffect(() => {
    setMin(todayISO());
    const q = new URLSearchParams(window.location.search).get("date");
    if (q && /^\d{4}-\d{2}-\d{2}$/.test(q)) setDate(q);
  }, []);

  const wa = whatsappLink(lang, { from, to, date, seats });
  // Online booking: with a date the visitor lands straight on the bus list, without one on the search page.
  const online = date
    ? `/${lang}/book/results?from=${fromId}&to=${toId}&date=${date}&pax=${seats}&trip=oneway`
    : `/${lang}/book?from=${fromId}&to=${toId}`;

  return (
    <div className="card border-gold/40">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label htmlFor="rb-date" className="label">{ui.date[lang]}</label>
          <DatePicker id="rb-date" label={ui.date[lang]} value={date} onChange={setDate} min={min} lang={lang} />
        </div>
        <div>
          <label htmlFor="rb-seats" className="label">{ui.seats[lang]}</label>
          <select id="rb-seats" className="field" value={seats} onChange={(e) => setSeats(Number(e.target.value))}>
            {[1, 2, 3, 4, 5, 6].map((n) => (
              <option key={n} value={n}>{n}</option>
            ))}
          </select>
        </div>
      </div>
      <Link to={online} className="btn btn-gold btn-shine mt-4 w-full text-lg" data-cta="book-a-seat">
        {ui.book[lang]}
      </Link>
      <p className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
        <span className="text-mute">{ui.orBookVia[lang]}</span>
        <a href={wa} target="_blank" rel="noopener" className="inline-flex min-h-11 items-center font-semibold text-gold-light underline underline-offset-4">
          WhatsApp
        </a>
        <a href={`tel:${company.helplineTel}`} className="font-semibold text-gold-light underline underline-offset-4">
          {ui.callHelpline[lang]} <span className="ltr">{company.helpline}</span>
        </a>
      </p>
    </div>
  );
}
