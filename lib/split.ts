import JSZip from "jszip";
import { buildXlsxBlob, type Cell } from "./excel";

export type SplitChunk = {
  label: string;
  rows: Cell[][];
};

export const sanitizeLabel = (label: string): string =>
  label.replace(/[\\/:*?"<>|]/g, "").trim() || "분할결과";

export function splitByRowCount(rows: Cell[][], rowsPerFile: number): SplitChunk[] {
  const size = Math.max(1, Math.floor(rowsPerFile));
  const chunks: SplitChunk[] = [];
  for (let i = 0; i < rows.length; i += size) {
    chunks.push({
      label: `분할_${chunks.length + 1}`,
      rows: rows.slice(i, i + size),
    });
  }
  if (chunks.length === 0) {
    chunks.push({ label: "분할_1", rows: [] });
  }
  return chunks;
}

export function splitByColumnValue(rows: Cell[][], columnIndex: number): SplitChunk[] {
  const groups = new Map<string, Cell[][]>();
  for (const row of rows) {
    const value = row[columnIndex];
    // 공백 차이("강남점" vs "강남점 ")로 같은 값이 다른 그룹으로 갈리지 않도록 트리밍한다.
    const trimmed = value === "" || value === undefined || value === null ? "" : String(value).trim();
    const key = trimmed === "" ? "미분류" : trimmed;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(row);
  }

  const entries = Array.from(groups.entries());
  const classified = entries.filter(([label]) => label !== "미분류");
  const unclassified = entries.filter(([label]) => label === "미분류");
  // 가나다/알파벳 순으로 정렬하고, "미분류"는 항상 맨 뒤로 보낸다.
  classified.sort((a, b) => a[0].localeCompare(b[0], "ko"));

  return [...classified, ...unclassified].map(([label, groupRows]) => ({
    label: sanitizeLabel(label),
    rows: groupRows,
  }));
}

export function splitEvenly(rows: Cell[][], numFiles: number): SplitChunk[] {
  const n = Math.max(1, Math.min(Math.floor(numFiles), rows.length || 1));
  const base = Math.floor(rows.length / n);
  let remainder = rows.length % n;
  const chunks: SplitChunk[] = [];
  let idx = 0;
  for (let i = 0; i < n; i++) {
    const size = base + (remainder > 0 ? 1 : 0);
    if (remainder > 0) remainder--;
    chunks.push({
      label: `분할_${i + 1}`,
      rows: rows.slice(idx, idx + size),
    });
    idx += size;
  }
  return chunks;
}

export async function buildDownloadBlob(
  headers: string[],
  chunks: SplitChunk[],
  baseName: string
): Promise<{ blob: Blob; filename: string }> {
  const safeBase = sanitizeLabel(baseName);

  if (chunks.length === 1) {
    return {
      blob: buildXlsxBlob(headers, chunks[0].rows, "Sheet1"),
      filename: `${safeBase}_${sanitizeLabel(chunks[0].label)}.xlsx`,
    };
  }

  const zip = new JSZip();
  const usedNames = new Set<string>();
  for (const chunk of chunks) {
    const name = `${safeBase}_${sanitizeLabel(chunk.label)}`;
    let finalName = name;
    let suffix = 2;
    while (usedNames.has(finalName)) {
      finalName = `${name}_${suffix}`;
      suffix++;
    }
    usedNames.add(finalName);
    const blob = buildXlsxBlob(headers, chunk.rows, "Sheet1");
    const arrayBuffer = await blob.arrayBuffer();
    zip.file(`${finalName}.xlsx`, arrayBuffer);
  }
  const zipBlob = await zip.generateAsync({ type: "blob" });
  return { blob: zipBlob, filename: `${safeBase}_분할결과.zip` };
}
