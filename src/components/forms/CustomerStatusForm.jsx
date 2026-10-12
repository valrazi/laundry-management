"use client";

import { useActionState } from "react";

import { toggleCustomerActiveAction } from "@/actions/admin";
import Alert from "@/components/ui/Alert";
import ConfirmButton from "@/components/ui/ConfirmButton";
import { Checkbox } from "@/components/ui/Form";
import { Save } from "@/components/ui/icons";

export default function CustomerStatusForm({ customer }) {
  const [state, formAction, pending] = useActionState(
    toggleCustomerActiveAction,
    null,
  );

  return (
    <form action={formAction} className="space-y-4">
      {state ? (
        <Alert variant={state.ok ? "success" : "error"}>{state.message}</Alert>
      ) : null}

      <input type="hidden" name="userId" value={customer.id} />

      <label className="flex items-start gap-2 text-sm text-slate-700">
        <Checkbox
          name="isActive"
          defaultChecked={customer.isActive}
          className="mt-0.5"
        />
        <span>
          Akun aktif
          <span className="block text-xs text-slate-500">
            Akun nonaktif tidak dapat login dan seluruh sesinya dicabut.
          </span>
        </span>
      </label>

      <ConfirmButton
        variant={customer.isActive ? "danger" : "success"}
        message={
          customer.isActive
            ? "Nonaktifkan akun pelanggan ini?"
            : "Aktifkan kembali akun pelanggan ini?"
        }
        className={pending ? "opacity-60" : ""}
      >
        <Save className="h-4 w-4" />
        Simpan status akun
      </ConfirmButton>
    </form>
  );
}
