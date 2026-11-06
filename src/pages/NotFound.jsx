import { Link } from "react-router-dom";
import { usePageMeta } from "../components/parts";
import { href } from "../lib/links";
import { useLang } from "../lib/useLang";

export const notFoundTitle = (lang) => (lang === "ur" ? "یہ صفحہ نہیں ملا" : "Page not found");

/** Any address that isn't a page (as on the live site). */
export function NotFound() {
  const lang = useLang();
  const ur = lang === "ur";
  usePageMeta(notFoundTitle(lang));
  return (
    <div className="container-nk pk-section">
      <div className="pk-card" style={{ padding: 28 }}>
        <h1 className="h2">{ur ? "یہ صفحہ نہیں ملا" : "Page not found"}</h1>
        <p className="mt-2">
          <Link to={href(lang)} className="font-semibold underline">
            {ur ? "ہوم پر جائیں" : "Go to the home page"}
          </Link>
        </p>
      </div>
    </div>
  );
}
