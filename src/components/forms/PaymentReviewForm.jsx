"use client";

import { useActionState, useState } from "react";

import { rejectPaymentAction, verifyPaymentAction } from "@/actions/payment";
import Alert from "@/components/ui/Alert";
import ConfirmButton from "@/components/ui/ConfirmButton";
import { Field, Textarea } from "@/components/ui/Form";
import { Check, X } from "@/components/ui/icons";
import { PAYMENT_STATUS } from "@/lib/constants";

export default function PaymentReviewForm({ payment }) {
  const [verifyState, verifyAction] = useActionState(verifyPaymentAction, null);
  const [rejectState, rejectAction, rejectPending] = useActionState(
    rejectPaymentAction,
    null,
  );
  const [reason, setReason] = useState("");

  const canReview =
    payment.status === PAYMENT_STATUS.WAITING_VERIFICATION &&
    Boolean(payment.hasProof);

  return (
    <div className="space-y-4">
      {verifyState ? (
        <Alert variant={verifyState.ok ? "success" : "error"}>
          {verifyState.message}
        </Alert>
      ) : null}

      {rejectState ? (
        <Alert variant={rejectState.ok ? "success" : "error"}>
          {rejectState.message}
        </Alert>
      ) : null}

      {!canReview ? (
        <Alert variant="info">
          {payment.hasProof
            ? "Pembayaran ini tidak berada pada tahap yang dapat diverifikasi."
            : "Belum ada bukti transfer yang diunggah pelanggan, sehingga belum dapat diverifikasi."}
        </Alert>
      ) : null}

      <form action={verifyAction} className="space-y-2">
        <input type="hidden" name="paymentId" value={payment.id} />
        <ConfirmButton
          variant="success"
          size="md"
          message="Verifikasi pembayaran ini sebagai lunas?"
          className="w-full"
        >
          <Check className="h-4 w-4" />
          Verifikasi pembayaran (Lunas)
        </ConfirmButton>
      </form>

      <form action={rejectAction} className="space-y-3">
        <input type="hidden" name="paymentId" value={payment.id} />

        <Field
          label="Alasan penolakan"
          htmlFor="reason"
          hint="Alasan akan ditampilkan kepada pelanggan agar dapat memperbaiki bukti transfer."
          error={rejectState?.fieldErrors?.reason}
        >
          <Textarea
            id="reason"
            name="reason"
            rows={3}
            maxLength={500}
            placeholder="Contoh: nominal transfer tidak sesuai dengan total tagihan."
            value={reason}
            onChange={(event) => setReason(event.target.value)}
          />
        </Field>

        <ConfirmButton
          variant="danger"
          size="md"
          message="Tolak bukti pembayaran ini?"
          className={`w-full ${rejectPending ? "opacity-60" : ""}`}
        >
          <X className="h-4 w-4" />
          Tolak pembayaran
        </ConfirmButton>
      </form>

      <p className="text-xs text-slate-500">
        Status pesanan tidak berubah otomatis ketika pembayaran diverifikasi.
        Perubahan status pesanan dilakukan secara terpisah.
      </p>
    </div>
  );
}
