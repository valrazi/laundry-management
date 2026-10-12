"use client";

import { useActionState, useState } from "react";

import { adminLoginAction } from "@/actions/adminAuth";
import Alert from "@/components/ui/Alert";
import Button from "@/components/ui/Button";
import { Field, Input } from "@/components/ui/Form";

export default function AdminLoginForm() {
  const [state, formAction, pending] = useActionState(adminLoginAction, null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  return (
    <form action={formAction} className="space-y-4" noValidate>
      {state && !state.ok ? (
        <Alert variant="error">{state.message}</Alert>
      ) : null}

      <Field label="Email admin" htmlFor="email" error={state?.fieldErrors?.email}>
        <Input
          id="email"
          name="email"
          type="email"
          inputMode="email"
          autoComplete="username"
          autoCapitalize="none"
          autoCorrect="off"
          placeholder="admin@laundry.test"
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
        variant="navy"
        className="w-full"
        size="lg"
      >
        Masuk ke Panel Admin
      </Button>
    </form>
  );
}
