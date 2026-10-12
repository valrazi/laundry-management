"use client";

import { useActionState, useState } from "react";

import { updateSettingsAction } from "@/actions/settings";
import Alert from "@/components/ui/Alert";
import Button from "@/components/ui/Button";
import { Field, Input, Textarea } from "@/components/ui/Form";
import { Save } from "@/components/ui/icons";
import { SETTING_KEYS } from "@/lib/constants";

export default function SettingsForm({ settings }) {
  const [state, formAction, pending] = useActionState(
    updateSettingsAction,
    null,
  );
  const [whatsappEnabled, setWhatsappEnabled] = useState(
    settings[SETTING_KEYS.WHATSAPP_ENABLED] === "true",
  );

  return (
    <form action={formAction} className="space-y-5">
      {state ? (
        <Alert variant={state.ok ? "success" : "error"}>{state.message}</Alert>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2">
        <Field
          label="Nama bank"
          htmlFor={SETTING_KEYS.PAYMENT_BANK_NAME}
          error={state?.fieldErrors?.[SETTING_KEYS.PAYMENT_BANK_NAME]}
        >
          <Input
            id={SETTING_KEYS.PAYMENT_BANK_NAME}
            name={SETTING_KEYS.PAYMENT_BANK_NAME}
            defaultValue={settings[SETTING_KEYS.PAYMENT_BANK_NAME] ?? ""}
            required
          />
        </Field>

        <Field
          label="Nomor rekening"
          htmlFor={SETTING_KEYS.PAYMENT_ACCOUNT_NUMBER}
          error={state?.fieldErrors?.[SETTING_KEYS.PAYMENT_ACCOUNT_NUMBER]}
        >
          <Input
            id={SETTING_KEYS.PAYMENT_ACCOUNT_NUMBER}
            name={SETTING_KEYS.PAYMENT_ACCOUNT_NUMBER}
            defaultValue={settings[SETTING_KEYS.PAYMENT_ACCOUNT_NUMBER] ?? ""}
            required
          />
        </Field>

        <Field
          label="Nama pemilik rekening"
          htmlFor={SETTING_KEYS.PAYMENT_ACCOUNT_NAME}
          error={state?.fieldErrors?.[SETTING_KEYS.PAYMENT_ACCOUNT_NAME]}
          className="sm:col-span-2"
        >
          <Input
            id={SETTING_KEYS.PAYMENT_ACCOUNT_NAME}
            name={SETTING_KEYS.PAYMENT_ACCOUNT_NAME}
            defaultValue={settings[SETTING_KEYS.PAYMENT_ACCOUNT_NAME] ?? ""}
            required
          />
        </Field>
      </div>

      <Field
        label="Instruksi pembayaran"
        htmlFor={SETTING_KEYS.PAYMENT_INSTRUCTIONS}
        hint="Ditampilkan pada halaman detail pesanan pelanggan."
        error={state?.fieldErrors?.[SETTING_KEYS.PAYMENT_INSTRUCTIONS]}
      >
        <Textarea
          id={SETTING_KEYS.PAYMENT_INSTRUCTIONS}
          name={SETTING_KEYS.PAYMENT_INSTRUCTIONS}
          rows={4}
          maxLength={1000}
          defaultValue={settings[SETTING_KEYS.PAYMENT_INSTRUCTIONS] ?? ""}
          required
        />
      </Field>

      <label className="flex items-start gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-3 text-sm text-slate-700">
        <input
          type="checkbox"
          name={SETTING_KEYS.WHATSAPP_ENABLED}
          checked={whatsappEnabled}
          onChange={(event) => setWhatsappEnabled(event.target.checked)}
          className="mt-0.5 h-4 w-4 rounded border-slate-300 text-brand-blue"
        />
        <span>
          Aktifkan integrasi WhatsApp
          <span className="block text-xs text-slate-500">
            Jika dinonaktifkan, tidak ada notifikasi yang dikirim walaupun
            template aktif.
          </span>
        </span>
      </label>

      <Button type="submit" loading={pending}>
        <Save className="h-4 w-4" />
        Simpan pengaturan
      </Button>
    </form>
  );
}
