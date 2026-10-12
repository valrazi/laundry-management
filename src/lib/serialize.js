/**
 * Mengubah nilai Prisma `Decimal` menjadi string biasa sebelum dikirim ke
 * Client Component. Nilai uang tidak pernah diproses sebagai bilangan
 * floating point pada klien; perhitungan resmi tetap di server.
 */

export function decimalToString(value) {
  if (value === null || value === undefined) return null;
  return String(value);
}

export function serializeOrderItemsForClient(items = []) {
  return items.map((item) => ({
    id: item.id,
    serviceNameSnapshot: item.serviceNameSnapshot,
    priceSnapshot: decimalToString(item.priceSnapshot) ?? "0",
    priceUnitSnapshot: item.priceUnitSnapshot,
    quantity: item.quantity,
    weight: decimalToString(item.weight),
    subtotal: decimalToString(item.subtotal) ?? "0",
  }));
}

export function serializeOrderForClient(order) {
  return {
    id: order.id,
    orderNumber: order.orderNumber,
    status: order.status,
    additionalCost: decimalToString(order.additionalCost) ?? "0",
    adminNotes: order.adminNotes ?? "",
    items: serializeOrderItemsForClient(order.items),
  };
}

export function serializeServicesForClient(services = []) {
  return services.map((service) => ({
    id: service.id,
    name: service.name,
    description: service.description ?? "",
    price: decimalToString(service.price) ?? "0",
    priceUnit: service.priceUnit,
    isActive: service.isActive,
  }));
}
