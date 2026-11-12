import { PlaceholderNote } from "../components/parts";
import { IS_LIVE } from "./api";
import { bt } from "./strings";

/** Which step of the booking each screen is (by its title): 1 search, 2 bus, 3 seats, 4 pay, 5 done. */
const STEP_OF = { bookTitle: 1, resultsTitle: 2, seatsTitle: 3, statusHELD: 4, payTitle: 4, statusCONFIRMED: 5 };
const STEPS = [
  { en: "Search", ur: "تلاش" },
  { en: "Bus", ur: "بس" },
  { en: "Seats", ur: "سیٹیں" },
  { en: "Pay", ur: "ادائیگی" },
];

/** Phones only: Search › Bus › Seats › Pay, with the steps already done ticked. Display only. */
function Progress({ step, lang }) {
  return (
    <nav aria-label={lang === "ur" ? "بکنگ کے مراحل" : "Booking steps"} className="nk-steps md:hidden">
      <ol>
        {STEPS.map((s, i) => {
          const n = i + 1;
          const state = n < step ? "done" : n === step ? "now" : "next";
          return (
            <li key={n} data-state={state} aria-current={state === "now" ? "step" : undefined}>
              <span className="nk-step-dot" aria-hidden>
                {state === "done" ? (
                  <svg viewBox="0 0 24 24" width="10" height="10" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12.5l4.5 4.5L19 7.5" /></svg>
                ) : (
                  n
                )}
              </span>
              <span>{s[lang]}</span>
              {state === "done" && <span className="sr-only">{lang === "ur" ? "(مکمل)" : "(done)"}</span>}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

/** Common frame for every booking screen. */
export function BookShell({ lang, title, children }) {
  const step = STEP_OF[title];
  return (
    <div className="nk-book container-nk py-8 sm:py-12">
      {step && <Progress step={step} lang={lang} />}
      <h1 className="h1 !text-[26px] md:!text-4xl">{bt(title, lang)}</h1>
      {!IS_LIVE && (
        <div className="mt-3 max-w-xl">
          <PlaceholderNote lang={lang} showConfirm={false} />
        </div>
      )}
      {children}
    </div>
  );
}
