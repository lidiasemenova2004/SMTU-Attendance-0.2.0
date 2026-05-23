import { setPipelineData } from "./utils/saver.ts";
import { SessionManager } from "./session.ts";
import { loginISU } from "./auth.ts";
import { fetchTargetGroups } from "./groups.ts";
import { fetchAttendanceForGroups } from "./attendance.ts";
import { calculateStats, statsToDashboardData } from "./stats.ts";
import { filterByCurrentSemester } from "./utils/semester.ts";
import type { PipelineResult } from "./types.ts";

export async function runFullPipeline(
  email: string,
  password: string,
  onProgress?: (step: string) => void,
): Promise<PipelineResult> {
  const session = new SessionManager();

  onProgress?.("Авторизация в ИСУ...");
  await loginISU(email, password, session);

  onProgress?.("Загрузка расписания...");
  const targetGroups = await fetchTargetGroups(session);
  console.log(`Найдено групп: ${targetGroups.length}`);

  onProgress?.("Сбор данных посещаемости...");
  const allMonthData = await fetchAttendanceForGroups(targetGroups, session, {
    concurrency: 4,
    delay: 250,
  });

  onProgress?.("Фильтрация по семестру...");
  const semesterData = filterByCurrentSemester(allMonthData);
  const effectiveData = semesterData.length > 0 ? semesterData : allMonthData;

  onProgress?.("Расчёт статистики...");
  const stats = calculateStats(effectiveData);
  const dashboardDatas = statsToDashboardData(stats, effectiveData);

  onProgress?.("Сохранение результата...");
const result: PipelineResult = {
  groups: targetGroups,
  stats,
  dashboardDatas,
  rawMonths: effectiveData,
};

  setPipelineData(result);

  onProgress?.("Готово");
  return result;
}
