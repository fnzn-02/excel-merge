import ExcelSplitter from "@/app/components/ExcelSplitter";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "엑셀 분할 - 뚝딱",
  description: "하나의 엑셀 파일을 행 개수, 컬럼 값, 균등 분할 기준으로 나눠주는 무료 도구",
};

export default function ExcelSplitPage() {
  return (
    <div className="flex flex-1 flex-col bg-zinc-50 dark:bg-black">
      <ExcelSplitter />
    </div>
  );
}
