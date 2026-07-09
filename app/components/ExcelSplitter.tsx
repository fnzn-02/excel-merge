"use client";

import { Fragment, useMemo, useRef, useState } from "react";
import { track } from "@vercel/analytics";
import { parseFile, type ParsedFile } from "@/lib/excel";
import {
  splitByRowCount,
  splitByColumnValue,
  splitEvenly,
  buildDownloadBlob,
  sanitizeLabel,
  type SplitChunk,
} from "@/lib/split";

const MAX_FREE_ROWS_PER_FILE = 10000;
const ACCEPTED_EXTENSIONS = [".xlsx", ".xls", ".csv"];
const UNIQUE_VALUE_WARNING_THRESHOLD = 50;

type Mode = "rowCount" | "columnValue" | "evenSplit";

export default function ExcelSplitter() {
  const [file, setFile] = useState<ParsedFile | null>(null);
  const [mode, setMode] = useState<Mode>("rowCount");
  const [rowCountInput, setRowCountInput] = useState(500);
  const [columnIndex, setColumnIndex] = useState(0);
  const [evenSplitInput, setEvenSplitInput] = useState(2);
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const chunks: SplitChunk[] = useMemo(() => {
    if (!file || file.rows.length === 0) return [];
    if (mode === "rowCount") return splitByRowCount(file.rows, rowCountInput);
    if (mode === "columnValue") return splitByColumnValue(file.rows, columnIndex);
    return splitEvenly(file.rows, evenSplitInput);
  }, [file, mode, rowCountInput, columnIndex, evenSplitInput]);

  const baseName = file ? sanitizeLabel(file.name.replace(/\.[^./\\]+$/, "")) : "";

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
      setColumnIndex(0);
      setExpandedIndex(null);
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

  const handleDownload = async () => {
    if (!file || chunks.length === 0) return;
    const { blob, filename } = await buildDownloadBlob(file.headers, chunks, baseName);
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
    track("분할 다운로드 완료", {
      모드: mode,
      분할파일수: chunks.length,
    });
  };

  const reset = () => {
    setFile(null);
    setError(null);
    setExpandedIndex(null);
  };

  const changeMode = (m: Mode) => {
    setMode(m);
    setExpandedIndex(null);
  };

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-8 px-6 py-16">
      <header className="flex flex-col gap-3 text-center sm:text-left">
        <h1 className="text-2xl font-semibold tracking-tight">엑셀 분할</h1>
        <p className="text-zinc-600 dark:text-zinc-400">
          하나의 엑셀 파일을 기준에 따라 여러 파일로 나눠드려요.
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

      {file && (
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

          <div className="flex flex-col gap-4">
            <div className="flex flex-wrap gap-2">
              {(
                [
                  { key: "rowCount", label: "행 개수 기준" },
                  { key: "columnValue", label: "컬럼 값 기준" },
                  { key: "evenSplit", label: "균등 분할" },
                ] as { key: Mode; label: string }[]
              ).map((m) => (
                <button
                  key={m.key}
                  onClick={() => changeMode(m.key)}
                  className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
                    mode === m.key
                      ? "bg-zinc-900 text-white dark:bg-white dark:text-zinc-900"
                      : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-700"
                  }`}
                >
                  {m.label}
                </button>
              ))}
            </div>

            {mode === "rowCount" && (
              <label className="flex items-center gap-2 text-sm">
                한 파일당
                <input
                  type="number"
                  min={1}
                  value={rowCountInput}
                  onChange={(e) => {
                    setRowCountInput(Number(e.target.value) || 1);
                    setExpandedIndex(null);
                  }}
                  className="w-24 rounded-lg border border-zinc-300 px-3 py-1.5 dark:border-zinc-700 dark:bg-zinc-900"
                />
                행씩
              </label>
            )}

            {mode === "columnValue" && (
              <label className="flex items-center gap-2 text-sm">
                기준 컬럼
                <select
                  value={columnIndex}
                  onChange={(e) => {
                    setColumnIndex(Number(e.target.value));
                    setExpandedIndex(null);
                  }}
                  className="rounded-lg border border-zinc-300 px-3 py-1.5 dark:border-zinc-700 dark:bg-zinc-900"
                >
                  {file.headers.map((h, i) => (
                    <option key={i} value={i}>
                      {h || `(열 ${i + 1})`}
                    </option>
                  ))}
                </select>
              </label>
            )}

            {mode === "evenSplit" && (
              <label className="flex items-center gap-2 text-sm">
                총
                <input
                  type="number"
                  min={1}
                  value={evenSplitInput}
                  onChange={(e) => {
                    setEvenSplitInput(Number(e.target.value) || 1);
                    setExpandedIndex(null);
                  }}
                  className="w-24 rounded-lg border border-zinc-300 px-3 py-1.5 dark:border-zinc-700 dark:bg-zinc-900"
                />
                개 파일로 균등하게
              </label>
            )}
          </div>

          {mode === "columnValue" && chunks.length > UNIQUE_VALUE_WARNING_THRESHOLD && (
            <p className="text-sm text-amber-600 dark:text-amber-400">
              분할 결과가 {chunks.length}개예요. 파일이 너무 많이 생길 수 있어요, 계속
              진행하시려면 그대로 다운로드하시면 돼요.
            </p>
          )}

          {chunks.length > 0 && (
            <div className="flex flex-col gap-4">
              <p className="text-sm text-zinc-500">
                총 {chunks.length}개 파일로 분할됩니다
              </p>
              <div className="max-h-96 overflow-y-auto rounded-lg border border-zinc-200 dark:border-zinc-800">
                <table className="w-full text-left text-sm">
                  <thead className="bg-zinc-50 dark:bg-zinc-900">
                    <tr>
                      <th className="px-3 py-2 font-medium">파일명</th>
                      <th className="px-3 py-2 font-medium">행 수</th>
                      <th className="px-3 py-2 font-medium"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {chunks.map((c, i) => (
                      <Fragment key={i}>
                        <tr className="border-t border-zinc-100 dark:border-zinc-800">
                          <td className="px-3 py-2">
                            {baseName}_{c.label}.xlsx
                          </td>
                          <td className="px-3 py-2">{c.rows.length}행</td>
                          <td className="px-3 py-2 text-right">
                            <button
                              onClick={() =>
                                setExpandedIndex(expandedIndex === i ? null : i)
                              }
                              className="text-xs text-zinc-500 underline hover:text-zinc-900 dark:hover:text-zinc-100"
                            >
                              {expandedIndex === i ? "닫기" : "미리보기"}
                            </button>
                          </td>
                        </tr>
                        {expandedIndex === i && (
                          <tr className="border-t border-zinc-100 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900/50">
                            <td colSpan={3} className="px-3 py-3">
                              <div className="overflow-x-auto rounded border border-zinc-200 dark:border-zinc-800">
                                <table className="w-full text-left text-xs">
                                  <thead>
                                    <tr>
                                      {file.headers.map((h, hi) => (
                                        <th
                                          key={hi}
                                          className="whitespace-nowrap px-2 py-1 font-medium text-zinc-500"
                                        >
                                          {h || `(열 ${hi + 1})`}
                                        </th>
                                      ))}
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {c.rows.slice(0, 3).map((row, ri) => (
                                      <tr
                                        key={ri}
                                        className="border-t border-zinc-100 dark:border-zinc-800"
                                      >
                                        {row.map((cell, ci) => (
                                          <td
                                            key={ci}
                                            className="whitespace-nowrap px-2 py-1"
                                          >
                                            {cell}
                                          </td>
                                        ))}
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                              {c.rows.length > 3 && (
                                <p className="mt-1 text-xs text-zinc-400">
                                  상위 3행만 표시돼요.
                                </p>
                              )}
                            </td>
                          </tr>
                        )}
                      </Fragment>
                    ))}
                  </tbody>
                </table>
              </div>
              <button
                onClick={handleDownload}
                className="w-fit rounded-full bg-zinc-900 px-5 py-2 text-sm font-medium text-white hover:bg-zinc-700 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-200"
              >
                {chunks.length > 1 ? "ZIP으로 다운로드" : "다운로드"}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
