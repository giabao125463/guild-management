export function normalizeClipboardText(input: string): string {
  return input.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
}

const NAME_HEADERS = new Set(["name", "currentname", "ten", "tên", "tên thành viên"]);

function splitTabRow(line: string): string[] {
  const columns = line.split("\t").map((value) => value.trim());
  while (columns.length > 0 && columns[columns.length - 1] === "") {
    columns.pop();
  }
  return columns;
}

function isNameHeader(value: string): boolean {
  return NAME_HEADERS.has(
    value
      .trim()
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/\s+/g, ""),
  );
}

export function parseClipboardNames(input: string): string[] {
  if (!input?.trim()) return [];

  const lines = normalizeClipboardText(input)
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  if (lines.length === 0) return [];

  const hasTabs = lines.some((line) => line.includes("\t"));
  if (!hasTabs) {
    return [...new Set(lines.map((line) => line.trim()).filter(Boolean))];
  }

  const firstColumns = splitTabRow(lines[0] ?? "");
  const nameColumnIndex = firstColumns.findIndex((column) => isNameHeader(column));
  const startIndex = nameColumnIndex >= 0 ? 1 : 0;
  const resolvedNameIndex =
    nameColumnIndex >= 0 ? nameColumnIndex : firstColumns.length >= 2 ? 1 : 0;

  const names: string[] = [];
  for (let index = startIndex; index < lines.length; index += 1) {
    const columns = splitTabRow(lines[index] ?? "");
    if (columns.every((column) => !column.trim())) continue;

    const name = columns[resolvedNameIndex]?.trim() ?? "";
    if (!name || isNameHeader(name)) continue;
    names.push(name);
  }

  return [...new Set(names)];
}

export function isPasteableNameData(text: string): boolean {
  return parseClipboardNames(text).length > 0;
}
