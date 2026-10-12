"use client";

import { useActionState, useState } from "react";

import { customerLoginAction } from "@/actions/auth";
import Alert from "@/components/ui/Alert";
import Button from "@/components/ui/Button";
import { Field, Input } from "@/components/ui/Form";

export default function LoginForm() {
  const [state, formAction, pending] = useActionState(
    customerLoginAction,
    null,
  );
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  return (
    <form action={formAction} className="space-y-4" noValidate>
      {state && !state.ok ? (
        <Alert variant="error">{state.message}</Alert>
      ) : null}

      <Field label="Email" htmlFor="email" error={state?.fieldErrors?.email}>
        <Input
          id="email"
          name="email"
          type="email"
          inputMode="email"
          autoComplete="email"
          autoCapitalize="none"
          autoCorrect="off"
          placeholder="nama@email.com"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          required
        />
      </Field>

      <Field
        label="Password"
        htmlFor="password"
        error={state?.fieldErrors?.password}
      >
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          placeholder="••••••••"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          required
        />
      </Field>

      <Button
        type="submit"
        loading={pending}
        className="w-full"
        size="lg"
      >
        Masuk sebagai Pelanggan
      </Button>
    </form>
  );
}
