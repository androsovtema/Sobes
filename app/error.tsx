"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[GlobalError]", error);
  }, [error]);

  return (
    <div className="min-h-screen bg-zinc-50 flex items-center justify-center px-4">
      <div className="text-center max-w-md">
        <p className="text-5xl mb-4">⚠️</p>
        <h1 className="text-2xl font-bold text-zinc-900 mb-2">Что-то пошло не так</h1>
        <p className="text-zinc-500 mb-8">
          Произошла непредвиденная ошибка. Попробуйте обновить страницу.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Button onClick={reset}>Попробовать снова</Button>
          <Button variant="outline" onClick={() => (window.location.href = "/")}>
            На главную
          </Button>
        </div>
        {error.digest && (
          <p className="text-xs text-zinc-400 mt-6">ID ошибки: {error.digest}</p>
        )}
      </div>
    </div>
  );
}
