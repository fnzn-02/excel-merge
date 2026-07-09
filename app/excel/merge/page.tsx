import ExcelMerger from "@/app/components/ExcelMerger";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "엑셀 병합 - 뚝딱",
  description: "여러 엑셀 파일을 브라우저에서 바로 하나로 합쳐주는 무료 도구",
};

export default function ExcelMergePage() {
  return (
    <div className="flex flex-1 flex-col bg-zinc-50 dark:bg-black">
      <ExcelMerger />
    </div>
  );
}
