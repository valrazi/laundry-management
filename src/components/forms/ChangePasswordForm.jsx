"use client";

import { useActionState, useState } from "react";

import { changePasswordAction } from "@/actions/customer";
import Alert from "@/components/ui/Alert";
import Button from "@/components/ui/Button";
import { Field, Input } from "@/components/ui/Form";
import { KeyRound } from "@/components/ui/icons";

const EMPTY = {
  currentPassword: "",
  newPassword: "",
  confirmPassword: "",
};

export default function ChangePasswordForm() {
  const [state, formAction, pending] = useActionState(
    changePasswordAction,
    null,
  );
  const [values, setValues] = useState(EMPTY);

  const update = (key) => (event) =>
    setValues((previous) => ({ ...previous, [key]: event.target.value }));

  // Kosongkan form setelah berhasil mengubah password.
  const submittedValues = state?.ok ? EMPTY : values;

  return (
    <form action={formAction} className="space-y-4">
      {state ? (
        <Alert variant={state.ok ? "success" : "error"}>{state.message}</Alert>
      ) : null}

      <Field
        label="Password saat ini"
        htmlFor="currentPassword"
        error={state?.fieldErrors?.currentPassword}
        required
      >
        <Input
          id="currentPassword"
          name="currentPassword"
          type="password"
          autoComplete="current-password"
          value={submittedValues.currentPassword}
          onChange={update("currentPassword")}
          required
        />
      </Field>

      <Field
        label="Password baru"
        htmlFor="newPassword"
        hint="Minimal 8 karakter, memuat huruf dan angka."
        error={state?.fieldErrors?.newPassword}
        required
      >
        <Input
          id="newPassword"
          name="newPassword"
          type="password"
          autoComplete="new-password"
          value={submittedValues.newPassword}
          onChange={update("newPassword")}
          required
        />
      </Field>

      <Field
        label="Konfirmasi password baru"
        htmlFor="confirmPassword"
        error={state?.fieldErrors?.confirmPassword}
        required
      >
        <Input
          id="confirmPassword"
          name="confirmPassword"
          type="password"
          autoComplete="new-password"
          value={submittedValues.confirmPassword}
          onChange={update("confirmPassword")}
          required
        />
      </Field>

      <Button type="submit" loading={pending}>
        <KeyRound className="h-4 w-4" />
        Ubah password
      </Button>

      <p className="text-xs text-slate-500">
        Setelah password berubah, seluruh sesi login di perangkat lain akan
        diakhiri.
      </p>
    </form>
  );
}
