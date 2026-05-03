/**
 * GeoOnline — статикалық беттер + опционалды API (тіркелу, кіру, әкімші).
 */

const state = {
  lang: (() => {
    const saved = localStorage.getItem("geo_lang");
    return saved === "ru" ? "ru" : "kk";
  })(), // "kk" | "ru"
  theme: (() => {
    const saved = localStorage.getItem("geo_theme");
    return saved === "dark" ? "dark" : "light";
  })(), // "light" | "dark"
  a11yFont: (() => {
    const n = Number.parseInt(localStorage.getItem("geo_a11y_font") || "0", 10);
    return n === 1 || n === 2 ? n : 0;
  })(),
  a11yContrast: localStorage.getItem("geo_a11y_contrast") === "1",
  a11yCvd: localStorage.getItem("geo_a11y_cvd") === "1",
};

function safeJsonParse(value, fallback = null) {
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}

/** API негізі: `assets/geo-api-config.js` немесе `window.__GEO_API_BASE__` (мысалы http://127.0.0.1:3001) */
function getGeoApiBase() {
  if (typeof window === "undefined") return "";
  const w = window.__GEO_API_BASE__;
  if (w != null && String(w).trim()) return String(w).trim().replace(/\/$/, "");
  return "";
}

/** `geo-api-config.js` жүктелген: API бар (бос жол = сол origin) */
function isGeoApiMode() {
  return typeof window !== "undefined" && Object.prototype.hasOwnProperty.call(window, "__GEO_API_BASE__");
}

/** Офлайн тіркелу: экрандағы демо растау коды (тексеру мин. 4 таңба) */
const GEO_REGISTER_OFFLINE_DEMO_CODE = "1234";

function getToken() {
  return localStorage.getItem("geo_token");
}

function setToken(tok) {
  if (tok) localStorage.setItem("geo_token", tok);
  else localStorage.removeItem("geo_token");
}

function getUser() {
  return safeJsonParse(localStorage.getItem("geo_user"), null);
}

function setUser(user) {
  localStorage.setItem("geo_user", JSON.stringify(user));
}

function clearUser() {
  localStorage.removeItem("geo_user");
  localStorage.removeItem("geo_token");
}

async function tryRestoreApiSession() {
  const token = getToken();
  if (!token) return;
  if (!isGeoApiMode()) return;
  const base = getGeoApiBase();
  try {
    const r = await fetch(`${base}/api/auth/me`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!r.ok) throw new Error("me");
    const data = await r.json();
    if (data.user) setUser({ ...data.user, login: data.user.phone, fromApi: true });
    else throw new Error("me");
  } catch {
    clearUser();
  }
}

function prefersReducedMotion() {
  return (
    typeof window !== "undefined" &&
    typeof window.matchMedia === "function" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

function beginThemeTransition() {
  if (prefersReducedMotion()) {
    return;
  }
  const root = document.documentElement;
  root.classList.add("theme-switching");
  window.clearTimeout(window.__geoThemeTransitionTid);
  window.__geoThemeTransitionTid = window.setTimeout(() => {
    root.classList.remove("theme-switching");
  }, 420);
}

function initThemeToggle() {
  const btn = el("themeToggle");
  if (!btn) return;

  const apply = () => {
    document.documentElement.dataset.theme = state.theme;
    applyA11y();
  };

  btn.addEventListener("click", () => {
    state.theme = state.theme === "dark" ? "light" : "dark";
    localStorage.setItem("geo_theme", state.theme);
    beginThemeTransition();
    apply();
    showToast(t(state.theme === "dark" ? "toastThemeDark" : "toastThemeLight"));
  });

  apply();
}

function applyA11y() {
  const root = document.documentElement;
  if (state.a11yFont > 0) root.setAttribute("data-a11y-font", String(state.a11yFont));
  else root.removeAttribute("data-a11y-font");

  if (state.a11yContrast) root.setAttribute("data-a11y-contrast", "1");
  else root.removeAttribute("data-a11y-contrast");

  if (state.a11yCvd) root.setAttribute("data-a11y-cvd", "1");
  else root.removeAttribute("data-a11y-cvd");

  const cBtn = el("a11yContrastBtn");
  if (cBtn) cBtn.setAttribute("aria-pressed", state.a11yContrast ? "true" : "false");

  const cvdBtn = el("a11yCvdBtn");
  if (cvdBtn) cvdBtn.setAttribute("aria-pressed", state.a11yCvd ? "true" : "false");
}

function initA11yPanel() {
  const btn = el("a11yToggle");
  const menu = el("a11yMenu");
  if (!btn || !menu) return;

  const closeMenu = () => {
    menu.classList.remove("open");
    btn.setAttribute("aria-expanded", "false");
  };

  btn.addEventListener("click", () => {
    const isOpen = menu.classList.toggle("open");
    btn.setAttribute("aria-expanded", String(isOpen));
  });

  const persist = () => {
    localStorage.setItem("geo_a11y_font", String(state.a11yFont));
    localStorage.setItem("geo_a11y_contrast", state.a11yContrast ? "1" : "0");
    localStorage.setItem("geo_a11y_cvd", state.a11yCvd ? "1" : "0");
    applyA11y();
  };

  el("a11yFontDown")?.addEventListener("click", () => {
    state.a11yFont = Math.max(0, state.a11yFont - 1);
    persist();
  });

  el("a11yFontUp")?.addEventListener("click", () => {
    state.a11yFont = Math.min(2, state.a11yFont + 1);
    persist();
  });

  el("a11yFontReset")?.addEventListener("click", () => {
    state.a11yFont = 0;
    persist();
  });

  el("a11yContrastBtn")?.addEventListener("click", () => {
    state.a11yContrast = !state.a11yContrast;
    persist();
  });

  el("a11yCvdBtn")?.addEventListener("click", () => {
    state.a11yCvd = !state.a11yCvd;
    persist();
  });

  el("a11yResetBtn")?.addEventListener("click", () => {
    state.a11yFont = 0;
    state.a11yContrast = false;
    state.a11yCvd = false;
    persist();
    closeMenu();
    showToast(t("toastA11yReset"));
  });

  document.addEventListener("click", (e) => {
    if (!menu.classList.contains("open")) return;
    const inside = e.target.closest("#a11yMenu") || e.target.closest("#a11yToggle");
    if (!inside) closeMenu();
  });

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") closeMenu();
  });

  persist();
}

const i18n = {
  kk: {
    langName: "Қазақша",
    toastLang: "Тіл: Қазақша",
    toastThemeLight: "Тақырып: Ашық",
    toastThemeDark: "Тақырып: Қараңғы",
    toastSupportSent: "Өтінім қабылданды. Жақын арада хабарласамыз.",
    toastLoginOk: "Сәтті! Аккаунтқа кірдіңіз.",
    toastRegisterOk: "Тіркелу сәтті аяқталды.",
    toastTrialAgree: "Тестті бастау үшін келісім белгісін қойыңыз.",
    toastRegisterAgree: "Тіркелу үшін келісім белгісін қойыңыз.",
    toastRegisterNeedName: "Аты-жөніңізді енгізіңіз (кемінде 2 таңба).",
    toastRegisterCompleteSteps: "Алдымен телефон мен мәліметтер қадамдарын аяқтаңыз.",
    toastPhoneInvalid: "Телефон нөмірін толық енгізіңіз: +7 және 10 сан.",
    toastOtpShort: "Кем дегенде 4 таңбалы код енгізіңіз.",
    toastOtpShortServer: "6 таңбалы кодты толық енгізіңіз.",
    toastRegCodeEmail: "Код поштаға жіберілді (SMTP қосулы болса).",
    toastRegCodeDemo: "Код жасалды. Экрандағы немесе хаттағы кодты енгізіңіз.",
    toastRegisterVerifyOk: "Код расталды, мәліметтерді толтырыңыз.",
    toastRegisterNeedVerify: "Алдымен 2 қадамда кодты растаңыз.",
    toastApiLoginNeedPass: "Сервер режимінде парольді енгізіңіз.",
    toastApiError: "Сервер қатесі. Кейінірек қайталаңыз.",
    skip: "Контентке өту",
    menu: "Мәзір",
    a11y: {
      brandAria: "GeoOnline басты бет",
      navAria: "Негізгі мәзір",
      notifsAria: "Хабарламалар",
      langAria: "Тілді ауыстыру",
      langMenuAria: "Тіл мәзірі",
      themeAria: "Тақырыпты ауыстыру",
      a11yDdAria: "Көрініс және қолжетімділік",
      a11yBtnAria: "Көрініс пен қолжетімділік мәзірі",
      a11yMenuAria: "Параметрлер",
      a11yToggleGroupAria: "Контраст және түстер",
      a11yFontGroupAria: "Мәтін өлшемі",
      a11yFontDecAria: "Қаріпті кішірейту",
      a11yFontResetAria: "Қаріп өлшемін әдепкіге қайтару",
      a11yFontIncAria: "Қаріпті үлкейту",
      heroPreviewAria: "GeoOnline платформасының превьюі",
      whyMediaAria: "GeoOnline оқушылары",
      reactStatsAria: "Платформа статистикасы",
      newsDialogAria: "Жаңалық мәтіні",
    },
    a11yPanel: {
      title: "Көру қабілеті нашар адамдарға",
      menuTitle: "Көрініс және қолжетімділік",
      themeLabel: "Тақырып",
      themeAction: "Ауыстыру",
      font: "Мәтін өлшемі",
      contrast: "Жоғары контраст",
      contrastShort: "Контраст",
      cvd: "Дальтонизм: көк пен сары-қызғылт (қызыл-жасылға сүйенбейді)",
      cvdShort: "Түстер",
      reset: "Барлығын қалпына келтіру",
    },
    toastA11yReset: "Қолжетімділік баптаулары қалпына келтірілді.",
    toastPromoOk: "Промокод қабылданды!",
    toastPromoErr: "Промокод жарамсыз немесе бұрын қолданылған.",
    toastDashSaved: "Жоспар сақталды.",
    toastProfileSaved: "Профиль сақталды.",
    toastProfileNeedName: "Аты-жөнін кемінде 2 таңба енгізіңіз.",
    toastProfileEmailInvalid: "Email форматын тексеріңіз.",
    notif: {
      title: "Хабарламалар",
      empty: "Әзірше бос. Сынақ тест аяқталғанда нәтиже осы жерде пайда болады.",
      clear: "Барлығын жою",
    },
    nav: {
      courses: "Курстар",
      simulator: "Тренажёр",
      trial: "Сынақ тест",
      mobile: "Мобилді қосымша",
      materials: "Материалдар",
    },
    header: {
      login: "Кіру",
      register: "Тіркелу",
      dash: "Кабинет",
      logout: "Шығу",
      admin: "Әкімші",
      teacherPanel: "Мұғалім панелі",
    },
    common: { skip: "Контентке өту", menu: "Мәзір" },
    hero: {
      eyebrow: "СУПЕР-ПЛАТФОРМА",
      titleTop: "СУПЕР-ПЛАТФОРМА",
      titleBottom: "ҰБТ-ға дайындалудың ең тиімді платформасы",
      titleBottomHtml:
        "ҰБТ-ға дайындалудың <span class=\"keep-words\">ең <span class=\"accent-word\">тиімді</span></span> платформасы",
      subtitle: "ҰТО форматына сәйкес пробный тесттер, тренажер және толық дайындық курстары. Бізбен бірге грантқа түсу оңай.",
      cta1: "Тегін пробный тест тапсыру",
      cta2: "Платформаға кіру",
      social: "10,000+ оқушы бізді таңдады",
      badge1: "Жылдам анализ",
      badge2: "Интеллектуалды тренажер",
      badge3: "Рейтинг жүйесі",
    },
    how: { title: "Платформа қалай жұмыс істейді?", subtitle: "Жүйелі дайындық: нақты нәтиже." },
    why: {
      title: "Неге бізді таңдайды?",
      subtitle: "ҰБТ-ға сапалы дайындық үшін барлық жағдай жасалған. Біз тек тест қана емес, білім беру экожүйесіміз.",
    },
    mobile: {
      title: "Мобилді қосымша",
      subtitle: "Кез келген жерде, кез келген уақытта дайындал",
      b1t: "Ыңғайлы тест интерфейсі",
      b1d: "Максималды тұрде НАҒЫЗ ҰБТ-ға жақындатылған.",
      b2t: "Әрдайым қолжетімді қатемен жұмыс",
      b2d: "ҰТО тест спецификациясына сай",
      b3t: "Интеллектуалды тренажер",
      b3d: "Барлық пәндер қамтылған",
    },
    phone: {
      brand: "GeoOnline",
      pill: "ҰБТ тест",
      q: "1/20 • Матем",
      text: "Берілген функцияның мәнін табыңыз.",
      cta1: "Жауап беру",
      cta2: "Келесі",
    },
    cta: {
      title: "ҰБТ-ға дайындықты бүгін баста",
      subtitle:
        "Уақытты жоғалтпай, қазірден баста да грантқа жақында. Бірінші пробный тест тегін.",
      cta1: "Тегін тест тапсыру",
      cta2: "Консультация алу",
    },
    footer: {
      desc: "ҰБТ-ға дайындықтың заманауи және ең тиімді тәсілі. Бізбен бірге болашағыңа қадам жаса.",
      platform: "Платформа",
      company: "Компания",
      help: "Көмек",
      about: "Біз туралы",
      contacts: "Байланыс",
      partners: "Серіктестер",
      news: "Жаңалықтар",
      faq: "Сұрақ-жауап (FAQ)",
      support: "Қолдау көрсету",
      privacy: "Құпиялылық саясаты",
      copyright: "© GeoOnline 2026. Барлық құқықтар қорғалған.",
      top: "↑ Жоғары",
      rating: "Рейтинг",
    },
    pages: {
      backHome: "← Басты бетке",
      login: {
        title: "Кіру",
        subtitle: "Аккаунтыңызға кіріңіз.",
        cardTitle: "Логин мен пароль",
        authTag: "Кіру",
        heading: "Аккаунтқа кіру",
        phoneLabel: "Телефон",
        phone: "Телефон немесе Email",
        pass: "Пароль",
        submit: "Кіру",
        next: "Әрі қарай",
        noAccount: "Аккаунт жоқ па?",
        toRegister: "Тіркелу",
        toRegisterLink: "Тіркелу",
        apiHint: "Телефон мен парольді енгізіңіз.",
      },
      register: {
        title: "Тіркелу",
        subtitle: "Жаңа аккаунт жасаңыз.",
        cardTitle: "Тіркелу",
        authTag: "Тіркелу",
        createTitle: "Тіркелу",
        stepPhone: "Телефон",
        stepVerify: "Растау",
        stepDetails: "Мәліметтер",
        name: "Аты-жөні",
        phone: "Телефон",
        pass: "Пароль",
        submit: "Тіркелу",
        continue: "Әрі қарай",
        back: "Артқа",
        agreePrefix: "Мен келісемін",
        agreeLink: "пайдаланушы келісімімен",
        agreementModalTitle: "Пайдаланушы келісімі",
        agreementClose: "Жабу",
        agreementIframeTitle: "Пайдаланушы келісімі",
        agreementOpenFull: "Толық бетте ашу",
        otpLabel: "Растау коды",
        otpHint:
          "Сервер режимінде 6 таңбалы код жіберіледі (пошта немесе экрандағы демо). 4 таңбадан кем емес енгізіңіз.",
        emailOptional: "Email (міндетті емес)",
        emailHint: "Толтырсаңыз, растау коды осы поштаға жіберілуі мүмкін (SMTP қосулы болса).",
        demoCodeHint: "Демо: код {code}",
        hasAccount: "Аккаунт бар ма?",
        toLogin: "Кіру",
        stepMeta: "Қадам {n} / {total}",
        stepsAria: "Тіркелу қадамдары",
      },
      dash: {
        title: "Жеке кабинет",
        subtitle: "Аккаунт ақпараты және платформаға өту.",
        greeting: "Сәлеметсіз бе,",
        welcomeHint:
          "Дайындықты жоғарыдағы мәзір арқылы жалғастырыңыз: Курстар, Тренажер, Материалдар, Сынақ тест.",
        welcomeHintAdmin: "Пайдаланушылар мен промокодтарды әкімші панелінен басқарыңыз.",
        welcomeHintTeacher:
          "Оқушылар тізімі мен промокодтарды тек қарау үшін «Мұғалім панелін» ашыңыз; төменде топ-10 прогресс көрсетіледі.",
        teacherTitle: "Мұғалім аймағы",
        teacherSubtitle: "Оқушылар тізімі мен прогресті қарау. Рөл өзгерту және жою — тек әкімші.",
        teacherOpen: "Мұғалім панелін ашу",
        leaderboardTitle: "Оқушылар: топ-10 (орташа прогресс, %)",
        leaderboardEmpty: "Әлі оқушы дерегі жоқ немесе прогресс 0%.",
        memberSince: "Тіркелген:",
        profileTitle: "Профиль",
        profileNameEdit: "Аты-жөні",
        profileEmailEdit: "Email (міндетті емес)",
        profileEmailPh: "мысалы name@mail.kz",
        profileEmailExplain:
          "Бұл email тек профильде сақталады. Тіркелу кодын поштаға жіберу үшін сервер .env ішінде SMTP_USER және SMTP_PASS қосу керек; қоспасаңыз терминалда emailSent=false — бұл қалыпты, код API жауабындағы demoCode арқылы беріледі.",
        profilePhoneNote: "Телефон тіркеуде бекітілген; өзгерту үшін қолдауға жазыңыз.",
        profileSave: "Сақтау",
        nameLabel: "Аты-жөні:",
        phoneLabel: "Телефон:",
        roleLabel: "Рөл:",
        roleStudent: "Оқушы",
        roleTeacher: "Мұғалім",
        roleAdminShort: "Әкімші",
        linksTitle: "Жылдам сілтемелер",
        toTraining: "Тренажер",
        toMaterials: "Материалдар",
        toTrial: "Сынақ тест",
        toCourses: "Курстар",
        toAdmin: "Әкімші панелі",
        adminTitle: "Әкімші аймағы",
        adminSubtitle: "Пайдаланушылар мен баптауларды басқару.",
        adminOpen: "Әкімші панелін ашу",
        statDemo: "Демо көрсеткіш",
        statDemoNote: "Нақты платформада прогресс профильден бақылады.",
        streakTitle: "Серия",
        streakUnit: "күн",
        streakHint: "Күн сайын кабинетке кірсеңіз, серия өседі.",
        overallProgress: "Жалпы прогресс",
        progressHint: "Курстар, тренажёрдегі география тақырыптары және чеклист бойынша орташа.",
        studyTitle: "Оқу жоспары",
        studyLead: "Курстар төменде кезекпен; апталық кесте мен промо — келесі карточкаларда. Географияда тренажер тақырыптары бөлек көрсетіледі.",
        topicProgressTitle: "Курстар мен прогресс",
        trainerLead: "География прогресі тренажерде есептеледі.",
        trainerDashHint:
          "Кабинетте көрсетілетін % тренажердегі соңғы нәтижені бетке оралғанда немесе бетті жаңартқанда жаңарады (нақты уақытта емес).",
        courseCatalog: "Курстар тізіміне өту",
        openTrainer: "Тренажерге өту",
        learningPathTitle: "Менің оқу жолым",
        pathHint: "Курс бойынша кезеңдер төменде; географияда тренажер тақырыптары бөлек көрсетіледі.",
        coursePhasesAria: "Курс кезеңдері",
        courseStatusNew: "Басталған жоқ",
        courseStatusActive: "Оқу кезінде",
        courseStatusDone: "Аяқталды",
        planTitle: "Апталық кесте",
        planHint: "Қай күнде, қанша уақытта не істейтініңізді жазыңыз.",
        planAdd: "Жоспарға қосу",
        planWeekday: "Күн",
        planTime: "Уақыт",
        planLabel: "Не істеу",
        planDone: "Орындалды",
        planRemove: "Жою",
        promoTitle: "Промокод",
        promoHint: "Әкімші жасаған промокодты енгізіңіз.",
        promoPlaceholder: "Мысалы GEONLINE2021",
        promoApply: "Қолдану",
        promoActive: "Белсенді промокодтар",
        promoEmpty: "Әлі промокод жоқ.",
        topics: {
          softskills: "ҰБТ Soft Skills",
          personal: "Жеке тиімділік",
          geo: "География ҰБТ",
          math_gani: "Математикалық сауаттылық, Ғани",
          math_oryn: "Математикалық сауаттылық, Орынбасар",
          reading: "Оқу сауаттылығы",
        },
        chk: {
          intro: "Кіріспе",
          video: "Бейне блок",
          quiz: "Тест / қорытынды",
          modules: "Модульлер",
          trial: "Пробный тест",
          repeat: "Қайталау",
          theory: "Теория",
          practice: "Практика",
          mock: "Пробный нұсқа",
          speed: "Жылдам оқу",
          analysis: "Талдау",
          exam: "Емтихан форматы",
        },
        weekdays: {
          "0": "Жек",
          "1": "Дүй",
          "2": "Сей",
          "3": "Сәр",
          "4": "Бей",
          "5": "Жұм",
          "6": "Сен",
        },
      },
      about: {
        title: "Біз туралы",
        subtitle:
          "GeoOnline: ҰБТ-ға дайындықты жүйелейтін бір платформа. Сынақ тест, тренажёр, курстар және материалдар бір орында.",
        block1: { title: "Біздің миссия", note: "Нақты нәтиже үшін жүйелі дайындық", text: "Оқушыға түсінікті оқу жолын, күнделікті әдетті және прогресті бақылауды бір жерге жинаймыз." },
        block2: {
          title: "Не береді?",
          note: "Платформа мүмкіндіктері",
          li1: "ҰБТ форматына жақын сынақ тесттер",
          li2: "Тақырыптық талдау және ұсыныстар",
          li3: "Интеллектуалды тренажёр",
          li4: "Курс материалдары және прогресс",
        },
        valuesTitle: "Құндылықтар",
        valuesSubtitle: "Оқушыға ыңғайлы, әділ және түсінікті платформа.",
        v1t: "Түсініктілік",
        v1n: "Қарапайым интерфейс",
        v1d: "Артық нәрсе жоқ: тек оқушыға керек функционал ғана.",
        v2t: "Нәтиже",
        v2n: "Дәл өлшем",
        v2d: "Прогресс пен әлсіз тақырыптар анық көрінеді.",
        v3t: "Қолдау",
        v3n: "Кері байланыс",
        v3d: "Сұрақ болса, тез жауап беретін арна болады.",
      },
      contacts: {
        title: "Байланыс",
        subtitle: "Сұрағыңыз бар ма? Жазыңыз, көмектесеміз.",
        block1: {
          title: "Байланыс арналары",
          note: "Жылдам жауап",
          li1: "WhatsApp: +7 (777) 777-77-77",
          li2: "Telegram: @geoonline_support",
          li3: "Email: support@geoonline.kz",
        },
        form: {
          title: "Қолдау қызметі",
          note: "Өтініш қалдырыңыз",
          name: "Аты-жөніңіз",
          phone: "Телефон",
          msg: "Хабарлама",
          send: "Жіберу",
          toFaq: "FAQ қарау",
        },
      },
      faq: {
        title: "Сұрақ-жауап",
        subtitle: "Жиі қойылатын сұрақтарға қысқа жауаптар.",
        q1: "Платформада не бар?",
        a1: "Сынақ тест, тренажёр, курстар және материалдар бір экожүйеде: әр бөлім өз бетінде.",
        q2: "Тіл ауыстыру қалай жұмыс істейді?",
        a2: "Жоғарыдағы тіл батырмасын таңдаңыз: сайт мәтіні бірден ауысады.",
        q3: "Қараңғы режим бар ма?",
        a3: "Иә. Жоғарыдағы ай белгісін басыңыз: тақырып қараңғы немесе ашық режимге ауысады.",
        q4: "Қалай байланыссам болады?",
        a4: "Қолдау үшін мына бетке өтіңіз:",
        a4Link: "Байланыс",
      },
      news: {
        title: "Жаңалықтар",
        subtitle: "ҰБТ жаңалықтары мен платформа жаңартулары.",
        readMore: "Толығырақ оқу",
        modalClose: "Жабу",
        hintTech:
          "Толық мәтінді көру үшін «Толығырақ оқу» басыңыз (модалка, таза JavaScript; басты бетте React-блок бар).",
        ubt1t: "2026 ҰБТ: өтініштер мен тест мерзімдері",
        ubt1d: "2026 • Күнтізбе",
        ubt1p: "Негізгі өтініштер мен тест күндері ресми жарияланған күнтізмеге сәйкес. Нақты датаны порталдан растаңыз.",
        ubt2t: "ҰБТ-ны жылына бірнеше рет тапсыру",
        ubt2d: "2026 • Сессиялар",
        ubt2p: "Ақылы оқу мен грант бағыттары бойынша әртүрлі терезелер болуы мүмкін. Ресми ережелерді бақылаңыз.",
        n1t: "Сынақ тест интерфейсі жаңартылды",
        n1d: "2026 • UI",
        n1p: "Тест тапсыру жылдамырақ, нәтиже панелі анық: форматтық блок пен таймер.",
        n2t: "Тренажёрде жаңа модульдер",
        n2d: "2026 • Simulator",
        n2p: "Тақырыптық тапсырмалар кеңейтілді, әлсіз тұстарды бекіту оңай.",
        n3t: "Dark mode қосылды",
        n3d: "2026 • Theme",
        n3p: "Кешкі уақытта оқу көзге жеңіл болу үшін қараңғы режим бар.",
      },
      privacy: {
        title: "Құпиялылық саясаты",
        subtitle: "Деректерді қалай жинаймыз және қалай қорғаймыз.",
        p1t: "1) Жалпы",
        p1n: "Негізгі қағидалар",
        p1d: "Төменде деректерді жинау мен қорғауға қатысты жалпы ақпарат берілген. Нақты құжат мәтінін заң кеңесшісімен келісу керек.",
        p2t: "2) Қандай дерек жиналуы мүмкін",
        p2n: "Мысал",
        li1: "Аты-жөні, байланыс нөмірі (қолдау формасы арқылы)",
        li2: "Платформадағы прогресс/нәтиже (егер аккаунт болса)",
        li3: "Құрылғы және браузер туралы техникалық ақпарат",
        p3t: "3) Байланыс",
        p3n: "Сұрақ болса",
        p3d: "Құпиялылық бойынша сұрақтарыңыз болса, мына жерге жазыңыз:",
        contactLink: "Байланыс",
      },
      agreement: {
        title: "Пайдаланушы келісімі",
        subtitle: "Платформаны пайдалану ережелері мен жауапкершіліктердің қысқаша сипаттамасы.",
        p1t: "1) Келісімнің мәні",
        p1n: "Жалпы",
        p1d:
          "Тіркелу немесе тестті бастау арқылы сіз осы келісімнің талаптарымен танысқан және олармен келісетініңізді растайсыз. Нақты құқықтық мәтінді заң кеңесшісімен келісу ұсынылады.",
        p2t: "2) Аккаунт және деректер",
        p2n: "Қауіпсіздік",
        p2d:
          "Телефон нөмірі және профильдегі деректер серверде сақталады. Парольді басқаға жарияламаңыз; күдік болған жағдайда парольді өзгертіңіз немесе қолдауға жазыңыз.",
        p3t: "3) Контент пен материалдар",
        p3n: "Пайдалану",
        p3d:
          "Курстар мен тренажер материалдары авторлық құқыққа бағынады. Материалдарды қайта сату немесе жария таратуға болмайды; жеке оқу мақсатында пайдалануға рұқсат етіледі.",
        p4t: "4) Құпиялылық",
        p4n: "Толығырақ",
        p4d: "Деректерді өңдеу тәртібі құпиялылық саясатында сипатталған.",
        privacyLink: "Құпиялылық саясаты",
        p5t: "5) Байланыс",
        p5n: "Сұрақ болса",
        p5d: "Келісім бойынша сұрақтарыңыз болса, Байланыс беті арқылы жазыңыз.",
        contactLink: "Байланыс",
      },
    },
    partnersSection: {
      title: "Біздің серіктестеріміз",
      subtitle: "Білім саласындағы серіктес ұйымдар.",
    },
    platform: {
      title: "Пробный тест",
      subtitle: "ҰБТ форматына жақын сынақ. Тренажер оқу бетінде, материалдар өз бетінде.",
      back: "← Басты бетке",
      toTraining: "Тренажерге",
      toMaterials: "Материалдар",
      ctaMaterials: "Материалдарға өту",
    },
    training: {
      title: "Тренажер",
      subtitle: "Тақырыптық модульдер мен прогресс. Материалдар бөлек бетте.",
      toMaterials: "Материалдарға өту",
      toTrial: "Пробный тестке өту",
      tryTrialCta: "Пробный тест тапсыру",
    },
    trial: {
      title: "Пробный тест",
      subtitle:
        "Толық ҰБТ: 4 сағат, 120 сұрақ, 5 секция, макс. 140 балл. Төменде GeoOnline география бейініне жақын қысқа сынақ (5 сұрақ; таймер тек тест басталған соң іске қосылады).",
      setup: {
        title: "Тестке дайындық",
        note: "Қысқа сынақ",
        lead:
          "Жоғарыда ҰБТ құрылымын оқыңыз, география бейіні үшін екінші пәнді таңдаңыз, келісім беріңіз және «Тестті бастау» басыңыз.",
        li1: "Міндетті пәндер: тарих, оқу сауаттылығы, математикалық сауаттылық (нақты ҰБТ-да 40 сұрақ).",
        li2: "Сіздің бейіндік жұп: география + таңдалған екінші пән (жоғарыдағы блокта).",
        li3: "Таймер тек сіз тестті бастағаннан кейін іске қосылады.",
        agree: "Таңдауларымды тексердім, тестті бастауға дайынмын.",
      },
      start: "Тестті бастау",
      cardTitle: "Мини пробный тест",
      cardNote: "ҰБТ форматына жақын",
      submit: "Тапсыру",
      reset: "Қайта бастау",
      resultTitle: "Нәтиже және ұсыныс",
      resultNote: "Талдау және кеңес",
      meta1: "5 мин · толық ҰБТ 4 сағат",
      meta2: "Жеке ұсыныс",
      meta3: "Қысқа формат",
      nextTitle: "Келесі қадам?",
      nextText: "Нәтижеден кейін тренажер арқылы әлсіз тақырыптарды бекітіңіз.",
      nextCta: "Тренажерге өту",
      scorePrefix: "Сіздің нәтижеңіз:",
      scoreEmpty: "Сіздің нәтижеңіз: -/5",
      recoEmpty: "Тестті тапсырып көріңіз: әлсіз тақырыптарыңыз бойынша ұсыныс шығарамыз.",
      recos: {
        great:
          "Керемет! Сізде база жақсы. Тренажер арқылы ұсақ қателерді азайтып, пробный тесттермен тұрақтандырыңыз.",
        good: "Жақсы нәтиже. Қателескен тақырыптарды белгілеп, сол модульдер бойынша тренажер жасаңыз.",
        mid: "Орташа. Алдымен базалық тақырыптарды қайталап, күн сайын 20-30 минут тренажер орындаңыз.",
        low: "Қиындау болып тұр. Ұсыныс: базалық курс пен күнделікті қысқа жаттығулар. Ең бастысы: тұрақтылық.",
      },
      ubt: {
        title: "Ресми ҰБТ (ЕНТ) форматы",
        lead: "4 сағат беріледі. Барлығы 120 тест сұрағы, ең жоғары балл: 140.",
        sections: "5 секция: 3 міндетті пән + 2 бейіндік пән (өзіңіз таңдайсыз).",
        mandTitle: "Міндетті пәндер: 40 сұрақ",
        mand1: "Қазақстан тарихы: 20 сұрақ",
        mand2: "Оқу сауаттылығы: 10 сұрақ",
        mand3: "Математикалық сауаттылық: 10 сұрақ",
        profTitle: "Бейіндік пәндер: 80 сұрақ",
        prof1: "1-бейіндік пән: 40 сұрақ",
        prof2: "2-бейіндік пән: 40 сұрақ",
        note: "Бейіндік комбинациялар мамандыққа байланысты (мысалы: Физика + Математика немесе Биология + Химия).",
      },
      geo: {
        title: "GeoOnline: география бейіні",
        lead:
          "Бізде география бойынша терең дайындық бар. Нақты ҰБТ-да екінші бейіндік пәнді өзіңіз таңдайсыз; төменде екінші пәнді ауыстырып, комбинацияны көріңіз.",
        label: "2-бейіндік пән",
        combo: "Сіздің бейіндік жұбыңыз:",
        fixed: "География",
      },
      timer: {
        officialLabel: "Ресми ҰБТ уақыты",
        officialValue: "4:00:00",
        questionsLabel: "120 сұрақ · макс. 140 балл",
        demoLabel: "Мини-тест таймері",
        idleHint: "Таймер «Тестті бастау» басылғанша тұрақтанған. Содан кейін 5 минут санайды.",
        demoHint: "5 сұрақ үшін шектеулі уақыт (толық тест: 4 сағат).",
        timeUpToast: "Уақыт аяқталды. Жауаптар есептелді.",
      },
    },
    sim: {
      title: "Тренажер",
      subtitle: "Әр пәннің кез келген модулінен дайындық жасап, әлсіз тұстарыңызды дамытыңыз.",
      stat1: "Тақырыптар",
      stat2: "Тиімділік",
      stat3v: "Тақырыптық",
      stat3: "Анализ",
      pickCourse: "Курсты таңдау",
      refreshDemo: "Жаңарту",
      panelTitle: "Тақырыптар панелі",
      panelNote: "Модульдер тізімі",
      hint: "Нақты платформада модульдер оқушы жоспарына сай құрылады.",
      moduleTap: "Басып, тақырып бойынша сессияны аяқтау (+прогресс).",
      topicBumped: "Тақырып бойынша прогресс жаңартылды.",
    },
    materialsPage: {
      title: "Материалдарға доступ",
      subtitle: "Тегін дайындық материалдарына қол жеткізіңіз",
      cta: "Тегін дайындық материалдарына доступ ал",
      toTrainer: "Тренажерге өту",
      toTrial: "Пробный тестке өту",
    },
    steps: { stepLabel: "Қадам", learnMore: "Толығырақ" },
    features: { verified: "Тексерілді" },
    rating: { reviews: "пікір" },
    courses: {
      title: "Дайындық курстары",
      subtitle: "Үздік мұғалімдерден ең түсінікті сабақтар",
      desc: "Тақырыптық жоспар, видео сабақтар, тапсырмалар және прогресс бақылауы.",
      open: "Курсты ашу",
    },
    materials: {
      title: "Материалдарға доступ",
      subtitle: "Тегін дайындық материалдарына қол жеткізіңіз",
      openAccessLead: "Төмендегі файлдарға тікелей қолжетімділік: PDF жүктеледі, HTML браузерде ашылады.",
      cta: "Тізімге өту",
      ctaScroll: "Тізімге өту",
      footNote: "Қосымша сұрақ болса, қолдау арқылы хабарласыңыз.",
      free: "Тегін",
      download: "Жүктеу",
      downloadFile: "Жүктеу",
      openFile: "Ашу",
      toastTip: "Файлды таңдап, жүктеңіз немесе ашыңыз.",
    },
    partners: {},
  },
  ru: {
    langName: "Орысша",
    toastLang: "Язык: Русский",
    toastThemeLight: "Тема: Светлая",
    toastThemeDark: "Тема: Тёмная",
    toastSupportSent: "Заявка принята. Мы скоро свяжемся.",
    toastLoginOk: "Готово! Вы вошли в аккаунт.",
    toastRegisterOk: "Регистрация успешно завершена.",
    toastTrialAgree: "Отметьте согласие, чтобы начать тест.",
    toastRegisterAgree: "Отметьте согласие для регистрации.",
    toastRegisterNeedName: "Введите имя (не короче 2 символов).",
    toastRegisterCompleteSteps: "Сначала пройдите шаги с телефоном и данными.",
    toastPhoneInvalid: "Введите полный номер: +7 и 10 цифр.",
    toastOtpShort: "Введите код не короче 4 символов.",
    toastOtpShortServer: "Введите полный 6-значный код.",
    toastRegCodeEmail: "Код отправлен на почту (если настроен SMTP).",
    toastRegCodeDemo: "Код создан. Введите его с экрана или из письма.",
    toastRegisterVerifyOk: "Код подтверждён, заполните данные.",
    toastRegisterNeedVerify: "Сначала подтвердите код на шаге 2.",
    toastApiLoginNeedPass: "В режиме с сервером введите пароль.",
    toastApiError: "Ошибка сервера. Попробуйте позже.",
    skip: "Перейти к контенту",
    menu: "Меню",
    a11y: {
      brandAria: "GeoOnline главная",
      navAria: "Главное меню",
      notifsAria: "Уведомления",
      langAria: "Сменить язык",
      langMenuAria: "Меню языка",
      themeAria: "Переключить тему",
      a11yDdAria: "Оформление и доступность",
      a11yBtnAria: "Меню: тема и доступность",
      a11yMenuAria: "Параметры",
      a11yToggleGroupAria: "Контраст и цвета",
      a11yFontGroupAria: "Размер текста",
      a11yFontDecAria: "Уменьшить шрифт",
      a11yFontResetAria: "Стандартный размер шрифта",
      a11yFontIncAria: "Увеличить шрифт",
      heroPreviewAria: "Превью платформы GeoOnline",
      whyMediaAria: "GeoOnline: студенты и команда",
      reactStatsAria: "Статистика платформы",
      newsDialogAria: "Текст новости",
    },
    a11yPanel: {
      title: "Для слабовидящих",
      menuTitle: "Оформление и доступность",
      themeLabel: "Тема",
      themeAction: "Переключить",
      font: "Размер текста",
      contrast: "Высокий контраст",
      contrastShort: "Контраст",
      cvd: "Дальтоникам: сине-оранжевые цвета (без опоры на красный/зелёный)",
      cvdShort: "Цвета",
      reset: "Сбросить все настройки",
    },
    toastA11yReset: "Настройки доступности сброшены.",
    toastPromoOk: "Промокод применён!",
    toastPromoErr: "Промокод недействителен или уже использован.",
    toastDashSaved: "Сохранено.",
    toastProfileSaved: "Профиль сохранён.",
    toastProfileNeedName: "Имя не короче 2 символов.",
    toastProfileEmailInvalid: "Проверьте формат email.",
    notif: {
      title: "Уведомления",
      empty: "Пока пусто. После пробного теста результат появится здесь.",
      clear: "Очистить всё",
    },
    nav: {
      courses: "Курсы",
      simulator: "Тренажёр",
      trial: "Пробный тест",
      mobile: "Мобильное приложение",
      materials: "Материалы",
    },
    header: {
      login: "Войти",
      register: "Регистрация",
      dash: "Кабинет",
      logout: "Выйти",
      admin: "Админ",
      teacherPanel: "Панель преподавателя",
    },
    common: { skip: "Перейти к контенту", menu: "Меню" },
    hero: {
      eyebrow: "СУПЕР-ПЛАТФОРМА",
      titleTop: "СУПЕР-ПЛАТФОРМА",
      titleBottom: "Самая эффективная платформа подготовки к ЕНТ",
      titleBottomHtml:
        "Самая <span class=\"keep-words\"><span class=\"accent-word\">эффективная</span></span> платформа подготовки к ЕНТ",
      subtitle: "Пробные тесты, тренажёр и полноценные курсы подготовки в формате НЦТ. С нами поступить на грант проще.",
      cta1: "Сдать бесплатный пробный тест",
      cta2: "Войти на платформу",
      social: "10,000+ учеников выбрали нас",
      badge1: "Быстрый анализ",
      badge2: "Интеллектуальный тренажёр",
      badge3: "Система рейтинга",
    },
    how: { title: "Как работает платформа?", subtitle: "Системная подготовка: реальный результат." },
    why: {
      title: "Почему выбирают нас?",
      subtitle: "Мы создали все условия для качественной подготовки к ЕНТ. Это не просто тесты, а образовательная экосистема.",
    },
    mobile: {
      title: "Мобильное приложение",
      subtitle: "Готовься где угодно и когда угодно",
      b1t: "Удобный интерфейс теста",
      b1d: "Максимально приближено к реальному формату ЕНТ.",
      b2t: "Работа над ошибками всегда доступна",
      b2d: "По спецификации тестов НЦТ",
      b3t: "Интеллектуальный тренажёр",
      b3d: "Охвачены все предметы",
    },
    phone: {
      brand: "GeoOnline",
      pill: "ЕНТ тест",
      q: "1/20 • Матем",
      text: "Найдите значение заданной функции.",
      cta1: "Ответить",
      cta2: "Далее",
    },
    cta: {
      title: "Начни подготовку к ЕНТ сегодня",
      subtitle: "Не теряй время: начни сейчас и стань ближе к гранту. Первый пробный тест бесплатно.",
      cta1: "Сдать бесплатный тест",
      cta2: "Получить консультацию",
    },
    footer: {
      desc: "Современный и самый эффективный способ подготовки к ЕНТ. Сделай шаг в своё будущее вместе с нами.",
      platform: "Платформа",
      company: "Компания",
      help: "Помощь",
      about: "О нас",
      contacts: "Контакты",
      partners: "Партнёры",
      news: "Новости",
      faq: "Вопрос-ответ (FAQ)",
      support: "Поддержка",
      privacy: "Политика конфиденциальности",
      copyright: "© GeoOnline 2026. Все права защищены.",
      top: "↑ Наверх",
      rating: "Рейтинг",
    },
    pages: {
      backHome: "← На главную",
      login: {
        title: "Вход",
        subtitle: "Войдите в свой аккаунт.",
        cardTitle: "Логин и пароль",
        authTag: "Вход",
        heading: "Войти в аккаунт",
        phoneLabel: "Телефон",
        phone: "Телефон или Email",
        pass: "Пароль",
        submit: "Войти",
        next: "Дальше",
        noAccount: "Нет аккаунта?",
        toRegister: "Регистрация",
        toRegisterLink: "Зарегистрироваться",
        apiHint: "Введите телефон и пароль.",
      },
      register: {
        title: "Регистрация",
        subtitle: "Создайте новый аккаунт.",
        cardTitle: "Регистрация",
        authTag: "Регистрация",
        createTitle: "Регистрация",
        stepPhone: "Телефон",
        stepVerify: "Подтверждение",
        stepDetails: "Данные",
        name: "Имя и фамилия",
        phone: "Телефон",
        pass: "Пароль",
        submit: "Зарегистрироваться",
        continue: "Дальше",
        back: "Назад",
        agreePrefix: "Я соглашаюсь с",
        agreeLink: "пользовательским соглашением",
        agreementModalTitle: "Пользовательское соглашение",
        agreementClose: "Закрыть",
        agreementIframeTitle: "Пользовательское соглашение",
        agreementOpenFull: "Открыть на отдельной странице",
        otpLabel: "Код подтверждения",
        otpHint:
          "В режиме с сервером приходит 6-значный код (на почту или показан на экране в демо). Минимум 4 символа.",
        emailOptional: "Email (необязательно)",
        emailHint: "Если указать и настроен SMTP, код будет отправлен на почту.",
        demoCodeHint: "Демо: код {code}",
        hasAccount: "Уже есть аккаунт?",
        toLogin: "Войти",
        stepMeta: "Шаг {n} из {total}",
        stepsAria: "Шаги регистрации",
      },
      dash: {
        title: "Личный кабинет",
        subtitle: "Данные аккаунта и быстрый доступ к платформе.",
        greeting: "Здравствуйте,",
        welcomeHint:
          "Продолжайте подготовку через меню вверху: Курсы, Тренажёр, Материалы, Пробный тест.",
        welcomeHintAdmin: "Управляйте пользователями и промокодами в админ-панели.",
        welcomeHintTeacher:
          "Для просмотра списка учеников и промокодов откройте «Панель преподавателя»; ниже — топ-10 по прогрессу.",
        teacherTitle: "Зона преподавателя",
        teacherSubtitle: "Просмотр списка учеников и прогресса. Изменение ролей и удаление — только у администратора.",
        teacherOpen: "Открыть панель преподавателя",
        leaderboardTitle: "Ученики: топ-10 (средний прогресс, %)",
        leaderboardEmpty: "Пока нет данных по ученикам или прогресс 0%.",
        memberSince: "Регистрация:",
        profileTitle: "Профиль",
        profileNameEdit: "Имя и фамилия",
        profileEmailEdit: "Email (необязательно)",
        profileEmailPh: "например name@mail.ru",
        profileEmailExplain:
          "Этот email только сохраняется в профиле. Чтобы сервер отправлял код регистрации на почту, в .env нужны SMTP_USER и SMTP_PASS; если их нет, в логе emailSent=false — это нормально, код приходит в ответе API (demoCode).",
        profilePhoneNote: "Телефон закреплён при регистрации; чтобы изменить — напишите в поддержку.",
        profileSave: "Сохранить",
        nameLabel: "Имя:",
        phoneLabel: "Телефон:",
        roleLabel: "Роль:",
        roleStudent: "Ученик",
        roleTeacher: "Преподаватель",
        roleAdminShort: "Админ",
        linksTitle: "Быстрые ссылки",
        toTraining: "Тренажёр",
        toMaterials: "Материалы",
        toTrial: "Пробный тест",
        toCourses: "Курсы",
        toAdmin: "Панель администратора",
        adminTitle: "Зона администратора",
        adminSubtitle: "Управление пользователями и настройками.",
        adminOpen: "Открыть панель администратора",
        statDemo: "Демо показатель",
        statDemoNote: "В полной версии прогресс отображается в профиле.",
        streakTitle: "Серия",
        streakUnit: "дн.",
        streakHint: "Заходите в кабинет каждый день, серия растёт.",
        overallProgress: "Общий прогресс",
        progressHint: "Среднее по курсам, темам тренажёра (география) и чеклистам.",
        studyTitle: "План занятий",
        studyLead: "Курсы перечислены ниже по порядку; недельное расписание и промо — в следующих карточках. По географии — темы тренажёра отдельно.",
        topicProgressTitle: "Курсы и прогресс",
        trainerLead: "Прогресс по географии считается в тренажёре.",
        trainerDashHint:
          "Процент в кабинете обновится, когда вы вернётесь со страницы тренажёра или обновите вкладку (не в реальном времени).",
        courseCatalog: "К списку курсов",
        openTrainer: "Открыть тренажёр",
        learningPathTitle: "Мой учебный план",
        pathHint: "Этапы курса ниже; география отдельно по темам тренажёра.",
        coursePhasesAria: "Этапы курса",
        courseStatusNew: "Не начат",
        courseStatusActive: "В процессе",
        courseStatusDone: "Завершён",
        planTitle: "Расписание недели",
        planHint: "Отметьте день, время и что будете делать.",
        planAdd: "Добавить в план",
        planWeekday: "День",
        planTime: "Время",
        planLabel: "Занятие",
        planDone: "Сделано",
        planRemove: "Удалить",
        promoTitle: "Промокод",
        promoHint: "Введите промокод, который выдал администратор.",
        promoPlaceholder: "Например GEONLINE2021",
        promoApply: "Применить",
        promoActive: "Активированные промокоды",
        promoEmpty: "Пока нет промокодов.",
        topics: {
          softskills: "Подготовка к ЕНТ | Soft Skills",
          personal: "Личная эффективность",
          geo: "География ЕНТ",
          math_gani: "Мат. грамотность, Ғани",
          math_oryn: "Мат. грамотность, Орынбасар",
          reading: "Грамотность чтения",
        },
        chk: {
          intro: "Введение",
          video: "Видеоблок",
          quiz: "Тест / итог",
          modules: "Модули",
          trial: "Пробный тест",
          repeat: "Повторение",
          theory: "Теория",
          practice: "Практика",
          mock: "Пробный вариант",
          speed: "Скорость чтения",
          analysis: "Анализ",
          exam: "Формат экзамена",
        },
        weekdays: {
          "0": "Вс",
          "1": "Пн",
          "2": "Вт",
          "3": "Ср",
          "4": "Чт",
          "5": "Пт",
          "6": "Сб",
        },
      },
      about: {
        title: "О нас",
        subtitle: "GeoOnline: единая платформа для подготовки к ЕНТ. Пробные тесты, тренажёр, курсы и материалы в одном месте.",
        block1: { title: "Наша миссия", note: "Системная подготовка = результат", text: "Собираем в одном месте понятный путь обучения, привычку заниматься и контроль прогресса." },
        block2: {
          title: "Что даёт?",
          note: "Возможности платформы",
          li1: "Пробные тесты близкие к формату ЕНТ",
          li2: "Тематический анализ и рекомендации",
          li3: "Интеллектуальный тренажёр",
          li4: "Материалы курсов и прогресс",
        },
        valuesTitle: "Ценности",
        valuesSubtitle: "Удобная, честная и понятная платформа для ученика.",
        v1t: "Понятность",
        v1n: "Простой интерфейс",
        v1d: "Ничего лишнего: только то, что помогает учиться.",
        v2t: "Результат",
        v2n: "Прозрачные метрики",
        v2d: "Прогресс и слабые темы видны сразу.",
        v3t: "Поддержка",
        v3n: "Обратная связь",
        v3d: "Если есть вопрос, ответим быстро через канал поддержки.",
      },
      contacts: {
        title: "Контакты",
        subtitle: "Есть вопрос? Напишите, поможем.",
        block1: {
          title: "Каналы связи",
          note: "Быстрый ответ",
          li1: "WhatsApp: +7 (777) 777-77-77",
          li2: "Telegram: @geoonline_support",
          li3: "Email: support@geoonline.kz",
        },
        form: {
          title: "Служба поддержки",
          note: "Оставьте заявку",
          name: "Имя и фамилия",
          phone: "Телефон",
          msg: "Сообщение",
          send: "Отправить",
          toFaq: "Открыть FAQ",
        },
      },
      faq: {
        title: "Вопрос-ответ",
        subtitle: "Короткие ответы на частые вопросы.",
        q1: "Что есть на платформе?",
        a1: "Пробный тест, тренажёр, курсы и материалы в одной экосистеме: у каждого раздела своя страница.",
        q2: "Как работает смена языка?",
        a2: "Выберите язык вверху: весь текст на сайте сразу переключится.",
        q3: "Есть ли тёмная тема?",
        a3: "Да. Нажмите на иконку луны вверху: тема переключится.",
        q4: "Как связаться с поддержкой?",
        a4: "Для поддержки перейдите на страницу:",
        a4Link: "Контакты",
      },
      news: {
        title: "Новости",
        subtitle: "Новости ЕНТ и обновления платформы.",
        readMore: "Подробнее",
        modalClose: "Закрыть",
        hintTech:
          "Нажмите «Подробнее» для полного текста (модальное окно на чистом JavaScript; на главной также есть React-блок).",
        ubt1t: "ЕНТ-2026: заявки и даты тестирования",
        ubt1d: "2026 · Календарь",
        ubt1p: "Окна заявок и дни экзамена задают по официальному календарю. Всегда сверяйте даты на портале.",
        ubt2t: "Несколько сессий ЕНТ в год",
        ubt2d: "2026 · Сессии",
        ubt2p: "Разные периоды для платного приёма и гранта. Следите за официальными правилами.",
        n1t: "Обновили интерфейс пробного теста",
        n1d: "2026 • UI",
        n1p: "Тест проходить быстрее, блок формата ЕНТ и таймер нагляднее.",
        n2t: "Новые модули в тренажёре",
        n2d: "2026 • Simulator",
        n2p: "Расширили тематические задания, закреплять слабые темы стало проще.",
        n3t: "Добавили тёмную тему",
        n3d: "2026 • Theme",
        n3p: "Для вечерних занятий теперь есть тёмный режим.",
      },
      privacy: {
        title: "Политика конфиденциальности",
        subtitle: "Как мы собираем и защищаем данные.",
        p1t: "1) Общие положения",
        p1n: "Основные принципы",
        p1d: "Ниже приведена общая информация о сборе и защите данных. Юридически точный текст согласуйте с юристом.",
        p2t: "2) Какие данные могут собираться",
        p2n: "Пример",
        li1: "Имя и контакты (через форму поддержки)",
        li2: "Прогресс/результаты на платформе (если есть аккаунт)",
        li3: "Техническая информация о браузере и устройстве",
        p3t: "3) Контакты",
        p3n: "Если есть вопросы",
        p3d: "По вопросам конфиденциальности напишите сюда:",
        contactLink: "Контакты",
      },
      agreement: {
        title: "Пользовательское соглашение",
        subtitle: "Кратко о правилах использования платформы и ответственности.",
        p1t: "1) Смысл соглашения",
        p1n: "Общее",
        p1d:
          "Регистрируясь или начиная тест, вы подтверждаете, что ознакомились с условиями и согласны с ними. Юридически точный текст согласуйте с юристом.",
        p2t: "2) Аккаунт и данные",
        p2n: "Безопасность",
        p2d:
          "Телефон и данные профиля хранятся на сервере. Не передавайте пароль третьим лицам; при подозрении смените пароль или напишите в поддержку.",
        p3t: "3) Контент и материалы",
        p3n: "Использование",
        p3d:
          "Материалы курсов и тренажёра охраняются авторским правом. Перепродажа и публичное распространение запрещены; для личного обучения использование разрешено.",
        p4t: "4) Конфиденциальность",
        p4n: "Подробнее",
        p4d: "Порядок обработки данных описан в политике конфиденциальности.",
        privacyLink: "Политика конфиденциальности",
        p5t: "5) Контакты",
        p5n: "Если есть вопросы",
        p5d: "По вопросам соглашения напишите через страницу контактов:",
        contactLink: "Контакты",
      },
    },
    partnersSection: {
      title: "Наши партнёры",
      subtitle: "Партнёрские организации в сфере образования.",
    },
    platform: {
      title: "Пробный тест",
      subtitle: "Формат, близкий к ЕНТ. Тренажёр на странице тренажёра, материалы на своей странице.",
      back: "← На главную",
      toTraining: "К тренажёру",
      toMaterials: "Материалы",
      ctaMaterials: "К материалам",
    },
    training: {
      title: "Тренажёр",
      subtitle: "Тематические модули и прогресс. Материалы на отдельной странице.",
      toMaterials: "К материалам",
      toTrial: "К пробному тесту",
      tryTrialCta: "Пройти пробный тест",
    },
    trial: {
      title: "Пробный тест",
      subtitle:
        "Полный ЕНТ: 4 часа, 120 вопросов, 5 секций, макс. 140 баллов. Ниже краткий тест GeoOnline (профиль «География»), 5 вопросов; таймер запускается только после старта.",
      setup: {
        title: "Подготовка к тесту",
        note: "Краткий тест",
        lead:
          "Прочитайте структуру ЕНТ выше, выберите второй профильный предмет, отметьте согласие и нажмите «Начать тест».",
        li1: "Обязательные предметы: история, грамотность чтения, математическая грамотность (в реальном ЕНТ: 40 вопросов).",
        li2: "Ваша профильная пара: география + выбранный второй предмет (блок выше).",
        li3: "Таймер включается только после нажатия «Начать тест».",
        agree: "Я проверил(а) выбор и готов(а) начать тест.",
      },
      start: "Начать тест",
      cardTitle: "Мини пробный тест",
      cardNote: "Максимально близко к ЕНТ",
      submit: "Отправить",
      reset: "Сбросить",
      resultTitle: "Результат и рекомендация",
      resultNote: "Анализ и совет",
      meta1: "5 мин · полный ЕНТ 4 ч",
      meta2: "Персональный совет",
      meta3: "Краткий формат",
      nextTitle: "Следующий шаг?",
      nextText: "После результата закрепи слабые темы в тренажёре.",
      nextCta: "Перейти к тренажёру",
      scorePrefix: "Ваш результат:",
      scoreEmpty: "Ваш результат: -/5",
      recoEmpty: "Пройдите тест: мы покажем слабые темы и дадим рекомендации.",
      recos: {
        great:
          "Отлично! База сильная. Закрепите результат в тренажёре и стабилизируйте пробными тестами.",
        good: "Хорошо. Отметьте темы, где ошиблись, и отработайте их в тренажёре.",
        mid: "Средне. Сначала повторите базу и делайте тренажёр по 20-30 минут в день.",
        low: "Пока сложно. Рекомендуем базовый курс и ежедневные короткие упражнения. Главное: регулярность.",
      },
      ubt: {
        title: "Официальный формат ЕНТ",
        lead: "Даётся 4 часа. Всего 120 тестовых вопросов, максимальный балл: 140.",
        sections: "5 секций: 3 обязательных предмета + 2 профильных (вы выбираете сами).",
        mandTitle: "Обязательные предметы: 40 вопросов",
        mand1: "История Казахстана: 20 вопросов",
        mand2: "Грамотность чтения: 10 вопросов",
        mand3: "Математическая грамотность: 10 вопросов",
        profTitle: "Профильные предметы: 80 вопросов",
        prof1: "1-й профильный предмет: 40 вопросов",
        prof2: "2-й профильный предмет: 40 вопросов",
        note: "Профильные комбинации зависят от специальности (например: Физика + Математика или Биология + Химия).",
      },
      geo: {
        title: "GeoOnline: профиль «География»",
        lead:
          "У нас глубокая подготовка по географии. На реальном ЕНТ второй профильный предмет вы выбираете сами; ниже переключите второй предмет и посмотрите комбинацию.",
        label: "2-й профильный предмет",
        combo: "Ваша профильная пара:",
        fixed: "География",
      },
      timer: {
        officialLabel: "Время официального ЕНТ",
        officialValue: "4:00:00",
        questionsLabel: "120 вопросов · макс. 140 баллов",
        demoLabel: "Таймер мини-теста",
        idleHint: "Таймер стоит, пока вы не нажмёте «Начать тест». Затем идёт отсчёт 5 минут.",
        demoHint: "5 вопросов с ограничением по времени (полный тест: 4 часа).",
        timeUpToast: "Время вышло. Ответы засчитаны.",
      },
    },
    sim: {
      title: "Тренажёр",
      subtitle: "Готовься по любому модулю и развивай слабые стороны.",
      stat1: "Темы",
      stat2: "Эффективность",
      stat3v: "Тематический",
      stat3: "анализ",
      pickCourse: "Выбрать курс",
      refreshDemo: "Обновить",
      panelTitle: "Панель тем",
      panelNote: "Список модулей",
      hint: "В реальной платформе модули формируются под план ученика.",
      moduleTap: "Нажмите, чтобы завершить сессию по теме (+прогресс).",
      topicBumped: "Прогресс по теме обновлён.",
    },
    materialsPage: {
      title: "Доступ к материалам",
      subtitle: "Получите доступ к бесплатным материалам",
      cta: "Получить доступ к бесплатным материалам",
      toTrainer: "К тренажёру",
      toTrial: "К пробному тесту",
    },
    steps: { stepLabel: "Шаг", learnMore: "Подробнее" },
    features: { verified: "Проверено" },
    rating: { reviews: "отзывов" },
    courses: {
      title: "Курсы подготовки",
      subtitle: "Понятные уроки от лучших учителей",
      desc: "План по темам, видеоуроки, задания и контроль прогресса.",
      open: "Открыть курс",
    },
    materials: {
      title: "Доступ к материалам",
      subtitle: "Получите доступ к бесплатным материалам",
      openAccessLead: "Файлы ниже доступны напрямую: PDF скачивается, HTML открывается в браузере.",
      cta: "К списку",
      ctaScroll: "К списку",
      footNote: "Нужна помощь? Напишите в поддержку.",
      free: "Бесплатно",
      download: "Скачать",
      downloadFile: "Скачать",
      openFile: "Открыть",
      toastTip: "Выберите файл: скачайте PDF или откройте страницу.",
    },
    partners: {},
  },
};

const mockByLang = {
  kk: {
    steps: [
      { n: 1, icon: "assets/11.png", title: "Пробный тест", text: "Біліміңізді НАҒЫЗ ҰБТ форматында тексеріп көріңіз." },
      { n: 2, icon: "assets/12.png", title: "Терең анализ", text: "Қателескен модульдер мен тақырыптарыңызды анықтаңыз" },
      { n: 3, icon: "assets/13.png", title: "Тренажер", text: "Белгілі бір тақырыптар бойынша дағдыңызды жетілдіріңіз." },
      { n: 4, icon: "assets/14.png", title: "Жоғары балл", text: "Жүйелі дайындық арқылы ҰБТ-да максималды балл жинаңыз." },
    ],
    features: [
      { icon: "target", title: "50/50", text: "GeoOnline 50/50 максималды ұпай жинаған оқушылар бойынша рекордсмен курс", meta: "50/50" },
      { icon: "rocket", title: "Ең нәтижелі курс", text: "120/130+ жинаған әр 2-ші оқушы GeoOnline-да оқыды", meta: "Ең нәтижелі курс" },
      { icon: "stack", title: "10000+ сұрақ", text: "Күнделікті жаңартылып отыратын пробный тесттер", meta: "10000+ сұрақ" },
      { icon: "chart", title: "Рейтинг жүйесі", text: "Республика бойынша деңгейіңді көр", meta: "Рейтинг жүйесі" },
    ],
    courses: [
      {
        icon: "course",
        cover: "assets/ADCE~1/SOFTSK~1.PNG",
        title: "ҰБТ-ға тиімді дайындық | Soft Skills",
        rating: 5.0,
        reviews: 24,
        level: "Курс",
        duration: "6 апта",
      },
      {
        icon: "course",
        cover: "assets/ADCE~1/079C~1.PNG",
        title: "Жеке тиімділік курсы | Азамат Скаков",
        rating: 5.0,
        reviews: 6,
        level: "Курс",
        duration: "4 апта",
      },
      {
        icon: "course",
        cover: "assets/ADCE~1/B983~1.PNG",
        title: "ГЕОГРАФИЯ ҰБТ | НЕГІЗГІ КУРС (2025/26)",
        rating: 5.0,
        reviews: 50,
        level: "ҰБТ",
        duration: "8 апта",
      },
      {
        icon: "course",
        cover: "assets/ADCE~1/0135~1.PNG",
        title: "Математикалық сауаттылық | Ғани Молдиманов",
        rating: 4.0,
        reviews: 3,
        level: "ҰБТ",
        duration: "6 апта",
      },
      {
        icon: "course",
        cover: "assets/ADCE~1/C0E5~1.PNG",
        title: "Математикалық сауаттылық | Орынбасар Бахытұлы",
        rating: 5.0,
        reviews: 12,
        level: "ҰБТ",
        duration: "6 апта",
      },
      {
        icon: "course",
        cover: "assets/ADCE~1/2691~1.PNG",
        title: "Оқу сауаттылығы | Гүлназ Шами",
        rating: 5.0,
        reviews: 1,
        level: "ҰБТ",
        duration: "5 апта",
      },
    ],
    trial: {
      questions: [
        { id: "q1", text: "Математикалық сауаттылық: 8 + 12 = ?", options: ["18", "19", "20", "22"], correctIndex: 2 },
        { id: "q2", text: "Қазақстан тарихы: Қазақ хандығы құрылған жыл?", options: ["1465", "1410", "1511", "1603"], correctIndex: 0 },
        { id: "q3", text: "Оқу сауаттылығы: Мәтіндегі негізгі ойды анықтау нені дамытады?", options: ["Есте сақтауды", "Талдауды", "Сурет салуды", "Жүгіруді"], correctIndex: 1 },
        { id: "q4", text: "География: Қазақстанның астанасы?", options: ["Алматы", "Астана", "Шымкент", "Тараз"], correctIndex: 1 },
        { id: "q5", text: "Ағылшын тілі: 'Education' сөзінің аудармасы?", options: ["Сауда", "Білім", "Жұмыс", "Қала"], correctIndex: 1 },
      ],
    },
    progress: [
      { id: "t_geo_phys", subject: "Физикалық география", value: 28 },
      { id: "t_geo_econ", subject: "Экономикалық география", value: 22 },
      { id: "t_geo_karto", subject: "Картография", value: 18 },
      { id: "t_geo_demo", subject: "Демография", value: 14 },
    ],
    modules: [
      { id: "t_geo_phys", name: "Физикалық география", tag: "Тренажер", desc: "Климат, белдеулер және табиғи зоналар." },
      { id: "t_geo_econ", name: "Экономикалық география", tag: "Анализ", desc: "Салалар, ресурстар, карта арқылы талдау." },
      { id: "t_geo_karto", name: "Картография", tag: "Практика", desc: "Координата, масштаб, карта оқу." },
      { id: "t_geo_demo", name: "Демография", tag: "Тренажер", desc: "Халық, урбанизация, көрсеткіштер." },
    ],
    materials: [
      { icon: "doc", title: "7 сынып", text: "Оқу материалы, PDF.", file: "materials/7 сынып.pdf", ext: "pdf" },
      { icon: "book", title: "8 сынып", text: "Интерактивті бет, HTML.", file: "materials/8 сынып.htm", ext: "htm" },
      { icon: "doc", title: "9 сынып", text: "Оқу материалы, PDF.", file: "materials/9 сынып.pdf", ext: "pdf" },
      { icon: "doc", title: "10 сынып", text: "Оқу материалы, PDF.", file: "materials/10 сынып.pdf", ext: "pdf" },
      { icon: "map", title: "Атлас 10–11 сынып", text: "Атлас, PDF.", file: "materials/Атлас 10-11 сынып.pdf", ext: "pdf" },
      { icon: "map", title: "Контурлық карта, 10 сынып", text: "Карта, PDF.", file: "materials/Контурная карта 10 сынып.pdf", ext: "pdf" },
    ],
    partners: [
      { logo: "assets/narxoz.png" },
      { logo: "assets/mnu.png" },
      { logo: "assets/alt.png" },
      { logo: "assets/tau.jpeg" },
    ],
  },
  ru: {
    steps: [
      { n: 1, icon: "assets/11.png", title: "Пробный тест", text: "Проверьте знания в формате максимально близком к ЕНТ." },
      { n: 2, icon: "assets/12.png", title: "Глубокий анализ", text: "Определите модули и темы, где были ошибки." },
      { n: 3, icon: "assets/13.png", title: "Тренажёр", text: "Прокачайте навыки по конкретным темам." },
      { n: 4, icon: "assets/14.png", title: "Высокий балл", text: "Системная подготовка поможет набрать максимум на ЕНТ." },
    ],
    features: [
      { icon: "target", title: "50/50", text: "Рекордный курс GeoOnline 50/50 по ученикам с максимальными баллами", meta: "50/50" },
      { icon: "rocket", title: "Самый результативный курс", text: "Каждый второй ученик с 120/130+ учился в GeoOnline", meta: "Топ-курс" },
      { icon: "stack", title: "10000+ вопросов", text: "Пробные тесты обновляются ежедневно", meta: "10000+ вопросов" },
      { icon: "chart", title: "Рейтинг", text: "Смотрите свой уровень по республике", meta: "Рейтинг" },
    ],
    courses: [
      {
        icon: "course",
        cover: "assets/ADCE~1/SOFTSK~1.PNG",
        title: "Эффективная подготовка к ЕНТ | Soft Skills",
        rating: 5.0,
        reviews: 24,
        level: "Курс",
        duration: "6 недель",
      },
      {
        icon: "course",
        cover: "assets/ADCE~1/079C~1.PNG",
        title: "Курс личной эффективности | Азамат Скаков",
        rating: 5.0,
        reviews: 6,
        level: "Курс",
        duration: "4 недели",
      },
      {
        icon: "course",
        cover: "assets/ADCE~1/B983~1.PNG",
        title: "ГЕОГРАФИЯ ЕНТ | БАЗОВЫЙ КУРС (2025/26)",
        rating: 5.0,
        reviews: 50,
        level: "ЕНТ",
        duration: "8 недель",
      },
      {
        icon: "course",
        cover: "assets/ADCE~1/0135~1.PNG",
        title: "Матем. грамотность | Гани Молдиманов",
        rating: 4.0,
        reviews: 3,
        level: "ЕНТ",
        duration: "6 недель",
      },
      {
        icon: "course",
        cover: "assets/ADCE~1/C0E5~1.PNG",
        title: "Матем. грамотность | Орынбасар Бахытулы",
        rating: 5.0,
        reviews: 12,
        level: "ЕНТ",
        duration: "6 недель",
      },
      {
        icon: "course",
        cover: "assets/ADCE~1/2691~1.PNG",
        title: "Читательская грамотность | Гульназ Шами",
        rating: 5.0,
        reviews: 1,
        level: "ЕНТ",
        duration: "5 недель",
      },
    ],
    trial: {
      questions: [
        { id: "q1", text: "Математическая грамотность: 8 + 12 = ?", options: ["18", "19", "20", "22"], correctIndex: 2 },
        { id: "q2", text: "История Казахстана: год основания Казахского ханства?", options: ["1465", "1410", "1511", "1603"], correctIndex: 0 },
        { id: "q3", text: "Чтение: что развивает поиск главной мысли текста?", options: ["Память", "Анализ", "Рисование", "Бег"], correctIndex: 1 },
        { id: "q4", text: "География: столица Казахстана?", options: ["Алматы", "Астана", "Шымкент", "Тараз"], correctIndex: 1 },
        { id: "q5", text: "Английский: перевод слова 'Education'?", options: ["Торговля", "Образование", "Работа", "Город"], correctIndex: 1 },
      ],
    },
    progress: [
      { id: "t_geo_phys", subject: "Физическая география", value: 28 },
      { id: "t_geo_econ", subject: "Экономическая география", value: 22 },
      { id: "t_geo_karto", subject: "Картография", value: 18 },
      { id: "t_geo_demo", subject: "Демография", value: 14 },
    ],
    modules: [
      { id: "t_geo_phys", name: "Физическая география", tag: "Тренажёр", desc: "Климат, пояса и природные зоны." },
      { id: "t_geo_econ", name: "Экономическая география", tag: "Анализ", desc: "Отрасли, ресурсы, анализ по карте." },
      { id: "t_geo_karto", name: "Картография", tag: "Практика", desc: "Координаты, масштаб, чтение карты." },
      { id: "t_geo_demo", name: "Демография", tag: "Тренажёр", desc: "Население, урбанизация, показатели." },
    ],
    materials: [
      { icon: "doc", title: "7 класс", text: "Учебные материалы, PDF.", file: "materials/7 сынып.pdf", ext: "pdf" },
      { icon: "book", title: "8 класс", text: "Интерактивная страница, HTML.", file: "materials/8 сынып.htm", ext: "htm" },
      { icon: "doc", title: "9 класс", text: "Учебные материалы, PDF.", file: "materials/9 сынып.pdf", ext: "pdf" },
      { icon: "doc", title: "10 класс", text: "Учебные материалы, PDF.", file: "materials/10 сынып.pdf", ext: "pdf" },
      { icon: "map", title: "Атлас 10–11 класс", text: "Атлас, PDF.", file: "materials/Атлас 10-11 сынып.pdf", ext: "pdf" },
      { icon: "map", title: "Контурная карта, 10 класс", text: "Карта, PDF.", file: "materials/Контурная карта 10 сынып.pdf", ext: "pdf" },
    ],
    partners: [
      { logo: "assets/narxoz.svg" },
      { logo: "assets/mnu.png" },
      { logo: "assets/alt.png" },
      { logo: "assets/tau.jpeg" },
    ],
  },
};

/** Толық мәтін жаңалық модалында (kk/ru). Обложка: geography-news-1.png / geography-news-2.jpg */
const NEWS_DETAIL = {
  ubtCal: {
    kk: {
      title: "2026 ҰБТ: өтініштер мен тест мерзімдері",
      meta: "Қаңтар 2026 · Күнтізбе",
      img: "assets/geography-news-1.png",
      paragraphs: [
        "2026 оқу жылына ҰБТ бойынша нақты күнтізме мен өтініш қабылдау терезелерін білім және ғылым министрлігі, сондай-ақ ұлттық тестілеу орталығы жариялайды. Жыл сайын мерзімдер түзетілуі мүмкін.",
        "Бұқаралық ақпарат құралдарындағы деректерге сүйенсек, негізгі ҰБТ-ға өтініштер көбіне сәуір айында қабылданады; тестілеу мамыр мен шілде аралығында жоспарланады. Нақты күніңізді әрқашан ресми порталдардан растаңыз.",
        "Талапкерлер үшін маңыздысы: өтініш пен тест күндерін жіберіп алмау. GeoOnline күнтізмеге үйрену, пробный тест пен география пәні бойынша дайындықты біріктіруге көмектеседі.",
        "Ресми ақпарат: министрлік сайты, білім порталдары және ұлттық тестілеу орталығының хабарламалары.",
      ],
    },
    ru: {
      title: "ЕНТ-2026: сроки подачи заявок и тестирования",
      meta: "Январь 2026 · Календарь",
      img: "assets/geography-news-1.png",
      paragraphs: [
        "Конкретный календарь ЕНТ и окна приёма заявок на 2026 учебный год публикует Министерство просвещения и науки РК и Национальный центр тестирования. Даты ежегодно могут корректироваться.",
        "По данным СМИ, приём заявок на основную сессию чаще приходится на апрель, а тестирование планируют с мая по июль. Всегда сверяйте свою дату только с официальными источниками.",
        "Главное для абитуриента: не пропустить окно заявки и день экзамена. GeoOnline помогает отработать формат, пробный тест и подготовку по географии.",
        "Официальная информация: сайты министерства, образовательные порталы и объявления НЦТ.",
      ],
    },
  },
  ubtSessions: {
    kk: {
      title: "ҰБТ-ны жылына бірнеше рет тапсыру",
      meta: "2026 • Сессиялар",
      img: "assets/geography-news-2.jpg",
      paragraphs: [
        "Қазақстанда ҰБТ форматы бойынша талапкерлер жылына бірнеше рет тестілеуге қатысу мүмкіндігін қарастырады: мысалы ақылы оқуға түсу үшін және гранттық конкурсқа қатысу үшін әртүрлі сессиялар болуы мүмкін.",
        "Әр сессияның мерзімі, өтініш терезесі және нәтиженің жарамдылығы туралы толық ақпаратты тек ресми құжаттардан алыңыз.",
        "GeoOnline-да сіз форматқа үйреніп, әр сессияға дайындықты жоспарлай аласыз; география бейіні бойынша терең материалдар мен тренажер бар.",
      ],
    },
    ru: {
      title: "Несколько сессий ЕНТ в год",
      meta: "2026 · Сессии",
      img: "assets/geography-news-2.jpg",
      paragraphs: [
        "В Казахстане абитуриенты могут участвовать в ЕНТ в несколько периодов в течение года: отдельные окна для платного приёма и для грантового конкурса.",
        "Сроки каждой сессии, приём заявок и правила зачёта баллов нужно проверять только в официальных документах.",
        "В GeoOnline можно отработать формат и спланировать подготовку к любой сессии; для профиля «География» есть материалы и тренажёр.",
      ],
    },
  },
  platUi: {
    kk: {
      title: "Пробный тест интерфейсі жаңартылды",
      meta: "2026 · UI",
      img: "assets/3.png",
      paragraphs: [
        "Платформада пробный тест бөлімінде ҰБТ форматына жақын ақпараттық блок, таймер және нәтиже панелі көріністерін жақсарттық.",
        "Мақсат: талапкерге нақты емтихан ритміне үйренуге ыңғайлы орта беру.",
      ],
    },
    ru: {
      title: "Обновили интерфейс пробного теста",
      meta: "2026 · UI",
      img: "assets/3.png",
      paragraphs: [
        "В разделе пробного теста добавлены информационный блок формата ЕНТ, таймер и более понятная панель результата.",
        "Цель: помочь быстрее привыкнуть к ритму экзамена.",
      ],
    },
  },
  platSim: {
    kk: {
      title: "Тренажерде жаңа модульдер",
      meta: "2026 · Simulator",
      img: "assets/geography-news-1.png",
      paragraphs: [
        "География және басқа пәндер бойынша тақырыптық модульдер кеңейтілді.",
        "Әлсіз тақырыптарды күн сайын қысқа сессиялармен бекіту оңайласады.",
      ],
    },
    ru: {
      title: "Новые модули в тренажёре",
      meta: "2026 · Simulator",
      img: "assets/geography-news-1.png",
      paragraphs: [
        "Расширены тематические модули по географии и смежным блокам.",
        "Проще закреплять слабые темы короткими ежедневными занятиями.",
      ],
    },
  },
  platTheme: {
    kk: {
      title: "Dark mode қосылды",
      meta: "2026 · Theme",
      img: "assets/12.png",
      paragraphs: [
        "Кешкі оқу үшін қараңғы тақырып қосылды; тіл мен тақырып параметрлері құрылғыда сақталады.",
      ],
    },
    ru: {
      title: "Добавили тёмную тему",
      meta: "2026 · Theme",
      img: "assets/12.png",
      paragraphs: [
        "Для вечерних занятий доступна тёмная тема; язык и тема сохраняются в браузере.",
      ],
    },
  },
};

const TRIAL_DEMO_DURATION_SEC = 5 * 60;
let trialTimerId = null;
let trialTimerRemaining = TRIAL_DEMO_DURATION_SEC;
let trialTimerActive = false;
let trialAudioCtx = null;

function getTrialAudioContext() {
  const AC = typeof window !== "undefined" ? window.AudioContext || window.webkitAudioContext : null;
  if (!AC) return null;
  if (!trialAudioCtx) trialAudioCtx = new AC();
  return trialAudioCtx;
}

/** Таймер біткенде — қысқа дыбыс (пайдаланушы «Бастау» басқанда AudioContext белсенді болады). */
function playTrialTimeUpSound() {
  try {
    const ctx = getTrialAudioContext();
    if (!ctx) return;
    if (ctx.state === "suspended") void ctx.resume();
    const t0 = ctx.currentTime;
    const tone = (freq, start, dur, vol = 0.11) => {
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.type = "sine";
      o.frequency.setValueAtTime(freq, t0 + start);
      g.gain.setValueAtTime(0, t0 + start);
      g.gain.linearRampToValueAtTime(vol, t0 + start + 0.02);
      g.gain.linearRampToValueAtTime(0, t0 + start + dur);
      o.connect(g);
      g.connect(ctx.destination);
      o.start(t0 + start);
      o.stop(t0 + start + dur + 0.03);
    };
    tone(880, 0, 0.14);
    tone(880, 0.2, 0.14);
    tone(523.25, 0.42, 0.32);
  } catch {
    /* браузер дыбысқа рұқсат бермесе — үнсіз */
  }
}

/** Нәтиже / хабарлама — қысқа «сәтті» аккорд */
function playNotificationSound() {
  try {
    const ctx = getTrialAudioContext();
    if (!ctx) return;
    if (ctx.state === "suspended") void ctx.resume();
    const t0 = ctx.currentTime;
    const tone = (freq, start, dur, vol = 0.085) => {
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.type = "sine";
      o.frequency.setValueAtTime(freq, t0 + start);
      g.gain.setValueAtTime(0, t0 + start);
      g.gain.linearRampToValueAtTime(vol, t0 + start + 0.018);
      g.gain.linearRampToValueAtTime(0, t0 + start + dur);
      o.connect(g);
      g.connect(ctx.destination);
      o.start(t0 + start);
      o.stop(t0 + start + dur + 0.03);
    };
    tone(523.25, 0, 0.11);
    tone(659.25, 0.1, 0.11);
    tone(783.99, 0.2, 0.14);
  } catch {
    /* үнсіз */
  }
}

const GEO_NOTIF_STORAGE_KEY = "geo_notifs_v1";
const GEO_NOTIF_MAX = 40;

function loadGeoNotifs() {
  const raw = localStorage.getItem(GEO_NOTIF_STORAGE_KEY);
  const parsed = safeJsonParse(raw, null);
  if (!Array.isArray(parsed)) return [];
  return parsed
    .filter((n) => n && typeof n === "object" && typeof n.kk === "string" && typeof n.ru === "string")
    .map((n) => ({
      id: String(n.id || ""),
      ts: Number(n.ts) || Date.now(),
      read: Boolean(n.read),
      kk: n.kk,
      ru: n.ru,
      kind: typeof n.kind === "string" ? n.kind : "",
    }))
    .filter((n) => n.id);
}

function saveGeoNotifs(list) {
  localStorage.setItem(GEO_NOTIF_STORAGE_KEY, JSON.stringify(list.slice(0, GEO_NOTIF_MAX)));
}

function pushGeoNotification({ kk, ru, kind = "" }) {
  const prev = loadGeoNotifs();
  const id = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`;
  const next = [{ id, ts: Date.now(), read: false, kk, ru, kind }, ...prev].slice(0, GEO_NOTIF_MAX);
  saveGeoNotifs(next);
  document.dispatchEvent(new CustomEvent("geo:notifs"));
}

function clearGeoNotifs() {
  localStorage.removeItem(GEO_NOTIF_STORAGE_KEY);
  document.dispatchEvent(new CustomEvent("geo:notifs"));
}

function formatNotifTime(ts) {
  try {
    const loc = state.lang === "ru" ? "ru-RU" : "kk-KZ";
    return new Date(ts).toLocaleString(loc, { dateStyle: "short", timeStyle: "short" });
  } catch {
    return "";
  }
}

function initNotifications() {
  const actions = document.querySelector(".header-actions");
  if (!actions) return;
  const btn = actions.querySelector(":scope > .icon-btn");
  if (!btn || btn.closest(".notif-dd")) return;

  const wrap = document.createElement("div");
  wrap.className = "notif-dd";
  btn.parentNode.insertBefore(wrap, btn);
  wrap.appendChild(btn);

  const badge = document.createElement("span");
  badge.className = "notif-badge";
  badge.setAttribute("aria-hidden", "true");
  btn.appendChild(badge);

  const menu = document.createElement("div");
  menu.id = "notifMenu";
  menu.className = "notif-menu";
  menu.setAttribute("role", "region");
  menu.setAttribute("aria-label", t("notif.title"));
  wrap.appendChild(menu);

  btn.setAttribute("aria-expanded", "false");
  btn.setAttribute("aria-haspopup", "true");
  btn.setAttribute("aria-controls", "notifMenu");

  const closeMenu = () => {
    menu.classList.remove("open");
    btn.setAttribute("aria-expanded", "false");
  };

  const render = () => {
    menu.setAttribute("aria-label", t("notif.title"));
    let list = loadGeoNotifs();
    const unread = list.filter((n) => !n.read).length;
    badge.textContent = unread > 9 ? "9+" : String(unread || "");
    badge.classList.toggle("show", unread > 0);

    const head = document.createElement("div");
    head.className = "notif-menu-head";
    head.textContent = t("notif.title");

    const body = document.createElement("div");
    if (!list.length) {
      const p = document.createElement("p");
      p.className = "notif-empty";
      p.textContent = t("notif.empty");
      body.appendChild(p);
    } else {
      const actionsRow = document.createElement("div");
      actionsRow.className = "notif-menu-actions";
      const clearBtn = document.createElement("button");
      clearBtn.type = "button";
      clearBtn.className = "notif-clear";
      clearBtn.textContent = t("notif.clear");
      clearBtn.addEventListener("click", () => {
        clearGeoNotifs();
        closeMenu();
      });
      actionsRow.appendChild(clearBtn);
      body.appendChild(actionsRow);

      const ul = document.createElement("div");
      ul.className = "notif-list";
      list.forEach((n) => {
        const item = document.createElement("div");
        item.className = "notif-item" + (n.read ? "" : " unread");
        const p = document.createElement("p");
        p.className = "notif-item-body";
        p.textContent = state.lang === "ru" ? n.ru : n.kk;
        const time = document.createElement("time");
        time.dateTime = new Date(n.ts).toISOString();
        time.textContent = formatNotifTime(n.ts);
        item.appendChild(p);
        item.appendChild(time);
        ul.appendChild(item);
      });
      body.appendChild(ul);
    }

    menu.replaceChildren(head, body);
  };

  btn.addEventListener("click", (e) => {
    e.stopPropagation();
    const willOpen = !menu.classList.contains("open");
    if (willOpen) {
      let list = loadGeoNotifs();
      if (list.some((n) => !n.read)) {
        list = list.map((n) => ({ ...n, read: true }));
        saveGeoNotifs(list);
      }
      menu.classList.add("open");
      btn.setAttribute("aria-expanded", "true");
      document.dispatchEvent(new CustomEvent("geo:notifs"));
    } else {
      closeMenu();
    }
    render();
  });

  document.addEventListener("click", (e) => {
    if (!menu.classList.contains("open")) return;
    if (!e.target.closest(".notif-dd")) closeMenu();
  });

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") closeMenu();
  });

  document.addEventListener("geo:lang", render);
  document.addEventListener("geo:notifs", render);
  render();
}

function t(path) {
  const parts = String(path).split(".");
  let cur = i18n[state.lang];
  for (const p of parts) {
    if (!cur || typeof cur !== "object") return "";
    cur = cur[p];
  }
  return cur == null ? "" : String(cur);
}

function getMock() {
  return mockByLang[state.lang] || mockByLang.kk;
}

const GEO_TRAINER_PCT_KEY = "geo_trainer_pct_v1";

function loadTrainerPctMap() {
  const o = safeJsonParse(localStorage.getItem(GEO_TRAINER_PCT_KEY), null);
  return o && typeof o === "object" && !Array.isArray(o) ? o : {};
}

function saveTrainerPctMap(map) {
  try {
    localStorage.setItem(GEO_TRAINER_PCT_KEY, JSON.stringify(map));
  } catch {
    /* ignore */
  }
}

function getTrainerPct(topicId, fallback) {
  const m = loadTrainerPctMap();
  const v = m[topicId];
  if (typeof v === "number" && !Number.isNaN(v)) return Math.min(100, Math.max(0, Math.round(v)));
  return Math.min(100, Math.max(0, Math.round(Number(fallback) || 0)));
}

function setTrainerPct(topicId, val) {
  const m = loadTrainerPctMap();
  m[topicId] = Math.min(100, Math.max(0, Math.round(val)));
  saveTrainerPctMap(m);
}

function bumpTrainerTopic(topicId, delta, fallback) {
  const cur = getTrainerPct(topicId, fallback);
  const next = Math.min(100, cur + delta);
  setTrainerPct(topicId, next);
  return next;
}

function avgTrainerModulesPct() {
  const mock = getMock();
  const mods = mock.modules;
  if (!mods?.length) return 0;
  let sum = 0;
  for (const m of mods) {
    const b = mock.progress.find((p) => p.id === m.id);
    sum += getTrainerPct(m.id, b?.value ?? 0);
  }
  return Math.round(sum / mods.length);
}

function getCourseProgressPct(courseIndex, dash) {
  const def = GEO_DASH_TOPIC_DEF[courseIndex];
  if (!def) return 0;
  const t = dash.topics.find((x) => x.id === def.id);
  return Math.min(100, Math.max(0, Number(t?.percent) || 0));
}

function dashboardStudyProgressPct(dash) {
  const n = GEO_DASH_TOPIC_DEF.length;
  if (!n) return 0;
  let s = 0;
  for (let i = 0; i < n; i++) s += getCourseProgressPct(i, dash);
  return Math.round(s / n);
}

function el(id) {
  return document.getElementById(id);
}

function escapeHtml(str) {
  return String(str)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function iconSvg(name, sizeClass = "ic") {
  const common = `class="${sizeClass}" viewBox="0 0 24 24" aria-hidden="true"`;
  const p = (d) => `<path fill="currentColor" d="${d}"></path>`;

  const icons = {
    test: `<svg ${common}>${p("M4 4h16v2H4V4Zm2 4h12v12H6V8Zm2 2v8h8v-8H8Z")}</svg>`,
    search: `<svg ${common}>${p("M10 18a8 8 0 1 1 5.3-14l.7.7A8 8 0 0 1 10 18Zm11 3-6-6 1.4-1.4 6 6L21 21Z")}</svg>`,
    brain: `<svg ${common}>${p("M9 4a4 4 0 0 0-4 4v1a3 3 0 0 0 0 6v1a4 4 0 0 0 4 4h1v-2H9a2 2 0 0 1-2-2v-2H6a1 1 0 1 1 0-2h1V8a2 2 0 0 1 2-2h1V4H9Zm6 0h-1v2h1a2 2 0 0 1 2 2v2h1a1 1 0 1 1 0 2h-1v2a2 2 0 0 1-2 2h-1v2h1a4 4 0 0 0 4-4v-1a3 3 0 0 0 0-6V8a4 4 0 0 0-4-4Z")}</svg>`,
    trophy: `<svg ${common}>${p("M7 4h10v2h2v3a5 5 0 0 1-5 5h-1v2h3v2H8v-2h3v-2H10A5 5 0 0 1 5 9V6h2V4Zm0 4H7v1a3 3 0 0 0 3 3h4a3 3 0 0 0 3-3V8h-2v1a3 3 0 0 1-3 3h-2a3 3 0 0 1-3-3V8Z")}</svg>`,
    target: `<svg ${common}>${p("M12 2a10 10 0 1 0 10 10h-2A8 8 0 1 1 12 4V2Zm0 6a4 4 0 1 0 4 4h-2a2 2 0 1 1-2-2V8Zm9.3-2.3L13 14l-3-3 8.3-8.3 3 3Z")}</svg>`,
    rocket: `<svg ${common}>${p("M14 3c3 0 7 4 7 7l-6 6-4-1-1-4 6-6Zm-9 9 4 1 1 4-2 2H4v-4l1-1Zm3-5 2 2-2 2-2-2 2-2Z")}</svg>`,
    stack: `<svg ${common}>${p("M12 2 2 7l10 5 10-5-10-5Zm0 7L2 4v3l10 5 10-5V4l-10 5Zm0 6L2 10v3l10 5 10-5v-3l-10 5Z")}</svg>`,
    chart: `<svg ${common}>${p("M4 20V4h2v14h14v2H4Zm4-4V9h2v7H8Zm4 0V6h2v10h-2Zm4 0v-5h2v5h-2Z")}</svg>`,
    course: `<svg ${common}>${p("M4 6a2 2 0 0 1 2-2h14v16H6a2 2 0 0 1-2-2V6Zm2 0v12h12V6H6Z")}</svg>`,
    book: `<svg ${common}>${p("M6 4h12a2 2 0 0 1 2 2v14H8a2 2 0 0 0-2 2V4Zm2 2v12h10V6H8Z")}</svg>`,
    map: `<svg ${common}>${p("M15 5 9 3 3 5v16l6-2 6 2 6-2V3l-6 2Zm0 2v12l-6-2V5l6 2Z")}</svg>`,
    doc: `<svg ${common}>${p("M6 2h9l5 5v15H6V2Zm9 1.5V8h4.5L15 3.5ZM8 10h10v2H8v-2Zm0 4h10v2H8v-2Zm0 4h7v2H8v-2Z")}</svg>`,
    calendar: `<svg ${common}>${p("M7 2h2v2h6V2h2v2h3v18H4V4h3V2Zm13 6H6v12h14V8Z")}</svg>`,
    handshake: `<svg ${common}>${p("M7 11 4 8 2 10l4 4 3-3Zm15-1-2-2-3 3-2-2-4 4-3-3-4 4 2 2 2-2 3 3 4-4 2 2 5-5Z")}</svg>`,
  };

  return icons[name] || `<svg ${common}>${p("M12 2a10 10 0 1 0 0 20a10 10 0 0 0 0-20Z")}</svg>`;
}

function formatRating(rating, reviews) {
  return `
    <span class="stars" aria-label="Rating">
      <span aria-hidden="true">${iconSvg("target", "ic ic-sm")}</span>
      <span>${rating.toFixed(1)}</span>
      <span style="color: rgba(12,18,34,.56); font-weight: 800;">(${reviews} ${escapeHtml(t("rating.reviews"))})</span>
    </span>
  `;
}

function renderSteps() {
  const root = el("stepsGrid");
  if (!root) return;
  const mock = getMock();
  root.innerHTML = mock.steps
    .map(
      (s) => {
        const isImg = typeof s.icon === "string" && s.icon.startsWith("assets/");
        const icon = isImg
          ? `<div class="tile-ic tile-ic--img" aria-hidden="true"><img class="tile-ic-img" src="${escapeHtml(s.icon)}" alt="" loading="lazy" /></div>`
          : `<div class="tile-ic" aria-hidden="true">${iconSvg(s.icon)}</div>`;

        return `
      <article class="card tile" tabindex="0">
        <div class="tile-top">
          ${icon}
          <div class="step-badge" aria-hidden="true">${s.n}</div>
        </div>
        <h3 class="tile-title">${escapeHtml(s.title)}</h3>
        <p class="tile-text">${escapeHtml(s.text)}</p>
      </article>
    `;
      },
    )
    .join("");
}

function renderFeatures() {
  const root = el("featuresGrid");
  if (!root) return;
  const mock = getMock();
  root.innerHTML = mock.features
    .map(
      (f) => `
      <article class="card tile" tabindex="0">
        <div class="tile-top">
          <div class="tile-ic" aria-hidden="true">${iconSvg(f.icon)}</div>
          <div style="font-weight: 800; color: rgba(12,18,34,.56);">${escapeHtml(f.meta)}</div>
        </div>
        <h3 class="tile-title">${escapeHtml(f.title)}</h3>
        <p class="tile-text">${escapeHtml(f.text)}</p>
      </article>
    `,
    )
    .join("");
}

function renderCourses() {
  const root = el("courseGrid");
  if (!root) return;
  const mock = getMock();
  root.innerHTML = mock.courses
    .map((c) => {
      return `
        <article class="card tile course-card" tabindex="0" aria-label="Course card">
          ${c.cover ? `<img class="course-cover" src="${escapeHtml(c.cover)}" alt="" loading="lazy" />` : ""}
          <h3 class="tile-title">${escapeHtml(c.title)}</h3>
          <p class="tile-text">${escapeHtml(t("courses.desc"))}</p>
          <div class="course-footer">
            <div>${formatRating(c.rating, c.reviews)}</div>
            <div class="course-pills">
              <span class="pill-min">${escapeHtml(c.level)}</span>
              <span class="pill-min">${escapeHtml(c.duration)}</span>
            </div>
          </div>
        </article>
      `;
    })
    .join("");
}

function getTrialProfile2Options() {
  if (state.lang === "ru") {
    return ["Математика", "Биология", "Химия", "Физика", "Литература", "Английский язык"];
  }
  return ["Математика", "Биология", "Химия", "Физика", "Әдебиеттану", "Ағылшын тілі"];
}

function buildTrialMetaHtml() {
  const opts = getTrialProfile2Options()
    .map((o) => `<option value="${escapeHtml(o)}">${escapeHtml(o)}</option>`)
    .join("");
  const fixed = escapeHtml(t("trial.geo.fixed"));
  const firstSecond = escapeHtml(getTrialProfile2Options()[0]);
  return `
    <div class="trial-info-grid">
      <div class="card trial-ubt-card">
        <div class="card-head">
          <div class="card-title">${escapeHtml(t("trial.ubt.title"))}</div>
          <div class="card-note">${escapeHtml(t("trial.ubt.lead"))}</div>
        </div>
        <div class="trial-ubt-body">
          <p class="trial-ubt-p">${escapeHtml(t("trial.ubt.sections"))}</p>
          <div class="trial-ubt-cols">
            <div>
              <div class="trial-ubt-subtitle">${escapeHtml(t("trial.ubt.mandTitle"))}</div>
              <ul class="trial-ubt-list">
                <li>${escapeHtml(t("trial.ubt.mand1"))}</li>
                <li>${escapeHtml(t("trial.ubt.mand2"))}</li>
                <li>${escapeHtml(t("trial.ubt.mand3"))}</li>
              </ul>
            </div>
            <div>
              <div class="trial-ubt-subtitle">${escapeHtml(t("trial.ubt.profTitle"))}</div>
              <ul class="trial-ubt-list">
                <li>${escapeHtml(t("trial.ubt.prof1"))}</li>
                <li>${escapeHtml(t("trial.ubt.prof2"))}</li>
              </ul>
            </div>
          </div>
          <p class="trial-ubt-note">${escapeHtml(t("trial.ubt.note"))}</p>
        </div>
      </div>
      <div class="card trial-geo-card">
        <div class="card-head">
          <div class="card-title">${escapeHtml(t("trial.geo.title"))}</div>
          <div class="card-note">${escapeHtml(t("trial.geo.lead"))}</div>
        </div>
        <div class="trial-geo-body">
          <label class="trial-select-label" for="trialProfile2">${escapeHtml(t("trial.geo.label"))}</label>
          <select id="trialProfile2" class="trial-profile-select">${opts}</select>
          <p class="trial-combo" id="trialGeoCombo"><strong>${escapeHtml(t("trial.geo.combo"))}</strong> ${fixed} + <span id="trialGeoSecond">${firstSecond}</span></p>
        </div>
      </div>
    </div>
    <div class="card trial-timer-card">
      <div class="trial-timer-split">
        <div class="trial-timer-ref">
          <div class="trial-timer-k">${escapeHtml(t("trial.timer.officialLabel"))}</div>
          <div class="trial-timer-big">${escapeHtml(t("trial.timer.officialValue"))}</div>
          <div class="trial-timer-small">${escapeHtml(t("trial.timer.questionsLabel"))}</div>
        </div>
        <div class="trial-timer-live">
          <div class="trial-timer-k">${escapeHtml(t("trial.timer.demoLabel"))}</div>
          <div class="trial-timer-big mono trial-timer-count" id="trialTimerDemo">--:--</div>
          <div class="trial-timer-small" id="trialTimerHint">${escapeHtml(t("trial.timer.idleHint"))}</div>
        </div>
      </div>
    </div>
  `;
}

function bindTrialGeoSelect() {
  const sel = el("trialProfile2");
  const second = el("trialGeoSecond");
  if (!sel || !second) return;
  const sync = () => {
    second.textContent = sel.value;
  };
  sel.replaceWith(sel.cloneNode(true));
  const sel2 = el("trialProfile2");
  if (!sel2) return;
  sel2.addEventListener("change", sync);
  sync();
}

function setTrialProfileLocked(locked) {
  const sel = el("trialProfile2");
  if (sel) sel.disabled = locked;
}

function setTrialIdle() {
  trialTimerActive = false;
  stopTrialTimer();
  trialTimerRemaining = TRIAL_DEMO_DURATION_SEC;
  const node = el("trialTimerDemo");
  if (node) {
    node.textContent = "--:--";
    node.classList.remove("trial-timer--warn", "trial-timer--dead");
  }
  const hint = el("trialTimerHint");
  if (hint) hint.textContent = t("trial.timer.idleHint");
  document.querySelector(".trial-timer-live")?.classList.remove("trial-timer-live--warn");
  const gate = el("trialSetupGate");
  const wrap = el("trialFormWrap");
  if (gate) gate.hidden = false;
  if (wrap) wrap.hidden = true;
  const cb = el("trialAgree");
  if (cb) cb.checked = false;
  setTrialProfileLocked(false);
}

function beginTrialTest() {
  if (!el("trialForm")) return;
  const agree = el("trialAgree");
  if (!agree?.checked) {
    showToast(t("toastTrialAgree"));
    return;
  }
  void getTrialAudioContext()?.resume?.();
  const gate = el("trialSetupGate");
  const wrap = el("trialFormWrap");
  if (gate) gate.hidden = true;
  if (wrap) wrap.hidden = false;
  trialTimerActive = true;
  trialTimerRemaining = TRIAL_DEMO_DURATION_SEC;
  const hint = el("trialTimerHint");
  if (hint) hint.textContent = t("trial.timer.demoHint");
  setTrialProfileLocked(true);
  updateTrialTimerDisplay();
  startTrialTimer();
}

function stopTrialTimer() {
  if (trialTimerId) {
    clearInterval(trialTimerId);
    trialTimerId = null;
  }
}

function updateTrialTimerDisplay() {
  const node = el("trialTimerDemo");
  if (!node || !trialTimerActive) return;
  const sec = Math.max(0, trialTimerRemaining);
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  node.textContent = `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  node.classList.toggle("trial-timer--warn", sec <= 60 && sec > 0);
  node.classList.toggle("trial-timer--dead", sec <= 0);
  const live = document.querySelector(".trial-timer-live");
  if (live) live.classList.toggle("trial-timer-live--warn", sec <= 60 && sec > 0);
}

function startTrialTimer() {
  if (!el("trialTimerDemo") || !trialTimerActive) return;
  stopTrialTimer();
  updateTrialTimerDisplay();
  trialTimerId = window.setInterval(() => {
    trialTimerRemaining -= 1;
    updateTrialTimerDisplay();
    if (trialTimerRemaining <= 0) {
      stopTrialTimer();
      trialTimerRemaining = 0;
      trialTimerActive = false;
      const node = el("trialTimerDemo");
      if (node) {
        node.textContent = "00:00";
        node.classList.add("trial-timer--dead");
      }
      playTrialTimeUpSound();
      submitTrialResults(true);
    }
  }, 1000);
}

function renderTrialMeta() {
  const host = el("trialMetaHost");
  if (!host) return;
  stopTrialTimer();
  host.innerHTML = buildTrialMetaHtml();
  bindTrialGeoSelect();
  setTrialIdle();
}

function renderTrialQuestions() {
  const root = el("trialQuestions");
  if (!root) return;
  const mock = getMock();
  root.innerHTML = mock.trial.questions
    .map((q, idx) => {
      const name = `trial_${q.id}`;
      const options = q.options
        .map(
          (opt, oIdx) => `
          <label class="opt">
            <input type="radio" name="${escapeHtml(name)}" value="${oIdx}" />
            <span>${String.fromCharCode(65 + oIdx)}) ${escapeHtml(opt)}</span>
          </label>
        `,
        )
        .join("");

      return `
        <div class="q" data-qid="${escapeHtml(q.id)}">
          <p class="q-title">${idx + 1}. ${escapeHtml(q.text)}</p>
          <div class="options">${options}</div>
        </div>
      `;
    })
    .join("");
}

function trialRecommendation(score, total) {
  const ratio = score / total;
  if (ratio >= 0.9) {
    return t("trial.recos.great");
  }
  if (ratio >= 0.6) {
    return t("trial.recos.good");
  }
  if (ratio >= 0.4) {
    return t("trial.recos.mid");
  }
  return t("trial.recos.low");
}

function escapeTrialInputName(name) {
  if (typeof CSS !== "undefined" && typeof CSS.escape === "function") return CSS.escape(name);
  return String(name).replace(/\\/g, "\\\\").replace(/([.#:[\],=*'"`])/g, "\\$1");
}

function computeTrialScore() {
  const mock = getMock();
  const qs = mock.trial?.questions;
  if (!Array.isArray(qs) || !qs.length) return { score: 0, total: 0 };
  const total = qs.length;
  let score = 0;
  qs.forEach((q) => {
    const name = `trial_${q.id}`;
    const checked = document.querySelector(`input[name="${escapeTrialInputName(name)}"]:checked`);
    if (!checked) return;
    const chosen = Number(checked.value);
    if (chosen === q.correctIndex) score += 1;
  });
  return { score, total };
}

function applyTrialResult(score, total) {
  const scoreEl = el("trialScore");
  const recoEl = el("trialReco");
  const box = el("trialResultBox");
  if (scoreEl) scoreEl.textContent = `${t("trial.scorePrefix")} ${score}/${total}`;
  if (recoEl) recoEl.textContent = trialRecommendation(score, total);
  if (box) {
    box.style.transition = "transform 180ms ease";
    box.style.transform = "translateY(-2px)";
    setTimeout(() => {
      box.style.transform = "translateY(0)";
    }, 180);
    box.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }
}

function submitTrialResults(fromTimer) {
  stopTrialTimer();
  trialTimerActive = false;
  let score = 0;
  let total = 0;
  try {
    const r = computeTrialScore();
    score = r.score;
    total = r.total;
    applyTrialResult(score, total);
    if (total > 0) {
      void getTrialAudioContext()?.resume?.();
      playNotificationSound();
      pushGeoNotification({
        kind: "trial_done",
        kk: `Сынақ тест аяқталды: ${score}/${total}. Ұсынымды төмендегі нәтиже бөлімінде қараңыз.`,
        ru: `Пробный тест завершён: ${score}/${total}. Рекомендация в блоке результата ниже.`,
      });
    }
  } catch (err) {
    console.error(err);
    showToast(state.lang === "ru" ? "Не удалось подсчитать результат." : "Нәтижені есептеу сәтсіз аяқталды.");
  }
  const form = el("trialForm");
  const node = el("trialTimerDemo");
  if (!fromTimer && node) {
    const sec = Math.max(0, trialTimerRemaining);
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    node.textContent = `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  }
  if (fromTimer) {
    showToast(t("trial.timer.timeUpToast"));
    if (form) form.querySelectorAll('input[type="radio"]').forEach((inp) => { inp.disabled = true; });
  }
}

function handleTrialSubmit(e) {
  e.preventDefault();
  submitTrialResults(false);
}

function resetTrial() {
  setTrialIdle();
  const form = el("trialForm");
  if (form) {
    form.reset();
    form.querySelectorAll('input[type="radio"]').forEach((inp) => { inp.disabled = false; });
  }
  const score = el("trialScore");
  const reco = el("trialReco");
  if (score) score.textContent = t("trial.scoreEmpty");
  if (reco) reco.textContent = t("trial.recoEmpty");
}

function renderProgress(initial = true) {
  const root = el("progressList");
  if (!root) return;
  const mock = getMock();
  const rows = mock.progress.map((p) => ({
    ...p,
    value: getTrainerPct(p.id, p.value),
  }));
  root.innerHTML = rows
    .map(
      (p) => `
      <div class="progress-row">
        <div class="progress-top">
          <span>${escapeHtml(p.subject)}</span>
          <span>${p.value}%</span>
        </div>
        <div class="bar"><span data-bar-id="${escapeHtml(p.id)}"></span></div>
      </div>
    `,
    )
    .join("");

  requestAnimationFrame(() => {
    rows.forEach((p) => {
      const bar = root.querySelector(`span[data-bar-id="${CSS.escape(p.id)}"]`);
      if (bar) bar.style.width = `${p.value}%`;
    });
  });

  if (initial) return;
}

function randomizeProgress() {
  const mock = getMock();
  const map = loadTrainerPctMap();
  mock.progress.forEach((p) => {
    map[p.id] = Math.max(12, Math.min(92, Math.floor(18 + Math.random() * 70)));
  });
  saveTrainerPctMap(map);
  renderProgress(false);
  renderModules();
}

function renderModules() {
  const root = el("moduleList");
  if (!root) return;
  const mock = getMock();
  root.innerHTML = mock.modules
    .map((m) => {
      const baseRow = mock.progress.find((p) => p.id === m.id);
      const pct = getTrainerPct(m.id, baseRow?.value ?? 0);
      const aria = `${m.name}, ${pct}%`;
      return `
      <div class="module module--interactive" data-trainer-id="${escapeHtml(m.id)}" role="button" tabindex="0" aria-label="${escapeHtml(aria)}">
        <div class="module-top">
          <div class="module-name-block">
            <div class="module-name">${escapeHtml(m.name)}</div>
            <div class="module-pct">${pct}%</div>
          </div>
          <div class="module-tag">${escapeHtml(m.tag)}</div>
        </div>
        <p class="module-desc">${escapeHtml(m.desc)}</p>
        <p class="module-act-hint" data-i18n="sim.moduleTap">${escapeHtml(t("sim.moduleTap"))}</p>
      </div>
    `;
    })
    .join("");
}

function wireTrainerModules() {
  const root = el("moduleList");
  if (!root || root.dataset.geoTrainerWired === "1") return;
  root.dataset.geoTrainerWired = "1";

  const activate = (rawId) => {
    const id = String(rawId || "");
    if (!id) return;
    const mock = getMock();
    const baseRow = mock.progress.find((p) => p.id === id);
    const fallback = baseRow?.value ?? 15;
    bumpTrainerTopic(id, 14, fallback);
    showToast(t("sim.topicBumped"));
    renderProgress(false);
    renderModules();
    applyI18n();
    document.dispatchEvent(new CustomEvent("geo:trainer-progress"));
  };

  root.addEventListener("click", (e) => {
    const mod = e.target.closest(".module[data-trainer-id]");
    if (!mod) return;
    activate(mod.getAttribute("data-trainer-id"));
  });
  root.addEventListener("keydown", (e) => {
    if (e.key !== "Enter" && e.key !== " ") return;
    const mod = e.target.closest(".module[data-trainer-id]");
    if (!mod) return;
    e.preventDefault();
    activate(mod.getAttribute("data-trainer-id"));
  });
}

function renderMaterials() {
  const root = el("materialGrid");
  if (!root) return;
  const mock = getMock();
  root.innerHTML = mock.materials
    .map((m) => {
      const href = encodeURI(m.file);
      const extRaw = (m.ext || String(m.file).split(".").pop() || "").toLowerCase();
      const isHtml = extRaw === "htm" || extRaw === "html";
      const isPdf = extRaw === "pdf";
      const badge = isPdf ? "PDF" : isHtml ? "HTML" : extRaw.toUpperCase();
      const badgeMod = isPdf ? "pdf" : isHtml ? "html" : "file";
      const ic = isPdf ? "doc" : isHtml ? "book" : m.icon || "doc";
      const btnLabel = isHtml ? t("materials.openFile") : t("materials.downloadFile");
      const downloadAttr = isHtml ? "" : ` download`;
      return `
      <article class="material-card">
        <div class="material-card-top">
          <div class="material-card-ic" aria-hidden="true">${iconSvg(ic)}</div>
          <span class="material-badge material-badge--${badgeMod}">${escapeHtml(badge)}</span>
        </div>
        <div class="material-card-body">
          <h3 class="material-card-title">${escapeHtml(m.title)}</h3>
          <p class="material-card-text">${escapeHtml(m.text)}</p>
        </div>
        <div class="material-card-foot">
          <span class="material-pill-free">${escapeHtml(t("materials.free"))}</span>
          <a class="btn btn-primary material-card-btn" href="${href}"${downloadAttr} target="_blank" rel="noopener noreferrer">
            ${escapeHtml(btnLabel)}
          </a>
        </div>
      </article>`;
    })
    .join("");
}

function renderPartners() {
  const root = el("partnerGrid");
  if (!root) return;
  const mock = getMock();
  root.innerHTML = mock.partners
    .map(
      (p) => `
      <img class="partner-logo" src="${escapeHtml(p.logo)}" alt="" loading="lazy" />
    `,
    )
    .join("");
}

function showToast(message) {
  const t = el("toast");
  if (!t) {
    console.warn("[GeoOnline]", message);
    return;
  }
  t.textContent = message;
  t.classList.add("show");
  clearTimeout(showToast._timer);
  showToast._timer = setTimeout(() => {
    t.classList.remove("show");
    t.textContent = "";
  }, 1800);
}

function normalizeKzPhoneDigits(inputRaw) {
  const d = String(inputRaw || "").replace(/\D/g, "");
  if (d.length === 10) {
    return `+7${d}`;
  }
  if (d.length === 11 && (d[0] === "7" || d[0] === "8")) {
    const ten = d.slice(1);
    if (ten.length === 10) return `+7${ten}`;
  }
  return "";
}

function bindPhoneInputs() {
  document.querySelectorAll(".phone-field-input").forEach((inp) => {
    inp.addEventListener("input", () => {
      const d = inp.value.replace(/\D/g, "").slice(0, 10);
      if (!d) {
        inp.value = "";
        return;
      }
      const a = d.slice(0, 3);
      const b = d.slice(3, 6);
      const c = d.slice(6, 8);
      const e = d.slice(8, 10);
      const parts = [a, b, c, e].filter(Boolean);
      inp.value = parts.join(" ");
    });
  });
}

function initRegisterWizard() {
  const p1 = el("regPanel1");
  if (!p1) return;

  let regWizardStep = 1;

  const syncRegisterStepDots = (n) => {
    document.querySelectorAll(".register-steps .auth-step").forEach((stepEl) => {
      const i = Number(stepEl.getAttribute("data-reg-step")) || 0;
      stepEl.classList.toggle("is-active", i === n);
      stepEl.classList.toggle("is-done", i > 0 && i < n);
      if (i === n) stepEl.setAttribute("aria-current", "step");
      else stepEl.removeAttribute("aria-current");
    });
  };

  const setStep = (n) => {
    const prev = regWizardStep;
    regWizardStep = n;
    el("regPanel1").hidden = n !== 1;
    el("regPanel2").hidden = n !== 2;
    el("regPanel3").hidden = n !== 3;
    syncRegisterStepDots(n);
    if (prev !== n) {
      requestAnimationFrame(() => {
        const panel = el(`regPanel${n}`);
        if (!panel) return;
        panel.scrollIntoView({
          behavior: prefersReducedMotion() ? "auto" : "smooth",
          block: "start",
          inline: "nearest",
        });
      });
    }
  };

  document.addEventListener("geo:lang", () => {
    if (!el("registerForm")) return;
    setStep(regWizardStep);
  });

  setStep(1);

  el("registerNext1")?.addEventListener("click", async () => {
    const phoneEl = el("regPhone");
    const agree = el("regAgree");
    const phone = normalizeKzPhoneDigits(phoneEl?.value || "");
    if (!phone) {
      showToast(t("toastPhoneInvalid"));
      phoneEl?.focus();
      return;
    }
    if (!agree?.checked) {
      showToast(t("toastRegisterAgree"));
      return;
    }
    const hint = el("regDemoCodeHint");
    if (hint) {
      hint.hidden = true;
      hint.textContent = "";
    }
    if (isGeoApiMode()) {
      try {
        const base = getGeoApiBase();
        const r = await fetch(`${base}/api/auth/register/request-code`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ phone, email: "" }),
        });
        const data = await r.json().catch(() => ({}));
        if (!r.ok) {
          showToast(data.message || t("toastApiError"));
          return;
        }
        if (data.demoCode && hint) {
          hint.textContent = t("pages.register.demoCodeHint").replace("{code}", String(data.demoCode));
          hint.hidden = false;
        }
        showToast(data.emailSent ? t("toastRegCodeEmail") : t("toastRegCodeDemo"));
      } catch {
        showToast(t("toastApiError"));
        return;
      }
    } else if (hint) {
      hint.textContent = t("pages.register.demoCodeHint").replace("{code}", GEO_REGISTER_OFFLINE_DEMO_CODE);
      hint.hidden = false;
    }
    setStep(2);
    el("regOtp")?.focus({ preventScroll: true });
  });

  el("registerBack2")?.addEventListener("click", () => setStep(1));

  el("registerNext2")?.addEventListener("click", async () => {
    const phone = normalizeKzPhoneDigits(el("regPhone")?.value || "");
    const otp = String(el("regOtp")?.value || "").trim();
    if (!phone) {
      showToast(t("toastPhoneInvalid"));
      return;
    }
    const minOtp = isGeoApiMode() ? 6 : 4;
    if (otp.length < minOtp) {
      showToast(isGeoApiMode() ? t("toastOtpShortServer") : t("toastOtpShort"));
      return;
    }
    if (isGeoApiMode()) {
      try {
        const base = getGeoApiBase();
        const r = await fetch(`${base}/api/auth/register/verify-code`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ phone, code: otp }),
        });
        const data = await r.json().catch(() => ({}));
        if (!r.ok) {
          showToast(data.message || t("toastApiError"));
          return;
        }
      } catch {
        showToast(t("toastApiError"));
        return;
      }
    }
    setStep(3);
    el("regName")?.focus({ preventScroll: true });
  });

  el("registerBack3")?.addEventListener("click", () => setStep(2));

  (async function tryRegisterVerifyHash() {
    const raw = String(location.hash || "").replace(/^#/, "");
    if (!raw.startsWith("verify?")) return;
    const q = new URLSearchParams(raw.slice("verify?".length));
    const code = q.get("code");
    const phoneDigits = q.get("phone") || "";
    if (!code || !phoneDigits) return;
    const phoneNorm = normalizeKzPhoneDigits(phoneDigits);
    if (!phoneNorm) return;
    const ten = phoneNorm.replace("+7", "");
    const pf = el("regPhone");
    if (pf && ten.length === 10) {
      const a = ten.slice(0, 3);
      const b = ten.slice(3, 6);
      const c = ten.slice(6, 8);
      const e = ten.slice(8, 10);
      pf.value = [a, b, c, e].filter(Boolean).join(" ");
    }
    const otpEl = el("regOtp");
    if (otpEl) otpEl.value = code;
    try {
      history.replaceState(null, "", `${location.pathname}${location.search}`);
    } catch {
      /* ignore */
    }
    if (isGeoApiMode()) {
      try {
        const base = getGeoApiBase();
        const r = await fetch(`${base}/api/auth/register/verify-code`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ phone: phoneNorm, code }),
        });
        const data = await r.json().catch(() => ({}));
        if (r.ok) {
          setStep(2);
          el("regOtp")?.focus({ preventScroll: true });
          showToast(t("toastRegisterVerifyOk"));
          applyI18n();
          return;
        }
        showToast(data.message || t("toastApiError"));
      } catch {
        showToast(t("toastApiError"));
      }
    }
    setStep(2);
    applyI18n();
  })();
}

function initAuthUI() {
  const user = getUser();

  const headerActions = document.querySelector(".header-actions");
  if (!headerActions) return;

  const loginLink = headerActions.querySelector('a.btn[href="login.html"]');
  const registerLink = headerActions.querySelector('a.btn[href="register.html"]');

  headerActions.querySelectorAll("[data-auth-ui='user']").forEach((n) => n.remove());

  if (!user) {
    if (loginLink) loginLink.style.display = "";
    if (registerLink) registerLink.style.display = "";
    return;
  }

  if (loginLink) loginLink.style.display = "none";
  if (registerLink) registerLink.style.display = "none";

  if ((user?.role === "admin" || user?.role === "teacher") && isGeoApiMode()) {
    const adm = document.createElement("a");
    adm.href = `${getGeoApiBase()}/admin.html`;
    adm.target = "_blank";
    adm.rel = "noopener noreferrer";
    adm.className = "btn btn-ghost btn-sm";
    adm.setAttribute("data-auth-ui", "user");
    adm.setAttribute("data-i18n", user.role === "admin" ? "header.admin" : "header.teacherPanel");
    headerActions.appendChild(adm);
  }

  const dashLink = document.createElement("a");
  dashLink.className = "btn btn-ghost btn-sm";
  dashLink.href = "dashboard.html";
  dashLink.setAttribute("data-auth-ui", "user");
  dashLink.setAttribute("data-i18n", "header.dash");

  const logoutBtn = document.createElement("button");
  logoutBtn.type = "button";
  logoutBtn.className = "btn btn-ghost btn-sm";
  logoutBtn.setAttribute("data-auth-ui", "user");
  logoutBtn.setAttribute("data-i18n", "header.logout");
  logoutBtn.addEventListener("click", () => {
    clearUser();
    showToast(state.lang === "ru" ? "Вы вышли." : "Шықтыңыз.");
    setTimeout(() => {
      window.location.replace("login.html#top");
    }, 200);
  });

  headerActions.appendChild(dashLink);
  headerActions.appendChild(logoutBtn);
  applyI18n();
  wirePlatformEntryLinks();
}

function formatDashDate(iso) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  try {
    return new Intl.DateTimeFormat(state.lang === "ru" ? "ru-RU" : "kk-KZ", {
      day: "numeric",
      month: "long",
      year: "numeric",
    }).format(d);
  } catch {
    return d.toLocaleDateString();
  }
}

const GEO_DASH_TOPIC_DEF = [
  { id: "softskills", items: ["intro", "video", "quiz"] },
  { id: "personal", items: ["intro", "video", "quiz"] },
  { id: "geo", items: ["modules", "trial", "repeat"] },
  { id: "math_gani", items: ["theory", "practice", "mock"] },
  { id: "math_oryn", items: ["theory", "practice", "mock"] },
  { id: "reading", items: ["speed", "analysis", "exam"] },
];

function mergeDashTopicsClient(stored) {
  const byId = new Map((Array.isArray(stored) ? stored : []).map((t) => [t.id, t]));
  return GEO_DASH_TOPIC_DEF.map((def) => {
    const ex = byId.get(def.id);
    const itemByKey = new Map((ex?.items || []).map((i) => [i.key, i]));
    const items = def.items.map((key) => ({
      key,
      done: Boolean(itemByKey.get(key)?.done),
    }));
    if (def.id === "geo") {
      return { id: def.id, percent: avgTrainerModulesPct(), items };
    }
    const doneN = items.filter((i) => i.done).length;
    const percent = items.length ? Math.round((doneN / items.length) * 100) : 0;
    return { id: def.id, percent, items };
  });
}

function defaultDashboardStateClient() {
  return {
    streak: 0,
    lastActiveDay: "",
    topics: mergeDashTopicsClient([]),
    weekPlan: [],
  };
}

function dashUtcDayKey(d = new Date()) {
  return d.toISOString().slice(0, 10);
}

function dashPrevUtcDay(dayKey) {
  const t = Date.parse(`${dayKey}T12:00:00.000Z`);
  if (Number.isNaN(t)) return "";
  const x = new Date(t);
  x.setUTCDate(x.getUTCDate() - 1);
  return x.toISOString().slice(0, 10);
}

function bumpLocalStreak(state) {
  const today = dashUtcDayKey();
  const last = String(state.lastActiveDay || "");
  let streak = Math.max(0, Number(state.streak) || 0);
  if (last === today) return { ...state, streak, lastActiveDay: last };
  if (last === "") streak = 1;
  else if (last === dashPrevUtcDay(today)) streak += 1;
  else streak = 1;
  return { ...state, streak, lastActiveDay: today };
}

function localDashKey(phone) {
  return `geo_dash_${phone || "anon"}`;
}

function loadLocalDashboard(phone) {
  try {
    const raw = localStorage.getItem(localDashKey(phone));
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function saveLocalDashboard(phone, state) {
  try {
    localStorage.setItem(localDashKey(phone), JSON.stringify(state));
  } catch {
    /* ignore */
  }
}

function resolveUserDashboard(user) {
  const phone = user?.phone || user?.login || "";
  let st = user?.dashboardState;
  if (!st || !Array.isArray(st.topics)) {
    const loc = loadLocalDashboard(phone);
    st = loc || defaultDashboardStateClient();
  }
  return {
    streak: Math.max(0, Number(st.streak) || 0),
    lastActiveDay: String(st.lastActiveDay || ""),
    topics: mergeDashTopicsClient(st.topics),
    weekPlan: Array.isArray(st.weekPlan) ? st.weekPlan.slice(0, 24) : [],
  };
}

function overallProgressPct(topics) {
  if (!topics.length) return 0;
  const s = topics.reduce((a, x) => a + (Number(x.percent) || 0), 0);
  return Math.round(s / topics.length);
}

function updateDashMetricEls(dash) {
  const streak = Math.max(0, Number(dash.streak) || 0);
  const user = getUser();
  const studyBoard = el("dashStudyBoard");
  const pct =
    studyBoard && user?.role !== "admin" ? dashboardStudyProgressPct(dash) : overallProgressPct(dash.topics);
  const hS = el("dashStreakHero");
  const hP = el("dashProgressHero");
  const sS = el("dashStatStreak");
  const sP = el("dashStatProgress");
  if (hS) hS.textContent = String(streak);
  if (hP) hP.textContent = `${pct}%`;
  if (sS) sS.textContent = String(streak);
  if (sP) sP.textContent = `${pct}%`;
}

let dashSaveTimer = null;

async function apiAuthPing() {
  const base = getGeoApiBase();
  const tok = getToken();
  if (!tok) return null;
  try {
    const r = await fetch(`${base}/api/auth/ping`, {
      method: "POST",
      headers: { Authorization: `Bearer ${tok}` },
    });
    if (!r.ok) return null;
    const data = await r.json().catch(() => ({}));
    if (data.user) {
      setUser({ ...data.user, login: data.user.phone, fromApi: true });
      return data.user;
    }
  } catch {
    /* ignore */
  }
  return null;
}

async function apiPatchProfile(body) {
  const base = getGeoApiBase();
  const tok = getToken();
  if (!tok) return { ok: false, message: "" };
  try {
    const r = await fetch(`${base}/api/auth/me`, {
      method: "PATCH",
      headers: { Authorization: `Bearer ${tok}`, "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await r.json().catch(() => ({}));
    if (!r.ok) return { ok: false, message: data.message || "" };
    if (data.user) setUser({ ...data.user, login: data.user.phone, fromApi: true });
    return { ok: true, message: "" };
  } catch {
    return { ok: false, message: "" };
  }
}

async function apiSaveDashboardPatch(body) {
  const base = getGeoApiBase();
  const tok = getToken();
  if (!tok) return false;
  try {
    const r = await fetch(`${base}/api/auth/me/dashboard`, {
      method: "PATCH",
      headers: { Authorization: `Bearer ${tok}`, "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await r.json().catch(() => ({}));
    if (!r.ok) return false;
    if (data.user) setUser({ ...data.user, login: data.user.phone, fromApi: true });
    return true;
  } catch {
    return false;
  }
}

async function apiRedeemPromo(code) {
  const base = getGeoApiBase();
  const tok = getToken();
  if (!tok) return { ok: false, message: "" };
  try {
    const r = await fetch(`${base}/api/auth/redeem`, {
      method: "POST",
      headers: { Authorization: `Bearer ${tok}`, "Content-Type": "application/json" },
      body: JSON.stringify({ code }),
    });
    const data = await r.json().catch(() => ({}));
    if (!r.ok) return { ok: false, message: data.message || "" };
    if (data.user) setUser({ ...data.user, login: data.user.phone, fromApi: true });
    return { ok: true };
  } catch {
    return { ok: false, message: "" };
  }
}

async function apiFetchLeaderboard(limit = 10) {
  const base = getGeoApiBase();
  const tok = getToken();
  if (!tok || !base) return { ok: false, leaderboard: [] };
  try {
    const r = await fetch(`${base}/api/admin/leaderboard?limit=${encodeURIComponent(String(limit))}`, {
      headers: { Authorization: `Bearer ${tok}` },
    });
    const data = await r.json().catch(() => ({}));
    if (!r.ok) return { ok: false, leaderboard: [] };
    return { ok: true, leaderboard: Array.isArray(data.leaderboard) ? data.leaderboard : [] };
  } catch {
    return { ok: false, leaderboard: [] };
  }
}

async function loadDashTeacherLeaderboard() {
  const wrap = el("dashLeaderboard");
  const listEl = el("dashLeaderboardList");
  if (!wrap || !listEl) return;
  const { ok, leaderboard } = await apiFetchLeaderboard(10);
  if (!ok) {
    wrap.hidden = false;
    listEl.innerHTML = `<li class="dash-leaderboard-empty muted">${escapeHtml(t("pages.dash.leaderboardEmpty"))}</li>`;
    return;
  }
  if (!leaderboard.length) {
    listEl.innerHTML = `<li class="dash-leaderboard-empty muted">${escapeHtml(t("pages.dash.leaderboardEmpty"))}</li>`;
    wrap.hidden = false;
    return;
  }
  listEl.innerHTML = leaderboard
    .map(
      (row, i) =>
        `<li class="dash-leaderboard-row"><span class="dash-lb-rank">${i + 1}</span><span class="dash-lb-name">${escapeHtml(row.name || "—")}</span><span class="dash-lb-phone muted">${escapeHtml(row.phoneMasked || "")}</span><span class="dash-lb-pct">${escapeHtml(String(row.progress ?? 0))}%</span></li>`,
    )
    .join("");
  wrap.hidden = false;
}

function scheduleDashboardSave(nextState, opts = {}) {
  const silent = Boolean(opts.silent);
  clearTimeout(dashSaveTimer);
  dashSaveTimer = setTimeout(async () => {
    const user = getUser();
    if (!user) return;
    if (isGeoApiMode() && getToken()) {
      const ok = await apiSaveDashboardPatch({ topics: nextState.topics, weekPlan: nextState.weekPlan });
      if (ok && !silent) showToast(t("toastDashSaved"));
    } else {
      setUser({ ...user, dashboardState: nextState });
      saveLocalDashboard(user.phone || user.login, nextState);
      if (!silent) showToast(t("toastDashSaved"));
    }
  }, 420);
}

function importTrainerPctIntoGeoTopic(silentSave = true) {
  const u = getUser();
  if (!u || u.role === "admin" || !el("dashStudyBoard")) return;
  const d = resolveUserDashboard(u);
  const geoIdx = d.topics.findIndex((t) => t.id === "geo");
  if (geoIdx < 0) return;
  const nextPct = avgTrainerModulesPct();
  const cur = Math.min(100, Math.max(0, Number(d.topics[geoIdx].percent) || 0));
  if (nextPct === cur) return;
  const topics = d.topics.map((t, i) => (i === geoIdx ? { ...t, percent: nextPct } : t));
  const next = { ...d, topics };
  setUser({ ...u, dashboardState: next });
  saveLocalDashboard(u.phone || u.login, next);
  if (isGeoApiMode() && getToken()) {
    scheduleDashboardSave(next, { silent: silentSave });
  }
}

function readDashFromDom() {
  const user = getUser();
  const base = resolveUserDashboard(user);
  const topics = GEO_DASH_TOPIC_DEF.map((def) => {
    const baseTopic = base.topics.find((t) => t.id === def.id);
    if (def.id === "geo") {
      const itemByKey = new Map((baseTopic?.items || []).map((i) => [i.key, i]));
      const items = def.items.map((key) => ({
        key,
        done: Boolean(itemByKey.get(key)?.done),
      }));
      return {
        id: def.id,
        percent: Math.min(100, Math.max(0, Number(baseTopic?.percent) || 0)),
        items,
      };
    }
    const items = def.items.map((key) => {
      const inp = document.querySelector(`input[data-topic="${def.id}"][data-item="${key}"]`);
      return { key, done: Boolean(inp?.checked) };
    });
    const doneN = items.filter((i) => i.done).length;
    const percent = items.length ? Math.round((doneN / items.length) * 100) : 0;
    return { id: def.id, percent, items };
  });
  const planRows = [...document.querySelectorAll(".dash-plan-row")];
  const weekPlan = planRows.map((row, i) => {
    const prev = base.weekPlan[i];
    return {
      id: row.getAttribute("data-id") || prev?.id || `p-${Date.now()}-${i}`,
      weekday: Number(row.querySelector(".dash-plan-day")?.value ?? 0),
      time: String(row.querySelector(".dash-plan-time")?.value ?? ""),
      label: String(row.querySelector(".dash-plan-label")?.value ?? ""),
      done: Boolean(row.querySelector(".dash-plan-chk")?.checked),
    };
  });
  return {
    streak: base.streak,
    lastActiveDay: base.lastActiveDay,
    topics,
    weekPlan,
  };
}

function renderPromoList(user) {
  const root = el("dashPromoList");
  if (!root) return;
  const list = user?.redeemedPromos || [];
  if (!list.length) {
    root.innerHTML = `<p class="muted" style="margin:0;font-size:calc(13px * var(--a11y-font-mul, 1))">${escapeHtml(t("pages.dash.promoEmpty"))}</p>`;
    return;
  }
  root.innerHTML =
    `<div style="font-weight:800;font-size:calc(12px * var(--a11y-font-mul, 1));margin-bottom:6px;text-transform:uppercase;letter-spacing:0.04em;color:var(--muted2)">${escapeHtml(t("pages.dash.promoActive"))}</div>` +
    list
      .map(
        (p) =>
          `<div class="dash-promo-item"><strong>${escapeHtml(p.code)}</strong> ${escapeHtml(p.label || "")}</div>`,
      )
      .join("");
}

function dashCourseStatusLabel(pct) {
  const n = Math.min(100, Math.max(0, Number(pct) || 0));
  if (n >= 100) return t("pages.dash.courseStatusDone");
  if (n <= 0) return t("pages.dash.courseStatusNew");
  return t("pages.dash.courseStatusActive");
}

function renderDashPhaseTrack(def, topic) {
  if (def.id === "geo") return "";
  const items = topic?.items || [];
  if (!items.length) return "";
  const li = items
    .map((item) => {
      const lab = t(`pages.dash.chk.${item.key}`) || item.key;
      const dn = item.done ? " is-done" : "";
      return `<li class="dash-phase-step${dn}"><span class="dash-phase-dot" aria-hidden="true"></span><span class="dash-phase-label">${escapeHtml(lab)}</span></li>`;
    })
    .join("");
  return `<ol class="dash-phase-track" aria-label="${escapeHtml(t("pages.dash.coursePhasesAria"))}">${li}</ol>`;
}

function renderDashTopics(dash, onChange) {
  const root = el("dashTopicList");
  if (!root) return;
  const mock = getMock();
  root.innerHTML = GEO_DASH_TOPIC_DEF.map((def, idx) => {
    const course = mock.courses[idx];
    const title = course?.title || t(`pages.dash.topics.${def.id}`) || def.id;
    const meta =
      course?.level && course?.duration ? `${course.level}, ${course.duration}` : "";
    const pct = getCourseProgressPct(idx, dash);
    const topic = dash.topics.find((x) => x.id === def.id);
    const status = dashCourseStatusLabel(pct);
    const ix = String(idx + 1).padStart(2, "0");
    const thumb = course?.cover
      ? `<div class="dash-course-thumb"><img src="${escapeHtml(course.cover)}" alt="" loading="lazy" decoding="async" /></div>`
      : `<div class="dash-course-thumb dash-course-thumb--ph" aria-hidden="true">${iconSvg("course", "ic")}</div>`;
    const checks =
      def.id !== "geo"
        ? (topic?.items || [])
            .map((item) => {
              const lab = t(`pages.dash.chk.${item.key}`) || item.key;
              const id = `chk-${def.id}-${item.key}`;
              return `<label class="dash-check"><input type="checkbox" id="${id}" data-topic="${escapeHtml(def.id)}" data-item="${escapeHtml(item.key)}" ${item.done ? "checked" : ""}/><span>${escapeHtml(lab)}</span></label>`;
            })
            .join("")
        : "";
    let geoBlock = "";
    if (def.id === "geo") {
      const geoPctStored = Math.min(100, Math.max(0, Number(topic?.percent) || 0));
      geoBlock = `<div class="dash-trainer-block"><p class="dash-trainer-lead">${escapeHtml(t("pages.dash.trainerLead"))}</p><p class="muted dash-trainer-dash-hint">${escapeHtml(t("pages.dash.trainerDashHint"))}</p><div class="dash-topic-bar dash-trainer-summary-bar" aria-hidden="true"><span style="width:${geoPctStored}%"></span></div><div class="dash-trainer-actions"><a class="btn btn-primary btn-sm" href="training.html#simulator">${escapeHtml(t("pages.dash.openTrainer"))}</a></div></div>`;
    }
    const phaseTrack = renderDashPhaseTrack(def, topic);
    const stCls =
      pct >= 100 ? "dash-course-card--done" : pct <= 0 ? "dash-course-card--new" : "dash-course-card--active";
    return `<article class="dash-course-card dash-topic ${stCls}" data-topic="${escapeHtml(def.id)}">
        <div class="dash-course-card__main">
          ${thumb}
          <div class="dash-course-card__body">
            <div class="dash-course-card__meta-row">
              <span class="dash-course-ix">${ix}</span>
              <span class="dash-course-status">${escapeHtml(status)}</span>
            </div>
            <div class="dash-course-card__headline">
              <h3 class="dash-topic-name">${escapeHtml(title)}</h3>
              <span class="dash-topic-pct">${pct}%</span>
            </div>
            ${meta ? `<p class="dash-course-meta muted">${escapeHtml(meta)}</p>` : ""}
            <div class="dash-topic-bar dash-course-bar"><span style="width:${pct}%"></span></div>
            ${phaseTrack}
            ${geoBlock}
            ${checks ? `<div class="dash-checklist dash-checklist--course">${checks}</div>` : ""}
          </div>
        </div>
      </article>`;
  }).join("");

  root.querySelectorAll('input[type="checkbox"][data-topic]').forEach((inp) => {
    inp.addEventListener("change", onChange);
  });
}

function renderDashPlan(dash, onChange) {
  const root = el("dashPlanRows");
  if (!root) return;
  const wd = (n) => t(`pages.dash.weekdays.${n}`);
  root.innerHTML = (dash.weekPlan || [])
    .map((row, idx) => {
      const rowId = row.id || `legacy-${idx}`;
      const rid = escapeHtml(rowId);
      const opts = [0, 1, 2, 3, 4, 5, 6]
        .map(
          (d) =>
            `<option value="${d}" ${Number(row.weekday) === d ? "selected" : ""}>${escapeHtml(wd(String(d)))}</option>`,
        )
        .join("");
      return `<div class="dash-plan-row" data-plan-idx="${idx}" data-id="${rid}">
        <select class="dash-plan-day" aria-label="${escapeHtml(t("pages.dash.planWeekday"))}">${opts}</select>
        <input type="text" class="dash-plan-time" value="${escapeHtml(row.time || "")}" placeholder="${escapeHtml(t("pages.dash.planTime"))}" />
        <input type="text" class="dash-plan-label" value="${escapeHtml(row.label || "")}" placeholder="${escapeHtml(t("pages.dash.planLabel"))}" />
        <label class="dash-plan-done"><input type="checkbox" class="dash-plan-chk" ${row.done ? "checked" : ""}/><span>${escapeHtml(t("pages.dash.planDone"))}</span></label>
        <button type="button" class="dash-plan-rm" aria-label="${escapeHtml(t("pages.dash.planRemove"))}">×</button>
      </div>`;
    })
    .join("");

  root.querySelectorAll(".dash-plan-row").forEach((rowEl) => {
    rowEl.querySelectorAll("select, input").forEach((n) => n.addEventListener("change", onChange));
    rowEl.querySelectorAll("input.dash-plan-time, input.dash-plan-label").forEach((n) => n.addEventListener("input", onChange));
    rowEl.querySelector(".dash-plan-rm")?.addEventListener("click", () => {
      const idx = Number(rowEl.getAttribute("data-plan-idx"));
      const u = getUser();
      const d = resolveUserDashboard(u);
      d.weekPlan.splice(idx, 1);
      setUser({ ...u, dashboardState: d });
      saveLocalDashboard(u.phone || u.login, d);
      if (isGeoApiMode() && getToken()) apiSaveDashboardPatch({ weekPlan: d.weekPlan });
      refreshDashStudyView();
    });
  });
}

function refreshDashStudyView() {
  const user = getUser();
  if (!user || !el("dashStudyBoard")) return;
  const d = resolveUserDashboard(user);
  updateDashMetricEls(d);
  renderPromoList(user);
  const onChange = () => {
    const next = readDashFromDom();
    updateDashMetricEls(next);
    setUser({ ...getUser(), dashboardState: next });
    scheduleDashboardSave(next);
  };
  renderDashTopics(d, onChange);
  renderDashPlan(d, onChange);
  applyI18n();
}

async function initDashboardStudyBoard() {
  if (!el("dashStudyBoard")) return;
  const user = getUser();
  if (!user) return;
  if (user.role === "admin") return;

  if (isGeoApiMode() && getToken()) {
    await apiAuthPing();
  } else {
    const d0 = resolveUserDashboard(getUser());
    const bumped = bumpLocalStreak(d0);
    if (bumped.lastActiveDay !== d0.lastActiveDay) {
      setUser({ ...getUser(), dashboardState: bumped });
      saveLocalDashboard(getUser().phone || getUser().login, bumped);
    }
  }

  importTrainerPctIntoGeoTopic(true);
  refreshDashStudyView();

  const board = el("dashStudyBoard");
  if (board && !board.dataset.geoDashBound) {
    board.dataset.geoDashBound = "1";
    el("dashPlanAdd")?.addEventListener("click", () => {
      const u = getUser();
      const rid =
        typeof crypto !== "undefined" && crypto.randomUUID
          ? crypto.randomUUID()
          : `p-${Date.now()}-${Math.random().toString(16).slice(2)}`;
      const d = resolveUserDashboard(u);
      d.weekPlan.push({ id: rid, weekday: 1, time: "19:00", label: "", done: false });
      setUser({ ...u, dashboardState: d });
      saveLocalDashboard(u.phone || u.login, d);
      if (isGeoApiMode() && getToken()) apiSaveDashboardPatch({ weekPlan: d.weekPlan });
      refreshDashStudyView();
    });
    el("dashPromoForm")?.addEventListener("submit", async (e) => {
      e.preventDefault();
      const fd = new FormData(e.target);
      const code = String(fd.get("code") || "").trim();
      if (!code) return;
      if (isGeoApiMode() && getToken()) {
        const r = await apiRedeemPromo(code);
        if (r.ok) {
          showToast(t("toastPromoOk"));
          e.target.reset();
          refreshDashStudyView();
        } else {
          showToast(r.message || t("toastPromoErr"));
        }
      } else {
        showToast(state.lang === "ru" ? "Нужен сервер и вход в аккаунт." : "Сервер және кіру қажет.");
      }
    });
    document.addEventListener("geo:lang", refreshDashStudyView);
    window.addEventListener("pageshow", () => {
      if (!el("dashStudyBoard")) return;
      importTrainerPctIntoGeoTopic(true);
      refreshDashStudyView();
    });
    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState !== "visible" || !el("dashStudyBoard")) return;
      importTrainerPctIntoGeoTopic(true);
      refreshDashStudyView();
    });
  }
}

function wirePlatformEntryLinks() {
  document.querySelectorAll("[data-platform-entry]").forEach((node) => {
    if (node.tagName !== "A") return;
    const u = getUser();
    node.setAttribute("href", u ? "dashboard.html#top" : "login.html#top");
  });
}

function wireDashProfileForm() {
  const form = el("dashProfileForm");
  if (!form) return;
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const fd = new FormData(form);
    const name = String(fd.get("name") || "").trim();
    const email = String(fd.get("email") || "").trim();
    if (name.length < 2) {
      showToast(t("toastProfileNeedName"));
      el("dashProfileName")?.focus();
      return;
    }
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      showToast(t("toastProfileEmailInvalid"));
      el("dashProfileEmail")?.focus();
      return;
    }
    const user = getUser();
    if (!user) return;
    if (isGeoApiMode() && getToken()) {
      const res = await apiPatchProfile({ name, email });
      if (!res.ok) {
        showToast(res.message || t("toastApiError"));
        return;
      }
      showToast(t("toastProfileSaved"));
      initAuthUI();
      document.dispatchEvent(new CustomEvent("geo:dash-profile"));
      return;
    }
    setUser({
      ...user,
      name,
      email: email || "",
      updatedAt: Date.now(),
    });
    showToast(t("toastProfileSaved"));
    initAuthUI();
    document.dispatchEvent(new CustomEvent("geo:dash-profile"));
  });
}

function initDashboardPage() {
  const profileNameInput = el("dashProfileName");
  if (!profileNameInput) return;

  const refresh = () => {
    const user = getUser();
    if (!user) {
      window.location.replace("login.html#top");
      return;
    }
    const isAdmin = user.role === "admin";
    const isTeacher = user.role === "teacher";
    document.body.classList.toggle("dash-user-admin", isAdmin);
    document.body.classList.toggle("dash-user-teacher", isTeacher);
    const adminHeroHint = el("dashAdminHeroHint");
    const teacherHeroHint = el("dashTeacherHeroHint");
    if (adminHeroHint) adminHeroHint.hidden = !isAdmin;
    if (teacherHeroHint) teacherHeroHint.hidden = !isTeacher;

    const nameInp = el("dashProfileName");
    const emailInp = el("dashProfileEmail");
    if (nameInp) nameInp.value = user.name?.trim() || "";
    if (emailInp) emailInp.value = (user.email || "").trim();

    const displayName = user.name?.trim() || user.phone || user.login || "—";
    const heroName = el("dashHeroName");
    if (heroName) heroName.textContent = displayName;
    const ph = el("dashPhone");
    if (ph) ph.textContent = user.phone || user.login || "—";
    const sinceEl = el("dashSince");
    if (sinceEl) sinceEl.textContent = formatDashDate(user.createdAt);
    const roleLine = el("dashRoleLine");
    const roleEl = el("dashRole");
    const roleBadge = el("dashRoleBadge");
    const adminPanel = el("dashAdminPanel");
    if (user.role && roleEl) {
      const roleLabel =
        user.role === "admin"
          ? t("pages.dash.roleAdminShort")
          : user.role === "teacher"
            ? t("pages.dash.roleTeacher")
            : t("pages.dash.roleStudent");
      roleEl.textContent = roleLabel;
      roleLine?.removeAttribute("hidden");
      if (roleBadge) {
        roleBadge.textContent = roleLabel;
        roleBadge.classList.toggle("dash-role-badge--admin", user.role === "admin");
        roleBadge.classList.toggle("dash-role-badge--teacher", user.role === "teacher");
        roleBadge.hidden = false;
      }
    } else {
      roleLine?.setAttribute("hidden", "");
      if (roleBadge) roleBadge.hidden = true;
    }
    const hasApi = isGeoApiMode();
    const base = getGeoApiBase();
    const canStaff = isTeacher && hasApi && Boolean(getToken());
    if (adminPanel) {
      adminPanel.hidden = !(user.role === "admin" && hasApi);
      const admOpen = el("dashAdminOpen");
      if (admOpen && user.role === "admin" && hasApi) admOpen.href = `${base}/admin.html`;
    }
    const teacherPanel = el("dashTeacherPanel");
    if (teacherPanel) {
      teacherPanel.hidden = !canStaff;
      const tOpen = el("dashTeacherOpen");
      if (tOpen && canStaff) tOpen.href = `${base}/admin.html`;
    }
    const lbWrap = el("dashLeaderboard");
    if (lbWrap) lbWrap.hidden = !canStaff;
    if (canStaff) {
      loadDashTeacherLeaderboard().catch(() => {});
    }
  };

  refresh();
  document.addEventListener("geo:lang", refresh);
  document.addEventListener("geo:dash-profile", refresh);
}

/** Кіру / тіркелу бетінде сессия бар болса — кабинетке */
function redirectIfLoggedInOnAuthPage() {
  if (!getUser()) return false;
  if (!el("loginForm") && !el("registerForm")) return false;
  window.location.replace("dashboard.html#top");
  return true;
}

function initNav() {
  const toggle = el("navToggle");
  const menu = el("navMenu");
  if (!toggle || !menu) return;

  const close = () => {
    menu.classList.remove("open");
    toggle.setAttribute("aria-expanded", "false");
  };

  toggle.addEventListener("click", () => {
    const isOpen = menu.classList.toggle("open");
    toggle.setAttribute("aria-expanded", String(isOpen));
  });

  // Close on link click (mobile)
  menu.addEventListener("click", (e) => {
    const a = e.target.closest("a");
    if (a) close();
  });

  // Close on outside click
  document.addEventListener("click", (e) => {
    if (!menu.classList.contains("open")) return;
    const inside = e.target.closest("#navMenu") || e.target.closest("#navToggle");
    if (!inside) close();
  });
}

function initLangToggle() {
  const btn = el("langToggle");
  const menu = el("langMenu");
  if (!btn || !menu) return;

  const flagSvg = (lang) => {
    if (lang === "ru") {
      return `
        <svg viewBox="0 0 36 24" width="20" height="14" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="RU">
          <rect width="36" height="24" rx="4" fill="#fff"/>
          <rect y="8" width="36" height="8" fill="#1f4fbf"/>
          <rect y="16" width="36" height="8" rx="0" fill="#d52b1e"/>
          <rect width="36" height="24" rx="4" fill="none" stroke="rgba(12,18,34,.18)"/>
        </svg>
      `.trim();
    }

    // Kazakhstan (simplified, without emblem)
    return `
      <svg viewBox="0 0 36 24" width="20" height="14" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="KZ">
        <rect width="36" height="24" rx="4" fill="#00afca"/>
        <circle cx="24" cy="12" r="4.2" fill="#f6c800"/>
        <rect x="5.2" y="4.2" width="2.2" height="15.6" rx="1.1" fill="#f6c800" opacity=".95"/>
        <rect width="36" height="24" rx="4" fill="none" stroke="rgba(12,18,34,.18)"/>
      </svg>
    `.trim();
  };

  const apply = () => {
    document.documentElement.lang = state.lang;

    const langText = el("langText");
    if (langText) langText.textContent = state.lang === "ru" ? "Русский" : "Қазақша";

    const langFlag = el("langFlag");
    if (langFlag) langFlag.innerHTML = flagSvg(state.lang);

    menu.querySelectorAll("[data-lang]").forEach((item) => {
      const v = item.getAttribute("data-lang");
      item.setAttribute("aria-checked", v === state.lang ? "true" : "false");
      const isCurrent = v === state.lang;
      item.hidden = isCurrent;
      item.style.display = isCurrent ? "none" : "";
      item.setAttribute("aria-hidden", isCurrent ? "true" : "false");

      const flagNode = item.querySelector("[data-flag]");
      if (flagNode) flagNode.innerHTML = flagSvg(v);
    });

    applyI18n();
    renderAllDynamic();
    document.dispatchEvent(new CustomEvent("geo:lang", { detail: { lang: state.lang } }));
  };

  const openMenu = () => {
    menu.classList.add("open");
    btn.setAttribute("aria-expanded", "true");
  };

  const closeMenu = () => {
    menu.classList.remove("open");
    btn.setAttribute("aria-expanded", "false");
  };

  btn.addEventListener("click", () => {
    const isOpen = menu.classList.toggle("open");
    btn.setAttribute("aria-expanded", String(isOpen));
  });

  menu.addEventListener("click", (e) => {
    const item = e.target.closest("[data-lang]");
    if (!item) return;
    state.lang = item.getAttribute("data-lang") === "ru" ? "ru" : "kk";
    localStorage.setItem("geo_lang", state.lang);
    apply();
    closeMenu();
    showToast(t("toastLang"));
  });

  document.addEventListener("click", (e) => {
    if (!menu.classList.contains("open")) return;
    const inside = e.target.closest("#langMenu") || e.target.closest("#langToggle");
    if (!inside) closeMenu();
  });

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") closeMenu();
  });

  apply();
}

function applyI18n() {
  document.querySelectorAll("[data-i18n]").forEach((node) => {
    const key = node.getAttribute("data-i18n");
    if (!key) return;
    node.textContent = t(key) || node.textContent;
  });

  document.querySelectorAll("[data-i18n-html]").forEach((node) => {
    const key = node.getAttribute("data-i18n-html");
    if (!key) return;
    const html = t(key);
    if (html) node.innerHTML = html;
  });

  document.querySelectorAll("[data-i18n-attr]").forEach((node) => {
    const spec = node.getAttribute("data-i18n-attr");
    if (!spec) return;

    // format: "aria-label:brandAria"
    const pairs = spec.split(",").map((p) => p.trim()).filter(Boolean);
    pairs.forEach((pair) => {
      const [attr, key] = pair.split(":").map((s) => s.trim());
      if (!attr || !key) return;
      const v = t(`a11y.${key}`);
      if (v) node.setAttribute(attr, v);
    });
  });
}

function renderAllDynamic() {
  renderSteps();
  renderFeatures();
  renderCourses();
  renderMaterials();
  renderPartners();
  renderTrialMeta();
  renderTrialQuestions();
  resetTrial();
  renderProgress(true);
  renderModules();
}

function initTrial() {
  renderTrialMeta();
  renderTrialQuestions();
  if (el("trialForm")) resetTrial();

  const form = el("trialForm");
  if (form) form.addEventListener("submit", handleTrialSubmit);
  const reset = el("trialReset");
  if (reset) reset.addEventListener("click", resetTrial);
  const start = el("trialStartBtn");
  if (start) start.addEventListener("click", beginTrialTest);
}

function initMaterials() {
  const btn = el("getMaterials");
  if (!btn) return;
  btn.addEventListener("click", () => {
    el("materialGrid")?.scrollIntoView({ behavior: "smooth", block: "start" });
    showToast(t("materials.toastTip"));
  });
}

function initWhyMedia() {
  const media = document.querySelector(".why-media");
  if (!media) return;

  const shots = Array.from(media.querySelectorAll(".why-shot"));
  if (shots.length < 2) return;

  shots.forEach((img, idx) => {
    img.addEventListener("mouseenter", () => {
      media.setAttribute("data-active", String(idx));
    });
    img.addEventListener("focus", () => {
      media.setAttribute("data-active", String(idx));
    });
  });

  media.addEventListener("mouseleave", () => {
    media.removeAttribute("data-active");
  });
}

function initBackToTop() {
  document.querySelectorAll("a.back-to-top").forEach((a) => {
    const update = () => {
      if (window.scrollY > 220) a.classList.add("is-visible");
      else a.classList.remove("is-visible");
    };

    a.addEventListener("click", (e) => {
      e.preventDefault();
      window.scrollTo({ top: 0, behavior: "smooth" });
      const top = document.getElementById("top");
      if (top) top.focus?.({ preventScroll: true });
      history.replaceState(null, "", "#top");
    });

    window.addEventListener("scroll", update, { passive: true });
    update();
  });
}

function openNewsModal(newsId) {
  const modal = el("newsModal");
  if (!modal || !newsId) return;
  const pack = NEWS_DETAIL[newsId]?.[state.lang] || NEWS_DETAIL[newsId]?.kk;
  if (!pack) return;

  modal.dataset.openId = newsId;
  const titleEl = el("newsModalTitle");
  const metaEl = el("newsModalMeta");
  const imgEl = el("newsModalImg");
  const bodyEl = el("newsModalBody");
  if (titleEl) titleEl.textContent = pack.title;
  if (metaEl) metaEl.textContent = pack.meta;
  if (imgEl) {
    imgEl.src = pack.img;
    imgEl.alt = pack.title;
  }
  if (bodyEl) {
    bodyEl.innerHTML = pack.paragraphs.map((p) => `<p>${escapeHtml(p)}</p>`).join("");
  }
  modal.removeAttribute("hidden");
  modal.setAttribute("aria-hidden", "false");
  el("newsModalClose")?.focus();
}

function closeNewsModal() {
  const modal = el("newsModal");
  if (!modal) return;
  modal.setAttribute("hidden", "");
  modal.setAttribute("aria-hidden", "true");
  delete modal.dataset.openId;
}

function closeAgreementModal() {
  const modal = el("agreementModal");
  if (!modal) return;
  modal.setAttribute("hidden", "");
  modal.setAttribute("aria-hidden", "true");
  document.body.style.overflow = "";
  el("regAgreeOpen")?.focus();
}

function openAgreementModal() {
  const modal = el("agreementModal");
  if (!modal) return;
  syncAgreementIframeTitle();
  modal.removeAttribute("hidden");
  modal.setAttribute("aria-hidden", "false");
  document.body.style.overflow = "hidden";
  el("agreementModalClose")?.focus();
}

function syncAgreementIframeTitle() {
  const iframe = el("agreementIframe");
  if (!iframe) return;
  const v = t("pages.register.agreementIframeTitle");
  if (v) iframe.setAttribute("title", v);
}

function initAgreementModal() {
  const modal = el("agreementModal");
  const openBtn = el("regAgreeOpen");
  if (!modal || !openBtn) return;
  syncAgreementIframeTitle();
  document.addEventListener("geo:lang", () => syncAgreementIframeTitle());
  openBtn.addEventListener("click", (e) => {
    e.preventDefault();
    openAgreementModal();
  });
  modal.querySelectorAll("[data-agreement-close]").forEach((node) => {
    node.addEventListener("click", () => closeAgreementModal());
  });
  modal.addEventListener("click", (e) => {
    if (e.target === modal) closeAgreementModal();
  });
  document.addEventListener("keydown", (e) => {
    if (e.key !== "Escape") return;
    if (!modal.hasAttribute("hidden")) closeAgreementModal();
  });
}

function initNewsModal() {
  const modal = el("newsModal");
  if (!modal) return;
  document.querySelectorAll("[data-news-open]").forEach((btn) => {
    btn.addEventListener("click", () => openNewsModal(btn.getAttribute("data-news-open")));
  });
  modal.querySelectorAll("[data-news-close]").forEach((node) => {
    node.addEventListener("click", closeNewsModal);
  });
  document.addEventListener("keydown", (e) => {
    if (e.key !== "Escape") return;
    if (!modal.hasAttribute("hidden")) closeNewsModal();
  });
  document.addEventListener("geo:lang", () => {
    const id = modal.dataset.openId;
    if (id && !modal.hasAttribute("hidden")) openNewsModal(id);
  });
}

function initMotionOnView() {
  // Small "appear" effect: uses built-in browser API, no libraries.
  const items = document.querySelectorAll(".tile, .card, .preview-card, .cta-card");
  items.forEach((n) => {
    n.style.opacity = "0";
    n.style.transform = "translateY(8px)";
  });

  const io = new IntersectionObserver(
    (entries) => {
      entries.forEach((e) => {
        if (!e.isIntersecting) return;
        const n = e.target;
        n.style.transition = "opacity 420ms ease, transform 420ms ease";
        n.style.opacity = "1";
        n.style.transform = "translateY(0)";
        io.unobserve(n);
      });
    },
    { threshold: 0.12 },
  );

  items.forEach((n) => io.observe(n));
}

function applyApiModeUI() {
  if (!isGeoApiMode()) return;
  document.querySelectorAll(".js-api-only").forEach((node) => node.removeAttribute("hidden"));
}

async function init() {
  await tryRestoreApiSession();
  if (redirectIfLoggedInOnAuthPage()) return;
  applyApiModeUI();
  initNav();
  initNotifications();
  initTrial();
  initMaterials();
  initLangToggle();
  initThemeToggle();
  initA11yPanel();
  initAuthUI();
  initDashboardPage();
  wireDashProfileForm();
  await initDashboardStudyBoard();
  initWhyMedia();
  initBackToTop();
  initNewsModal();
  initAgreementModal();

  const rand = el("randomizeProgress");
  if (rand) rand.addEventListener("click", randomizeProgress);

  const supportForm = el("supportForm");
  if (supportForm) {
    supportForm.addEventListener("submit", (e) => {
      e.preventDefault();
      showToast(t("toastSupportSent"));
      supportForm.reset();
    });
  }

  bindPhoneInputs();
  initRegisterWizard();
  wireTrainerModules();

  const loginForm = el("loginForm");
  if (loginForm) {
    loginForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const fd = new FormData(loginForm);
      const phone = normalizeKzPhoneDigits(fd.get("login") || "");
      if (!phone) {
        showToast(t("toastPhoneInvalid"));
        loginForm.querySelector(".phone-field-input")?.focus();
        return;
      }
      const base = getGeoApiBase();
      if (isGeoApiMode()) {
        const password = String(fd.get("password") || "");
        if (!password) {
          showToast(t("toastApiLoginNeedPass"));
          loginForm.querySelector('input[name="password"]')?.focus();
          return;
        }
        try {
          const r = await fetch(`${base}/api/auth/login`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ phone, password }),
          });
          const data = await r.json().catch(() => ({}));
          if (!r.ok) {
            showToast(data.message || t("toastApiError"));
            return;
          }
          setToken(data.token);
          setUser({ ...data.user, login: data.user.phone, fromApi: true });
          await apiAuthPing();
          initAuthUI();
          showToast(t("toastLoginOk"));
          loginForm.reset();
          setTimeout(() => {
            window.location.replace("dashboard.html#top");
          }, 350);
        } catch {
          showToast(t("toastApiError"));
        }
        return;
      }
      const user = { login: phone, phone, updatedAt: Date.now() };
      setUser(user);
      initAuthUI();
      showToast(t("toastLoginOk"));
      loginForm.reset();
      setTimeout(() => {
        window.location.replace("dashboard.html#top");
      }, 350);
    });
  }

  const registerForm = el("registerForm");
  if (registerForm) {
    registerForm.addEventListener("submit", (e) => e.preventDefault());

    const runRegisterSubmit = async () => {
      const p3 = el("regPanel3");
      if (!p3 || p3.hidden) {
        showToast(t("toastRegisterCompleteSteps"));
        return;
      }
      const fd = new FormData(registerForm);
      const agreeEl = registerForm.querySelector('input[name="agree"]');
      if (!agreeEl?.checked) {
        showToast(t("toastRegisterAgree"));
        return;
      }
      const name = String(fd.get("name") || "").trim();
      if (name.length < 2) {
        showToast(t("toastRegisterNeedName"));
        el("regName")?.focus();
        return;
      }
      const phone = normalizeKzPhoneDigits(fd.get("phone") || "");
      if (!phone) {
        showToast(t("toastPhoneInvalid"));
        el("regPhone")?.focus();
        return;
      }
      const base = getGeoApiBase();
      if (isGeoApiMode()) {
        const password = String(fd.get("password") || "");
        if (password.length < 6) {
          showToast(state.lang === "ru" ? "Пароль не короче 6 символов." : "Пароль кемінде 6 таңба болуы керек.");
          return;
        }
        try {
          const r = await fetch(`${base}/api/auth/register`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ name, phone, password }),
          });
          const data = await r.json().catch(() => ({}));
          if (!r.ok) {
            showToast(data.message || t("toastApiError"));
            return;
          }
          setToken(data.token);
          setUser({ ...data.user, login: data.user.phone, fromApi: true });
          await apiAuthPing();
          initAuthUI();
          showToast(t("toastRegisterOk"));
          registerForm.reset();
          el("regPanel1").hidden = false;
          el("regPanel2").hidden = true;
          el("regPanel3").hidden = true;
          setTimeout(() => {
            window.location.replace("dashboard.html#top");
          }, 350);
        } catch {
          showToast(t("toastApiError"));
        }
        return;
      }
      const user = { name, phone, login: phone, updatedAt: Date.now() };
      setUser(user);
      initAuthUI();
      showToast(t("toastRegisterOk"));
      registerForm.reset();
      el("regPanel1").hidden = false;
      el("regPanel2").hidden = true;
      el("regPanel3").hidden = true;
      setTimeout(() => {
        window.location.replace("dashboard.html#top");
      }, 350);
    };

    el("registerSubmit")?.addEventListener("click", () => {
      runRegisterSubmit().catch((err) => console.error(err));
    });
  }

  initMotionOnView();
}

document.addEventListener("DOMContentLoaded", () => {
  init().catch((err) => console.error(err));
});

