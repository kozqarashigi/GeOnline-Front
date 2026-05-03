import { useEffect, useState } from "react";

function readLang() {
  return localStorage.getItem("geo_lang") === "ru" ? "ru" : "kk";
}

function useSyncedLang() {
  const [lang, setLang] = useState(readLang);

  useEffect(() => {
    const onDocLang = (e) => {
      const next = e.detail?.lang;
      if (next === "ru" || next === "kk") setLang(next);
    };
    const onStorage = (e) => {
      if (e.key === "geo_lang" && e.newValue) {
        setLang(e.newValue === "ru" ? "ru" : "kk");
      }
    };
    document.addEventListener("geo:lang", onDocLang);
    window.addEventListener("storage", onStorage);
    return () => {
      document.removeEventListener("geo:lang", onDocLang);
      window.removeEventListener("storage", onStorage);
    };
  }, []);

  return lang;
}

function CountUp({ end, duration = 1100, locale }) {
  const [value, setValue] = useState(0);

  useEffect(() => {
    if (typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setValue(end);
      return;
    }
    const start = performance.now();
    let raf = 0;
    const tick = (now) => {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - (1 - t) ** 3;
      setValue(Math.round(end * eased));
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [end, duration]);

  return <>{value.toLocaleString(locale)}</>;
}

const MESSAGES = {
  kk: {
    title: "Платформа сандармен",
    subtitle: "Нақты уақытта жаңартылатын платформа көрсеткіштері.",
    stats: [
      { end: 12500, suffix: "+", label: "белсенді оқушы" },
      { end: 842000, suffix: "", label: "тест сұрағы шешілді" },
      { end: 94, suffix: "%", label: "қанағаттану" },
      { end: 12800, suffix: "+", label: "сабақ сағаты" },
    ],
  },
  ru: {
    title: "Цифры платформы",
    subtitle: "Показатели платформы с динамическим обновлением.",
    stats: [
      { end: 12500, suffix: "+", label: "активных учеников" },
      { end: 842000, suffix: "", label: "решено тестовых вопросов" },
      { end: 94, suffix: "%", label: "удовлетворённость" },
      { end: 12800, suffix: "+", label: "часов уроков" },
    ],
  },
};

export function StatsStrip() {
  const lang = useSyncedLang();
  const locale = lang === "ru" ? "ru-RU" : "kk-KZ";
  const msg = MESSAGES[lang];

  return (
    <div className="react-stats">
      <div className="react-stats-head">
        <h2 className="react-stats-title">{msg.title}</h2>
        <p className="react-stats-subtitle">{msg.subtitle}</p>
      </div>
      <div className="react-stats-grid" role="list">
        {msg.stats.map((s) => (
          <div className="react-stats-card" key={s.label} role="listitem">
            <div className="react-stats-value" aria-live="polite">
              <CountUp end={s.end} locale={locale} />
              {s.suffix ? <span className="react-stats-suffix">{s.suffix}</span> : null}
            </div>
            <div className="react-stats-label">{s.label}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
