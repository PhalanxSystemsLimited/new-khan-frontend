/** Small pieces shared by the cargo screens (kept apart so the screens can use each other without import loops). */
import { Badge } from "../ui";

export const PaymentBadge = ({ p }) =>
  p.payment === "paid" ? <Badge tone="green">Paid</Badge> : p.paidAt ? <Badge tone="green">Paid on collection</Badge> : <Badge tone="amber">Receiver pays</Badge>;

/** "+923001234567" -> "0300 1234567" */
export const phoneText = (v) => {
  const d = String(v ?? "").replace(/\D/g, "");
  const local = d.startsWith("92") && d.length === 12 ? `0${d.slice(2)}` : d;
  return local.length === 11 ? `${local.slice(0, 4)} ${local.slice(4)}` : v ?? "–";
};
