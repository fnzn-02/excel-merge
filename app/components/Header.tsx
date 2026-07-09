import Link from "next/link";

export default function Header() {
  return (
    <header className="border-b border-zinc-200 bg-white dark:border-zinc-800 dark:bg-black">
      <div className="flex items-center px-6 py-4 sm:px-10">
        <div className="flex flex-1 items-center">
          <Link href="/" className="flex items-center gap-2 text-lg font-bold">
            <img src="/icon.svg" alt="" width={24} height={24} />
            뚝딱
          </Link>
        </div>

        <nav className="flex items-center gap-6 text-sm text-zinc-600 dark:text-zinc-400">
          <div className="group relative">
            <button className="flex items-center gap-1 py-2">
              엑셀
              <svg
                width="10"
                height="10"
                viewBox="0 0 10 10"
                className="mt-px"
                aria-hidden="true"
              >
                <path d="M1 3l4 4 4-4" stroke="currentColor" strokeWidth="1.5" fill="none" />
              </svg>
            </button>
            <div className="invisible absolute left-1/2 top-full z-10 w-36 -translate-x-1/2 rounded-lg border border-zinc-200 bg-white py-1.5 opacity-0 shadow-lg transition-opacity group-hover:visible group-hover:opacity-100 dark:border-zinc-800 dark:bg-zinc-900">
              <Link
                href="/excel/merge"
                className="block px-4 py-2 hover:bg-zinc-50 dark:hover:bg-zinc-800"
              >
                엑셀 병합
              </Link>
              <Link
                href="/excel/split"
                className="block px-4 py-2 hover:bg-zinc-50 dark:hover:bg-zinc-800"
              >
                엑셀 분할
              </Link>
              <Link
                href="/excel/clean"
                className="block px-4 py-2 hover:bg-zinc-50 dark:hover:bg-zinc-800"
              >
                엑셀 데이터 클리너
              </Link>
            </div>
          </div>
        </nav>

        <div className="flex flex-1 items-center justify-end">
          <a
            href="https://forms.gle/ncQJpfoJxKpTMuP9A"
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm font-medium text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
          >
            피드백
          </a>
        </div>
      </div>
    </header>
  );
}
