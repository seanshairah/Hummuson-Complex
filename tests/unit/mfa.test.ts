import { describe, expect, it } from "vitest";
import { TOTP, Secret } from "otpauth";
import {
  consumeRecoveryCode,
  createEnrolment,
  createRecoveryCodes,
  verifyTotp,
} from "@/server/mfa";

const EMAIL = "admin@example.test";

function currentCode(secret: string, offsetSeconds = 0): string {
  return new TOTP({
    issuer: "Humuson Complex",
    label: EMAIL,
    algorithm: "SHA1",
    digits: 6,
    period: 30,
    secret: Secret.fromBase32(secret),
  }).generate({ timestamp: Date.now() + offsetSeconds * 1000 });
}

describe("TOTP", () => {
  it("accepts the code its own secret produces", () => {
    const { secret } = createEnrolment(EMAIL);
    expect(verifyTotp(EMAIL, secret, currentCode(secret))).toBe(true);
  });

  it("tolerates one step of clock drift either way, and no more", () => {
    const { secret } = createEnrolment(EMAIL);
    expect(verifyTotp(EMAIL, secret, currentCode(secret, -30))).toBe(true);
    expect(verifyTotp(EMAIL, secret, currentCode(secret, 30))).toBe(true);
    // Two steps out is a stale code, and accepting it would widen the window
    // the second factor exists to narrow.
    expect(verifyTotp(EMAIL, secret, currentCode(secret, -90))).toBe(false);
  });

  it("rejects a code from a different secret", () => {
    const a = createEnrolment(EMAIL);
    const b = createEnrolment(EMAIL);
    expect(verifyTotp(EMAIL, a.secret, currentCode(b.secret))).toBe(false);
  });

  it("rejects anything that is not six digits", () => {
    const { secret } = createEnrolment(EMAIL);
    for (const bad of ["", "12345", "1234567", "abcdef", "12 34 56 78"]) {
      expect(verifyTotp(EMAIL, secret, bad)).toBe(false);
    }
  });

  it("issues a distinct secret each time", () => {
    expect(createEnrolment(EMAIL).secret).not.toBe(createEnrolment(EMAIL).secret);
  });
});

describe("recovery codes", () => {
  it("stores only hashes, never the codes themselves", async () => {
    const { codes, hashes } = await createRecoveryCodes();
    expect(codes).toHaveLength(10);
    for (const code of codes) expect(hashes).not.toContain(code);
  });

  it("accepts a code once and not twice", async () => {
    const { codes, hashes } = await createRecoveryCodes();
    const remaining = await consumeRecoveryCode(codes[0]!, hashes);
    expect(remaining).toHaveLength(9);
    expect(await consumeRecoveryCode(codes[0]!, remaining!)).toBeNull();
  });

  it("still accepts the others after one is spent", async () => {
    const { codes, hashes } = await createRecoveryCodes();
    const remaining = await consumeRecoveryCode(codes[0]!, hashes);
    expect(await consumeRecoveryCode(codes[1]!, remaining!)).toHaveLength(8);
  });

  it("rejects a code that was never issued", async () => {
    const { hashes } = await createRecoveryCodes();
    expect(await consumeRecoveryCode("aaaaaa-bbbbbb", hashes)).toBeNull();
  });
});
