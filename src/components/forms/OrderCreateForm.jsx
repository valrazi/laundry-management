"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { createOrderAction } from "@/actions/order";
import Alert from "@/components/ui/Alert";
import Button from "@/components/ui/Button";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { Field, Input, Textarea } from "@/components/ui/Form";
import { Checkbox } from "@/components/ui/Form";
import { Plus } from "@/components/ui/icons";
import { PRICE_UNIT_SHORT, PRICE_UNITS } from "@/lib/constants";

function formatRupiah(value) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
  }).format(Number(value) || 0);
}

export default function OrderCreateForm({ services }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [result, setResult] = useState(null);
  const [notes, setNotes] = useState("");
  const [selection, setSelection] = useState(() =>
    Object.fromEntries(
      services.map((service) => [
        service.id,
        { checked: false, quantity: "1" },
      ]),
    ),
  );

  const setChecked = (serviceId, checked) =>
    setSelection((previous) => ({
      ...previous,
      [serviceId]: { ...previous[serviceId], checked },
    }));

  const setQuantity = (serviceId, quantity) =>
    setSelection((previous) => ({
      ...previous,
      [serviceId]: { ...previous[serviceId], quantity },
    }));

  const selectedServices = services.filter(
    (service) => selection[service.id]?.checked,
  );

  // Pratinjau saja — perhitungan resmi dilakukan di server.
  const estimatedTotal = selectedServices.reduce((total, service) => {
    if (service.priceUnit !== PRICE_UNITS.ITEM) return total;
    const quantity = Number(selection[service.id]?.quantity) || 0;
    return total + Number(service.price) * quantity;
  }, 0);

  const hasPendingWeight = selectedServices.some(
    (service) => service.priceUnit === PRICE_UNITS.KG,
  );

  const handleSubmit = (event) => {
    event.preventDefault();
    setResult(null);

    if (selectedServices.length === 0) {
      setResult({ ok: false, message: "Pilih minimal satu layanan." });
      return;
    }

    startTransition(async () => {
      const response = await createOrderAction({
        items: selectedServices.map((service) => ({
          serviceId: service.id,
          quantity:
            service.priceUnit === PRICE_UNITS.ITEM
              ? Number(selection[service.id]?.quantity) || 1
              : null,
        })),
        customerNotes: notes,
      });

      if (response.ok && response.data?.orderId) {
        router.push(`/customer/orders/${response.data.orderId}`);
        return;
      }

      setResult(response);
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {result && !result.ok ? (
        <Alert variant="error">{result.message}</Alert>
      ) : null}

      <Card>
        <CardHeader
          title="Pilih layanan"
          description="Berat aktual akan ditimbang dan ditentukan oleh admin setelah pakaian diterima."
        />
        <CardBody className="space-y-3">
          {services.length === 0 ? (
            <Alert variant="info">
              Belum ada layanan aktif. Silakan hubungi admin laundry.
            </Alert>
          ) : null}

          {services.map((service) => {
            const entry = selection[service.id];
            const isItem = service.priceUnit === PRICE_UNITS.ITEM;

            return (
              <div
                key={service.id}
                className={`rounded-lg border p-3 transition ${
                  entry?.checked
                    ? "border-brand-blue bg-brand-blue/5"
                    : "border-slate-200"
                }`}
              >
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <label className="flex min-w-0 flex-1 items-start gap-3">
                    <Checkbox
                      checked={entry?.checked ?? false}
                      onChange={(event) =>
                        setChecked(service.id, event.target.checked)
                      }
                      className="mt-1"
                    />
                    <span className="min-w-0">
                      <span className="block text-base font-medium text-slate-800 sm:text-sm">
                        {service.name}
                      </span>
                      <span className="block text-sm text-slate-600">
                        {formatRupiah(service.price)}
                        {PRICE_UNIT_SHORT[service.priceUnit] ?? ""}
                      </span>
                      {service.description ? (
                        <span className="mt-0.5 block text-xs text-slate-500">
                          {service.description}
                        </span>
                      ) : null}
                    </span>
                  </label>

                  {isItem && entry?.checked ? (
                    <div className="w-full sm:w-32">
                      <Field label="Jumlah" htmlFor={`qty-${service.id}`}>
                        <Input
                          id={`qty-${service.id}`}
                          type="number"
                          inputMode="numeric"
                          min="1"
                          max="999"
                          step="1"
                          value={entry.quantity}
                          onChange={(event) =>
                            setQuantity(service.id, event.target.value)
                          }
                        />
                      </Field>
                    </div>
                  ) : null}
                </div>
              </div>
            );
          })}
        </CardBody>
      </Card>

      <Card>
        <CardHeader title="Catatan pesanan" />
        <CardBody>
          <Field
            label="Catatan untuk laundry"
            htmlFor="customerNotes"
            hint="Contoh: pisahkan pakaian putih, jangan pakai pewangi."
            error={result?.fieldErrors?.customerNotes}
          >
            <Textarea
              id="customerNotes"
              rows={3}
              maxLength={500}
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              placeholder="Opsional"
            />
          </Field>
        </CardBody>
      </Card>

      <Card>
        <CardBody className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm text-slate-500">
              Estimasi biaya layanan per item
            </span>
            <span className="text-lg font-semibold tabular-nums text-brand-navy">
              {formatRupiah(estimatedTotal)}
            </span>
          </div>

          {hasPendingWeight ? (
            <Alert variant="info">
              Pesanan ini memuat layanan per kilogram. Total akhir akan
              dihitung admin setelah berat aktual ditimbang, sehingga estimasi
              di atas belum termasuk layanan tersebut.
            </Alert>
          ) : null}

          <Button
            type="submit"
            loading={isPending}
            size="lg"
            className="w-full sm:w-auto"
          >
            <Plus className="h-4 w-4" />
            Buat pesanan
          </Button>

          <p className="text-xs text-slate-500">
            Harga dan satuan diambil langsung dari data layanan di server.
            Nomor pesanan dibuat otomatis dan unik.
          </p>
        </CardBody>
      </Card>
    </form>
  );
}
