interface StepItemProps {
  number: string;
  title: string;
  desc: string;
  isLast?: boolean;
}

export function StepItem({ number, title, desc, isLast = false }: StepItemProps) {
  return (
    <div className="flex gap-5 items-start">
      {/* Number badge + connecting line */}
      <div className="flex flex-col items-center shrink-0">
        <div className="flex h-11 w-11 items-center justify-center rounded-full bg-primary text-primary-foreground text-base font-bold ring-4 ring-primary/15">
          {number}
        </div>
        {!isLast && (
          <div className="mt-2 w-px flex-1 min-h-[2rem] bg-gradient-to-b from-primary/30 to-transparent" />
        )}
      </div>
      <div className="pb-2">
        <h3 className="font-semibold text-lg mb-1.5 text-balance">{title}</h3>
        <p className="text-muted-foreground text-sm leading-relaxed text-balance">{desc}</p>
      </div>
    </div>
  );
}
