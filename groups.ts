import {SessionManager} from "./session.ts"
import { buildGroupSchedule } from "./schedule/schedule.ts";
import { fetch } from "@tauri-apps/plugin-http";

export async function fetchGroupsAndSubjects(
  options?: { onProgress?: (pct: number) => void },
) {
  const schedule = await buildGroupSchedule(fetch, options);
  const index: Record<string, Set<string>> = {};

  for (const [group, ...days] of schedule){
    index[group] ??= new Set<string>();
    for  (const dayLessons of days) {
      for (const lesson of dayLessons){
        index[group].add(lesson.subject);
      }
    }
  }
  return Object.fromEntries(Object.entries(index).map(([g,s]) => [g,Array.from(s).sort()]))
}
 
export async function fetchTargetGroups(
  session: SessionManager
): Promise<string[]> {
  const schedule = await buildGroupSchedule(session.request.bind(session));
  const allGroups = schedule.map(([group]) => group);

  return allGroups
    .filter((group) => /^20\d{3}/.test(group))
    .sort((a, b) => a.localeCompare(b));
}
 