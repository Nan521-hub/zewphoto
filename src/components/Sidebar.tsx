import { NavLink, useNavigate } from "react-router-dom";
import { useWorkflow, type WorkflowStep } from "@/store/useWorkflow";
import { cn } from "@/lib/utils";
import { Boxes, FolderTree, Spline, Cog, RotateCcw, type LucideIcon } from "lucide-react";

interface NavItem {
  to: string;
  label: string;
  enLabel: string;
  step: WorkflowStep;
  icon: LucideIcon;
  index: number;
}

const NAV_ITEMS: NavItem[] = [
  { to: "/", label: "工作台", enLabel: "STATION", step: "home", icon: Boxes, index: 0 },
  { to: "/classify", label: "图片分类", enLabel: "CLASSIFY", step: "classify", icon: FolderTree, index: 1 },
  { to: "/pair", label: "1688 配对", enLabel: "PAIR", step: "pair", icon: Spline, index: 2 },
  { to: "/process", label: "执行处理", enLabel: "FORGE", step: "process", icon: Cog, index: 3 },
];

export default function Sidebar() {
  const { productCode, styleCode, currentStep, scan, reset } = useWorkflow();
  const navigate = useNavigate();

  const handleReset = () => {
    if (!confirm("确定重置所有数据？将清空当前进度。")) return;
    reset();
    navigate("/");
  };

  return (
    <aside className="w-[260px] shrink-0 bg-ink-900 text-bone-100 flex flex-col border-r-2 border-ink-900">
      {/* 品牌 */}
      <div className="px-6 py-7 border-b border-ink-700">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 bg-flame flex items-center justify-center shadow-industrial-sm">
            <span className="font-mono font-black text-base text-white tracking-tightest">IF</span>
          </div>
          <div className="leading-tight">
            <div className="font-mono text-[10px] tracking-industrial text-flame">IMAGE FORGE</div>
            <div className="font-sans text-[13px] font-bold tracking-tight">图片处理工作台</div>
          </div>
        </div>
        <div className="mt-4 font-mono text-[10px] text-ink-400 tracking-industrial">
          v1.0 · BROWSER-NATIVE
        </div>
      </div>

      {/* 编码状态 */}
      <div className="px-6 py-5 border-b border-ink-700 space-y-2.5">
        <div>
          <div className="font-mono text-[9px] text-ink-400 tracking-industrial">商品编号 / PRODUCT</div>
          <div className="font-mono text-sm font-bold text-bone-100 tabular tracking-tight">
            {productCode || <span className="text-ink-500">—</span>}
          </div>
        </div>
        <div>
          <div className="font-mono text-[9px] text-ink-400 tracking-industrial">款式编号 / STYLE</div>
          <div className="font-mono text-sm font-bold text-bone-100 tabular tracking-tight">
            {styleCode || <span className="text-ink-500">—</span>}
          </div>
        </div>
      </div>

      {/* 导航 */}
      <nav className="flex-1 px-3 py-4 space-y-1">
        {NAV_ITEMS.map((item) => {
          const enabled = isStepReachable(item.step, currentStep, scan);
          const Icon = item.icon;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              className={cn(
                "block px-3 py-2.5 border-l-2 transition-colors group",
                !enabled && "pointer-events-none opacity-40",
              )}
              style={({ isActive }) => ({
                borderLeftColor: isActive ? "#FF6B35" : "transparent",
                background: isActive ? "rgba(255,107,53,0.08)" : "transparent",
              })}
            >
              {({ isActive }) => (
                <div className="flex items-center gap-3">
                  <span
                    className={cn(
                      "font-mono text-[10px] w-5 text-center",
                      isActive ? "text-flame" : "text-ink-500",
                    )}
                  >
                    {String(item.index).padStart(2, "0")}
                  </span>
                  <Icon size={16} className={isActive ? "text-flame" : "text-ink-300"} />
                  <div className="leading-tight">
                    <div
                      className={cn(
                        "text-[13px] font-bold tracking-tight",
                        isActive ? "text-bone-100" : "text-ink-200",
                      )}
                    >
                      {item.label}
                    </div>
                    <div className="font-mono text-[9px] text-ink-500 tracking-industrial">
                      {item.enLabel}
                    </div>
                  </div>
                </div>
              )}
            </NavLink>
          );
        })}
      </nav>

      {/* 底部状态 */}
      <div className="px-4 py-4 border-t border-ink-700">
        <button
          onClick={handleReset}
          className="w-full flex items-center justify-center gap-2 px-3 py-2 border border-ink-600 text-ink-300 hover:border-flame hover:text-flame transition-colors font-mono text-[11px] tracking-industrial"
        >
          <RotateCcw size={12} />
          RESET
        </button>
      </div>
    </aside>
  );
}

function isStepReachable(
  target: WorkflowStep,
  current: WorkflowStep,
  scan: { folder1200: unknown[] } | null,
): boolean {
  // 已到达过的步骤都可访问
  const order: WorkflowStep[] = ["home", "classify", "pair", "process", "done"];
  const currentIdx = order.indexOf(current);
  const targetIdx = order.indexOf(target);
  if (targetIdx <= currentIdx) return true;
  // 前进一步需要满足条件
  if (target === "classify") return Boolean(scan && scan.folder1200.length > 0);
  if (target === "pair") return currentIdx >= 1;
  if (target === "process") return currentIdx >= 2;
  return false;
}
