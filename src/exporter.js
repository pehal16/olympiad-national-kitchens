const fs = require("fs");
const path = require("path");
const { EXPORTS_DIR } = require("./store");
const { ensureDir } = require("./utils");

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
  ensureDir(EXPORTS_DIR);
  const filePath = path.join(EXPORTS_DIR, fileName);
  fs.writeFileSync(filePath, content, "utf8");
  return filePath;
}

module.exports = {
  createAttemptsCsv,
  saveExportFile
};
