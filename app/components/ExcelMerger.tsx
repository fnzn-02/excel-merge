"use client";

import { useMemo, useRef, useState } from "react";
import { track } from "@vercel/analytics";
import {
  buildXlsxBlob,
  mergeParsedFiles,
  parseFile,
  type ParsedFile,
} from "@/lib/excel";

const MAX_FREE_ROWS_PER_FILE = 10000;
const ACCEPTED_EXTENSIONS = [".xlsx", ".xls", ".csv"];
const PREVIEW_ROW_LIMIT = 50;

export default function ExcelMerger() {
  const [files, setFiles] = useState<ParsedFile[]>([]);
  const [dedupe, setDedupe] = useState(true);
  const [removeEmptyColumns, setRemoveEmptyColumns] = useState(true);
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [outputFilename, setOutputFilename] = useState("병합결과");
  const inputRef = useRef<HTMLInputElement>(null);

  const rawMergeResult = useMemo(() => {
    if (files.length === 0) return null;
    return mergeParsedFiles(files, dedupe);
  }, [files, dedupe]);

  const emptyColumnNames = useMemo(() => {
    if (!rawMergeResult || rawMergeResult.rows.length === 0) return [];
    // 숫자 0은 falsy지만 "빈 값"이 아니므로, 빈 문자열인지만 정확히 검사한다.
    return rawMergeResult.headers.filter((_, i) =>
      rawMergeResult.rows.every((row) => row[i] === "")
    );
  }, [rawMergeResult]);

  const mergeResult = useMemo(() => {
    if (!rawMergeResult) return null;
    if (!removeEmptyColumns || emptyColumnNames.length === 0) return rawMergeResult;
    const keepIndices = rawMergeResult.headers
      .map((_, i) => i)
      .filter((i) => !emptyColumnNames.includes(rawMergeResult.headers[i]));
    return {
      ...rawMergeResult,
      headers: keepIndices.map((i) => rawMergeResult.headers[i]),
      rows: rawMergeResult.rows.map((row) => keepIndices.map((i) => row[i])),
    };
  }, [rawMergeResult, removeEmptyColumns, emptyColumnNames]);

  const handleFileList = async (fileList: FileList) => {
    setError(null);
    const incoming = Array.from(fileList);

    const invalid = incoming.find(
      (f) => !ACCEPTED_EXTENSIONS.some((ext) => f.name.toLowerCase().endsWith(ext))
    );
    if (invalid) {
      setError(`"${invalid.name}"은 지원하지 않는 형식이에요. (.xlsx, .xls, .csv만 가능)`);
      return;
    }

    setIsProcessing(true);
    try {
      const parsed = await Promise.all(
        incoming.map((f) => parseFile(f, MAX_FREE_ROWS_PER_FILE))
      );
      setFiles((prev) => [...prev, ...parsed]);
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

  const removeFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleDownload = () => {
    if (!mergeResult) return;
    const blob = buildXlsxBlob(mergeResult.headers, mergeResult.rows);
    const url = URL.createObjectURL(blob);
    const safeName = outputFilename.trim().replace(/[\\/:*?"<>|]/g, "") || "병합결과";
    const a = document.createElement("a");
    a.href = url;
    a.download = `${safeName}.xlsx`;
    a.click();
    URL.revokeObjectURL(url);
    track("다운로드 완료", {
      파일수: files.length,
      행수: mergeResult.rows.length,
    });
  };

  return (
    <div className="w-full max-w-3xl mx-auto px-6 py-16 flex flex-col gap-8">
      <header className="flex flex-col gap-3 text-center sm:text-left">
        <h1 className="text-2xl font-semibold tracking-tight">엑셀 병합기</h1>
        <p className="text-zinc-600 dark:text-zinc-400">
          여러 엑셀 파일을 업로드하면 자동으로 하나로 합쳐드려요.
        </p>
        <p className="inline-flex w-fit items-center gap-1.5 self-center whitespace-nowrap rounded-full bg-emerald-50 px-3 py-1 text-sm font-medium text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300 sm:self-start">
          🔒 서버 전송 없이 브라우저에서만 처리
        </p>
      </header>

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
          multiple
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
          .xlsx, .xls, .csv · 파일 개수 무제한 · 파일당{" "}
          {MAX_FREE_ROWS_PER_FILE.toLocaleString()}행까지
        </p>
      </div>

      {isProcessing && (
        <p className="text-sm text-zinc-500">파일 읽는 중...</p>
      )}

      {error && (
        <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">
          {error}
        </div>
      )}

      {files.length > 0 && (
        <div className="flex flex-col gap-2">
          <h2 className="text-sm font-medium text-zinc-500">
            업로드된 파일 ({files.length}개)
          </h2>
          <ul className="flex flex-col gap-2">
            {files.map((f, i) => (
              <li
                key={`${f.name}-${i}`}
                className="flex items-center justify-between rounded-lg border border-zinc-200 px-4 py-2 text-sm dark:border-zinc-800"
              >
                <span className="truncate">{f.name}</span>
                <span className="flex items-center gap-3 text-zinc-500">
                  <span>
                    {f.rows.length}행 · {f.headers.length}열
                    {f.truncated && (
                      <span className="ml-1 text-amber-600 dark:text-amber-400">
                        ({MAX_FREE_ROWS_PER_FILE.toLocaleString()}행 초과분 잘림)
                      </span>
                    )}
                  </span>
                  <button
                    onClick={() => removeFile(i)}
                    className="text-zinc-400 hover:text-red-600"
                    aria-label="파일 제거"
                  >
                    삭제
                  </button>
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {mergeResult && (
        <div className="flex flex-col gap-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
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
                  checked={removeEmptyColumns}
                  onChange={(e) => setRemoveEmptyColumns(e.target.checked)}
                  disabled={emptyColumnNames.length === 0}
                />
                완전히 빈 컬럼 제거
              </label>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex items-center overflow-hidden rounded-full border border-zinc-300 dark:border-zinc-700">
                <input
                  type="text"
                  value={outputFilename}
                  onChange={(e) => setOutputFilename(e.target.value)}
                  placeholder="병합결과"
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

          <p className="text-sm text-zinc-500">
            총 {mergeResult.rows.length}행 · {mergeResult.headers.length}열
            {dedupe && mergeResult.duplicatesRemoved > 0 && (
              <> · 중복 {mergeResult.duplicatesRemoved}행 제거됨</>
            )}
          </p>

          {emptyColumnNames.length > 0 && (
            <p className="text-xs text-amber-600 dark:text-amber-400">
              빈 컬럼 감지됨: {emptyColumnNames.join(", ")}
              {removeEmptyColumns ? " (제거됨)" : " — 체크하면 제거돼요"}
            </p>
          )}

          <div className="overflow-x-auto rounded-lg border border-zinc-200 dark:border-zinc-800">
            <table className="w-full text-left text-sm">
              <thead className="bg-zinc-50 dark:bg-zinc-900">
                <tr>
                  {mergeResult.headers.map((h, i) => (
                    <th key={i} className="whitespace-nowrap px-3 py-2 font-medium">
                      {h || `(열 ${i + 1})`}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {mergeResult.rows.slice(0, PREVIEW_ROW_LIMIT).map((row, ri) => (
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
          {mergeResult.rows.length > PREVIEW_ROW_LIMIT && (
            <p className="text-xs text-zinc-400">
              미리보기는 상위 {PREVIEW_ROW_LIMIT}행만 표시돼요. 전체 결과는 다운로드해서
              확인하세요.
            </p>
          )}
        </div>
      )}

      <footer className="mt-8 flex justify-center sm:justify-start">
        <a
          href="https://forms.gle/ncQJpfoJxKpTMuP9A"
          target="_blank"
          rel="noopener noreferrer"
          className="text-sm text-zinc-500 underline decoration-zinc-300 underline-offset-4 hover:text-zinc-700 dark:decoration-zinc-700 dark:hover:text-zinc-300"
        >
          피드백 / 버그 제보하기
        </a>
      </footer>
    </div>
  );
}
