import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useWorkflow } from "@/store/useWorkflow";
import PageHeader, { StepBar } from "@/components/PageHeader";
import { cn } from "@/lib/utils";
import type { ImageFile } from "@/types";
import {
  ArrowLeft,
  ArrowRight,
  Users,
  Square,
  Image as ImageIcon,
  X,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
} from "lucide-react";

const PAIR_NAMES = ["陈悦组", "杜青组"];

export default function Pair() {
  const navigate = useNavigate();
  const { scan, pairs, setPair, swapPairMember, setStep } = useWorkflow();
  const [dragFileId, setDragFileId] = useState<string | null>(null);
  const [hoverSlot, setHoverSlot] = useState<string | null>(null);

  if (!scan) {
    return (
      <>
        <PageHeader index="03" title="1688 配对" enTitle="PAIR" />
        <div className="flex-1 flex items-center justify-center text-ink-400">
          请先返回工作台扫描文件夹
        </div>
      </>
    );
  }

  const folder1688 = scan.folder1688;
  // 已分配的图片 id 集合
  const assignedIds = new Set<string>();
  pairs.forEach((p) => {
    if (p.square) assignedIds.add(p.square);
    if (p.first) assignedIds.add(p.first);
  });
  const available = folder1688.filter((f) => !assignedIds.has(f.id));

  const allFilled = pairs.every((p) => p.square && p.first);

  const handleDrop = (e: React.DragEvent, idx: 0 | 1, field: "square" | "first") => {
    e.preventDefault();
    const fileId = e.dataTransfer.getData("text/plain") || dragFileId;
    if (fileId) setPair(idx, field, fileId);
    setHoverSlot(null);
    setDragFileId(null);
  };

  const handleAssignByClick = (fileId: string) => {
    // 点击分配：找第一个空槽位
    for (let i = 0; i < 2; i++) {
      if (!pairs[i].square) {
        setPair(i as 0 | 1, "square", fileId);
        return;
      }
      if (!pairs[i].first) {
        setPair(i as 0 | 1, "first", fileId);
        return;
      }
    }
  };

  const goNext = () => {
    setStep("process");
    navigate("/process");
  };
  const goBack = () => {
    setStep("classify");
    navigate("/classify");
  };

  return (
    <>
      <PageHeader
        index="03"
        title="1688 配对"
        enTitle="PAIR"
        desc="将下方 1688 图片拖入两组配对槽位。每组需要 1 张方图和 1 张首图，对应商品主图素材。"
        right={
          <div className="text-right">
            <div className="font-mono text-[10px] text-ink-400 tracking-industrial">FOLDER 1688</div>
            <div className="font-mono text-sm font-bold text-ink-900 tabular">
              {folder1688.length} 张图片
            </div>
          </div>
        }
      />
      <StepBar current={2} />

      {/* 配对区 */}
      <div className="flex-1 overflow-y-auto p-8 space-y-6">
        {folder1688.length === 0 ? (
          <div className="bg-bone-100 border-2 border-dashed border-ink-300 p-12 text-center">
            <AlertTriangle size={32} className="mx-auto text-ink-400 mb-3" />
            <div className="font-sans font-bold text-ink-600">未发现 1688 文件夹</div>
            <p className="text-sm text-ink-400 mt-1">该步骤将自动跳过，可直接进入下一步</p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-6">
              {pairs.map((pair, idx) => (
                <PairCard
                  key={idx}
                  index={idx as 0 | 1}
                  name={PAIR_NAMES[idx]}
                  pair={pair}
                  scan={scan}
                  onDrop={handleDrop}
                  onDragOverSlot={(field) => setHoverSlot(`${idx}-${field}`)}
                  onDragLeave={() => setHoverSlot(null)}
                  hoverSlot={hoverSlot}
                  onClear={(field) => setPair(idx as 0 | 1, field, null)}
                  onSwap={() => {
                    if (pair.square) swapPairMember(pair.square);
                  }}
                />
              ))}
            </div>

            {/* 可用图片 */}
            <section className="bg-white border-2 border-ink-900 shadow-industrial-sm">
              <div className="bg-ink-900 px-5 py-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <ImageIcon size={14} className="text-flame" />
                  <span className="font-sans text-sm font-bold text-bone-100">可用图片</span>
                  <span className="font-mono text-[10px] text-ink-400 tracking-industrial">
                    AVAILABLE
                  </span>
                </div>
                <span className="font-mono text-xs text-flame tabular font-bold">
                  {available.length}
                </span>
              </div>
              <div className="p-5">
                {available.length === 0 ? (
                  <div className="text-center py-6">
                    <CheckCircle2 size={28} className="mx-auto text-flame mb-2" />
                    <div className="font-sans text-sm font-bold text-ink-700">
                      所有图片已分配
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-6 gap-3">
                    {available.map((img) => (
                      <button
                        key={img.id}
                        draggable
                        onDragStart={(e) => {
                          setDragFileId(img.id);
                          e.dataTransfer.effectAllowed = "move";
                          e.dataTransfer.setData("text/plain", img.id);
                        }}
                        onDragEnd={() => setDragFileId(null)}
                        onClick={() => handleAssignByClick(img.id)}
                        className="group relative bg-bone-100 border-2 border-ink-900 hover:border-flame hover:shadow-industrial-sm transition-all cursor-grab active:cursor-grabbing text-left"
                        title={`${img.name} · ${img.width}×${img.height}\n点击或拖拽到槽位`}
                      >
                        <div className="aspect-square overflow-hidden bg-white">
                          <img
                            src={img.url}
                            alt={img.name}
                            className="w-full h-full object-cover"
                            loading="lazy"
                          />
                        </div>
                        <div className="px-1.5 py-1 border-t border-ink-200">
                          <div
                            className="font-mono text-[9px] text-ink-600 truncate"
                            title={img.name}
                          >
                            {img.name}
                          </div>
                          <div className="font-mono text-[9px] text-ink-400 tabular">
                            {img.width}×{img.height}
                          </div>
                        </div>
                        <div className="absolute top-1 right-1 bg-ink-900 text-bone-100 font-mono text-[8px] px-1 py-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                          {img.width === img.height ? "1:1" : `${img.width}:${img.height}`}
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <div className="px-5 py-3 bg-bone-50 border-t border-ink-200 font-mono text-[10px] text-ink-500 tracking-industrial">
                提示：方图通常宽高比为 1:1，首图通常为长图。点击图片可自动填入下一个空槽位。
              </div>
            </section>
          </>
        )}
      </div>

      {/* 底部操作栏 */}
      <div className="px-10 py-4 bg-bone-100 border-t-2 border-ink-900 flex items-center justify-between">
        <button
          onClick={goBack}
          className="flex items-center gap-2 px-4 py-2 font-sans text-sm font-bold text-ink-700 hover:text-flame transition-colors"
        >
          <ArrowLeft size={16} />
          返回分类
        </button>
        <div className="flex items-center gap-4">
          <div className="font-mono text-[10px] tracking-industrial">
            {folder1688.length === 0 ? (
              <span className="text-ink-500">无 1688 文件夹，可直接继续</span>
            ) : allFilled ? (
              <span className="text-flame flex items-center gap-1">
                <CheckCircle2 size={12} /> 两组配对已完成
              </span>
            ) : (
              <span className="text-ink-500">
                已配对 {pairs.filter((p) => p.square && p.first).length}/2 组
              </span>
            )}
          </div>
          <button
            onClick={goNext}
            disabled={folder1688.length > 0 && !allFilled}
            className={cn(
              "flex items-center gap-2 px-6 py-2.5 font-sans font-bold text-sm transition-all border-2",
              folder1688.length === 0 || allFilled
                ? "bg-ink-900 text-bone-100 border-ink-900 hover:bg-flame hover:border-flame shadow-industrial-sm"
                : "bg-bone-200 text-ink-400 border-ink-200 cursor-not-allowed",
            )}
          >
            进入执行处理
            <ArrowRight size={16} />
          </button>
        </div>
      </div>
    </>
  );
}

interface PairCardProps {
  index: 0 | 1;
  name: string;
  pair: { square: string | null; first: string | null };
  scan: { folder1688: ImageFile[] };
  onDrop: (e: React.DragEvent, idx: 0 | 1, field: "square" | "first") => void;
  onDragOverSlot: (field: "square" | "first") => void;
  onDragLeave: () => void;
  hoverSlot: string | null;
  onClear: (field: "square" | "first") => void;
  onSwap: () => void;
}

function PairCard({
  index,
  name,
  pair,
  scan,
  onDrop,
  onDragOverSlot,
  onDragLeave,
  hoverSlot,
  onClear,
  onSwap,
}: PairCardProps) {
  const findImg = (id: string | null): ImageFile | null =>
    id ? scan.folder1688.find((f) => f.id === id) || null : null;
  const squareImg = findImg(pair.square);
  const firstImg = findImg(pair.first);

  return (
    <div className="bg-white border-2 border-ink-900 shadow-industrial-sm">
      <div className="bg-ink-900 px-5 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Users size={14} className="text-flame" />
          <span className="font-sans text-sm font-bold text-bone-100">{name}</span>
          <span className="font-mono text-[10px] text-ink-400 tracking-industrial">
            GROUP_{index === 0 ? "CHEN" : "DU"}
          </span>
        </div>
        <button
          onClick={onSwap}
          disabled={!pair.square && !pair.first}
          className={cn(
            "flex items-center gap-1 px-2 py-1 font-mono text-[9px] tracking-industrial border transition-colors",
            pair.square || pair.first
              ? "border-ink-600 text-ink-300 hover:border-flame hover:text-flame"
              : "border-ink-700 text-ink-500 cursor-not-allowed",
          )}
          title="交换方图与首图"
        >
          <RefreshCw size={10} />
          SWAP
        </button>
      </div>
      <div className="grid grid-cols-2 gap-px bg-ink-900">
        <Slot
          label="方图"
          enLabel="SQUARE"
          icon={<Square size={12} />}
          img={squareImg}
          isHover={hoverSlot === `${index}-square`}
          onDrop={(e) => onDrop(e, index, "square")}
          onDragOver={() => onDragOverSlot("square")}
          onDragLeave={onDragLeave}
          onClear={() => onClear("square")}
          finalName={`${name}方图`}
        />
        <Slot
          label="首图"
          enLabel="FIRST"
          icon={<ImageIcon size={12} />}
          img={firstImg}
          isHover={hoverSlot === `${index}-first`}
          onDrop={(e) => onDrop(e, index, "first")}
          onDragOver={() => onDragOverSlot("first")}
          onDragLeave={onDragLeave}
          onClear={() => onClear("first")}
          finalName={`${name}首图`}
        />
      </div>
    </div>
  );
}

interface SlotProps {
  label: string;
  enLabel: string;
  icon: React.ReactNode;
  img: ImageFile | null;
  isHover: boolean;
  onDrop: (e: React.DragEvent) => void;
  onDragOver: () => void;
  onDragLeave: () => void;
  onClear: () => void;
  finalName: string;
}

function Slot({
  label,
  enLabel,
  icon,
  img,
  isHover,
  onDrop,
  onDragOver,
  onDragLeave,
  onClear,
  finalName,
}: SlotProps) {
  return (
    <div
      onDrop={onDrop}
      onDragOver={(e) => {
        e.preventDefault();
        onDragOver();
      }}
      onDragLeave={onDragLeave}
      className={cn(
        "bg-white p-3 min-h-[180px] flex flex-col",
        isHover && "drop-target-active",
      )}
    >
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-1.5">
          <span className="text-ink-700">{icon}</span>
          <span className="font-sans text-xs font-bold text-ink-900">{label}</span>
        </div>
        <span className="font-mono text-[9px] text-ink-400 tracking-industrial">{enLabel}</span>
      </div>
      {img ? (
        <div className="relative flex-1 border-2 border-ink-900 bg-bone-100 group">
          <div className="aspect-square overflow-hidden">
            <img src={img.url} alt={img.name} className="w-full h-full object-cover" />
          </div>
          <button
            onClick={onClear}
            className="absolute top-1 right-1 w-5 h-5 bg-rust text-white flex items-center justify-center hover:bg-flame opacity-0 group-hover:opacity-100 transition-opacity"
            title="移除"
          >
            <X size={11} />
          </button>
          <div className="px-2 py-1 border-t border-ink-200">
            <div className="font-mono text-[9px] text-ink-600 truncate">{img.name}</div>
            <div className="font-mono text-[10px] text-flame font-bold tabular">
              {img.width}×{img.height}
            </div>
          </div>
          <div className="absolute bottom-1 left-1 bg-ink-900 text-flame font-mono text-[9px] px-1.5 py-0.5 font-bold tracking-industrial">
            → {finalName}.jpg
          </div>
        </div>
      ) : (
        <div className="flex-1 border-2 border-dashed border-ink-300 flex flex-col items-center justify-center bg-bone-50">
          <ImageIcon size={24} className="text-ink-300 mb-1" />
          <span className="font-mono text-[10px] text-ink-400 tracking-industrial">DROP HERE</span>
        </div>
      )}
    </div>
  );
}
