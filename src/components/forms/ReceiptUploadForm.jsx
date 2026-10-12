"use client";

import { useActionState, useState } from "react";

import { submitReceiptAction } from "@/actions/payment";
import Alert from "@/components/ui/Alert";
import Button from "@/components/ui/Button";
import { Field, Input } from "@/components/ui/Form";
import { Upload } from "@/components/ui/icons";
import { ALLOWED_RECEIPT_EXTENSIONS } from "@/lib/constants";

export default function ReceiptUploadForm({ orderId, maxSizeMb }) {
  const [state, formAction, pending] = useActionState(submitReceiptAction, null);
  const [fileName, setFileName] = useState("");

  return (
    <form action={formAction} className="space-y-4">
      {state ? (
        <Alert variant={state.ok ? "success" : "error"}>{state.message}</Alert>
      ) : null}

      <input type="hidden" name="orderId" value={orderId} />

      <Field
        label="File bukti transfer"
        htmlFor="proof"
        hint={`Format ${ALLOWED_RECEIPT_EXTENSIONS.join(
          ", ",
        )} · maksimal ${maxSizeMb} MB`}
        error={state?.fieldErrors?.proof}
      >
        <Input
          id="proof"
          name="proof"
          type="file"
          accept="image/jpeg,image/png,image/webp"
          required
          onChange={(event) =>
            setFileName(event.target.files?.[0]?.name ?? "")
          }
          className="file:mr-3 file:rounded-md file:border-0 file:bg-brand-navy file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-white hover:file:bg-[#16304f]"
        />
      </Field>

      {fileName ? (
        <p className="text-xs text-slate-500">File dipilih: {fileName}</p>
      ) : null}

      <Button type="submit" loading={pending} className="w-full sm:w-auto">
        <Upload className="h-4 w-4" />
        Unggah bukti transfer
      </Button>

      <p className="text-xs text-slate-500">
        Mengunggah bukti transfer tidak berarti pembayaran otomatis lunas.
        Admin akan memeriksa dan memverifikasi terlebih dahulu.
      </p>
    </form>
  );
}
