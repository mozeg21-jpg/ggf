import Link from "next/link";

export default function NotFound() {
  return (
    <div className="mx-auto flex max-w-lg flex-col items-center px-4 py-24 text-center">
      <div className="grid h-16 w-16 place-items-center rounded-2xl border border-line bg-surface text-3xl">
        🔎
      </div>
      <h1 className="mt-6 text-2xl font-extrabold text-fg">
        الصفحة مش موجودة
      </h1>
      <p className="mt-2 text-muted">
        يمكن المنتج اتشال أو الرابط غلط. ارجع للمتجر وكمّل تسوّق.
      </p>
      <Link
        href="/"
        className="mt-6 rounded-xl bg-brand-gradient px-6 py-3 font-semibold text-white transition-opacity hover:opacity-95"
      >
        الرجوع للرئيسية
      </Link>
    </div>
  );
}
