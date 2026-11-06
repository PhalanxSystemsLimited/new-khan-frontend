import { terminals } from "../data/site";
import { ui } from "./i18n";

/*
 * Enquiry form fields for Charter and Cargo (and a plain Contact form).
 * Field: { name, label: {en,ur}, type, required?, hint?, min?, step?, minLength?, options?: "terminals", defaultValue? }
 */

const name = { name: "name", label: ui.name, type: "text", required: true };
const phone = { name: "phone", label: ui.phoneField, type: "tel", required: true };
const email = { name: "email", label: ui.email, type: "email" };

export const formFields = {
  charter: [
    name,
    phone,
    email,
    { name: "from", label: ui.fromCity, type: "text", required: true },
    { name: "to", label: ui.toCity, type: "text", required: true },
    { name: "date", label: ui.date, type: "date", required: true },
    { name: "passengers", label: ui.passengers, type: "number", required: true },
    { name: "returnTrip", label: ui.returnTrip, type: "checkbox" },
    { name: "notes", label: ui.notes, type: "textarea" },
  ],
  cargo: [
    { name: "name", label: ui.senderName, type: "text", required: true },
    { name: "phone", label: ui.senderPhone, type: "tel", required: true },
    email,
    { name: "from", label: ui.sendTerminal, type: "select", required: true, options: "terminals" },
    { name: "to", label: ui.recvTerminal, type: "select", required: true, options: "terminals" },
    { name: "item", label: ui.item, type: "textarea", required: true, minLength: 10, hint: ui.itemHint },
    { name: "weight", label: ui.weight, type: "number", required: true, min: 0.1, step: 0.1, hint: ui.weightHint },
    { name: "pieces", label: ui.pieces, type: "number", required: true, min: 1, step: 1, defaultValue: "1" },
    { name: "receiverName", label: ui.receiverName, type: "text", required: true },
    { name: "receiverPhone", label: ui.receiverPhone, type: "tel", required: true },
    { name: "notes", label: ui.notes, type: "textarea" },
  ],
  contact: [name, phone, email, { name: "message", label: ui.message, type: "textarea", required: true }],
};

/** The fields of a form with labels in the page language and terminal options filled in. */
export const resolveFields = (kind, lang) =>
  formFields[kind].map((f) => ({
    name: f.name,
    label: f.label[lang],
    type: f.type,
    required: !!f.required,
    hint: f.hint?.[lang],
    min: f.min,
    step: f.step,
    minLength: f.minLength,
    defaultValue: f.defaultValue,
    options: f.options === "terminals" ? terminals.map((t) => ({ value: t.id, label: t.city[lang] })) : undefined,
  }));
