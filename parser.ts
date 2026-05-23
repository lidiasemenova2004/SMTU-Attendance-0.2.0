import * as cheerio from "cheerio";
import type { AttendanceRecord, MonthData } from "./types";

const MONTH_CODE_RE = /\b(20\d{2}(0[1-9]|1[0-2]))\b/;

function parseAttendanceCell(value: string): { present: boolean; timeIn?: string; timeOut?: string } {
  const trimmed = value.trim();
  if (!trimmed || trimmed === "/") return { present: false };

  const match = trimmed.match(/(?:(\d{2}:\d{2}))?\s*\/\s*(?:(\d{2}:\d{2}))?/);
  if (match) {
    return { present: true, timeIn: match[1] || undefined, timeOut: match[2] || undefined };
  }
  return { present: true };
}

function extractMonth(html: string): string {
  const code = html.match(MONTH_CODE_RE);
  if (code) return code[1];

  const bodyText = cheerio.load(html)("body").text();
  const codeFromText = bodyText.match(MONTH_CODE_RE);
  return codeFromText ? codeFromText[1] : "Unknown";
}

export function parseAttendanceMonth(html: string, group: string): MonthData {
  const $ = cheerio.load(html);
  const month = extractMonth(html);

  const records: AttendanceRecord[] = [];
  const dates: { date: string; day: string }[] = [];

  const tables = $("table").toArray();
  const tableNode = tables.find((tbl) => {
    const headerCells = $(tbl).find("tr").first().find("th, td").length;
    return headerCells >= 3;
  });

  if (!tableNode) throw new Error(`Attendance table not found for group ${group}`);

  const table = $(tableNode);

  table
    .find("tr")
    .first()
    .find("th, td")
    .slice(2)
    .each((_, el) => {
      const txt = $(el).text().trim();
      const m = txt.match(/(\d{1,2})\s+([A-Za-zÀ-ßà-ÿ¨¸]{2,})/);
      if (m) dates.push({ date: m[1], day: m[2] });
    });

  table.find("tr").each((idx, row) => {
    if (idx === 0) return;

    const cols = $(row)
      .find("td")
      .map((_, td) => $(td).text().trim())
      .toArray();

    if (cols.length < 2) return;

    const number = parseInt(cols[0], 10) || 0;
    const fio = cols[1];
    if (!fio) return;

    for (let i = 0; i < dates.length; i++) {
      const cell = cols[i + 2] || "";
      const { present, timeIn, timeOut } = parseAttendanceCell(cell);
      records.push({
        studentNumber: number,
        fio,
        date: dates[i].date,
        dayOfWeek: dates[i].day,
        timeIn,
        timeOut,
        present,
      });
    }
  });

  return { group, month, records };
}
