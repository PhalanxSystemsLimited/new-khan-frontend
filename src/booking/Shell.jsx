import { PlaceholderNote } from "../components/parts";
import { IS_LIVE } from "./api";
import { bt } from "./strings";

/** Common frame for every booking screen. */
export function BookShell({ lang, title, children }) {
  return (
    <div className="container-nk py-8 sm:py-12">
      <h1 className="h1 !text-3xl sm:!text-4xl">{bt(title, lang)}</h1>
      {!IS_LIVE && (
        <div className="mt-3 max-w-xl">
          <PlaceholderNote lang={lang} showConfirm={false} />
        </div>
      )}
      {children}
    </div>
  );
}
