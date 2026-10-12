"use client";

import { useActionState, useState } from "react";

import {
  createServiceAction,
  toggleServiceAction,
  updateServiceAction,
} from "@/actions/service";
import Alert from "@/components/ui/Alert";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import ConfirmButton from "@/components/ui/ConfirmButton";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { Field, Input, Select, Textarea } from "@/components/ui/Form";
import ServiceIcon from "@/components/ui/ServiceIcon";
import { Pencil, Plus, Save, X } from "@/components/ui/icons";
import { PRICE_UNIT_LABELS, PRICE_UNIT_SHORT, PRICE_UNITS } from "@/lib/constants";

const UNIT_OPTIONS = [PRICE_UNITS.KG, PRICE_UNITS.ITEM];

export function formatRupiah(value) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
  }).format(Number(value) || 0);
}

function CreateServiceForm() {
  const [state, formAction, pending] = useActionState(createServiceAction, null);
  // State dipakai hanya untuk pratinjau ikon layanan secara langsung.
  const [name, setName] = useState("");
  const [priceUnit, setPriceUnit] = useState(PRICE_UNITS.KG);

  return (
    <Card>
      <CardHeader
        title="Tambah layanan"
        description="Harga dan satuan yang disimpan di sini dipakai sebagai snapshot pada pesanan baru."
      />
      <CardBody>
        <form action={formAction} className="space-y-4">
          {state ? (
            <Alert variant={state.ok ? "success" : "error"}>
              {state.message}
            </Alert>
          ) : null}

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Field
              label="Nama layanan"
              htmlFor="new-name"
              error={state?.fieldErrors?.name}
              hint="Ikon kartu dipilih otomatis dari kata kunci nama layanan."
              required
              className="lg:col-span-2"
            >
              <div className="flex items-center gap-2">
                <ServiceIcon name={name} priceUnit={priceUnit} />
                <Input
                  id="new-name"
                  name="name"
                  placeholder="Contoh: Cuci Setrika"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  required
                />
              </div>
            </Field>

            <Field
              label="Harga"
              htmlFor="new-price"
              error={state?.fieldErrors?.price}
              required
            >
              <Input
                id="new-price"
                name="price"
                type="number"
                min="1"
                step="0.01"
                placeholder="7000"
                required
              />
            </Field>

            <Field
              label="Satuan harga"
              htmlFor="new-priceUnit"
              error={state?.fieldErrors?.priceUnit}
              required
            >
              <Select
                id="new-priceUnit"
                name="priceUnit"
                value={priceUnit}
                onChange={(event) => setPriceUnit(event.target.value)}
              >
                {UNIT_OPTIONS.map((unit) => (
                  <option key={unit} value={unit}>
                    {PRICE_UNIT_LABELS[unit]}
                  </option>
                ))}
              </Select>
            </Field>
          </div>

          <Field
            label="Deskripsi"
            htmlFor="new-description"
            error={state?.fieldErrors?.description}
          >
            <Textarea
              id="new-description"
              name="description"
              rows={2}
              maxLength={1000}
              placeholder="Keterangan singkat layanan (opsional)"
            />
          </Field>

          <label className="flex items-center gap-2 text-sm text-slate-700">
            <input
              type="checkbox"
              name="isActive"
              defaultChecked
              className="h-4 w-4 rounded border-slate-300 text-brand-blue"
            />
            Aktifkan layanan ini
          </label>

          <Button type="submit" loading={pending}>
            <Plus className="h-4 w-4" />
            Tambah layanan
          </Button>
        </form>
      </CardBody>
    </Card>
  );
}

function EditServiceForm({ service, onClose }) {
  const [state, formAction, pending] = useActionState(updateServiceAction, null);
  // State dipakai hanya untuk pratinjau ikon layanan secara langsung.
  const [name, setName] = useState(service.name);
  const [priceUnit, setPriceUnit] = useState(service.priceUnit);

  return (
    <form action={formAction} className="space-y-4 bg-slate-50 p-4">
      <input type="hidden" name="serviceId" value={service.id} />

      {state ? (
        <Alert variant={state.ok ? "success" : "error"}>{state.message}</Alert>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Field
          label="Nama layanan"
          htmlFor={`name-${service.id}`}
          error={state?.fieldErrors?.name}
          className="lg:col-span-2"
        >
          <div className="flex items-center gap-2">
            <ServiceIcon name={name} priceUnit={priceUnit} />
            <Input
              id={`name-${service.id}`}
              name="name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              required
            />
          </div>
        </Field>

        <Field
          label="Harga"
          htmlFor={`price-${service.id}`}
          error={state?.fieldErrors?.price}
        >
          <Input
            id={`price-${service.id}`}
            name="price"
            type="number"
            min="1"
            step="0.01"
            defaultValue={service.price}
            required
          />
        </Field>

        <Field
          label="Satuan"
          htmlFor={`unit-${service.id}`}
          error={state?.fieldErrors?.priceUnit}
        >
          <Select
            id={`unit-${service.id}`}
            name="priceUnit"
            value={priceUnit}
            onChange={(event) => setPriceUnit(event.target.value)}
          >
            {UNIT_OPTIONS.map((unit) => (
              <option key={unit} value={unit}>
                {PRICE_UNIT_LABELS[unit]}
              </option>
            ))}
          </Select>
        </Field>
      </div>

      <Field
        label="Deskripsi"
        htmlFor={`description-${service.id}`}
        error={state?.fieldErrors?.description}
      >
        <Textarea
          id={`description-${service.id}`}
          name="description"
          rows={2}
          maxLength={1000}
          defaultValue={service.description}
        />
      </Field>

      <label className="flex items-center gap-2 text-sm text-slate-700">
        <input
          type="checkbox"
          name="isActive"
          defaultChecked={service.isActive}
          className="h-4 w-4 rounded border-slate-300 text-brand-blue"
        />
        Layanan aktif
      </label>

      <div className="flex gap-2">
        <Button type="submit" loading={pending}>
          <Save className="h-4 w-4" />
          Simpan perubahan
        </Button>
        <Button type="button" variant="outline" onClick={onClose}>
          <X className="h-4 w-4" />
          Tutup
        </Button>
      </div>
    </form>
  );
}

export default function ServiceManager({ services }) {
  const [editingId, setEditingId] = useState(null);

  return (
    <div className="space-y-6">
      <CreateServiceForm />

      <Card>
        <CardHeader
          title="Daftar layanan"
          description={`${services.length} layanan terdaftar. Perubahan harga tidak mengubah pesanan lama.`}
        />

        {services.length === 0 ? (
          <CardBody>
            <p className="text-sm text-slate-500">
              Belum ada layanan. Tambahkan layanan pertama di atas.
            </p>
          </CardBody>
        ) : (
          <div className="divide-y divide-slate-200">
            {services.map((service) => (
              <div key={service.id}>
                <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-4">
                  <div className="flex min-w-0 items-center gap-3">
                    <ServiceIcon
                      name={service.name}
                      priceUnit={service.priceUnit}
                    />
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-medium text-slate-800">
                          {service.name}
                        </p>
                        {service.isActive ? (
                          <Badge tone="success">Aktif</Badge>
                        ) : (
                          <Badge tone="danger">Nonaktif</Badge>
                        )}
                      </div>
                      <p className="mt-0.5 text-sm text-slate-600">
                        {formatRupiah(service.price)}
                        {PRICE_UNIT_SHORT[service.priceUnit] ?? ""}
                      </p>
                      {service.description ? (
                        <p className="mt-0.5 text-xs text-slate-500">
                          {service.description}
                        </p>
                      ) : null}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        setEditingId(
                          editingId === service.id ? null : service.id,
                        )
                      }
                    >
                      <Pencil className="h-4 w-4" />
                      {editingId === service.id ? "Batal" : "Ubah"}
                    </Button>

                    <form action={toggleServiceAction}>
                      <input type="hidden" name="serviceId" value={service.id} />
                      {service.isActive ? null : (
                        <input type="hidden" name="isActive" value="on" />
                      )}
                      <ConfirmButton
                        variant={service.isActive ? "danger" : "success"}
                        message={
                          service.isActive
                            ? `Nonaktifkan layanan "${service.name}"? Layanan ini tidak lagi bisa dipilih pada pesanan baru.`
                            : `Aktifkan kembali layanan "${service.name}"?`
                        }
                      >
                        {service.isActive ? "Nonaktifkan" : "Aktifkan"}
                      </ConfirmButton>
                    </form>
                  </div>
                </div>

                {editingId === service.id ? (
                  <EditServiceForm
                    service={service}
                    onClose={() => setEditingId(null)}
                  />
                ) : null}
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
