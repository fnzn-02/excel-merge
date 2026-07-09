"use client";

import { useMemo, useRef, useState } from "react";
import { track } from "@vercel/analytics";
import { buildXlsxBlob, parseFile, type ParsedFile } from "@/lib/excel";
import {
  trimCells,
  removeEmptyRows,
  findEmptyColumns,
  findAllZeroColumns,
  removeColumns,
  dedupeRows,
} from "@/lib/clean";

const MAX_FREE_ROWS_PER_FILE = 10000;
const ACCEPTED_EXTENSIONS = [".xlsx", ".xls", ".csv"];
const PREVIEW_ROW_LIMIT = 50;

export default function ExcelCleaner() {
  const [file, setFile] = useState<ParsedFile | null>(null);
  const [trimWhitespace, setTrimWhitespace] = useState(true);
  const [removeEmptyRowsOn, setRemoveEmptyRowsOn] = useState(true);
  const [removeEmptyColumnsOn, setRemoveEmptyColumnsOn] = useState(true);
  const [removeZeroColumnsOn, setRemoveZeroColumnsOn] = useState(false);
  const [dedupe, setDedupe] = useState(true);
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [outputFilename, setOutputFilename] = useState("정리결과");
  const inputRef = useRef<HTMLInputElement>(null);

  const cleaned = useMemo(() => {
    if (!file) return null;

    let rows = file.rows;
    let headers = file.headers;

    if (trimWhitespace) rows = trimCells(rows);
    if (removeEmptyRowsOn) rows = removeEmptyRows(rows);

    const emptyColumnNames = removeEmptyColumnsOn ? findEmptyColumns(headers, rows) : [];
    if (emptyColumnNames.length > 0) {
      const result = removeColumns(headers, rows, emptyColumnNames);
      headers = result.headers;
      rows = result.rows;
    }

    const zeroColumnNames = removeZeroColumnsOn ? findAllZeroColumns(headers, rows) : [];
    if (zeroColumnNames.length > 0) {
      const result = removeColumns(headers, rows, zeroColumnNames);
      headers = result.headers;
      rows = result.rows;
    }

    let duplicatesRemoved = 0;
    if (dedupe) {
      const result = dedupeRows(rows);
      rows = result.rows;
      duplicatesRemoved = result.duplicatesRemoved;
    }

    return { headers, rows, duplicatesRemoved, emptyColumnNames, zeroColumnNames };
  }, [
    file,
    trimWhitespace,
    removeEmptyRowsOn,
    removeEmptyColumnsOn,
    removeZeroColumnsOn,
    dedupe,
  ]);

  const handleFileList = async (fileList: FileList) => {
    setError(null);
    const incoming = fileList[0];
    if (!incoming) return;

    if (!ACCEPTED_EXTENSIONS.some((ext) => incoming.name.toLowerCase().endsWith(ext))) {
      setError(`"${incoming.name}"은 지원하지 않는 형식이에요. (.xlsx, .xls, .csv만 가능)`);
      return;
    }

    setIsProcessing(true);
    try {
      const parsed = await parseFile(incoming, MAX_FREE_ROWS_PER_FILE);
      setFile(parsed);
    } catch (e) {
      const message =
        e instanceof Error
          ? e.message
          : "파일을 읽는 중 오류가 발생했어요. 파일이 손상되지 않았는지 확인해주세요.";
      setError(message);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDownload = () => {
    if (!cleaned) return;
    const blob = buildXlsxBlob(cleaned.headers, cleaned.rows, "Sheet1");
    const url = URL.createObjectURL(blob);
    const safeName = outputFilename.trim().replace(/[\\/:*?"<>|]/g, "") || "정리결과";
    const a = document.createElement("a");
    a.href = url;
    a.download = `${safeName}.xlsx`;
    a.click();
    URL.revokeObjectURL(url);
    track("클리너 다운로드 완료", {
      원본행수: file?.rows.length ?? 0,
      결과행수: cleaned.rows.length,
    });
  };

  const reset = () => {
    setFile(null);
    setError(null);
  };

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-8 px-6 py-16">
      <header className="flex flex-col gap-3 text-center sm:text-left">
        <h1 className="text-2xl font-semibold tracking-tight">엑셀 데이터 클리너</h1>
        <p className="text-zinc-600 dark:text-zinc-400">
          하나의 엑셀 파일에 쌓인 중복/빈 값/공백을 자동으로 정리해드려요.
        </p>
        <p className="inline-flex w-fit items-center gap-1.5 self-center whitespace-nowrap rounded-full bg-emerald-50 px-3 py-1 text-sm font-medium text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300 sm:self-start">
          🔒 서버 전송 없이 브라우저에서만 처리
        </p>
      </header>

      {!file && (
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setIsDragging(true);
          }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={(e) => {
            e.preventDefault();
            setIsDragging(false);
            if (e.dataTransfer.files.length > 0) {
              void handleFileList(e.dataTransfer.files);
            }
          }}
          onClick={() => inputRef.current?.click()}
          className={`cursor-pointer rounded-2xl border-2 border-dashed p-10 text-center transition-colors ${
            isDragging
              ? "border-zinc-900 bg-zinc-50 dark:border-zinc-100 dark:bg-zinc-900"
              : "border-zinc-300 dark:border-zinc-700"
          }`}
        >
          <input
            ref={inputRef}
            type="file"
            accept={ACCEPTED_EXTENSIONS.join(",")}
            className="hidden"
            onChange={(e) => {
              if (e.target.files && e.target.files.length > 0) {
                void handleFileList(e.target.files);
              }
              e.target.value = "";
            }}
          />
          <p className="font-medium">
            여기로 파일을 끌어다 놓거나 클릭해서 업로드하세요
          </p>
          <p className="mt-1 text-sm text-zinc-500">
            .xlsx, .xls, .csv · 파일 1개 · 최대 {MAX_FREE_ROWS_PER_FILE.toLocaleString()}행
          </p>
        </div>
      )}

      {isProcessing && <p className="text-sm text-zinc-500">파일 읽는 중...</p>}

      {error && (
        <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">
          {error}
        </div>
      )}

      {file && cleaned && (
        <div className="flex flex-col gap-6">
          <div className="flex items-center justify-between rounded-lg border border-zinc-200 px-4 py-2 text-sm dark:border-zinc-800">
            <span className="truncate">{file.name}</span>
            <span className="flex items-center gap-3 text-zinc-500">
              <span>
                {file.rows.length}행 · {file.headers.length}열
              </span>
              <button
                onClick={reset}
                className="text-zinc-400 hover:text-red-600"
                aria-label="파일 제거"
              >
                삭제
              </button>
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={trimWhitespace}
                onChange={(e) => setTrimWhitespace(e.target.checked)}
              />
              셀 앞뒤 공백 제거
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={removeEmptyRowsOn}
                onChange={(e) => setRemoveEmptyRowsOn(e.target.checked)}
              />
              완전히 빈 행 제거
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={removeEmptyColumnsOn}
                onChange={(e) => setRemoveEmptyColumnsOn(e.target.checked)}
              />
              완전히 빈 컬럼 제거
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={dedupe}
                onChange={(e) => setDedupe(e.target.checked)}
              />
              완전히 동일한 행 중복 제거
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={removeZeroColumnsOn}
                onChange={(e) => setRemoveZeroColumnsOn(e.target.checked)}
              />
              값이 전부 0인 컬럼도 제거
            </label>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-zinc-500">
              총 {cleaned.rows.length}행 · {cleaned.headers.length}열
              {dedupe && cleaned.duplicatesRemoved > 0 && (
                <> · 중복 {cleaned.duplicatesRemoved}행 제거됨</>
              )}
              {removeEmptyColumnsOn && cleaned.emptyColumnNames.length > 0 && (
                <> · 빈 컬럼 {cleaned.emptyColumnNames.length}개 제거됨</>
              )}
              {removeZeroColumnsOn && cleaned.zeroColumnNames.length > 0 && (
                <> · 0값 컬럼 {cleaned.zeroColumnNames.length}개 제거됨</>
              )}
            </p>
            <div className="flex items-center gap-2">
              <div className="flex items-center overflow-hidden rounded-full border border-zinc-300 dark:border-zinc-700">
                <input
                  type="text"
                  value={outputFilename}
                  onChange={(e) => setOutputFilename(e.target.value)}
                  placeholder="정리결과"
                  aria-label="다운로드 파일명"
                  className="w-32 bg-transparent px-4 py-2 text-sm outline-none sm:w-40"
                />
                <span className="pr-3 text-sm text-zinc-400">.xlsx</span>
              </div>
              <button
                onClick={handleDownload}
                className="rounded-full bg-zinc-900 px-5 py-2 text-sm font-medium text-white hover:bg-zinc-700 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-200"
              >
                다운로드
              </button>
            </div>
          </div>

          <div className="overflow-x-auto rounded-lg border border-zinc-200 dark:border-zinc-800">
            <table className="w-full text-left text-sm">
              <thead className="bg-zinc-50 dark:bg-zinc-900">
                <tr>
                  {cleaned.headers.map((h, i) => (
                    <th key={i} className="whitespace-nowrap px-3 py-2 font-medium">
                      {h || `(열 ${i + 1})`}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {cleaned.rows.slice(0, PREVIEW_ROW_LIMIT).map((row, ri) => (
                  <tr key={ri} className="border-t border-zinc-100 dark:border-zinc-800">
                    {row.map((cell, ci) => (
                      <td key={ci} className="whitespace-nowrap px-3 py-2">
                        {cell}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {cleaned.rows.length > PREVIEW_ROW_LIMIT && (
            <p className="text-xs text-zinc-400">
              미리보기는 상위 {PREVIEW_ROW_LIMIT}행만 표시돼요. 전체 결과는 다운로드해서
              확인하세요.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
