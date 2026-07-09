import ExcelCleaner from "@/app/components/ExcelCleaner";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "엑셀 데이터 클리너 - 뚝딱",
  description: "중복행, 빈 행/컬럼, 앞뒤 공백을 자동으로 정리해주는 무료 엑셀 도구",
};

export default function ExcelCleanPage() {
  return (
    <div className="flex flex-1 flex-col bg-zinc-50 dark:bg-black">
      <ExcelCleaner />
    </div>
  );
}
