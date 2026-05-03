/** Қысқа мерзімді SMS/email коды және телефон расталған күйі (Mongo-ға жазылмайды). */

const TTL_CODE_MS = 15 * 60 * 1000;
const TTL_VERIFIED_MS = 30 * 60 * 1000;

const pendingCodes = new Map();
const verifiedPhones = new Map();

function cleanup() {
  const now = Date.now();
  for (const [k, v] of pendingCodes.entries()) {
    if (v.expires < now) pendingCodes.delete(k);
  }
  for (const [k, exp] of verifiedPhones.entries()) {
    if (exp < now) verifiedPhones.delete(k);
  }
}

export function setRegisterCode(phone, code) {
  cleanup();
  pendingCodes.set(phone, { code: String(code), expires: Date.now() + TTL_CODE_MS });
}

export function verifyRegisterCode(phone, inputCode) {
  cleanup();
  const row = pendingCodes.get(phone);
  if (!row) {
    return { ok: false, message: "Код не запрошен или истёк. Запросите код снова." };
  }
  if (Date.now() > row.expires) {
    pendingCodes.delete(phone);
    return { ok: false, message: "Срок кода истёк. Запросите новый." };
  }
  if (String(inputCode).trim() !== row.code) {
    return { ok: false, message: "Неверный код" };
  }
  pendingCodes.delete(phone);
  verifiedPhones.set(phone, Date.now() + TTL_VERIFIED_MS);
  return { ok: true };
}

export function isPhoneRegisterVerified(phone) {
  cleanup();
  const exp = verifiedPhones.get(phone);
  return typeof exp === "number" && Date.now() < exp;
}

export function clearRegisterVerification(phone) {
  verifiedPhones.delete(phone);
  pendingCodes.delete(phone);
}
