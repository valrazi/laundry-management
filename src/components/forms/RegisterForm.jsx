"use client";

import { useActionState, useState } from "react";

import { registerAction } from "@/actions/auth";
import Alert from "@/components/ui/Alert";
import Button from "@/components/ui/Button";
import { Field, Input } from "@/components/ui/Form";

const INITIAL = {
  name: "",
  email: "",
  phone: "",
  password: "",
  confirmPassword: "",
};

export default function RegisterForm() {
  const [state, formAction, pending] = useActionState(registerAction, null);
  const [values, setValues] = useState(INITIAL);

  const update = (key) => (event) =>
    setValues((previous) => ({ ...previous, [key]: event.target.value }));

  return (
    <form action={formAction} className="space-y-4" noValidate>
      {state && !state.ok ? (
        <Alert variant="error">{state.message}</Alert>
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
          placeholder="Nama Anda"
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
          placeholder="nama@email.com"
          value={values.email}
          onChange={update("email")}
          required
        />
      </Field>

      <Field
        label="Nomor WhatsApp"
        htmlFor="phone"
        error={state?.fieldErrors?.phone}
        hint="Contoh: 081234567890"
        required
      >
        <Input
          id="phone"
          name="phone"
          inputMode="tel"
          autoComplete="tel"
          placeholder="081234567890"
          value={values.phone}
          onChange={update("phone")}
          required
        />
      </Field>

      <Field
        label="Password"
        htmlFor="password"
        error={state?.fieldErrors?.password}
        hint="Minimal 8 karakter, memuat huruf dan angka."
        required
      >
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="new-password"
          value={values.password}
          onChange={update("password")}
          required
        />
      </Field>

      <Field
        label="Konfirmasi password"
        htmlFor="confirmPassword"
        error={state?.fieldErrors?.confirmPassword}
        required
      >
        <Input
          id="confirmPassword"
          name="confirmPassword"
          type="password"
          autoComplete="new-password"
          value={values.confirmPassword}
          onChange={update("confirmPassword")}
          required
        />
      </Field>

      <Button type="submit" loading={pending} className="w-full" size="lg">
        Daftar sekarang
      </Button>
    </form>
  );
}
