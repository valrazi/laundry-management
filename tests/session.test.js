import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { ROLES } from "@/lib/constants";
import { hashPassword, verifyPassword } from "@/lib/password";
import prisma from "@/lib/prisma";
import {
  createSessionRecord,
  getUserBySessionToken,
  hashSessionToken,
} from "@/lib/session";

import { createCustomerWithPassword, createUser, resetDatabase } from "./helpers";

beforeAll(async () => {
  await resetDatabase();
});

afterAll(async () => {
  await prisma.$disconnect();
});

describe("hash password", () => {
  it("menyimpan hash bcrypt, bukan plaintext", async () => {
    const hash = await hashPassword("Rahasia123");
    expect(hash).not.toBe("Rahasia123");
    expect(hash.startsWith("$2")).toBe(true);
  });

  it("menghasilkan hash berbeda untuk password yang sama (salt acak)", async () => {
    const first = await hashPassword("Rahasia123");
    const second = await hashPassword("Rahasia123");
    expect(first).not.toBe(second);
  });

  it("memverifikasi password benar dan menolak password salah", async () => {
    const hash = await hashPassword("Rahasia123");
    expect(await verifyPassword("Rahasia123", hash)).toBe(true);
    expect(await verifyPassword("Rahasia124", hash)).toBe(false);
    expect(await verifyPassword("", hash)).toBe(false);
  });
});

describe("session", () => {
  it("membuat session lalu memvalidasi tokennya", async () => {
    const { user } = await createCustomerWithPassword({
      email: `sesi-${Date.now()}@test.test`,
    });
    const { token } = await createSessionRecord(user.id);

    const found = await getUserBySessionToken(token);
    expect(found?.id).toBe(user.id);
    expect(found?.role).toBe(ROLES.CUSTOMER);
  });

  it("tidak pernah mengembalikan passwordHash", async () => {
    const { user } = await createCustomerWithPassword({
      email: `sesi2-${Date.now()}@test.test`,
    });
    const { token } = await createSessionRecord(user.id);
    const found = await getUserBySessionToken(token);
    expect(found.passwordHash).toBeUndefined();
  });

  it("menyimpan hash token, bukan token mentah", async () => {
    const { user } = await createCustomerWithPassword({
      email: `sesi3-${Date.now()}@test.test`,
    });
    const { token } = await createSessionRecord(user.id);

    const raw = await prisma.session.findUnique({ where: { id: token } });
    expect(raw).toBeNull();

    const hashed = await prisma.session.findUnique({
      where: { id: hashSessionToken(token) },
    });
    expect(hashed).not.toBeNull();
  });

  it("menolak token yang tidak dikenal", async () => {
    expect(await getUserBySessionToken("token-palsu")).toBeNull();
    expect(await getUserBySessionToken(undefined)).toBeNull();
  });

  it("menolak dan menghapus session yang kedaluwarsa", async () => {
    const { user } = await createCustomerWithPassword({
      email: `sesi4-${Date.now()}@test.test`,
    });
    const token = `kedaluwarsa-${Date.now()}`;

    await prisma.session.create({
      data: {
        id: hashSessionToken(token),
        userId: user.id,
        expiresAt: new Date(Date.now() - 60_000),
      },
    });

    expect(await getUserBySessionToken(token)).toBeNull();
    expect(
      await prisma.session.findUnique({ where: { id: hashSessionToken(token) } }),
    ).toBeNull();
  });

  it("menolak session milik akun yang dinonaktifkan", async () => {
    const inactive = await createUser({
      isActive: false,
      email: `nonaktif-${Date.now()}@test.test`,
    });
    const { token } = await createSessionRecord(inactive.id);
    expect(await getUserBySessionToken(token)).toBeNull();
  });
});

describe("batasan database", () => {
  it("email harus unik", async () => {
    const email = `unik-${Date.now()}@test.test`;
    await createUser({ email });
    await expect(createUser({ email })).rejects.toMatchObject({ code: "P2002" });
  });

  it("nomor telepon harus unik", async () => {
    const phone = `0812${Date.now().toString().slice(-8)}`;
    await createUser({ phone, email: `p1-${Date.now()}@test.test` });
    await expect(
      createUser({ phone, email: `p2-${Date.now()}@test.test` }),
    ).rejects.toMatchObject({ code: "P2002" });
  });

  it("nomor pesanan harus unik", async () => {
    const { user } = await createCustomerWithPassword({
      email: `order-${Date.now()}@test.test`,
    });
    const orderNumber = `LDR-TEST-UNIK`;

    await prisma.order.create({
      data: { orderNumber, customerId: user.id, status: "PENDING" },
    });

    await expect(
      prisma.order.create({
        data: { orderNumber, customerId: user.id, status: "PENDING" },
      }),
    ).rejects.toMatchObject({ code: "P2002" });
  });
});
