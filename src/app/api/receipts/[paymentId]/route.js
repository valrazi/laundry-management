import { NextResponse } from "next/server";

import { getCurrentUser } from "@/lib/auth";
import { ROLES } from "@/lib/constants";
import prisma from "@/lib/prisma";
import { readReceiptBuffer, sanitizeOriginalName } from "@/lib/uploads";

/**
 * Menyajikan file bukti transfer.
 *
 * File TIDAK berada di folder `public/` sehingga tidak dapat diakses lewat URL
 * statis. Route handler ini memeriksa autentikasi dan kepemilikan sebelum
 * mengirim isi file (PRD §11, AGENTS.md §10).
 */
export async function GET(request, { params }) {
  const { paymentId } = await params;

  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json(
      { error: "Anda harus login untuk mengakses file ini." },
      { status: 401 },
    );
  }

  const payment = await prisma.payment.findUnique({
    where: { id: paymentId },
    select: {
      id: true,
      proofFilePath: true,
      proofMimeType: true,
      proofOriginalName: true,
      order: { select: { customerId: true } },
    },
  });

  if (!payment || !payment.proofFilePath) {
    return NextResponse.json(
      { error: "Bukti transfer tidak ditemukan." },
      { status: 404 },
    );
  }

  const isOwner = payment.order?.customerId === user.id;
  const isAdmin = user.role === ROLES.ADMIN;
  if (!isOwner && !isAdmin) {
    return NextResponse.json(
      { error: "Anda tidak memiliki akses ke file ini." },
      { status: 403 },
    );
  }

  const buffer = await readReceiptBuffer(payment.proofFilePath);
  if (!buffer) {
    return NextResponse.json(
      { error: "File bukti transfer tidak tersedia di server." },
      { status: 404 },
    );
  }

  const asAttachment =
    new URL(request.url).searchParams.get("download") === "1";

  const filename = sanitizeOriginalName(payment.proofOriginalName);

  return new NextResponse(buffer, {
    status: 200,
    headers: {
      "Content-Type": payment.proofMimeType || "application/octet-stream",
      "Content-Length": String(buffer.length),
      "Content-Disposition": `${
        asAttachment ? "attachment" : "inline"
      }; filename="${filename}"`,
      // File privat: jangan pernah disimpan pada cache bersama.
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
