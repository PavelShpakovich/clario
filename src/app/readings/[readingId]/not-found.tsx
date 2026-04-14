import Link from 'next/link';
import { Button } from '@/components/ui/button';

export default function ReadingNotFound() {
  return (
    <div className="flex flex-col flex-1">
      <main className="flex flex-1 flex-col items-center justify-center px-4 py-24 text-center">
        <p className="text-[8rem] sm:text-[12rem] font-black leading-none tracking-tighter text-primary/10 select-none">
          404
        </p>

        <div className="-mt-6 sm:-mt-10 flex flex-col gap-4 max-w-md">
          <h1 className="text-2xl sm:text-3xl font-bold">Разбор не найден</h1>
          <p className="text-muted-foreground text-sm sm:text-base leading-relaxed">
            Этот астрологический разбор не существует или был удалён.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
            <Button asChild size="lg">
              <Link href="/readings">Все разборы</Link>
            </Button>
            <Button asChild variant="outline" size="lg">
              <Link href="/dashboard">На дашборд</Link>
            </Button>
          </div>
        </div>
      </main>
    </div>
  );
}
