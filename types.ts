import type { AttendanceDashboardData } from "../../views/dashboards.ts";

export interface AttendanceRecord {
  studentNumber: number;
  fio: string;
  date: string;
  dayOfWeek: string;
  timeIn?: string;
  timeOut?: string;
  present: boolean;
}

export interface MonthData {
  group: string;
  month: string;
  records: AttendanceRecord[];
}

export interface StudentStat {
  fio: string;
  totalDays: number;
  presentDays: number;
  absentDays: number;
  attendancePercent: number;
}

export interface GroupStats {
  group: string;
  month: string;
  students: StudentStat[];
  groupAverage: number;
}

export interface PipelineResult {
  groups: string[];
  stats: GroupStats[];
  dashboardDatas: AttendanceDashboardData[];
  rawMonths: MonthData[];
}
