const { ensureDir } = require("./utils");

let fsModule = null;
let pathModule = null;

function getFs() {
  if (!fsModule) {
    fsModule = require("fs");
  }
  return fsModule;
}

function getPath() {
  if (!pathModule) {
    pathModule = require("path");
  }
  return pathModule;
}

function csvEscape(value) {
  const text = String(value ?? "");
  const escaped = text.replace(/"/g, "\"\"");
  return `"${escaped}"`;
}

function createAttemptsCsv(rows) {
  const headers = [
    "ФИО",
    "Учреждение",
    "Группа",
    "Наставник",
    "Статус",
    "Начало",
    "Завершение",
    "Тур 1",
    "Тур 2",
    "Тур 3",
    "Тур 4",
    "Тур 5",
    "Итоговый балл",
    "Время (мс)",
    "Награда"
  ];

  const lines = [headers.map(csvEscape).join(";")];
  rows.forEach((row) => {
    lines.push(
      [
        row.fullName,
        row.institution,
        row.groupName,
        row.mentorName,
        row.status,
        row.startedAt,
        row.finishedAt,
        row.tour1,
        row.tour2,
        row.tour3,
        row.tour4,
        row.tour5,
        row.totalFinalScore,
        row.totalDurationMs,
        row.diploma
      ]
        .map(csvEscape)
        .join(";")
    );
  });

  return lines.join("\n");
}

function saveExportFile(fileName, content) {
  const { EXPORTS_DIR } = require("./store");
  ensureDir(EXPORTS_DIR);
  const filePath = getPath().join(EXPORTS_DIR, fileName);
  getFs().writeFileSync(filePath, content, "utf8");
  return filePath;
}

module.exports = {
  createAttemptsCsv,
  saveExportFile
};
