import { renderAppHeader } from "./components/header";

export type GroupItem = {
  id: string;
  modal: string;
};

/* const defaultGroups: GroupItem[] = [
  "20100",
  "20101",
  "20102",
  "20103",
  "20104",
  "20105",
  "20106",
  "20107",
  "20108",
  "20109",
  "20110",
  "20111",
  "20112",
  "20113",
  "20114",
  "20115",
  "20116",
  "20117",
  "20118",
  "20119",
].map((id) => ({ id, modal: "view-mode" })); */

export function renderGroupsPage(groups: GroupItem[]): string {
  return `
    ${renderAppHeader({
      title: "Список групп",
      actions: [{ label: "Выйти", route: "home" }],
    })}
    <main>
      <div class="wrapper">
        <div class="wrapper-title">Факультет цифровых и промышленных технологий</div>
        <div class="list">
          ${groups
            .map(
              (group) => `
                <button class="btn-group" data-group="${group.id}" data-modal="${group.modal ?? "view-mode"}">
                  <span>${group.id}</span>
                </button>
              `,
            )
            .join("")}
        </div>
      </div>
    </main>
  `;
}
