import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useWorkflow, selectUnclassified, selectByCategory } from "@/store/useWorkflow";
import { CATEGORY_DEFS, type CategoryId, type ImageFile } from "@/types";
import { batchDetect } from "@/services/imageProcess";
import PageHeader, { StepBar } from "@/components/PageHeader";
import { cn } from "@/lib/utils";
import {
  Sparkles,
  ArrowRight,
  ArrowLeft,
  Image as ImageIcon,
  Wand2,
  X,
  CheckCircle2,
  Square,
  CheckSquare,
  Minus,
  MoveRight,
} from "lucide-react";

export default function Classify() {
  const navigate = useNavigate();
  const {
    scan,
    classification,
    orderInCategory,
    assignCategory,
    removeFromCategory,
    reorderInCategory,
    autoAssignWhiteBg,
    markAutoDetection,
    setStep,
  } = useWorkflow();

  const [detecting, setDetecting] = useState(false);
  const [detectProgress, setDetectProgress] = useState({ done: 0, total: 0 });
  const [dragFileId, setDragFileId] = useState<string | null>(null);
  const [hoverBucket, setHoverBucket] = useState<CategoryId | null>(null);
  const [previewImg, setPreviewImg] = useState<ImageFile | null>(null);
  const [multiSelect, setMultiSelect] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [selectedInBucket, setSelectedInBucket] = useState<Record<string, Set<string>>>({});

  const unclassified = selectUnclassified(useWorkflow());
  const total = scan?.folder1200.length || 0;
  const classifiedCount = total - unclassified.length;

  if (!scan) {
    return (
      <>
        <PageHeader index="02" title="图片分类" enTitle="CLASSIFY" />
        <div className="flex-1 flex items-center justify-center text-ink-400">
          请先返回工作台扫描文件夹
        </div>
      </>
    );
  }

  const handleAutoDetect = async () => {
    if (!scan) return;
    setDetecting(true);
    setDetectProgress({ done: 0, total: scan.folder1200.length });
    try {
      const results = await batchDetect(scan.folder1200, (idx, total) => {
        setDetectProgress({ done: idx + 1, total });
      });
      // 标记检测结果到 store（更新 ImageFile.isWhiteBg/hasTopText）
      for (const r of results) {
        markAutoDetection(r.fileId, r.isWhiteBg, r.hasTopText);
      }
      autoAssignWhiteBg(results);
    } finally {
      setDetecting(false);
    }
  };

  const handleDragStart = (e: React.DragEvent, fileId: string) => {
    setDragFileId(fileId);
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", fileId);
  };

  const handleDrop = (e: React.DragEvent, cat: CategoryId) => {
    e.preventDefault();
    const fileId = e.dataTransfer.getData("text/plain") || dragFileId;
    if (fileId) assignCategory(fileId, cat);
    setHoverBucket(null);
    setDragFileId(null);
  };

  const requiredCatsFilled =
    orderInCategory.main.length > 0 &&
    orderInCategory.scene.length > 0 &&
    orderInCategory.whitebg.length > 0;

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleBucketSelect = (catId: CategoryId, fileId: string) => {
    setSelectedInBucket((prev) => {
      const bucketSet = prev[catId] ? new Set(prev[catId]) : new Set<string>();
      if (bucketSet.has(fileId)) bucketSet.delete(fileId);
      else bucketSet.add(fileId);
      return { ...prev, [catId]: bucketSet };
    });
  };

  const selectAllUnclassified = () => {
    if (selectedIds.size === unclassified.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(unclassified.map((f) => f.id)));
    }
  };

  const batchAssign = (cat: CategoryId) => {
    if (selectedIds.size === 0) return;
    for (const id of selectedIds) {
      assignCategory(id, cat);
    }
    setSelectedIds(new Set());
  };

  const batchRemoveFromBucket = (catId: CategoryId) => {
    const bucketSet = selectedInBucket[catId];
    if (!bucketSet || bucketSet.size === 0) return;
    for (const id of bucketSet) {
      removeFromCategory(id);
    }
    setSelectedInBucket((prev) => {
      const next = { ...prev };
      delete next[catId];
      return next;
    });
  };

  const toggleMultiSelect = () => {
    setMultiSelect((v) => !v);
    setSelectedIds(new Set());
    setSelectedInBucket({});
  };

  const goNext = () => {
    setStep("pair");
    navigate("/pair");
  };

  const goBack = () => {
    setStep("home");
    navigate("/");
  };

  return (
    <>
      <PageHeader
        index="02"
        title="图片分类"
        enTitle="CLASSIFY"
        desc="将左侧未分类图片拖入右侧类别桶中。属性图将单独命名为商品编码。"
        right={
          <div className="flex items-center gap-2">
            <button
              onClick={toggleMultiSelect}
              className={cn(
                "flex items-center gap-2 px-4 py-2.5 font-sans text-sm font-bold border-2 transition-all",
                multiSelect
                  ? "bg-gold text-ink-900 border-gold shadow-industrial-sm"
                  : "bg-white text-ink-700 border-ink-900 hover:bg-ink-900 hover:text-bone-100",
              )}
            >
              {multiSelect ? <CheckSquare size={15} /> : <Square size={15} />}
              {multiSelect ? "多选模式" : "多选模式"}
            </button>
            <button
              onClick={handleAutoDetect}
              disabled={detecting}
              className={cn(
                "flex items-center gap-2 px-4 py-2.5 font-sans text-sm font-bold border-2 transition-all",
                detecting
                  ? "bg-bone-200 text-ink-400 border-ink-200 cursor-wait"
                  : "bg-flame text-white border-flame hover:bg-flame-600 shadow-industrial-sm",
              )}
            >
              <Wand2 size={15} className={detecting ? "animate-spin" : ""} />
              {detecting
                ? `检测中 ${detectProgress.done}/${detectProgress.total}`
                : "一键检测白底图"}
            </button>
          </div>
        }
      />
      <StepBar current={1} />

      {/* 进度条 */}
      <div className="px-10 py-3 bg-bone-100 border-b border-ink-200 flex items-center gap-4">
        <div className="flex-1 flex items-center gap-3">
          <div className="font-mono text-[10px] text-ink-500 tracking-industrial">PROGRESS</div>
          <div className="flex-1 h-2 bg-ink-200 relative overflow-hidden">
            <div
              className="absolute inset-y-0 left-0 bg-flame transition-all"
              style={{ width: `${total > 0 ? (classifiedCount / total) * 100 : 0}%` }}
            />
          </div>
          <div className="font-mono text-xs font-bold tabular">
            <span className="text-flame">{classifiedCount}</span>
            <span className="text-ink-400"> / {total}</span>
          </div>
        </div>
        <div className="font-mono text-[10px] text-ink-500 tracking-industrial">
          UNCLASSIFIED: <span className="text-ink-900 font-bold">{unclassified.length}</span>
        </div>
      </div>

      <div className="flex-1 flex min-h-0">
        {/* 左侧：未分类图片 */}
        <div className="w-[42%] border-r-2 border-ink-900 flex flex-col bg-bone-50 min-h-0">
          <div className="px-5 py-3 bg-ink-900 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ImageIcon size={14} className="text-flame" />
              <span className="font-sans text-sm font-bold text-bone-100">未分类图片</span>
              <span className="font-mono text-[10px] text-ink-400 tracking-industrial">QUEUE</span>
            </div>
            <div className="flex items-center gap-3">
              {multiSelect && (
                <button
                  onClick={selectAllUnclassified}
                  className="font-mono text-[10px] text-gold hover:text-flame transition-colors flex items-center gap-1"
                >
                  {selectedIds.size === unclassified.length && unclassified.length > 0 ? (
                    <CheckSquare size={12} />
                  ) : selectedIds.size > 0 ? (
                    <Minus size={12} />
                  ) : (
                    <Square size={12} />
                  )}
                  全选
                </button>
              )}
              <span className="font-mono text-xs text-flame tabular font-bold">{unclassified.length}</span>
            </div>
          </div>
          <div className="flex-1 overflow-y-auto p-4">
            {unclassified.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-ink-400 gap-2">
                <CheckCircle2 size={32} className="text-flame" />
                <div className="font-sans text-sm font-bold">全部已分类</div>
                <div className="font-mono text-[10px] tracking-industrial">ALL CLASSIFIED</div>
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-3">
                {unclassified.map((img) => (
                  <ThumbCard
                    key={img.id}
                    img={img}
                    onDragStart={(e) => handleDragStart(e, img.id)}
                    onDragEnd={() => setDragFileId(null)}
                    onPreview={() => setPreviewImg(img)}
                    detecting={detecting}
                    selectable={multiSelect}
                    selected={selectedIds.has(img.id)}
                    onToggleSelect={() => toggleSelect(img.id)}
                  />
                ))}
              </div>
            )}
          </div>
          {multiSelect && (
            <div className="px-4 py-3 bg-bone-50 border-t-2 border-ink-900">
              <div className="font-mono text-[10px] text-ink-500 tracking-industrial mb-2">
                已选 <span className="text-flame font-bold">{selectedIds.size}</span> 张 — 点击下方类别批量分配
              </div>
              <div className="flex flex-wrap gap-1.5">
                {CATEGORY_DEFS.map((cat) => (
                  <button
                    key={cat.id}
                    onClick={() => batchAssign(cat.id)}
                    disabled={selectedIds.size === 0}
                    className={cn(
                      "px-2.5 py-1.5 font-sans text-[11px] font-bold border-2 transition-all flex items-center gap-1",
                      selectedIds.size > 0
                        ? "bg-white text-ink-900 border-ink-900 hover:bg-flame hover:text-white hover:border-flame"
                        : "bg-bone-100 text-ink-400 border-ink-200 cursor-not-allowed",
                    )}
                  >
                    <MoveRight size={12} />
                    {cat.shortLabel}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* 右侧：分类桶 */}
        <div className="flex-1 flex flex-col min-h-0">
          <div className="px-5 py-3 bg-ink-900 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles size={14} className="text-flame" />
              <span className="font-sans text-sm font-bold text-bone-100">类别桶</span>
              <span className="font-mono text-[10px] text-ink-400 tracking-industrial">CATEGORY BUCKETS</span>
            </div>
            <div className="font-mono text-[10px] text-ink-400 tracking-industrial">
              拖拽图片到对应桶中
            </div>
          </div>
          <div className="flex-1 overflow-y-auto p-4 grid grid-cols-2 gap-3 content-start">
            {CATEGORY_DEFS.map((cat) => (
              <CategoryBucket
                key={cat.id}
                cat={cat}
                files={selectByCategory(useWorkflow.getState(), cat.id)}
                onDrop={(e) => handleDrop(e, cat.id)}
                onDragOver={(e) => {
                  e.preventDefault();
                  setHoverBucket(cat.id);
                }}
                onDragLeave={() => setHoverBucket(null)}
                isHover={hoverBucket === cat.id}
                onRemove={removeFromCategory}
                onReorder={reorderInCategory}
                onPreview={setPreviewImg}
                onDragStart={handleDragStart}
                selectable={multiSelect}
                selectedIds={selectedInBucket[cat.id] || new Set()}
                onToggleSelect={(fileId) => toggleBucketSelect(cat.id, fileId)}
                onBatchRemove={() => batchRemoveFromBucket(cat.id)}
              />
            ))}
          </div>
        </div>
      </div>

      {/* 底部操作栏 */}
      <div className="px-10 py-4 bg-bone-100 border-t-2 border-ink-900 flex items-center justify-between">
        <button
          onClick={goBack}
          className="flex items-center gap-2 px-4 py-2 font-sans text-sm font-bold text-ink-700 hover:text-flame transition-colors"
        >
          <ArrowLeft size={16} />
          返回工作台
        </button>
        <div className="flex items-center gap-4">
          <div className="font-mono text-[10px] tracking-industrial">
            {requiredCatsFilled ? (
              <span className="text-flame flex items-center gap-1">
                <CheckCircle2 size={12} /> 主图/场景图/白底图已就绪
              </span>
            ) : (
              <span className="text-ink-500">至少需要主图、场景图、白底图</span>
            )}
          </div>
          <button
            onClick={goNext}
            disabled={classifiedCount === 0}
            className={cn(
              "flex items-center gap-2 px-6 py-2.5 font-sans font-bold text-sm transition-all border-2",
              classifiedCount > 0
                ? "bg-ink-900 text-bone-100 border-ink-900 hover:bg-flame hover:border-flame shadow-industrial-sm"
                : "bg-bone-200 text-ink-400 border-ink-200 cursor-not-allowed",
            )}
          >
            进入 1688 配对
            <ArrowRight size={16} />
          </button>
        </div>
      </div>

      {/* 预览弹窗 */}
      {previewImg && <PreviewModal img={previewImg} onClose={() => setPreviewImg(null)} />}
    </>
  );
}

interface ThumbCardProps {
  img: ImageFile;
  onDragStart: (e: React.DragEvent) => void;
  onDragEnd: () => void;
  onPreview: () => void;
  detecting?: boolean;
  selectable?: boolean;
  selected?: boolean;
  onToggleSelect?: () => void;
}

function ThumbCard({
  img,
  onDragStart,
  onDragEnd,
  onPreview,
  detecting,
  selectable,
  selected,
  onToggleSelect,
}: ThumbCardProps) {
  const handleClick = (e: React.MouseEvent) => {
    if (selectable && onToggleSelect) {
      e.preventDefault();
      onToggleSelect();
    }
  };
  return (
    <div
      draggable={!detecting && !selectable}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onDoubleClick={onPreview}
      onClick={handleClick}
      className={cn(
        "group relative bg-white border-2 transition-all",
        selectable ? "cursor-pointer" : "cursor-grab active:cursor-grabbing",
        selected
          ? "border-flame ring-2 ring-flame/30"
          : "border-ink-900 hover:shadow-industrial-sm hover:-translate-y-0.5",
      )}
    >
      {selectable && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onToggleSelect?.();
          }}
          className="absolute top-1 left-1 z-10 w-5 h-5 bg-white border-2 border-ink-900 flex items-center justify-center hover:bg-bone-100"
        >
          {selected && <CheckSquare size={13} className="text-flame" />}
        </button>
      )}
      <div className="aspect-square overflow-hidden bg-bone-100">
        <img
          src={img.url}
          alt={img.name}
          className="w-full h-full object-cover"
          loading="lazy"
        />
      </div>
      {img.isWhiteBg && (
        <div className="absolute top-1 right-1 bg-ink-900 text-bone-100 font-mono text-[8px] px-1 py-0.5 tracking-industrial">
          {img.hasTopText ? "ATTR" : "WHITE"}
        </div>
      )}
      <div className="px-1.5 py-1 border-t border-ink-200">
        <div className="font-mono text-[9px] text-ink-500 truncate tracking-tight" title={img.name}>
          {img.name}
        </div>
        <div className="font-mono text-[9px] text-ink-400 tabular">
          {img.width}×{img.height}
        </div>
      </div>
    </div>
  );
}

interface CategoryBucketProps {
  cat: (typeof CATEGORY_DEFS)[number];
  files: ImageFile[];
  onDrop: (e: React.DragEvent) => void;
  onDragOver: (e: React.DragEvent) => void;
  onDragLeave: () => void;
  isHover: boolean;
  onRemove: (fileId: string) => void;
  onReorder: (cat: CategoryId, from: number, to: number) => void;
  onPreview: (img: ImageFile) => void;
  onDragStart: (e: React.DragEvent, fileId: string) => void;
  selectable?: boolean;
  selectedIds: Set<string>;
  onToggleSelect: (fileId: string) => void;
  onBatchRemove: () => void;
}

function CategoryBucket({
  cat,
  files,
  onDrop,
  onDragOver,
  onDragLeave,
  isHover,
  onRemove,
  onReorder,
  onPreview,
  onDragStart,
  selectable,
  selectedIds,
  onToggleSelect,
  onBatchRemove,
}: CategoryBucketProps) {
  const [dragOverIdx, setDragOverIdx] = useState<number | null>(null);
  const hasSelected = selectedIds.size > 0;

  const selectAllInBucket = () => {
    if (files.length === 0) return;
    if (selectedIds.size === files.length) {
      // 取消全选（清空）
      for (const f of files) onToggleSelect(f.id);
    } else {
      // 全选：先清掉，再加上所有
      for (const f of files) {
        if (!selectedIds.has(f.id)) onToggleSelect(f.id);
      }
    }
  };

  return (
    <div
      onDrop={onDrop}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      className={cn(
        "bg-white border-2 border-ink-900 flex flex-col min-h-[200px]",
        isHover && "drop-target-active",
        cat.optional && "border-dashed",
      )}
    >
      <div className="px-3 py-2 bg-ink-900 flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <span className="font-sans text-xs font-bold text-bone-100">{cat.shortLabel}</span>
          {cat.optional && (
            <span className="font-mono text-[8px] text-ink-400 tracking-industrial">OPT</span>
          )}
        </div>
        <div className="flex items-center gap-1.5">
          {selectable && files.length > 0 && (
            <>
              <button
                onClick={selectAllInBucket}
                className="text-ink-400 hover:text-gold transition-colors"
                title={hasSelected ? "取消全选" : "全选本桶"}
              >
                {selectedIds.size === files.length && files.length > 0 ? (
                  <CheckSquare size={12} />
                ) : hasSelected ? (
                  <Minus size={12} />
                ) : (
                  <Square size={12} />
                )}
              </button>
              {hasSelected && (
                <button
                  onClick={onBatchRemove}
                  className="text-rust hover:text-flame transition-colors"
                  title="批量移回未分类"
                >
                  <X size={12} />
                </button>
              )}
            </>
          )}
          <span
            className={cn(
              "font-mono text-xs font-bold tabular px-1.5",
              files.length > 0 ? "text-flame" : "text-ink-500",
            )}
          >
            {files.length}
          </span>
        </div>
      </div>
      <div className="flex-1 p-2 overflow-x-auto">
        {files.length === 0 ? (
          <div className="h-full min-h-[160px] flex items-center justify-center">
            <span className="font-mono text-[10px] text-ink-300 tracking-industrial">DROP HERE</span>
          </div>
        ) : (
          <div className="flex gap-2">
            {files.map((img, idx) => (
              <div
                key={img.id}
                draggable={!selectable}
                onDragStart={(e) => onDragStart(e, img.id)}
                onDragOver={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setDragOverIdx(idx);
                }}
                onDragLeave={() => setDragOverIdx(null)}
                onDrop={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  const fromId = e.dataTransfer.getData("text/plain");
                  const fromIdx = files.findIndex((f) => f.id === fromId);
                  if (fromIdx >= 0 && fromIdx !== idx) {
                    onReorder(cat.id, fromIdx, idx);
                  }
                  setDragOverIdx(null);
                }}
                onClick={() => selectable && onToggleSelect(img.id)}
                className={cn(
                  "relative w-20 shrink-0 bg-bone-100 border border-ink-900 transition-all",
                  !selectable && "cursor-grab active:cursor-grabbing",
                  selectable && "cursor-pointer",
                  dragOverIdx === idx && "ring-2 ring-flame",
                  selectedIds.has(img.id) && "ring-2 ring-flame border-flame",
                )}
              >
                {selectable && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onToggleSelect(img.id);
                    }}
                    className="absolute top-0.5 left-0.5 z-10 w-4 h-4 bg-white border border-ink-900 flex items-center justify-center hover:bg-bone-100"
                  >
                    {selectedIds.has(img.id) && <CheckSquare size={10} className="text-flame" />}
                  </button>
                )}
                <div className="aspect-square overflow-hidden">
                  <img src={img.url} alt={img.name} className="w-full h-full object-cover" />
                </div>
                <div className="absolute top-0.5 right-0.5 bg-ink-900 text-bone-100 font-mono text-[8px] w-4 h-4 flex items-center justify-center font-bold">
                  {String(idx + 1).padStart(2, "0")}
                </div>
                {!selectable && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onRemove(img.id);
                    }}
                    className="absolute top-0.5 right-0.5 w-4 h-4 bg-rust text-white flex items-center justify-center hover:bg-flame"
                    title="移除"
                  >
                    <X size={10} />
                  </button>
                )}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onPreview(img);
                  }}
                  className="absolute inset-0 opacity-0 hover:opacity-100 hover:bg-ink-900/40 transition-opacity flex items-center justify-center"
                  title="预览"
                >
                  <ImageIcon size={16} className="text-bone-100" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
      <div className="px-2 py-1 border-t border-ink-200 font-mono text-[9px] text-ink-400 tracking-tight truncate">
        {cat.description}
      </div>
    </div>
  );
}

function PreviewModal({ img, onClose }: { img: ImageFile; onClose: () => void }) {
  return (
    <div
      className="fixed inset-0 bg-ink-900/80 z-50 flex items-center justify-center p-8"
      onClick={onClose}
    >
      <div
        className="bg-white border-2 border-flame shadow-industrial max-w-3xl max-h-full flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-4 py-2 bg-ink-900 flex items-center justify-between">
          <div className="font-mono text-xs text-bone-100 truncate">{img.name}</div>
          <button onClick={onClose} className="text-bone-100 hover:text-flame">
            <X size={16} />
          </button>
        </div>
        <div className="bg-bone-100 flex items-center justify-center p-4 max-h-[70vh]">
          <img src={img.url} alt={img.name} className="max-w-full max-h-[60vh] object-contain" />
        </div>
        <div className="px-4 py-2 bg-bone-50 border-t border-ink-200 grid grid-cols-3 gap-4 font-mono text-[10px]">
          <div>
            <div className="text-ink-400 tracking-industrial">尺寸</div>
            <div className="text-ink-900 font-bold tabular">
              {img.width} × {img.height}
            </div>
          </div>
          <div>
            <div className="text-ink-400 tracking-industrial">白底</div>
            <div className="text-ink-900 font-bold">
              {img.isWhiteBg === undefined ? "未检测" : img.isWhiteBg ? "是" : "否"}
            </div>
          </div>
          <div>
            <div className="text-ink-400 tracking-industrial">顶部文字</div>
            <div className="text-ink-900 font-bold">
              {img.hasTopText === undefined ? "未检测" : img.hasTopText ? "是" : "否"}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}


