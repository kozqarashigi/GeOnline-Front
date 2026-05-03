/**
 * Қазақстан / РФ форматы: 10 цифр (707…), немесе 11 (+7… немесе 8…).
 * Бұрынғы логика 10 таңбаны «7 + 9 сан» деп қате түсіндіріп, кіруді сындыратын.
 */
export function normalizeKzPhone(input) {
  const d = String(input ?? "").replace(/\D/g, "");
  if (d.length === 10) {
    return `+7${d}`;
  }
  if (d.length === 11 && (d[0] === "7" || d[0] === "8")) {
    const ten = d.slice(1);
    if (ten.length === 10) return `+7${ten}`;
  }
  return null;
}

/** Әкімші журналында кездейсоқ нөмірді толық көрсетпеу */
export function maskPhoneForLog(phone) {
  const d = String(phone ?? "").replace(/\D/g, "");
  if (d.length < 4) return "—";
  const last2 = d.slice(-2);
  return `+7 *** *** ** ${last2}`;
}
