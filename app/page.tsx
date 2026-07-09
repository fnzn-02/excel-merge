import Link from "next/link";

export default function Home() {
  return (
    <div className="flex flex-1 flex-col bg-zinc-50 dark:bg-black">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-10 px-6 py-20">
        <div className="flex flex-col gap-4 text-center sm:text-left">
          <h1 className="text-3xl font-bold tracking-tight">뚝딱</h1>
          <p className="text-lg text-zinc-600 dark:text-zinc-400">
            반복되는 사무 작업, 서버 업로드 없이 브라우저에서 뚝딱 끝내세요.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Link
            href="/excel/merge"
            className="group flex flex-col gap-2 rounded-2xl border border-zinc-200 p-6 transition-colors hover:border-zinc-400 dark:border-zinc-800 dark:hover:border-zinc-600"
          >
            <span className="text-sm font-medium text-emerald-600 dark:text-emerald-400">
              엑셀
            </span>
            <span className="text-lg font-semibold">엑셀 병합</span>
            <span className="text-sm text-zinc-500">
              여러 엑셀 파일을 자동으로 하나로 합쳐요
            </span>
            <span className="mt-2 text-sm font-medium text-zinc-900 group-hover:underline dark:text-zinc-100">
              시작하기 →
            </span>
          </Link>

          <Link
            href="/excel/split"
            className="group flex flex-col gap-2 rounded-2xl border border-zinc-200 p-6 transition-colors hover:border-zinc-400 dark:border-zinc-800 dark:hover:border-zinc-600"
          >
            <span className="text-sm font-medium text-emerald-600 dark:text-emerald-400">
              엑셀
            </span>
            <span className="text-lg font-semibold">엑셀 분할</span>
            <span className="text-sm text-zinc-500">
              하나의 엑셀 파일을 기준에 따라 여러 파일로 나눠요
            </span>
            <span className="mt-2 text-sm font-medium text-zinc-900 group-hover:underline dark:text-zinc-100">
              시작하기 →
            </span>
          </Link>

          <Link
            href="/excel/clean"
            className="group flex flex-col gap-2 rounded-2xl border border-zinc-200 p-6 transition-colors hover:border-zinc-400 dark:border-zinc-800 dark:hover:border-zinc-600"
          >
            <span className="text-sm font-medium text-emerald-600 dark:text-emerald-400">
              엑셀
            </span>
            <span className="text-lg font-semibold">엑셀 데이터 클리너</span>
            <span className="text-sm text-zinc-500">
              중복행, 빈 행/컬럼, 앞뒤 공백을 자동으로 정리해요
            </span>
            <span className="mt-2 text-sm font-medium text-zinc-900 group-hover:underline dark:text-zinc-100">
              시작하기 →
            </span>
          </Link>
        </div>
      </div>
    </div>
  );
}
