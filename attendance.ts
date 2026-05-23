import * as cheerio from "cheerio";
import { SessionManager } from "./session.ts";
import { parseAttendanceMonth } from "./parser.ts";
import type { MonthData } from "./types.ts";

const MONTH_CODE_RE = /\b(20\d{2}(0[1-9]|1[0-2]))\b/g;
const STUB_BASE_URL = "../views/sd";
const cachedStubMonthsByGroup = new Map<string, string[]>();

function getCurrentPeriod() {
  const now = new Date();
  const year = now.getFullYear().toString();
  const monthNum = (now.getMonth() + 1).toString().padStart(2, "0");
  const monthLabel = `${year}-${monthNum}`;
  return {
    year,
    month: monthNum,
    code: `${year}${monthNum}`,
    label: monthLabel,
  };
}

function extractMonthCodesFromPage(html: string): string[] {
  const bodyText = cheerio.load(html)("body").text();
  const found: string[] = [];

  for (const match of bodyText.matchAll(MONTH_CODE_RE)) {
    found.push(match[1]);
  }

  return [...new Set(found)].sort();
}

function toMonthCode(year: number, month: number): string {
  return `${year}${month.toString().padStart(2, "0")}`;
}

function getCurrentSemesterMonthCodes(): Set<string> {
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1;

  // Осенний семестр: сентябрь-январь
  if (currentMonth >= 9 || currentMonth === 1) {
    const year = currentMonth === 1 ? currentYear - 1 : currentYear;
    return new Set([
      toMonthCode(year, 9),
      toMonthCode(year, 10),
      toMonthCode(year, 11),
      toMonthCode(year, 12),
      toMonthCode(currentMonth === 1 ? currentYear : currentYear + 1, 1),
    ]);
  }

  // Весенний семестр: февраль-июнь
  return new Set([
    toMonthCode(currentYear, 2),
    toMonthCode(currentYear, 3),
    toMonthCode(currentYear, 4),
    toMonthCode(currentYear, 5),
    toMonthCode(currentYear, 6),
  ]);
}

// Сканирует широкий диапазон дат и возвращает ВСЕ month-коды, для которых есть заглушка
async function scanAllAvailableMonths(group: string): Promise<string[]> {
  const now = new Date();
  const startYear = now.getFullYear() - 1;
  const endYear = now.getFullYear() + 1;
  const monthCodesToCheck: string[] = [];

  for (let y = startYear; y <= endYear; y++) {
    for (let m = 1; m <= 12; m++) {
      monthCodesToCheck.push(toMonthCode(y, m));
    }
  }

  const available: string[] = [];

  // Параллельно проверяем все monthCode
  await Promise.all(
    monthCodesToCheck.map(async (code) => {
      const html = await fetchStubHtml(group, code);
      if (html) available.push(code);
    })
  );

  return available.sort();
}

// Основная функция — сначала реальное сканирование папки, потом фильтр по семестру
async function getStubMonthCodes(group: string): Promise<string[]> {
  const cached = cachedStubMonthsByGroup.get(group);
  if (cached) return cached;

  console.log(`[Attendance] Сканирую заглушки месяцев для группы ${group}...`);

  // 1. Ищем всё, что реально лежит в папке
  const allFound = await scanAllAvailableMonths(group);
  console.log(`[Attendance] Найдены месяцы в заглушках: ${allFound.join(", ") || "нет"}`);

  // 2. Выделяем только те, что относятся к текущему семестру
  const semesterSet = getCurrentSemesterMonthCodes();
  const currentSemesterMonths = allFound.filter(code => semesterSet.has(code));

  console.log(`[Attendance] Из них текущему семестру принадлежат: ${currentSemesterMonths.join(", ") || "нет"}`);

  cachedStubMonthsByGroup.set(group, currentSemesterMonths);
  return currentSemesterMonths;
}

async function fetchStubHtml(group: string, monthCode: string): Promise<string | null> {
  const urls = [
    `${STUB_BASE_URL}/${group}/${monthCode}.html`,
    `${STUB_BASE_URL}/${monthCode}.html`,
  ];

  for (const url of urls) {
    try {
      const res = await fetch(url);
      if (!res.ok) continue;
      return await res.text();
    } catch (error) {
      console.warn(`[Attendance] Stub fetch failed: ${url}`, error);
    }
  }

  return null;
}

function seemsDeniedHtml(html: string): boolean {
  const text = cheerio.load(html)("body").text().toLowerCase();
  return (
    text.includes("доступ") ||
    text.includes("нет прав") ||
    text.includes("авториз") ||
    text.includes("ошибка") ||
    text.includes("не найдена")
  );
}

function isAccessRedirect(res: Response, expectedPathPart: string): boolean {
  if (!res.redirected) return false;

  const url = (res.url || "").toLowerCase();
  const expected = expectedPathPart.toLowerCase();

  if (url.includes(expected)) return false;

  return (
    url.includes("/login") ||
    url.includes("/users/sign_in") ||
    url.includes("/auth") ||
    url.includes("/403") ||
    url.includes("/404") ||
    url.includes("/error")
  );
}

async function loadStubAttendance(group: string, monthCode?: string): Promise<MonthData> {
  console.log(`[Attendance] Переход на заглушку: group=${group}, month=${monthCode ?? "auto"}`);
  const current = getCurrentPeriod();
  const fallbackMonths = await getStubMonthCodes(group);
  const candidates = [
    monthCode,
    current.code,
    ...fallbackMonths,
  ].filter((v): v is string => Boolean(v));

  for (const code of candidates) {
    const html = await fetchStubHtml(group, code);
    if (!html) continue;

    const parsed = parseAttendanceMonth(html, group);
    parsed.month = monthCode ?? code;
    console.log(`[Attendance] Заглушка загружена: group=${group}, sourceMonth=${code}, targetMonth=${parsed.month}`);
    return parsed;
  }

  console.error(`[Attendance] Заглушка не найдена: group=${group}, month=${monthCode ?? "auto"}`);
  throw new Error(`[Attendance] Stub not found for group ${group}`);
}

async function probeMonthCodes(
  group: string,
  year: string,
  month: string,
  session: SessionManager,
): Promise<string[] | null> {
  const monthCode = `${year}${month}`;
  const expectedPath = `/students_groups_card_event/${group}/sd/${monthCode}/`;
  const url = `https://isu.smtu.ru${expectedPath}`;

  try {
    const res = await session.request(url);
    if (!res.ok || res.status === 403 || res.status === 404) throw new Error(`HTTP ${res.status}`);
    if (isAccessRedirect(res, expectedPath)) throw new Error("Redirected to access page");
    const html = await res.text();

    if (seemsDeniedHtml(html)) throw new Error("Access denied by content");

    return extractMonthCodesFromPage(html);
  } catch (error) {
    console.warn(`[Attendance] Не удалось получить список месяцев для ${group}:`, error);
    return null;
  }
}

async function fetchSingleMonth(
  group: string,
  monthCode: string,
  session: SessionManager,
): Promise<MonthData> {
  const expectedPath = `/students_groups_card_event/${group}/sd/${monthCode}/`;
  const url = `https://isu.smtu.ru${expectedPath}`;

  try {
    const res = await session.request(url);
    if (!res.ok || res.status === 403 || res.status === 404) throw new Error(`HTTP ${res.status}`);
    if (isAccessRedirect(res, expectedPath)) throw new Error("Redirected to access page");
    const html = await res.text();

    if (seemsDeniedHtml(html)) throw new Error("Access denied by content");

    const parsed = parseAttendanceMonth(html, group);
    parsed.month = monthCode;
    console.log(`[Attendance] Данные загружены онлайн: group=${group}, month=${monthCode}`);
    return parsed;
  } catch (error) {
    console.warn(`[Attendance] Онлайн-загрузка не удалась, использую заглушку: group=${group}, month=${monthCode}`, error);
    return loadStubAttendance(group, monthCode);
  }
}

async function runWithConcurrency<T>(
  tasks: Array<() => Promise<T>>,
  limit: number,
): Promise<Array<T | undefined>> {
  const results: Array<T | undefined> = new Array(tasks.length).fill(undefined);
  const queue = tasks.map((task, i) => ({ task, i }));

  const workers = Array.from({ length: limit }, async () => {
    while (queue.length > 0) {
      const next = queue.shift();
      if (!next) break;

      try {
        results[next.i] = await next.task();
      } catch {
        // no-op, fallback is handled in fetchSingleMonth
      }
    }
  });

  await Promise.all(workers);
  return results;
}

function isDefined<T>(value: T | undefined): value is T {
  return value !== undefined;
}

export async function fetchAttendanceForGroups(
  groups: string[],
  session: SessionManager,
  options: { concurrency?: number; delay?: number } = {},
): Promise<MonthData[]> {
  const { concurrency = 4, delay = 200 } = options;
  const current = getCurrentPeriod();

  console.log(`[Attendance] fetchAttendanceForGroups() start`);
  console.log(`[Attendance] Текущий период: ${current.label} (${current.code})`);
  console.log(`[Attendance] Пробуем получить список месяцев для ${groups.length} групп...`);

  const groupMonths: Record<string, string[]> = {};

  for (const group of groups) {
    const monthCodes = await probeMonthCodes(group, current.year, current.month, session);
    const stubMonthCodes = await getStubMonthCodes(group);
    groupMonths[group] = monthCodes && monthCodes.length > 0
      ? monthCodes
      : stubMonthCodes.length > 0
        ? stubMonthCodes
        : [current.code];
    console.log(`[Attendance] ${group}: месяцев к загрузке ${groupMonths[group].length} -> ${groupMonths[group].join(", ")}`);
  }

  const allTasks: Array<() => Promise<MonthData>> = [];

  for (const group of groups) {
    for (const monthCode of groupMonths[group]) {
      allTasks.push(async () => {
        if (delay > 0) await new Promise((r) => setTimeout(r, delay));
        return fetchSingleMonth(group, monthCode, session);
      });
    }
  }

  if (allTasks.length === 0) return [];

  const loaded = (await runWithConcurrency(allTasks, concurrency)).filter(isDefined);
  console.log(`[Attendance] Загрузка завершена. Записей месяцев: ${loaded.length}`);
  return loaded;
}
