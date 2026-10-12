"use client";

import { useActionState, useState } from "react";

import { updateProfileAction } from "@/actions/customer";
import Alert from "@/components/ui/Alert";
import Button from "@/components/ui/Button";
import { Field, Input } from "@/components/ui/Form";
import { Save } from "@/components/ui/icons";

export default function ProfileForm({ user }) {
  const [state, formAction, pending] = useActionState(updateProfileAction, null);
  const [values, setValues] = useState({
    name: user.name,
    email: user.email,
    phone: user.phone,
  });

  const update = (key) => (event) =>
    setValues((previous) => ({ ...previous, [key]: event.target.value }));

  return (
    <form action={formAction} className="space-y-4">
      {state ? (
        <Alert variant={state.ok ? "success" : "error"}>{state.message}</Alert>
      ) : null}

      <Field
        label="Nama lengkap"
        htmlFor="name"
        error={state?.fieldErrors?.name}
        required
      >
        <Input
          id="name"
          name="name"
          autoComplete="name"
          autoCapitalize="words"
          value={values.name}
          onChange={update("name")}
          required
        />
      </Field>

      <Field
        label="Email"
        htmlFor="email"
        error={state?.fieldErrors?.email}
        required
      >
        <Input
          id="email"
          name="email"
          type="email"
          inputMode="email"
          autoComplete="email"
          autoCapitalize="none"
          autoCorrect="off"
          value={values.email}
          onChange={update("email")}
          required
        />
      </Field>

      <Field
        label="Nomor WhatsApp"
        htmlFor="phone"
        hint="Nomor ini dipakai untuk mengirim notifikasi status pesanan."
        error={state?.fieldErrors?.phone}
        required
      >
        <Input
          id="phone"
          name="phone"
          inputMode="tel"
          value={values.phone}
          onChange={update("phone")}
          required
        />
      </Field>

      <Button type="submit" loading={pending}>
        <Save className="h-4 w-4" />
        Simpan profil
      </Button>
    </form>
  );
}
