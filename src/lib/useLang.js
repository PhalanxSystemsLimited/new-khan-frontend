import { useParams } from "react-router-dom";
import { DEFAULT_LANG, isLang } from "./i18n";

/** Current language from the URL (/en/... or /ur/...). */
export function useLang() {
  const { lang } = useParams();
  return isLang(lang) ? lang : DEFAULT_LANG;
}
