import type { AttendanceDashboardData } from "../../views/dashboards.ts";
import type { MonthData, AttendanceRecord } from "./types.ts";

function formatTimeMark(rec: AttendanceRecord | undefined): string {
  if (!rec || !rec.present) return "-";
  if (rec.timeIn && rec.timeOut) return `${rec.timeIn}<br />${rec.timeOut}`;
  return "Присутствовал";
}

export function monthDataToDashboardData(monthData: MonthData): AttendanceDashboardData {
  // 1. Уникальные даты (отсортированные)
  const allDates = [...new Set(monthData.records.map(r => r.date))].sort();
  // Для отображения используем номера дней (можно изменить формат)
  const days = allDates.map(d => d.split('-')[2]); // "2026-02-01" → "01"

  // 2. Группируем записи по студентам
  const studentRecords = new Map<string, Map<string, AttendanceRecord>>();
  for (const rec of monthData.records) {
    if (!studentRecords.has(rec.fio)) studentRecords.set(rec.fio, new Map());
    studentRecords.get(rec.fio)!.set(rec.date, rec);
  }

  // 3. Строим studentRows
  const studentRows = Array.from(studentRecords.entries()).map(([fio, dateMap]) => ({
    name: fio,
    days: allDates.map(date => formatTimeMark(dateMap.get(date))),
  }));

  // 4. Вычисляем статистику для summary
  const totalDays = allDates.length;
  const studentStats = Array.from(studentRecords.entries()).map(([fio, dateMap]) => {
    const present = allDates.filter(d => dateMap.get(d)?.present === true).length;
    const percent = totalDays > 0 ? (present / totalDays) * 100 : 0;
    return { fio, present, percent };
  });

  const groupAverage = studentStats.length > 0
    ? studentStats.reduce((sum, s) => sum + s.percent, 0) / studentStats.length
    : 0;

  const bestStudent = studentStats.reduce((best, s) => s.percent > best.percent ? s : best, studentStats[0]);
  const worstStudent = studentStats.reduce((worst, s) => s.percent < worst.percent ? s : worst, studentStats[0]);

  // 5. Заглушки для дисциплин (одна общая строка)
  const totalPresentAll = studentStats.reduce((sum, s) => sum + s.present, 0);
  const totalPossibleAll = totalDays * studentStats.length;

  return {
    group: monthData.group,
    studentsCount: studentStats.length,
    period: `${allDates[0]} – ${allDates[allDates.length - 1]}`,
    days: days,
    summary: [
      { title: "Общая посещаемость", percent: Math.round(groupAverage), note: monthData.month },
      { title: "Лучший студент", name: bestStudent?.fio, percent: Math.round(bestStudent?.percent ?? 0), note: monthData.month },
      { title: "Обратить внимание", name: worstStudent?.fio, percent: Math.round(worstStudent?.percent ?? 0), note: monthData.month },
    ],
    studentRows: studentRows,
    studentDetailRows: [
      { discipline: "Все занятия", visited: bestStudent?.present ?? 0, total: totalDays, status: getStatus(bestStudent?.percent ?? 0) }
    ],
    disciplineRows: [
      { discipline: "Все дисциплины", visited: totalPresentAll, total: totalPossibleAll, status: getStatus(groupAverage) }
    ],
    disciplineStudentRows: studentStats.map(s => ({
      name: s.fio,
      visited: s.present,
      total: totalDays,
      status: getStatus(s.percent)
    })),
    disciplineStudentDetailRows: studentRows.map(row => ({ name: row.name, days: row.days }))
  };
}

function getStatus(percent: number): string {
  if (percent >= 85) return "Отлично";
  if (percent >= 70) return "Хорошо";
  if (percent >= 50) return "Удовлетворительно";
  return "Требует внимания";
}