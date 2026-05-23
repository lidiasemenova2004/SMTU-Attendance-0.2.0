import { renderAppHeader } from "./components/header.ts";

export type DashboardRoute =
  | "students"
  | "student-detail"
  | "disciplines"
  | "discipline-students"
  | "discipline-student-detail";

type SummaryCard = {
  title: string;
  name?: string;
  percent: number;
  note: string;
};

type StudentAttendanceRow = {
  name: string;
  days: string[];
};

type DisciplineRow = {
  discipline: string;
  visited: number;
  total: number;
  status: string;
};

type DisciplineStudentRow = {
  name: string;
  visited: number;
  total: number;
  status: string;
};

export type AttendanceDashboardData = {
  group: string;
  studentsCount: number;
  period: string;
  days: string[];
  summary: SummaryCard[];
  studentRows: StudentAttendanceRow[];
  studentDetailRows: DisciplineRow[];
  disciplineRows: DisciplineRow[];
  disciplineStudentRows: DisciplineStudentRow[];
  disciplineStudentDetailRows: StudentAttendanceRow[];
};

/* export const sampleDashboardData: AttendanceDashboardData = {
  group: "20190",
  studentsCount: 28,
  period: "01.02.2026-28.02.2026",
  days: ["01", "02", "03", "04", "05", "06", "07", "08", "09", "10", "11", "12", "13","14", "15", "16", "17", "18", "19","20", "21", "22", "23", "24", "25","26", "27", "28"],
  summary: [
    {
      title: "Общая посещаемость",
      percent: 92,
      note: "За выбранный промежуток",
    },
    {
      title: "Лучший студент",
      name: "Парамонова Д. С.",
      percent: 98,
      note: "За выбранный промежуток",
    },
    {
      title: "Обратить внимание",
      name: "Яликов М. А.",
      percent: 64,
      note: "За выбранный промежуток",
    },
  ],
  studentRows: [
    { name: "Парамонова Д. С.", days: ["-", "-", "10:08<br />14:10", "10:08<br />14:10", "-", "10:08<br />14:10", "-"] },
    { name: "Гниляков Я. И.", days: ["-", "09:20<br />12:35", "-", "10:10<br />15:00", "-", "-", "-"] },
    { name: "Киселева В. К.", days: ["-", "10:06<br />12:53", "-", "10:09<br />15:14", "08:26<br />14:07", "08:34<br />11:36", "-"] },
  ],
  studentDetailRows: [
    { discipline: "Программирование", visited: 46, total: 50, status: "Отлично" },
    { discipline: "Математика", visited: 42, total: 50, status: "Хорошо" },
    { discipline: "Физика", visited: 32, total: 50, status: "Требует внимания" },
  ],
  disciplineRows: [
    { discipline: "Программирование", visited: 460, total: 500, status: "Отлично" },
    { discipline: "Математика", visited: 430, total: 500, status: "Хорошо" },
    { discipline: "Физика", visited: 350, total: 500, status: "Требует внимания" },
  ],
  disciplineStudentRows: [
    { name: "Парамонова Д. С.", visited: 46, total: 50, status: "Отлично" },
    { name: "Гниляков Я. И.", visited: 41, total: 50, status: "Хорошо" },
    { name: "Яликов М. А.", visited: 32, total: 50, status: "Требует внимания" },
  ],
  disciplineStudentDetailRows: [
    { name: "Парамонова Д. С.", days: ["-", "-", "2/3", "2/3", "-", "2/3", "-"] },
    { name: "Гниляков Я. И.", days: ["-", "2/3", "-", "2/3", "-", "-", "-"] },
    { name: "Яликов М. А.", days: ["-", "-", "1/3", "2/3", "-", "1/3", "-"] },
  ],
}; */

function percent(visited: number, total: number): string {
  return `${Math.round((visited / total) * 100)}%`;
}

function renderSummaryCards(cards: SummaryCard[]): string {
  return `
    <div class="top-row summary-row">
      ${cards
        .map(
          (card) => `
            <div class="wrapper">
              <h2>${card.title}</h2>
              <p class="name">${card.name ?? ""}</p>
              <p class="procent">${card.percent}%</p>
              <p class="notes">${card.note}</p>
            </div>
          `,
        )
        .join("")}
    </div>
  `;
}

function renderDashboardHeader(data: AttendanceDashboardData, titleSuffix: string): string {
  return renderAppHeader({
    title: `Статистика группы ${data.group}${titleSuffix}`,
    subtitle: ` ${data.studentsCount} студентов`,
    actions: [
      { label: "Выбрать месяц", route: "groups" },
      { label: "К списку групп", route: "groups" },
    ],
  });
}

function renderStudentAttendanceTable(data: AttendanceDashboardData, withDetails: boolean): string {
  return `
    <table class="timeinout">
      <thead>
        <tr>
          <th>№</th>
          <th>ФИО</th>
          ${data.days.map((day) => `<th>${day}</th>`).join("")}
          ${withDetails ? "<th>Подробнее</th>" : ""}
        </tr>
      </thead>
      <tbody>
        ${data.studentRows
          .map(
            (row, index) => `
              <tr>
                <td>${index + 1}</td>
                <td>${row.name}</td>
                ${row.days.map((day) => `<td>${day}</td>`).join("")}
                ${withDetails ? '<td><a href="#student-detail">Подробнее</a></td>' : ""}
              </tr>
            `,
          )
          .join("")}
      </tbody>
    </table>
  `;
}

function renderDisciplineTable(rows: DisciplineRow[], withDetails: boolean): string {
  return `
    <table class="disp">
      <thead>
        <tr>
          <th>Дисциплина</th>
          <th>Посещено</th>
          <th>Всего занятий</th>
          <th>Процент</th>
          <th>Статус</th>
          ${withDetails ? "<th>Подробнее</th>" : ""}
        </tr>
      </thead>
      <tbody>
        ${rows
          .map(
            (row) => `
              <tr>
                <td>${row.discipline}</td>
                <td>${row.visited}</td>
                <td>${row.total}</td>
                <td>${percent(row.visited, row.total)}</td>
                <td>${row.status}</td>
                ${withDetails ? '<td><a href="#discipline-students">Подробнее</a></td>' : ""}
              </tr>
            `,
          )
          .join("")}
      </tbody>
    </table>
  `;
}

function renderDisciplineStudentsTable(rows: DisciplineStudentRow[]): string {
  return `
    <table class="studdisp">
      <thead>
        <tr>
          <th>№</th>
          <th>ФИО</th>
          <th>Посещено</th>
          <th>Всего занятий</th>
          <th>Процент</th>
          <th>Статус</th>
        </tr>
      </thead>
      <tbody>
        ${rows
          .map(
            (row, index) => `
              <tr>
                <td>${index + 1}</td>
                <td>${row.name}</td>
                <td>${row.visited}</td>
                <td>${row.total}</td>
                <td>${percent(row.visited, row.total)}</td>
                <td>${row.status}</td>
              </tr>
            `,
          )
          .join("")}
      </tbody>
    </table>
  `;
}

function renderDisciplineStudentDetailTable(data: AttendanceDashboardData): string {
  return `
    <table class="timeinout">
      <thead>
        <tr>
          <th>№</th>
          <th>ФИО</th>
          ${data.days.map((day) => `<th>${day}</th>`).join("")}
        </tr>
      </thead>
      <tbody>
        ${data.disciplineStudentDetailRows
          .map(
            (row, index) => `
              <tr>
                <td>${index + 1}</td>
                <td>${row.name}</td>
                ${row.days.map((day) => `<td>${day}</td>`).join("")}
              </tr>
            `,
          )
          .join("")}
      </tbody>
    </table>
  `;
}

export function renderDashboardView(route: DashboardRoute, data: AttendanceDashboardData): string {
  const selectedStudent = data.studentRows[0]?.name ?? "";
  const selectedDiscipline = data.disciplineRows[0]?.discipline ?? "";

  if (route === "student-detail") {
    return `
      ${renderDashboardHeader(data, `. ${selectedStudent}`)}
      <main>
        ${renderSummaryCards([
          data.summary[0],
          { title: "Лучшая дисциплина", name: data.studentDetailRows[0]?.discipline, percent: 92, note: "За выбранный промежуток" },
          { title: "Обратить внимание", name: data.studentDetailRows[2]?.discipline, percent: 64, note: "За выбранный промежуток" },
        ])}
        <div class="wrapper">
          <div class="wrapper-title">Посещаемость студента за ${data.period}</div>
          ${renderDisciplineTable(data.studentDetailRows, false)}
        </div>
      </main>
    `;
  }

  if (route === "disciplines") {
    return `
      ${renderDashboardHeader(data, "")}
      <main>
        ${renderSummaryCards([
          data.summary[0],
          { title: "Лучшая дисциплина", name: data.disciplineRows[0]?.discipline, percent: 92, note: "За выбранный промежуток" },
          { title: "Обратить внимание", name: data.disciplineRows[2]?.discipline, percent: 70, note: "За выбранный промежуток" },
        ])}
        <div class="wrapper">
          <div class="wrapper-title">Посещаемость дисциплин за ${data.period}</div>
          ${renderDisciplineTable(data.disciplineRows, true)}
        </div>
      </main>
    `;
  }

  if (route === "discipline-students") {
    return `
      ${renderDashboardHeader(data, `. ${selectedDiscipline}`)}
      <main>
        ${renderSummaryCards(data.summary)}
        <div class="wrapper">
          <div class="top-row table-head-row">
            <div class="wrapper-title">Посещаемость дисциплины</div>
            <a href="#discipline-student-detail" class="wrapper-title">Подробнее</a>
          </div>
          ${renderDisciplineStudentsTable(data.disciplineStudentRows)}
        </div>
      </main>
    `;
  }

  if (route === "discipline-student-detail") {
    return `
      ${renderDashboardHeader(data, `. ${selectedDiscipline}`)}
      <main>
        ${renderSummaryCards(data.summary)}
        <div class="wrapper">
          <div class="wrapper-title">Посещаемость студентов за ${data.period}</div>
          ${renderDisciplineStudentDetailTable(data)}
        </div>
      </main>
    `;
  }

  return `
    ${renderDashboardHeader(data, "")}
    <main>
      ${renderSummaryCards(data.summary)}
      <div class="wrapper">
        <div class="wrapper-title">Посещаемость студентов за ${data.period}</div>
        ${renderStudentAttendanceTable(data, true)}
      </div>
    </main>
  `;
}
