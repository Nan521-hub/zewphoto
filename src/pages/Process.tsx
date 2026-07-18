import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useWorkflow } from "@/store/useWorkflow";
import { runProcessing } from "@/services/processor";
import PageHeader, { StepBar } from "@/components/PageHeader";
import { cn } from "@/lib/utils";
import type { ProcessLog, ProcessStep } from "@/types";
import {
  Play,
  ArrowLeft,
  CheckCircle2,
  Loader2,
  XCircle,
  Circle,
  Terminal,
  FolderTree,
  RotateCcw,
  AlertTriangle,
} from "lucide-react";

export default function ProcessPage() {
  const navigate = useNavigate();
  const {
    scan,
    productCode,
    styleCode,
    pairs,
    orderInCategory,
    outputDirName,
    steps,
    logs,
    processing,
    currentStep,
    setStep,
    reset,
  } = useWorkflow();

  const [error, setError] = useState<string | null>(null);
  const logEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [logs]);

  if (!scan) {
    return (
      <>
        <PageHeader index="04" title="执行处理" enTitle="FORGE" />
        <div className="flex-1 flex items-center justify-center text-ink-400">
          请先返回工作台扫描文件夹
        </div>
      </>
    );
  }

  const isDone = currentStep === "done";
  const hasError = error !== null;

  const handleStart = async () => {
    setError(null);
    try {
      await runProcessing({ productCode, styleCode });
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  };

  const handleReset = () => {
    if (!confirm("确定重置所有数据？将清空当前进度。")) return;
    reset();
    navigate("/");
  };

  const handleBack = () => {
    setStep("pair");
    navigate("/pair");
  };

  // 进度概览
  const totalSteps = steps.length;
  const doneSteps = steps.filter((s) => s.status === "done").length;
  const overallPct = totalSteps > 0 ? (doneSteps / totalSteps) * 100 : 0;

  // 预览命名
  const previewNames = buildPreviewNames(styleCode, orderInCategory, productCode);

  return (
    <>
      <PageHeader
        index="04"
        title="执行处理"
        enTitle="FORGE"
        desc="确认配置无误后启动处理。所有图片将在浏览器内处理并写入输出文件夹。"
        right={
          <div className="text-right">
            <div className="font-mono text-[10px] text-ink-400 tracking-industrial">OUTPUT</div>
            <div className="font-mono text-sm font-bold text-ink-900">
              {outputDirName || "未选择"}
            </div>
          </div>
        }
      />
      <StepBar current={3} />

      <div className="flex-1 flex min-h-0">
        {/* 左侧：步骤与配置概览 */}
        <div className="w-[45%] border-r-2 border-ink-900 flex flex-col bg-bone-50 min-h-0">
          <div className="px-5 py-3 bg-ink-900 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FolderTree size={14} className="text-flame" />
              <span className="font-sans text-sm font-bold text-bone-100">配置概览</span>
              <span className="font-mono text-[10px] text-ink-400 tracking-industrial">OVERVIEW</span>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-5 space-y-4">
            <SummaryCard title="基本信息">
              <SummaryRow label="商品编号" value={productCode} mono />
              <SummaryRow label="款式编号" value={styleCode} mono />
              <SummaryRow label="1200 图片" value={`${scan.folder1200.length} 张`} />
              <SummaryRow label="1688 图片" value={`${scan.folder1688.length} 张`} />
              <SummaryRow label="视频文件" value={`${scan.videos.length} 个`} />
              <SummaryRow
                label="ozon 文件夹"
                value={scan.hasOzon ? `有 · ${scan.ozonFileNames.length} 文件` : "无"}
                highlight={scan.hasOzon}
              />
            </SummaryCard>

            <SummaryCard title="1200 分类情况">
              {(["main", "scene", "detail", "micro", "whitebg", "attribute"] as const).map((cat) => {
                const labels: Record<string, string> = {
                  main: "主图",
                  scene: "场景图",
                  detail: "产品详情",
                  micro: "细节图",
                  whitebg: "白底图",
                  attribute: "属性图",
                };
                const count = orderInCategory[cat].length;
                return (
                  <SummaryRow
                    key={cat}
                    label={labels[cat]}
                    value={`${count} 张`}
                    highlight={count > 0}
                  />
                );
              })}
            </SummaryCard>

            <SummaryCard title="1688 配对">
              {pairs.map((p, i) => (
                <div key={i} className="py-1">
                  <div className="font-mono text-[10px] text-ink-400 tracking-industrial">
                    {["陈悦组", "杜青组"][i]}
                  </div>
                  <div className="font-mono text-xs text-ink-900">
                    方图：{p.square ? "✓" : "—"} · 首图：{p.first ? "✓" : "—"}
                  </div>
                </div>
              ))}
            </SummaryCard>

            <SummaryCard title="命名预览">
              <div className="space-y-1 font-mono text-[11px] text-ink-700">
                {previewNames.slice(0, 5).map((n, i) => (
                  <div key={i} className="truncate">
                    <span className="text-flame">▸</span> {n}
                  </div>
                ))}
                {previewNames.length > 5 && (
                  <div className="text-ink-400">...共 {previewNames.length} 个文件</div>
                )}
              </div>
            </SummaryCard>

            <SummaryCard title="输出结构">
              <pre className="font-mono text-[10px] text-ink-600 leading-relaxed whitespace-pre-wrap">
{buildOutputTree(productCode, scan.hasOzon)}
              </pre>
            </SummaryCard>
          </div>
        </div>

        {/* 右侧：处理进度与日志 */}
        <div className="flex-1 flex flex-col min-h-0">
          {/* 进度头部 */}
          <div className="px-5 py-4 bg-ink-900 border-b border-ink-700 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <ProgressRing pct={overallPct} done={isDone} error={hasError} />
              <div>
                <div className="font-sans text-sm font-bold text-bone-100">
                  {isDone
                    ? "处理完成"
                    : hasError
                    ? "处理出错"
                    : processing
                    ? "正在处理..."
                    : "准备就绪"}
                </div>
                <div className="font-mono text-[10px] text-ink-400 tracking-industrial">
                  {isDone
                    ? "ALL DONE"
                    : hasError
                    ? "ERROR"
                    : processing
                    ? "PROCESSING"
                    : "READY"}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {isDone ? (
                <button
                  onClick={handleReset}
                  className="flex items-center gap-2 px-4 py-2 bg-flame text-white font-sans text-sm font-bold hover:bg-flame-600 transition-colors shadow-industrial-sm"
                >
                  <RotateCcw size={14} />
                  开始新任务
                </button>
              ) : (
                <button
                  onClick={handleStart}
                  disabled={processing}
                  className={cn(
                    "flex items-center gap-2 px-5 py-2 font-sans text-sm font-bold transition-all border-2",
                    processing
                      ? "bg-ink-700 text-ink-400 border-ink-700 cursor-wait"
                      : "bg-flame text-white border-flame hover:bg-flame-600 shadow-industrial-sm",
                  )}
                >
                  {processing ? (
                    <>
                      <Loader2 size={14} className="animate-spin" />
                      处理中...
                    </>
                  ) : (
                    <>
                      <Play size={14} />
                      启动处理
                    </>
                  )}
                </button>
              )}
            </div>
          </div>

          {/* 步骤列表 */}
          <div className="px-5 py-3 bg-bone-100 border-b border-ink-200">
            <div className="space-y-1.5">
              {steps.length === 0 ? (
                <div className="text-xs text-ink-400 font-mono tracking-industrial py-2">
                  点击「启动处理」开始
                </div>
              ) : (
                steps.map((step) => <StepRow key={step.id} step={step} />)
              )}
            </div>
          </div>

          {/* 错误提示 */}
          {error && (
            <div className="px-5 py-3 bg-rust/10 border-b-2 border-rust flex items-start gap-2 text-sm text-rust">
              <AlertTriangle size={16} className="shrink-0 mt-0.5" />
              <div>
                <div className="font-bold">处理失败</div>
                <div className="text-xs mt-1 font-mono">{error}</div>
              </div>
            </div>
          )}

          {/* 日志 */}
          <div className="flex-1 overflow-y-auto bg-ink-900 p-5 font-mono text-[11px] leading-relaxed">
            <div className="flex items-center gap-2 text-ink-400 mb-3 pb-2 border-b border-ink-700">
              <Terminal size={12} className="text-flame" />
              <span className="tracking-industrial">EXECUTION LOG</span>
            </div>
            {logs.length === 0 ? (
              <div className="text-ink-500 tracking-industrial">// 等待处理开始...</div>
            ) : (
              <div className="space-y-0.5">
                {logs.map((log, i) => (
                  <LogRow key={i} log={log} />
                ))}
                <div ref={logEndRef} />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 底部操作栏 */}
      <div className="px-10 py-4 bg-bone-100 border-t-2 border-ink-900 flex items-center justify-between">
        <button
          onClick={handleBack}
          disabled={processing}
          className={cn(
            "flex items-center gap-2 px-4 py-2 font-sans text-sm font-bold transition-colors",
            processing
              ? "text-ink-300 cursor-not-allowed"
              : "text-ink-700 hover:text-flame",
          )}
        >
          <ArrowLeft size={16} />
          返回配对
        </button>
        {isDone && (
          <div className="flex items-center gap-2 text-flame font-mono text-xs tracking-industrial">
            <CheckCircle2 size={14} />
            全部处理完成，请到输出文件夹查看
          </div>
        )}
      </div>
    </>
  );
}

function buildPreviewNames(
  styleCode: string,
  orderInCategory: Record<string, string[]>,
  productCode: string,
): string[] {
  const order = ["main", "scene", "detail", "micro", "whitebg"];
  const names: string[] = [];
  let seq = 1;
  for (const cat of order) {
    const ids = orderInCategory[cat] || [];
    for (const _ of ids) {
      const seqStr = String(seq).padStart(2, "0");
      names.push(`${styleCode}-00-${seqStr}.jpg`);
      seq++;
    }
  }
  if ((orderInCategory.attribute || []).length > 0) {
    names.push(`${productCode}.jpg (属性图)`);
  }
  return names;
}

function buildOutputTree(productCode: string, hasOzon: boolean): string {
  const code = productCode || "商品编码";
  const lines = [
    "trae111/",
    "├── 1200/   # 重命名图",
    "├── 800/    # 800×800 方图",
    "├── 750/    # 750×757 扩边图",
    `├── ${code}/  # 1688 改名`,
    "│   ├── 陈悦组方图.jpg",
    "│   ├── 陈悦组首图.jpg",
    "│   ├── 杜青组方图.jpg",
    "│   └── 杜青组首图.jpg",
    `├── ${code}.jpg  # 属性图`,
    `├── ${code}视频/  # 视频文件夹`,
  ];
  if (hasOzon) {
    lines.push("└── 900 1200/  # ozon 改名（原文件保留）");
  } else {
    lines.push("└── （无 ozon 文件夹）");
  }
  return lines.join("\n");
}

function ProgressRing({ pct, done, error }: { pct: number; done: boolean; error: boolean }) {
  const size = 56;
  const stroke = 5;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const offset = c - (pct / 100) * c;
  const color = error ? "#8B3A1F" : done ? "#FF6B35" : "#FF6B35";
  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#262626" strokeWidth={stroke} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeDasharray={c}
          strokeDashoffset={offset}
          strokeLinecap="square"
          className="transition-all duration-300"
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        {done ? (
          <CheckCircle2 size={20} className="text-flame" />
        ) : error ? (
          <XCircle size={20} className="text-rust" />
        ) : (
          <span className="font-mono text-xs font-bold text-bone-100 tabular">
            {Math.round(pct)}%
          </span>
        )}
      </div>
    </div>
  );
}

function StepRow({ step }: { step: ProcessStep }) {
  const icon = {
    pending: <Circle size={12} className="text-ink-400" />,
    running: <Loader2 size={12} className="text-flame animate-spin" />,
    done: <CheckCircle2 size={12} className="text-flame" />,
    error: <XCircle size={12} className="text-rust" />,
  }[step.status];

  return (
    <div className="flex items-center gap-2.5 text-xs">
      <span className="shrink-0">{icon}</span>
      <span
        className={cn(
          "font-sans font-bold",
          step.status === "done"
            ? "text-ink-900"
            : step.status === "running"
            ? "text-flame"
            : step.status === "error"
            ? "text-rust"
            : "text-ink-400",
        )}
      >
        {step.label}
      </span>
      {step.count && (
        <span className="font-mono text-[10px] text-ink-500 tabular">
          {step.count.done}/{step.count.total}
        </span>
      )}
      {step.detail && (
        <span className="font-mono text-[10px] text-ink-400 ml-auto truncate">{step.detail}</span>
      )}
    </div>
  );
}

function LogRow({ log }: { log: ProcessLog }) {
  const colors: Record<ProcessLog["level"], string> = {
    info: "text-ink-300",
    success: "text-flame",
    warn: "text-yellow-400",
    error: "text-rust",
  };
  const prefix: Record<ProcessLog["level"], string> = {
    info: "ℹ",
    success: "✓",
    warn: "⚠",
    error: "✗",
  };
  return (
    <div className="flex gap-2">
      <span className="text-ink-500 tabular shrink-0">{log.time}</span>
      <span className={cn("shrink-0", colors[log.level])}>{prefix[log.level]}</span>
      <span className={cn("break-all", colors[log.level])}>{log.message}</span>
    </div>
  );
}

function SummaryCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white border border-ink-900">
      <div className="px-3 py-1.5 bg-ink-900 flex items-center justify-between">
        <span className="font-sans text-xs font-bold text-bone-100">{title}</span>
      </div>
      <div className="p-3 space-y-1">{children}</div>
    </div>
  );
}

function SummaryRow({
  label,
  value,
  mono,
  highlight,
}: {
  label: string;
  value: string;
  mono?: boolean;
  highlight?: boolean;
}) {
  return (
    <div className="flex items-center justify-between text-xs">
      <span className="text-ink-500">{label}</span>
      <span
        className={cn(
          mono ? "font-mono" : "font-sans",
          "font-bold tabular",
          highlight ? "text-flame" : "text-ink-900",
        )}
      >
        {value}
      </span>
    </div>
  );
}
