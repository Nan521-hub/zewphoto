import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useWorkflow } from "@/store/useWorkflow";
import {
  pickInputDirectory,
  pickOutputDirectory,
  scanDirectory,
  isFsApiSupported,
} from "@/services/fileSystem";
import PageHeader, { StepBar } from "@/components/PageHeader";
import { cn } from "@/lib/utils";
import {
  FolderInput,
  FolderOutput,
  ScanLine,
  ArrowRight,
  AlertTriangle,
  CheckCircle2,
  Package,
} from "lucide-react";

export default function Home() {
  const navigate = useNavigate();
  const {
    productCode,
    styleCode,
    setCodes,
    inputDirName,
    outputDirName,
    inputDirHandle,
    outputDirHandle,
    setInputDir,
    setOutputDir,
    setScan,
    setStep,
    scan,
  } = useWorkflow();

  const [scanning, setScanning] = useState(false);
  const [scanErr, setScanErr] = useState<string | null>(null);
  const supported = isFsApiSupported();

  const handlePickInput = async () => {
    setScanErr(null);
    try {
      const handle = await pickInputDirectory();
      setInputDir(handle, handle.name);
    } catch (e) {
      if (e instanceof DOMException && e.name === "AbortError") return;
      setScanErr(e instanceof Error ? e.message : String(e));
    }
  };

  const handlePickOutput = async () => {
    setScanErr(null);
    try {
      const handle = await pickOutputDirectory();
      setOutputDir(handle, handle.name);
    } catch (e) {
      if (e instanceof DOMException && e.name === "AbortError") return;
      setScanErr(e instanceof Error ? e.message : String(e));
    }
  };

  const handleScan = async () => {
    if (!inputDirHandle) return;
    setScanning(true);
    setScanErr(null);
    try {
      const result = await scanDirectory(inputDirHandle);
      setScan(result);
    } catch (e) {
      setScanErr(e instanceof Error ? e.message : String(e));
    } finally {
      setScanning(false);
    }
  };

  const canGoNext =
    productCode.trim() &&
    styleCode.trim() &&
    inputDirHandle &&
    outputDirHandle &&
    scan &&
    scan.folder1200.length > 0;

  const goNext = () => {
    setStep("classify");
    navigate("/classify");
  };

  return (
    <>
      <PageHeader
        index="01"
        title="工作台"
        enTitle="STATION"
        desc="输入商品与款式编号，选择输入与输出文件夹，扫描图片素材后开始处理流程。"
      />
      <StepBar current={0} />

      <div className="flex-1 overflow-y-auto p-10 space-y-6">
        {!supported && (
          <div className="bg-rust/10 border-2 border-rust p-4 flex items-start gap-3">
            <AlertTriangle className="text-rust shrink-0" size={20} />
            <div>
              <div className="font-bold text-rust">浏览器不兼容</div>
              <p className="text-sm text-rust/80 mt-1">
                本工具依赖 File System Access API，请在 <strong>Chrome 86+</strong> 或{" "}
                <strong>Edge 86+</strong> 中打开。其他浏览器无法直接读写本地文件夹。
              </p>
            </div>
          </div>
        )}

        {/* 编码输入 */}
        <section className="bg-white border-2 border-ink-900 shadow-industrial-sm">
          <div className="bg-ink-900 px-5 py-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="font-mono text-[10px] text-flame tracking-industrial">SECTION_A</span>
              <span className="font-sans text-sm font-bold text-bone-100">编码输入</span>
            </div>
            <span className="font-mono text-[10px] text-ink-400 tracking-industrial">REQUIRED</span>
          </div>
          <div className="grid grid-cols-2 gap-px bg-ink-900">
            <CodeField
              label="商品编号"
              enLabel="PRODUCT CODE"
              placeholder="例如：XS7046-101"
              value={productCode}
              onChange={(v) => setCodes(v, styleCode)}
            />
            <CodeField
              label="款式编号"
              enLabel="STYLE CODE"
              placeholder="例如：XS7046-101"
              value={styleCode}
              onChange={(v) => setCodes(productCode, v)}
            />
          </div>
        </section>

        {/* 文件夹选择 */}
        <section className="bg-white border-2 border-ink-900 shadow-industrial-sm">
          <div className="bg-ink-900 px-5 py-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="font-mono text-[10px] text-flame tracking-industrial">SECTION_B</span>
              <span className="font-sans text-sm font-bold text-bone-100">文件夹选择</span>
            </div>
            <span className="font-mono text-[10px] text-ink-400 tracking-industrial">FOLDERS</span>
          </div>
          <div className="grid grid-cols-2 gap-px bg-ink-900">
            <FolderField
              icon={<FolderInput size={18} />}
              label="输入文件夹"
              enLabel="INPUT"
              hint="包含 1200 / 1688 / 视频文件"
              dirName={inputDirName}
              onClick={handlePickInput}
            />
            <FolderField
              icon={<FolderOutput size={18} />}
              label="输出文件夹"
              enLabel="OUTPUT"
              hint="桌面 trae111 文件夹"
              dirName={outputDirName}
              onClick={handlePickOutput}
            />
          </div>
        </section>

        {/* 扫描与状态 */}
        <section className="bg-white border-2 border-ink-900 shadow-industrial-sm">
          <div className="bg-ink-900 px-5 py-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="font-mono text-[10px] text-flame tracking-industrial">SECTION_C</span>
              <span className="font-sans text-sm font-bold text-bone-100">扫描与状态</span>
            </div>
            <button
              onClick={handleScan}
              disabled={!inputDirHandle || scanning}
              className={cn(
                "flex items-center gap-2 px-3 py-1.5 font-mono text-[11px] tracking-industrial transition-all",
                !inputDirHandle || scanning
                  ? "bg-ink-700 text-ink-400 cursor-not-allowed"
                  : "bg-flame text-white hover:bg-flame-600",
              )}
            >
              <ScanLine size={13} className={scanning ? "animate-spin" : ""} />
              {scanning ? "SCANNING..." : "SCAN NOW"}
            </button>
          </div>

          {scanErr && (
            <div className="px-5 py-3 bg-rust/10 border-b border-rust/30 text-sm text-rust flex items-center gap-2">
              <AlertTriangle size={14} /> {scanErr}
            </div>
          )}

          <div className="grid grid-cols-5 gap-px bg-ink-900">
            <StatCell
              label="1200 图片"
              value={scan ? scan.folder1200.length : "—"}
              active={!!scan && scan.folder1200.length > 0}
            />
            <StatCell
              label="1688 图片"
              value={scan ? scan.folder1688.length : "—"}
              active={!!scan && scan.folder1688.length > 0}
            />
            <StatCell
              label="视频文件"
              value={scan ? scan.videos.length : "—"}
              active={!!scan && scan.videos.length > 0}
            />
            <StatCell
              label="ozon 文件夹"
              value={scan ? (scan.hasOzon ? `是 · ${scan.ozonFileNames.length} 文件` : "否") : "—"}
              active={!!scan && scan.hasOzon}
            />
            <StatCell
              label="扫描状态"
              value={scan ? "已完成" : "未扫描"}
              active={!!scan}
            />
          </div>

          {scan && (
            <div className="px-5 py-4 bg-bone-50 border-t border-ink-200 animate-fade-up">
              <div className="flex items-center gap-2 text-xs text-ink-600">
                <Package size={14} className="text-flame" />
                <span className="font-mono">根目录：</span>
                <span className="font-bold">{scan.rootName}</span>
                <span className="text-ink-400">·</span>
                <span>共扫描到 {scan.folder1200.length + scan.folder1688.length + scan.videos.length} 个素材</span>
              </div>
            </div>
          )}
        </section>

        {/* 启动按钮 */}
        <div className="flex items-center justify-between pt-2">
          <div className="text-xs text-ink-500 font-mono tracking-industrial">
            {canGoNext ? (
              <span className="flex items-center gap-1.5 text-flame">
                <CheckCircle2 size={14} /> READY · 可进入分类步骤
              </span>
            ) : (
              <span>请完成上方所有必填项后再继续</span>
            )}
          </div>
          <button
            onClick={goNext}
            disabled={!canGoNext}
            className={cn(
              "flex items-center gap-2 px-6 py-3 font-sans font-bold text-sm transition-all border-2",
              canGoNext
                ? "bg-ink-900 text-bone-100 border-ink-900 hover:bg-flame hover:border-flame shadow-industrial-sm hover:shadow-industrial"
                : "bg-bone-200 text-ink-400 border-ink-200 cursor-not-allowed",
            )}
          >
            进入图片分类
            <ArrowRight size={16} />
          </button>
        </div>
      </div>
    </>
  );
}

function CodeField({
  label,
  enLabel,
  placeholder,
  value,
  onChange,
}: {
  label: string;
  enLabel: string;
  placeholder: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="bg-white px-5 py-4">
      <div className="flex items-center justify-between mb-2">
        <label className="font-sans text-sm font-bold text-ink-900">{label}</label>
        <span className="font-mono text-[9px] text-ink-400 tracking-industrial">{enLabel}</span>
      </div>
      <div className="relative">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 font-mono text-flame text-xs">▸</span>
        <input
          type="text"
          value={value}
          placeholder={placeholder}
          onChange={(e) => onChange(e.target.value)}
          className="w-full pl-7 pr-3 py-2.5 bg-bone-100 border-2 border-ink-900 font-mono text-base font-bold text-ink-900 placeholder:text-ink-300 placeholder:font-normal focus:outline-none focus:bg-white focus:border-flame transition-colors"
        />
      </div>
    </div>
  );
}

function FolderField({
  icon,
  label,
  enLabel,
  hint,
  dirName,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  enLabel: string;
  hint: string;
  dirName: string | null;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="bg-white px-5 py-4 text-left hover:bg-bone-50 transition-colors group"
    >
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="text-ink-700 group-hover:text-flame transition-colors">{icon}</span>
          <label className="font-sans text-sm font-bold text-ink-900">{label}</label>
        </div>
        <span className="font-mono text-[9px] text-ink-400 tracking-industrial">{enLabel}</span>
      </div>
      <div
        className={cn(
          "px-3 py-2.5 border-2 border-dashed font-mono text-sm transition-colors",
          dirName
            ? "border-ink-900 bg-bone-100 text-ink-900 font-bold"
            : "border-ink-300 bg-bone-100 text-ink-400",
        )}
      >
        {dirName ? `📁 ${dirName}` : "点击选择文件夹"}
      </div>
      <div className="mt-1.5 font-mono text-[10px] text-ink-400 tracking-industrial">{hint}</div>
    </button>
  );
}

function StatCell({
  label,
  value,
  active,
}: {
  label: string;
  value: string | number;
  active: boolean;
}) {
  return (
    <div className="bg-white px-5 py-4">
      <div className="font-mono text-[9px] text-ink-400 tracking-industrial mb-1">{label.toUpperCase()}</div>
      <div
        className={cn(
          "font-mono text-2xl font-black tabular tracking-tightest",
          active ? "text-flame" : "text-ink-300",
        )}
      >
        {value}
      </div>
    </div>
  );
}
