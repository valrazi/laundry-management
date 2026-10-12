"use client";

import { useState, useTransition } from "react";

import { updateOrderDetailsAction } from "@/actions/order";
import Alert from "@/components/ui/Alert";
import Button from "@/components/ui/Button";
import { Field, Input, Textarea } from "@/components/ui/Form";
import { Save } from "@/components/ui/icons";
import {
  PRICE_UNIT_SHORT,
  PRICE_UNITS,
} from "@/lib/constants";

/**
 * Perhitungan di komponen ini HANYA untuk pratinjau (label "perkiraan").
 * Nilai resmi selalu dihitung ulang di server oleh orderService.
 */
function estimateSubtotal(item) {
  const price = Number(item.priceSnapshot) || 0;
  if (item.priceUnitSnapshot === PRICE_UNITS.KG) {
    const weight = Number(item.weight);
    return Number.isFinite(weight) ? price * weight : 0;
  }
  const quantity = Number(item.quantity);
  return Number.isFinite(quantity) ? price * quantity : 0;
}

export default function OrderDetailsForm({ order }) {
  const [isPending, startTransition] = useTransition();
  const [result, setResult] = useState(null);

  const [items, setItems] = useState(
    order.items.map((item) => ({
      id: item.id,
      serviceNameSnapshot: item.serviceNameSnapshot,
      priceSnapshot: item.priceSnapshot,
      priceUnitSnapshot: item.priceUnitSnapshot,
      quantity: item.quantity ?? "",
      weight: item.weight ?? "",
    })),
  );
  const [additionalCost, setAdditionalCost] = useState(
    order.additionalCost ?? "0",
  );
  const [adminNotes, setAdminNotes] = useState(order.adminNotes ?? "");

  const updateItem = (id, key, value) =>
    setItems((previous) =>
      previous.map((item) =>
        item.id === id ? { ...item, [key]: value } : item,
      ),
    );

  const estimatedSubtotal = items.reduce(
    (total, item) => total + estimateSubtotal(item),
    0,
  );
  const estimatedTotal = estimatedSubtotal + (Number(additionalCost) || 0);

  const formatRupiah = (value) =>
    new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
    }).format(value);

  const handleSubmit = (event) => {
    event.preventDefault();
    setResult(null);
    startTransition(async () => {
      const response = await updateOrderDetailsAction({
        orderId: order.id,
        additionalCost,
        adminNotes,
        items: items.map((item) => ({
          id: item.id,
          quantity: item.quantity,
          weight: item.weight,
        })),
      });
      setResult(response);
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {result ? (
        <Alert variant={result.ok ? "success" : "error"}>
          {result.message}
        </Alert>
      ) : null}

      <div className="space-y-3">
        {items.map((item) => (
          <div
            key={item.id}
            className="grid gap-3 rounded-lg border border-slate-200 p-3 sm:grid-cols-[1fr_auto_auto] sm:items-end"
          >
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-slate-800">
                {item.serviceNameSnapshot}
              </p>
              <p className="text-xs text-slate-500">
                {formatRupiah(item.priceSnapshot)}
                {PRICE_UNIT_SHORT[item.priceUnitSnapshot] ?? ""}
              </p>
            </div>

            {item.priceUnitSnapshot === PRICE_UNITS.KG ? (
              <Field
                label="Berat aktual (kg)"
                htmlFor={`weight-${item.id}`}
                className="sm:w-40"
              >
                <Input
                  id={`weight-${item.id}`}
                  type="number"
                  step="0.01"
                  min="0"
                  max="1000"
                  value={item.weight}
                  placeholder="Belum ditimbang"
                  onChange={(event) =>
                    updateItem(item.id, "weight", event.target.value)
                  }
                />
              </Field>
            ) : (
              <Field
                label="Jumlah item"
                htmlFor={`quantity-${item.id}`}
                className="sm:w-32"
              >
                <Input
                  id={`quantity-${item.id}`}
                  type="number"
                  min="1"
                  max="999"
                  step="1"
                  value={item.quantity}
                  onChange={(event) =>
                    updateItem(item.id, "quantity", event.target.value)
                  }
                />
              </Field>
            )}

            <p className="text-sm tabular-nums text-slate-600 sm:pb-2.5 sm:text-right">
              {formatRupiah(estimateSubtotal(item))}
            </p>
          </div>
        ))}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field
          label="Biaya tambahan"
          htmlFor="additionalCost"
          hint="Misalnya biaya antar jemput atau layanan khusus."
          error={result?.fieldErrors?.additionalCost}
        >
          <Input
            id="additionalCost"
            type="number"
            min="0"
            step="0.01"
            value={additionalCost}
            onChange={(event) => setAdditionalCost(event.target.value)}
          />
        </Field>

        <div className="rounded-lg bg-slate-50 p-3 sm:self-end">
          <p className="text-xs uppercase tracking-wide text-slate-500">
            Perkiraan total (dihitung ulang di server)
          </p>
          <p className="mt-1 text-lg font-semibold text-brand-navy tabular-nums">
            {formatRupiah(estimatedTotal)}
          </p>
        </div>
      </div>

      <Field
        label="Catatan internal admin"
        htmlFor="adminNotes"
        hint="Tidak ditampilkan ke pelanggan."
        error={result?.fieldErrors?.adminNotes}
      >
        <Textarea
          id="adminNotes"
          rows={2}
          maxLength={1000}
          value={adminNotes}
          onChange={(event) => setAdminNotes(event.target.value)}
        />
      </Field>

      <Button type="submit" loading={isPending}>
        <Save className="h-4 w-4" />
        Simpan rincian pesanan
      </Button>
    </form>
  );
}
