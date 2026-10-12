"use client";

import { useActionState, useState } from "react";

import { updateOrderStatusAction } from "@/actions/order";
import Alert from "@/components/ui/Alert";
import ConfirmButton from "@/components/ui/ConfirmButton";
import { Field, Select, Textarea } from "@/components/ui/Form";
import { Checkbox } from "@/components/ui/Form";
import { RefreshCw } from "@/components/ui/icons";
import {
  ORDER_STATUS_LABELS,
  ORDER_STATUS_LIST,
  ORDER_STATUS_TRANSITIONS,
} from "@/lib/constants";

export default function OrderStatusForm({ order }) {
  const [state, formAction, pending] = useActionState(
    updateOrderStatusAction,
    null,
  );
  const [correctionMode, setCorrectionMode] = useState(false);

  const normalTransitions = ORDER_STATUS_TRANSITIONS[order.status] || [];
  const availableStatuses = correctionMode
    ? ORDER_STATUS_LIST.filter((status) => status !== order.status)
    : normalTransitions;

  return (
    <form action={formAction} className="space-y-4">
      {state ? (
        <Alert variant={state.ok ? "success" : "error"}>{state.message}</Alert>
      ) : null}

      <input type="hidden" name="orderId" value={order.id} />

      {normalTransitions.length === 0 && !correctionMode ? (
        <Alert variant="info">
          Status pesanan ini bersifat final pada alur normal. Jika memang perlu
          dikoreksi, aktifkan mode koreksi admin di bawah — koreksi akan dicatat
          pada riwayat status.
        </Alert>
      ) : null}

      <Field
        label="Status baru"
        htmlFor="status"
        error={state?.fieldErrors?.status}
      >
        <Select
          id="status"
          name="status"
          defaultValue={availableStatuses[0] ?? ""}
          key={correctionMode ? "correction" : "normal"}
        >
          {availableStatuses.length === 0 ? (
            <option value="">Tidak ada status lanjutan</option>
          ) : null}
          {availableStatuses.map((status) => (
            <option key={status} value={status}>
              {ORDER_STATUS_LABELS[status]}
            </option>
          ))}
        </Select>
      </Field>

      <Field
        label="Catatan perubahan status"
        htmlFor="notes"
        hint="Opsional. Catatan tersimpan pada riwayat status."
        error={state?.fieldErrors?.notes}
      >
        <Textarea id="notes" name="notes" rows={2} maxLength={500} />
      </Field>

      <label className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
        <Checkbox
          name="force"
          checked={correctionMode}
          onChange={(event) => setCorrectionMode(event.target.checked)}
          className="mt-0.5"
        />
        <span>
          Mode koreksi admin
          <span className="block text-xs">
            Memungkinkan perubahan ke status mana pun dan dicatat sebagai
            koreksi pada riwayat.
          </span>
        </span>
      </label>

      <ConfirmButton
        variant="primary"
        size="md"
        message="Ubah status pesanan ini? Notifikasi WhatsApp akan dikirim ke pelanggan jika template event aktif."
      >
        <RefreshCw className="h-4 w-4" />
        {pending ? "Menyimpan..." : "Simpan status"}
      </ConfirmButton>

      <p className="text-xs text-slate-500">
        Notifikasi hanya dikirim bila status benar-benar berubah dan template
        untuk event tersebut aktif.
      </p>
    </form>
  );
}
