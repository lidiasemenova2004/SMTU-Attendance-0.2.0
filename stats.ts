import type { MonthData, GroupStats, StudentStat } from "./types.ts";
import type { AttendanceRecord } from "./types.ts";
import type { AttendanceDashboardData } from "../../views/dashboards.ts"; 

// Вспомогательные функции
function statusByPercent(value: number): string {
  if (value >= 85) return "Отлично";
  if (value >= 70) return "Хорошо";
  if (value >= 50) return "Удовлетворительно";
  return "Требует внимания";
}

function formatDayDate(isoDate: string): string {
  const d = new Date(isoDate);
  return String(d.getDate()).padStart(2, '0');
}

function buildDayList(records: AttendanceRecord[]): string[] {
  const daysSet = new Set(records.map(r => r.date));
  return Array.from(daysSet).sort().map(formatDayDate);
}

function buildStudentRows(
  students: StudentStat[],
  records: AttendanceRecord[],
  dayListFull: string[] // ISO-даты
): { name: string; days: string[] }[] {
  // Группируем записи по студенту и дате
  const map = new Map<string, Map<string, AttendanceRecord>>();
  for (const r of records) {
    if (!map.has(r.fio)) map.set(r.fio, new Map());
    map.get(r.fio)!.set(r.date, r);
  }

  return students.map(s => {
    const studentRecords = map.get(s.fio) ?? new Map();
    const days = dayListFull.map(date => {
      const rec = studentRecords.get(date);
      if (!rec || !rec.present) return "-";
      const timeIn = rec.timeIn?.slice(0, 5) ?? "";
      const timeOut = rec.timeOut?.slice(0, 5) ?? "";
      return timeIn && timeOut ? `${timeIn}<br />${timeOut}` : timeIn || "—";
    });
    return { name: s.fio, days };
  });
}

export function statsToDashboardData(
  stats: GroupStats[],
  allMonthData: MonthData[]
): AttendanceDashboardData[] {
  const dataMap = new Map(allMonthData.map(md => [md.group, md]));

  return stats.map(stat => {
    const monthData = dataMap.get(stat.group);
    const records = monthData?.records ?? [];
    const dayListFull = buildDayList(records);
    const dayListShort = dayListFull.map(d => d); // можно оставить как есть

    const bestStudent = stat.students.length > 0
  ? stat.students.reduce((a, b) => a.attendancePercent > b.attendancePercent ? a : b)
  : undefined;

const riskStudent = stat.students.length > 0
  ? stat.students.reduce((a, b) => a.attendancePercent < b.attendancePercent ? a : b)
  : undefined;

    const studentRows = buildStudentRows(stat.students, records, dayListFull);

    // Пока дисциплин нет – всё агрегируем как «Все занятия»
    const totalVisited = stat.students.reduce((sum, s) => sum + s.presentDays, 0);
    const totalDays = stat.students.reduce((sum, s) => sum + s.totalDays, 0);
    const disciplineRow = {
      discipline: "Все занятия",
      visited: totalVisited,
      total: totalDays,
      status: statusByPercent(stat.groupAverage),
    };

    return {
      group: stat.group,
      studentsCount: stat.students.length,
      period: stat.month,
      days: dayListShort,
      summary: [
        {
          title: "Общая посещаемость",
          percent: stat.groupAverage,
          note: stat.month,
        },
        {
          title: "Лучший студент",
          name: bestStudent?.fio,
          percent: bestStudent?.attendancePercent ?? 0,
          note: stat.month,
        },
        {
          title: "Обратить внимание",
          name: riskStudent?.fio,
          percent: riskStudent?.attendancePercent ?? 0,
          note: stat.month,
        },
      ],
      studentRows,
      studentDetailRows: [disciplineRow],
      disciplineRows: [disciplineRow],
      disciplineStudentRows: stat.students.map(s => ({
        name: s.fio,
        visited: s.presentDays,
        total: s.totalDays,
        status: statusByPercent(s.attendancePercent),
      })),
      disciplineStudentDetailRows: studentRows, // те же дни
    };
  });
}

export function calculateStats(allMonthData: MonthData[]): GroupStats[] {
  const result: GroupStats[] = [];

  for (const md of allMonthData) {
    const dayPresenceByStudent = new Map<string, Map<string, boolean>>();

    for (const rec of md.records) {
      if (!dayPresenceByStudent.has(rec.fio)) {
        dayPresenceByStudent.set(rec.fio, new Map<string, boolean>());
      }

      const dayMap = dayPresenceByStudent.get(rec.fio)!;
      const prev = dayMap.get(rec.date) ?? false;
      dayMap.set(rec.date, prev || rec.present);
    }

    const students: StudentStat[] = Array.from(dayPresenceByStudent.entries()).map(([fio, dayMap]) => {
      const totalDays = dayMap.size;
      const presentDays = Array.from(dayMap.values()).filter(Boolean).length;
      const absentDays = totalDays - presentDays;
      const attendancePercent = totalDays ? Math.round((presentDays / totalDays) * 100) : 0;

      return { fio, totalDays, presentDays, absentDays, attendancePercent };
    });

    students.sort((a, b) => a.fio.localeCompare(b.fio));

    const groupAvg = students.length
      ? Math.round(students.reduce((sum, s) => sum + s.attendancePercent, 0) / students.length)
      : 0;

    result.push({ group: md.group, month: md.month, students, groupAverage: groupAvg });
  }

  return result;
}
