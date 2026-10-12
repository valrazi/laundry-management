import Link from "next/link";

import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import EmptyState from "@/components/ui/EmptyState";
import { Field, Input, Select } from "@/components/ui/Form";
import PageHeader from "@/components/ui/PageHeader";
import Pagination from "@/components/ui/Pagination";
import { Card, CardHeader } from "@/components/ui/Card";
import { Search } from "@/components/ui/icons";
import { formatDate, formatDateTime } from "@/lib/format";
import { paginationQuery, readListQuery } from "@/lib/query";
import { listCustomers } from "@/services/customerService";

export const metadata = { title: "Pelanggan" };

export default async function AdminCustomersPage({ searchParams }) {
  const params = await searchParams;
  const query = readListQuery(params);
  const customerStatus =
    params?.status === "active" || params?.status === "inactive"
      ? params.status
      : "";

  const result = await listCustomers({
    q: query.q,
    page: query.page,
    pageSize: query.pageSize,
    status: customerStatus,
  });

  return (
    <>
      <PageHeader
        title="Pelanggan"
        description="Kelola data pelanggan laundry. Akun tidak dihapus permanen, hanya dinonaktifkan."
      />

      <Card>
        <CardHeader title="Pencarian & filter" />
        <form
          method="get"
          action="/admin/customers"
          className="grid gap-4 px-5 py-4 sm:grid-cols-2 lg:grid-cols-4"
        >
          <Field label="Cari pelanggan" htmlFor="q" className="lg:col-span-2">
            <Input
              id="q"
              name="q"
              type="search"
              placeholder="Nama, email, atau nomor WhatsApp"
              defaultValue={query.q}
            />
          </Field>

          <Field label="Status akun" htmlFor="status">
            <Select id="status" name="status" defaultValue={customerStatus}>
              <option value="">Semua status</option>
              <option value="active">Aktif</option>
              <option value="inactive">Nonaktif</option>
            </Select>
          </Field>

          <div className="flex items-end gap-2">
            <Button type="submit">
              <Search className="h-4 w-4" />
              Terapkan
            </Button>
            <Link
              href="/admin/customers"
              className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100"
            >
              Reset
            </Link>
          </div>
        </form>
      </Card>

      <Card>
        <CardHeader
          title="Daftar pelanggan"
          description={`${result.total} pelanggan terdaftar.`}
        />

        {result.items.length === 0 ? (
          <div className="p-5">
            <EmptyState
              title="Tidak ada pelanggan"
              description="Coba ubah kata kunci pencarian atau filter status."
            />
          </div>
        ) : (
          <>
            <div className="table-scroll">
              <table className="min-w-full divide-y divide-slate-200 text-sm">
                <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="px-4 py-3 font-medium">Nama</th>
                    <th className="px-4 py-3 font-medium">Kontak</th>
                    <th className="px-4 py-3 font-medium">Status</th>
                    <th className="px-4 py-3 text-center font-medium">
                      Pesanan
                    </th>
                    <th className="px-4 py-3 font-medium">Terdaftar</th>
                    <th className="px-4 py-3 text-right font-medium">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {result.items.map((customer) => (
                    <tr key={customer.id} className="hover:bg-slate-50">
                      <td className="px-4 py-3">
                        <p className="font-medium text-slate-800">
                          {customer.name}
                        </p>
                        <p className="text-xs text-slate-500">
                          Terakhir diperbarui {formatDate(customer.updatedAt)}
                        </p>
                      </td>
                      <td className="px-4 py-3 text-slate-600">
                        <p>{customer.email}</p>
                        <p className="text-xs text-slate-500">
                          {customer.phone}
                        </p>
                      </td>
                      <td className="px-4 py-3">
                        {customer.isActive ? (
                          <Badge tone="success">Aktif</Badge>
                        ) : (
                          <Badge tone="danger">Nonaktif</Badge>
                        )}
                      </td>
                      <td className="px-4 py-3 text-center tabular-nums text-slate-700">
                        {customer._count?.orders ?? 0}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-slate-500">
                        {formatDateTime(customer.createdAt)}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Link
                          href={`/admin/customers/${customer.id}`}
                          className="text-sm font-medium text-brand-blue hover:underline"
                        >
                          Detail
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <Pagination
              page={result.page}
              totalPages={result.totalPages}
              total={result.total}
              pageSize={result.pageSize}
              basePath="/admin/customers"
              query={{
                q: query.q,
                status: customerStatus,
                pageSize: query.pageSize,
              }}
            />
          </>
        )}
      </Card>
    </>
  );
}
