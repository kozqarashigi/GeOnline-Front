import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { maskPhoneForLog, normalizeKzPhone } from "../src/lib/phone.js";

describe("phone", () => {
  it("normalizeKzPhone accepts 10 digits", () => {
    assert.equal(normalizeKzPhone("707 123 45 67"), "+77071234567");
    assert.equal(normalizeKzPhone("77071234567"), "+77071234567");
  });

  it("normalizeKzPhone accepts 11 with leading 7 or 8", () => {
    assert.equal(normalizeKzPhone("87071234567"), "+77071234567");
    assert.equal(normalizeKzPhone("77071234567"), "+77071234567");
  });

  it("normalizeKzPhone returns null for invalid", () => {
    assert.equal(normalizeKzPhone(""), null);
    assert.equal(normalizeKzPhone("123"), null);
    assert.equal(normalizeKzPhone("abcdefghij"), null);
  });

  it("maskPhoneForLog hides middle digits", () => {
    assert.equal(maskPhoneForLog("+77071234567"), "+7 *** *** ** 67");
    assert.equal(maskPhoneForLog("ab"), "—");
  });
});
