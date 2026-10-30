import fs from "node:fs";
import { restoreInstallation } from "../server/backup.mjs";
const [file, target] = process.argv.slice(2);
if (!file || !target || !process.env.CONSTRUCTOR_BACKUP_PASSWORD) {
  console.error(
    "Укажите файл .olybackup, новую пустую папку и пароль в переменной CONSTRUCTOR_BACKUP_PASSWORD.",
  );
  process.exit(1);
}
console.log(
  JSON.stringify(
    restoreInstallation(
      fs.readFileSync(file),
      process.env.CONSTRUCTOR_BACKUP_PASSWORD,
      target,
    ),
  ),
);
