import React, { createContext, useContext, useState, useMemo, useCallback } from "react";

const dict = {
  en: {
    app: "Skillo",
    tagline: "Skills manager for your AI agents",
    nav: { skills: "Installed", find: "Find & add", advanced: "Advanced", settings: "Settings" },
    scope: { project: "Project", global: "Global" },
    skills: {
      title: "Installed skills",
      empty: "No skills installed in this scope yet.",
      emptyHint: "Search skills.sh and add one, or run a sync from Advanced.",
      refresh: "Refresh",
      installedIn: "Installed in",
      status: "status",
      filterAgents: "All agents",
      noDescription: "No description",
      showPath: "Show files",
      updateAll: "Update all",
      update: "Update",
      remove: "Remove",
      all: "All",
      source: "source",
    },
    search: {
      title: "Find skills",
      inputLabel: "A repo URL, a GitHub repo like owner/repo, or search skills.sh — results update as you type",
      searchBtn: "Search",
      searching: "Searching…",
      minChars: "Type at least 2 characters to search.",
      installs: "installs",
      onlineError: "Couldn't reach skills.sh — searched the CLI instead.",
      resultsEmpty: "Nothing found. Try another keyword.",
      previewBtn: "See skills",
      previewEmpty: "No skills discovered in this package.",
      chooseFirst: "Choose skills below, pick agents, add it.",
      installBtn: "Install",
      installingNote: "Leave agents on auto-detect unless the CLI didn't find yours.",
      agentsAuto: "Auto-detect agents (recommended)",
      agentsManual: "Specify agents (ids: claude-code, cursor, opencode, …)",
      copyMode: "Copy files instead of symlinking",
      globalMode: "Install globally (~ instead of this project)",
    },
    modal: {
      skillsIn: "Skills in",
      agents: "Agents",
      close: "Close",
      confirm: "Install",
      starting: "Preparing…",
    },
    runBar: {
      idle: "Idle",
      running: "Running",
      done: "Done",
      failed: "Failed",
      log: "Log",
      clear: "Clear",
      expand: "Details",
      collapse: "Hide",
      noJobs: "No operations yet. Install, update or remove a skill to see them here.",
      labels: {
        add: "Install",
        remove: "Remove",
        update: "Update",
        list: "List skills",
        find: "Search",
        sync: "Sync node_modules",
        "install-lock": "Restore from lockfile",
        init: "Create skill",
        preview: "Preview package",
        version: "CLI version",
      },
    },
    advanced: {
      title: "Advanced",
      syncTitle: "Sync node_modules",
      syncHint: "Runs skills experimental_sync — links skills shipped in node_modules packages into your agent directories.",
      lockTitle: "Restore from skills-lock.json",
      lockHint: "Runs skills experimental_install — reinstalls every skill recorded in the lockfile.",
      dryRun: "Dry run",
      run: "Run",
      initTitle: "New local skill",
      initHint: "Runs skills init <name> — creates <name>/SKILL.md in this project.",
      namePlaceholder: "my-skill",
      experimental: "Experimental — these commands may change in future CLI versions.",
    },
    settings: {
      title: "Settings",
      projectDir: "Project folder",
      pick: "Choose…",
      cwdHint: "Project commands (list, add, remove, update, init, sync) run here.",
      language: "Language",
      lastResort: "Open folder",
    },
    toast: { success: "Done", failed: "Failed",
      added: "Installed",
      removed: "Removed",
      updated: "Updated",
      synced: "Sync finished",
      locked: "Restore finished",
      inited: "Skill created",
    },
  },

  ar: {
    app: "سكيلو",
    tagline: "مدير الـ Skills لعمال الـ AI بتوعك",
    nav: { skills: "المتثبيتة", find: "البحث والتسطيب", advanced: "متقدم", settings: "الإعدادات" },
    scope: { project: "المشروع", global: "عام" },
    skills: {
      title: "السكيلز المثبتة",
      empty: "مفيش سكيلز متثبتة هنا لسه.",
      emptyHint: "دوّر في skills.sh وسطّب واحدة، أو اعمل sync من قسم «متقدم».",
      refresh: "تحدث",
      installedIn: "مثبّتة في",
      status: "الحالة",
      filterAgents: "كل الـ agents",
      noDescription: "بدون وصف",
      showPath: "افتح الملفات",
      updateAll: "حدّث الكل",
      update: "تحديث",
      remove: "إزالة",
      all: "الكل",
      source: "المصدر",
    },
    search: {
      title: "دوّر على سكيلز",
      inputLabel: "رابط repo، أو owner/repo من GitHub، أو دوّر في skills.sh — النتايج بتتحدث مع كل حرف",
      searchBtn: "بحث",
      searching: "جاري البحث…",
      minChars: "اكتب حرفين على الأقل عشان البحث يشتغل.",
      installs: "تسطيب",
      onlineError: "skills.sh مش متاح — جربنا البحث من الـ CLI نفسه.",
      resultsEmpty: "مفيش حاجة. جرّب كلمة تانية.",
      previewBtn: "شد شوية",
      previewEmpty: "مفيش سكيلز اتمكنش تقرا من الحزمة دي.",
      chooseFirst: "اختار السكيلز، حدد الـ agents، وسطّب.",
      installBtn: "تسطيب",
      installingNote: "خلّي الـ agents على auto-detect إلا لو الـ CLI ملقاهاش.",
      agentsAuto: "حدد الـ agents لوحده (مستحسن)",
      agentsManual: "حدد بنفسك (ids: claude-code, cursor, opencode, …)",
      copyMode: "نسخ الملفات بدل Symlink",
      globalMode: "تسطيب عام (~ بدل المشروع ده)",
    },
    modal: {
      skillsIn: "السكيلز اللي جوه",
      agents: "الـ agents",
      close: "إغلاق",
      confirm: "تثبيت",
      starting: "في تحضير…",
    },
    runBar: {
      idle: "خامل",
      running: "شغّال",
      done: "خلص",
      failed: "فشل",
      log: "السجل",
      clear: "تفريغ",
      expand: "التفاصيل",
      collapse: "إخفاء",
      noJobs: "مفيش عمليات لسه. سطّب، حدّث أو شيل سكيل وتشوف هنا.",
      labels: {
        add: "تثبيت",
        remove: "إزالة",
        update: "تحديث",
        list: "قراءة السكيلز",
        find: "بحث",
        sync: "مزامنة node_modules",
        "install-lock": "استعادة من lockfile",
        init: "إنشاء سكيل",
        preview: "معاينة حزمة",
        version: "نسخة الـ CLI",
      },
    },
    advanced: {
      title: "متقدم",
      syncTitle: "مزامنة node_modules",
      syncHint: "يشغّل skills experimental_sync — بيربط السكيلز اللي جاية مع node_modules في مجلدات الـ agents بتوعك.",
      lockTitle: "استعادة من skills-lock.json",
      lockHint: "يشغّل skills experimental_install — بيرجّع كل سكيل مسجّل في الملف ده.",
      dryRun: "تجربة بدون تغيير",
      run: "تشغيل",
      initTitle: "سكيل محلي جديد",
      initHint: "يشغّل skills init <name> — يعمل <name>/SKILL.md في المشروع ده.",
      namePlaceholder: "my-skill",
      experimental: "تجريبي — الأوامر دي ممكن تتغير في إصدارات CLI جاية.",
    },
    settings: {
      title: "الإعدادات",
      projectDir: "مجلد المشروع",
      pick: "اختار…",
      cwdHint: "أوامر المشروع (list، add، remove، update، init، sync) بتشتغل هنا.",
      language: "اللغة",
      lastResort: "افتح المجلد",
    },
    toast: { success: "تم", failed: "فشل", added: "اتثبّت", removed: "اتشال", updated: "اتحدّث", synced: "المزامنة خلصت", locked: "الاستعادة خلصت", inited: "السكيل اتعملت" },
  },
};

const I18nContext = createContext(null);

export function I18nProvider({ children }) {
  const [lang, setLang] = useState(() => localStorage.getItem("skillo.lang") || "en");
  const t = useCallback((path) => {
    const parts = path.split(".");
    let cur = dict[lang] || dict.en;
    for (const p of parts) {
      if (cur == null) break;
      cur = cur[p];
    }
    return cur ?? path;
  }, [lang]);

  const value = useMemo(() => {
    const dir = lang === "ar" ? "rtl" : "ltr";
    document.documentElement.lang = lang;
    document.documentElement.dir = dir;
    return { lang, setLang: (l) => { localStorage.setItem("skillo.lang", l); setLang(l); }, t, dir };
  }, [lang, t]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  return useContext(I18nContext);
}
