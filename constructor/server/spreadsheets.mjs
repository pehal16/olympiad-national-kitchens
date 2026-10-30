import ExcelJS from "exceljs";
import { fail } from "./util.mjs";
const safe = (v) =>
  /^[=+\-@]/.test(String(v ?? "")) ? `'${v}` : String(v ?? "");
export async function readRows(buffer, filename) {
  fail(buffer.length <= 25 * 1024 * 1024, "Таблица не должна превышать 25 МБ.");
  const book = new ExcelJS.Workbook();
  if (filename.toLowerCase().endsWith(".csv")) {
    const { Readable } = await import("node:stream");
    await book.csv.read(Readable.from(buffer), {
      parserOptions: {
        delimiter: buffer.toString("utf8", 0, 2000).includes(";") ? ";" : ",",
      },
    });
  } else await book.xlsx.load(buffer);
  const sheet = book.worksheets[0];
  fail(
    sheet && sheet.rowCount <= 10001 && sheet.columnCount <= 100,
    "Таблица слишком большая или пуста.",
  );
  const rows = [];
  sheet.eachRow((row) => {
    const cells = [];
    row.eachCell({ includeEmpty: true }, (cell) =>
      cells.push(String(cell.text ?? "")),
    );
    rows.push(cells);
  });
  return { headers: rows[0] || [], rows: rows.slice(1) };
}
export async function exportRows(rows, format = "xlsx") {
  const book = new ExcelJS.Workbook(),
    sheet = book.addWorksheet("Результаты");
  for (const row of rows)
    sheet.addRow(row.map((v) => (typeof v === "number" ? v : safe(v))));
  sheet.views = [{ state: "frozen", ySplit: 1 }];
  sheet.getRow(1).font = { bold: true };
  sheet.columns.forEach((col) => (col.width = 24));
  return Buffer.from(
    format === "csv"
      ? await book.csv.writeBuffer({
          formatterOptions: { delimiter: ";", writeBOM: true },
        })
      : await book.xlsx.writeBuffer(),
  );
}
