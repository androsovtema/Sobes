import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-[#f4f6f2] flex items-center justify-center px-4">
      <div className="text-center max-w-md">
        <p className="text-6xl font-bold text-surface mb-4">404</p>
        <h1 className="text-2xl font-bold text-ink mb-2">Страница не найдена</h1>
        <p className="text-subtle mb-8">
          Такой страницы не существует или она была удалена.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link href="/candidate/dashboard">
            <Button variant="outline">Дашборд соискателя</Button>
          </Link>
          <Link href="/employer/dashboard">
            <Button variant="outline">Дашборд работодателя</Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
