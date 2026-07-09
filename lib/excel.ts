import * as XLSX from "xlsx";

export type Cell = string | number;

export type ParsedFile = {
  name: string;
  headers: string[];
  rows: Cell[][];
  truncated: boolean;
};

export type MergeResult = {
  headers: string[];
  rows: Cell[][];
  duplicatesRemoved: number;
};

const normalizeHeader = (h: string) => h.trim();

const cellToString = (v: unknown): string => {
  if (v === null || v === undefined) return "";
  return String(v);
};

const formatDate = (d: Date): string => {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
};

// 날짜 셀은 읽을 수 있는 날짜 문자열로, 숫자 셀은 실제 숫자 그대로 유지한다.
// (숫자를 문자열로 바꿔버리면 다운로드한 파일에서 SUM/자동합계가 깨짐)
const normalizeCellValue = (v: unknown): Cell => {
  if (v === null || v === undefined) return "";
  if (v instanceof Date) return formatDate(v);
  if (typeof v === "number") return v;
  return String(v);
};

// 같은 파일 안에 동일한 헤더명이 여러 번 나오면 뒤 컬럼이 앞 컬럼 값을 덮어써서
// 데이터가 조용히 사라지는 걸 막기 위해, 두 번째 등장부터 구분자를 붙임.
function dedupeHeaders(headers: string[]): string[] {
  const counts = new Map<string, number>();
  return headers.map((h) => {
    if (!h) return h;
    const count = (counts.get(h) ?? 0) + 1;
    counts.set(h, count);
    return count === 1 ? h : `${h} (${count})`;
  });
}

const hasValidBinarySignature = (bytes: Uint8Array, filename: string): boolean => {
  const lower = filename.toLowerCase();
  if (lower.endsWith(".xlsx")) {
    return bytes[0] === 0x50 && bytes[1] === 0x4b; // ZIP("PK") 시그니처
  }
  if (lower.endsWith(".xls")) {
    return (
      bytes[0] === 0xd0 && bytes[1] === 0xcf && bytes[2] === 0x11 && bytes[3] === 0xe0
    ); // OLE2 시그니처
  }
  return true; // csv는 별도 바이너리 시그니처가 없음
};

export async function parseFile(
  file: File,
  maxRows: number
): Promise<ParsedFile> {
  const buffer = await file.arrayBuffer();
  if (!hasValidBinarySignature(new Uint8Array(buffer), file.name)) {
    throw new Error(`"${file.name}" 파일이 손상되었거나 올바른 엑셀 파일이 아니에요.`);
  }
  // cellDates: true로 읽으면 날짜 서식이 있는 셀만 JS Date로 들어오고,
  // 일반 숫자(통화 포함)는 그대로 숫자로 남아서 SUM이 계속 작동한다.
  const workbook = XLSX.read(buffer, { type: "array", cellDates: true });
  const firstSheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[firstSheetName];
  const raw = XLSX.utils.sheet_to_json<unknown[]>(sheet, {
    header: 1,
    blankrows: false,
  });

  if (raw.length === 0) {
    return { name: file.name, headers: [], rows: [], truncated: false };
  }

  const [headerRow, ...dataRows] = raw;
  const headers = dedupeHeaders(
    headerRow.map((h) => normalizeHeader(cellToString(h)))
  );
  const truncated = dataRows.length > maxRows;
  const limitedRows = dataRows.slice(0, maxRows);
  const rows = limitedRows.map((row) =>
    headers.map((_, i) => normalizeCellValue(row[i]))
  );

  return { name: file.name, headers, rows, truncated };
}

export function mergeParsedFiles(
  files: ParsedFile[],
  dedupe: boolean
): MergeResult {
  const headerOrder: string[] = [];
  const headerIndex = new Map<string, number>();

  for (const f of files) {
    for (const h of f.headers) {
      if (!h) continue;
      if (!headerIndex.has(h)) {
        headerIndex.set(h, headerOrder.length);
        headerOrder.push(h);
      }
    }
  }

  const allRows: Cell[][] = [];
  for (const f of files) {
    const colMap = f.headers.map((h) => headerIndex.get(h));
    for (const row of f.rows) {
      const newRow: Cell[] = new Array(headerOrder.length).fill("");
      row.forEach((cell, i) => {
        const idx = colMap[i];
        if (idx !== undefined) newRow[idx] = cell;
      });
      allRows.push(newRow);
    }
  }

  let finalRows = allRows;
  let duplicatesRemoved = 0;
  if (dedupe) {
    const seen = new Set<string>();
    finalRows = [];
    for (const row of allRows) {
      const key = row.join("");
      if (seen.has(key)) {
        duplicatesRemoved++;
        continue;
      }
      seen.add(key);
      finalRows.push(row);
    }
  }

  return { headers: headerOrder, rows: finalRows, duplicatesRemoved };
}

export function buildXlsxBlob(
  headers: string[],
  rows: Cell[][],
  sheetName = "Sheet1"
): Blob {
  const sheet = XLSX.utils.aoa_to_sheet([headers, ...rows]);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, sheet, sheetName);
  const arrayBuffer = XLSX.write(workbook, {
    type: "array",
    bookType: "xlsx",
  });
  return new Blob([arrayBuffer], {
    type: "application/octet-stream",
  });
}
