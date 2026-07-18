import { cn } from "@/lib/utils";

interface PageHeaderProps {
  index: string;
  title: string;
  enTitle: string;
  desc?: string;
  right?: React.ReactNode;
}

export default function PageHeader({ index, title, enTitle, desc, right }: PageHeaderProps) {
  return (
    <header className="px-10 pt-8 pb-6 border-b-2 border-ink-900 bg-bone-50">
      <div className="flex items-end justify-between gap-6">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <span className="font-mono text-[11px] bg-ink-900 text-flame px-2 py-0.5 font-bold tracking-industrial">
              {index}
            </span>
            <span className="font-mono text-[11px] text-ink-500 tracking-industrial">{enTitle}</span>
          </div>
          <h1 className="font-sans text-3xl font-black text-ink-900 tracking-tightest leading-none">
            {title}
          </h1>
          {desc && <p className="mt-2 text-sm text-ink-500 max-w-2xl">{desc}</p>}
        </div>
        {right && <div className="shrink-0">{right}</div>}
      </div>
    </header>
  );
}

interface StepBarProps {
  current: 0 | 1 | 2 | 3;
}

export function StepBar({ current }: StepBarProps) {
  const steps = [
    { label: "工作台", en: "STATION" },
    { label: "分类", en: "CLASSIFY" },
    { label: "配对", en: "PAIR" },
    { label: "处理", en: "FORGE" },
  ];
  return (
    <div className="px-10 py-4 bg-bone-100 border-b border-ink-200">
      <div className="flex items-center gap-3">
        {steps.map((s, i) => (
          <div key={i} className="flex items-center gap-3 flex-1 last:flex-none">
            <div
              className={cn(
                "flex items-center gap-2 px-2 py-1",
                i === current && "bg-ink-900 text-bone-100",
                i < current && "text-flame",
                i > current && "text-ink-400",
              )}
            >
              <span
                className={cn(
                  "font-mono text-[10px] font-bold w-5 h-5 flex items-center justify-center border",
                  i === current && "border-flame text-flame",
                  i < current && "border-flame bg-flame text-white",
                  i > current && "border-ink-300",
                )}
              >
                {i < current ? "✓" : String(i + 1).padStart(2, "0")}
              </span>
              <span className="font-sans text-xs font-bold tracking-tight">{s.label}</span>
              <span className="font-mono text-[9px] tracking-industrial opacity-70">{s.en}</span>
            </div>
            {i < steps.length - 1 && (
              <div className={cn("flex-1 h-px", i < current ? "bg-flame" : "bg-ink-200")} />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
