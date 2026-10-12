"use client";

import { useActionState, useState } from "react";

import { updateTemplateAction } from "@/actions/notification";
import Alert from "@/components/ui/Alert";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import { Field, Input, Textarea } from "@/components/ui/Form";
import { Save } from "@/components/ui/icons";
import { TEMPLATE_VARIABLES } from "@/lib/constants";
import { renderTemplate } from "@/services/templateEngine";

export default function TemplateEditor({ template, previewVariables }) {
  const [state, formAction, pending] = useActionState(updateTemplateAction, null);
  const [message, setMessage] = useState(template.message);
  const [isActive, setIsActive] = useState(template.isActive);

  const preview = renderTemplate(message, previewVariables);

  return (
    <section className="rounded-xl border border-slate-200 bg-white shadow-sm">
      <header className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 px-5 py-4">
        <div>
          <h3 className="text-base font-semibold text-brand-navy">
            {template.name}
          </h3>
          <p className="mt-0.5 font-mono text-xs text-slate-500">
            {template.eventKey}
          </p>
        </div>
        {isActive ? (
          <Badge tone="success">Aktif</Badge>
        ) : (
          <Badge tone="danger">Nonaktif</Badge>
        )}
      </header>

      <div className="grid gap-6 px-5 py-4 lg:grid-cols-2">
        <form action={formAction} className="space-y-4">
          {state ? (
            <Alert variant={state.ok ? "success" : "error"}>
              {state.message}
            </Alert>
          ) : null}

          <input type="hidden" name="eventKey" value={template.eventKey} />

          <Field
            label="Nama template"
            htmlFor={`name-${template.eventKey}`}
            error={state?.fieldErrors?.name}
          >
            <Input
              id={`name-${template.eventKey}`}
              name="name"
              defaultValue={template.name}
              required
            />
          </Field>

          <Field
            label="Isi pesan"
            htmlFor={`message-${template.eventKey}`}
            hint="Gunakan variabel seperti {{customerName}} atau {{orderNumber}}."
            error={state?.fieldErrors?.message}
          >
            <Textarea
              id={`message-${template.eventKey}`}
              name="message"
              rows={6}
              maxLength={2000}
              value={message}
              onChange={(event) => setMessage(event.target.value)}
              required
            />
          </Field>

          <label className="flex items-center gap-2 text-sm text-slate-700">
            <input
              type="checkbox"
              name="isActive"
              checked={isActive}
              onChange={(event) => setIsActive(event.target.checked)}
              className="h-4 w-4 rounded border-slate-300 text-brand-blue"
            />
            Kirim notifikasi untuk event ini
          </label>

          <Button type="submit" loading={pending}>
            <Save className="h-4 w-4" />
            Simpan template
          </Button>
        </form>

        <div className="space-y-4">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
              Variabel yang didukung
            </p>
            <ul className="mt-2 flex flex-wrap gap-1.5">
              {TEMPLATE_VARIABLES.map((variable) => (
                <li key={variable.key}>
                  <span
                    title={variable.label}
                    className="inline-block rounded-md bg-slate-100 px-2 py-0.5 font-mono text-xs text-slate-700"
                  >
                    {`{{${variable.key}}}`}
                  </span>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
              Pratinjau dengan data contoh
            </p>
            <pre className="mt-2 whitespace-pre-wrap rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700">
              {preview || "(pesan kosong)"}
            </pre>
          </div>

          <p className="text-xs text-slate-500">
            Variabel yang tidak terdaftar akan ditolak saat template disimpan.
          </p>
        </div>
      </div>
    </section>
  );
}
