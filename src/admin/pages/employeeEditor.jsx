/**
 * Add / edit an employee from another page (Drivers, Conductors) with the Employees page's own registration form.
 * "Add" pre-selects the designation used for that dropdown (Employee lists > Designations, "Used for"); saving goes
 * through the normal employee endpoint, which also keeps the driver / conductor record in step (syncCrew).
 */
import { useState } from "react";
import { toast } from "../../components/Toast";
import { adminApi } from "../api";
import { useLoad } from "../ui";
import { EmployeeForm } from "./Employees";

/** kind: "driver" | "conductor" (the designation's "Used for"). onSaved: reload the page's list. */
export function useEmployeeEditor(kind, onSaved) {
  const lists = useLoad(() => adminApi.employeeLists(), []);
  const [editing, setEditing] = useState(null); // null | {} (new) | full employee record
  const [opening, setOpening] = useState(false);
  const preset = (lists.data?.designations ?? []).find((d) => d.crew === kind && d.isActive);

  async function edit(employeeId) {
    setOpening(true);
    try {
      setEditing(await adminApi.employee(employeeId));
    } catch (e) {
      toast("Could not open this employee", { body: e.message || "Please try again.", kind: "error", duration: 7000 });
    }
    setOpening(false);
  }

  const node =
    editing && lists.data ? (
      <EmployeeForm
        employee={editing.id ? editing : null}
        lists={lists.data}
        presetDesignationId={preset?.id ?? ""}
        onClose={() => setEditing(null)}
        onSaved={() => {
          setEditing(null);
          onSaved?.();
        }}
      />
    ) : null;

  return {
    add: () => setEditing({}),
    edit,
    node,
    opening,
    canAdd: Boolean(lists.data && preset),
    /** The lists loaded but no active designation is used for this dropdown. */
    noDesignation: Boolean(lists.data && !preset),
    listsReady: Boolean(lists.data),
  };
}
