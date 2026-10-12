import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { ROLES } from "@/lib/constants";
import prisma from "@/lib/prisma";
import { AUTH_FAILURE, authenticateCredentials } from "@/services/authService";

import { createCustomerWithPassword, createUser, resetDatabase } from "./helpers";

const PASSWORD = "Rahasia123";

let customer;
let admin;
let inactive;

beforeAll(async () => {
  await resetDatabase();

  customer = (
    await createCustomerWithPassword({
      email: "pintu-pelanggan@test.test",
      password: PASSWORD,
    })
  ).user;

  admin = await createUser({
    email: "pintu-admin@test.test",
    password: PASSWORD,
    role: ROLES.ADMIN,
  });

  inactive = await createUser({
    email: "pintu-nonaktif@test.test",
    password: PASSWORD,
    isActive: false,
  });
});

afterAll(async () => {
  await prisma.$disconnect();
});

describe("pintu masuk pelanggan (/login)", () => {
  it("menerima akun pelanggan", async () => {
    const result = await authenticateCredentials({
      email: customer.email,
      password: PASSWORD,
      expectedRole: ROLES.CUSTOMER,
    });

    expect(result.ok).toBe(true);
    expect(result.user.role).toBe(ROLES.CUSTOMER);
    expect(result.user.id).toBe(customer.id);
  });

  it("menolak password yang salah", async () => {
    const result = await authenticateCredentials({
      email: customer.email,
      password: "PasswordSalah9",
      expectedRole: ROLES.CUSTOMER,
    });

    expect(result.ok).toBe(false);
    expect(result.reason).toBe(AUTH_FAILURE.INVALID_CREDENTIALS);
    expect(result.message).toBe("Email atau password salah.");
  });

  it("memberi pesan sama untuk email yang tidak terdaftar (anti enumerasi)", async () => {
    const result = await authenticateCredentials({
      email: "tidak-ada@test.test",
      password: PASSWORD,
      expectedRole: ROLES.CUSTOMER,
    });

    expect(result.ok).toBe(false);
    expect(result.reason).toBe(AUTH_FAILURE.INVALID_CREDENTIALS);
    expect(result.message).toBe("Email atau password salah.");
  });

  it("menolak akun admin dan mengarahkan ke halaman login admin", async () => {
    const result = await authenticateCredentials({
      email: admin.email,
      password: PASSWORD,
      expectedRole: ROLES.CUSTOMER,
    });

    expect(result.ok).toBe(false);
    expect(result.reason).toBe(AUTH_FAILURE.WRONG_ROLE);
    expect(result.message).toMatch(/login admin/i);
  });
});

describe("pintu masuk admin (/admin/login)", () => {
  it("menerima akun admin", async () => {
    const result = await authenticateCredentials({
      email: admin.email,
      password: PASSWORD,
      expectedRole: ROLES.ADMIN,
    });

    expect(result.ok).toBe(true);
    expect(result.user.role).toBe(ROLES.ADMIN);
  });

  it("menolak akun pelanggan dan mengarahkan ke halaman login pelanggan", async () => {
    const result = await authenticateCredentials({
      email: customer.email,
      password: PASSWORD,
      expectedRole: ROLES.ADMIN,
    });

    expect(result.ok).toBe(false);
    expect(result.reason).toBe(AUTH_FAILURE.WRONG_ROLE);
    expect(result.message).toMatch(/login pelanggan/i);
  });

  it("menolak password yang salah sebelum menyebutkan role", async () => {
    const result = await authenticateCredentials({
      email: customer.email,
      password: "PasswordSalah9",
      expectedRole: ROLES.ADMIN,
    });

    // Role tidak dibocorkan karena password belum terbukti benar.
    expect(result.reason).toBe(AUTH_FAILURE.INVALID_CREDENTIALS);
    expect(result.message).not.toMatch(/role|admin|pelanggan/i);
  });
});

describe("akun nonaktif", () => {
  it("menolak login walaupun password benar", async () => {
    const result = await authenticateCredentials({
      email: inactive.email,
      password: PASSWORD,
      expectedRole: ROLES.CUSTOMER,
    });

    expect(result.ok).toBe(false);
    expect(result.reason).toBe(AUTH_FAILURE.INACTIVE);
    expect(result.message).toMatch(/dinonaktifkan/i);
  });
});

describe("kerahasiaan data", () => {
  it("tidak pernah mengembalikan passwordHash", async () => {
    const result = await authenticateCredentials({
      email: customer.email,
      password: PASSWORD,
      expectedRole: ROLES.CUSTOMER,
    });

    expect(result.user.passwordHash).toBeUndefined();
  });
});
