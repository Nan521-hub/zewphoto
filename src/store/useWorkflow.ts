import { create } from "zustand";
import type {
  CategoryId,
  ImageFile,
  PairGroup,
  ProcessLog,
  ProcessStep,
  ScanResult,
  VideoFile,
} from "@/types";

export type WorkflowStep = "home" | "classify" | "pair" | "process" | "done";

interface WorkflowState {
  // 基础编码
  productCode: string; // 商品编号
  styleCode: string; // 款式编号

  // 文件夹句柄
  inputDirName: string | null;
  outputDirName: string | null;
  inputDirHandle: FileSystemDirectoryHandle | null;
  outputDirHandle: FileSystemDirectoryHandle | null;

  // 扫描结果
  scan: ScanResult | null;

  // 1200 图片分类（按类别组织）
  // 使用 map: fileId -> category，每个类别内的顺序由 ImageFile.order 决定
  classification: Record<string, CategoryId>; // fileId -> category
  orderInCategory: Record<CategoryId, string[]>; // category -> fileIds in order

  // 1688 配对
  pairs: [PairGroup, PairGroup]; // [陈悦组, 杜青组]

  // 处理状态
  steps: ProcessStep[];
  logs: ProcessLog[];
  processing: boolean;
  currentStep: WorkflowStep;

  // Actions
  setCodes: (product: string, style: string) => void;
  setInputDir: (handle: FileSystemDirectoryHandle, name: string) => void;
  setOutputDir: (handle: FileSystemDirectoryHandle, name: string) => void;
  setScan: (scan: ScanResult) => void;
  assignCategory: (fileId: string, category: CategoryId) => void;
  removeFromCategory: (fileId: string) => void;
  reorderInCategory: (category: CategoryId, fromIdx: number, toIdx: number) => void;
  autoAssignWhiteBg: (results: { fileId: string; isWhiteBg: boolean; hasTopText: boolean }[]) => void;
  markAutoDetection: (fileId: string, isWhiteBg: boolean, hasTopText: boolean) => void;
  setPair: (index: 0 | 1, field: "square" | "first", fileId: string | null) => void;
  swapPairMember: (fileId: string) => void; // 在已分配的配对中切换角色
  setStep: (step: WorkflowStep) => void;
  setSteps: (steps: ProcessStep[]) => void;
  updateStep: (id: string, patch: Partial<ProcessStep>) => void;
  addLog: (level: ProcessLog["level"], message: string) => void;
  clearLogs: () => void;
  setProcessing: (v: boolean) => void;
  reset: () => void;
}

const initialPairs: [PairGroup, PairGroup] = [
  { square: null, first: null },
  { square: null, first: null },
];

const emptyOrder: Record<CategoryId, string[]> = {
  main: [],
  scene: [],
  detail: [],
  micro: [],
  whitebg: [],
  attribute: [],
};

export const useWorkflow = create<WorkflowState>((set, get) => ({
  productCode: "",
  styleCode: "",
  inputDirName: null,
  outputDirName: null,
  inputDirHandle: null,
  outputDirHandle: null,
  scan: null,
  classification: {},
  orderInCategory: { ...emptyOrder },
  pairs: [{ ...initialPairs[0] }, { ...initialPairs[1] }],
  steps: [],
  logs: [],
  processing: false,
  currentStep: "home",

  setCodes: (product, style) => set({ productCode: product.trim(), styleCode: style.trim() }),

  setInputDir: (handle, name) => set({ inputDirHandle: handle, inputDirName: name }),
  setOutputDir: (handle, name) => set({ outputDirHandle: handle, outputDirName: name }),

  setScan: (scan) =>
    set({
      scan,
      classification: {},
      orderInCategory: { ...emptyOrder },
      pairs: [{ square: null, first: null }, { square: null, first: null }],
    }),

  assignCategory: (fileId, category) =>
    set((state) => {
      const prevCat = state.classification[fileId];
      const nextOrder = { ...state.orderInCategory };
      // 从原类别移除
      if (prevCat) {
        nextOrder[prevCat] = nextOrder[prevCat].filter((id) => id !== fileId);
      }
      // 加入新类别（末尾）
      if (!nextOrder[category].includes(fileId)) {
        nextOrder[category] = [...nextOrder[category], fileId];
      }
      return {
        classification: { ...state.classification, [fileId]: category },
        orderInCategory: nextOrder,
      };
    }),

  removeFromCategory: (fileId) =>
    set((state) => {
      const prevCat = state.classification[fileId];
      if (!prevCat) return state;
      const nextOrder = { ...state.orderInCategory };
      nextOrder[prevCat] = nextOrder[prevCat].filter((id) => id !== fileId);
      const nextClass = { ...state.classification };
      delete nextClass[fileId];
      return { classification: nextClass, orderInCategory: nextOrder };
    }),

  reorderInCategory: (category, fromIdx, toIdx) =>
    set((state) => {
      const arr = [...state.orderInCategory[category]];
      if (fromIdx < 0 || fromIdx >= arr.length || toIdx < 0 || toIdx >= arr.length) return state;
      const [moved] = arr.splice(fromIdx, 1);
      arr.splice(toIdx, 0, moved);
      return {
        orderInCategory: { ...state.orderInCategory, [category]: arr },
      };
    }),

  autoAssignWhiteBg: (results) =>
    set((state) => {
      const nextClass = { ...state.classification };
      const nextOrder = { ...state.orderInCategory };
      // 先把已有 attribute/whitebg 分配清空
      nextOrder.whitebg = [];
      nextOrder.attribute = [];
      for (const r of results) {
        if (r.isWhiteBg) {
          const cat: CategoryId = r.hasTopText ? "attribute" : "whitebg";
          nextClass[r.fileId] = cat;
          nextOrder[cat].push(r.fileId);
        } else if (nextClass[r.fileId] === "whitebg" || nextClass[r.fileId] === "attribute") {
          // 之前误分到白底/属性，但本次检测非白底 -> 移除
          delete nextClass[r.fileId];
        }
      }
      return { classification: nextClass, orderInCategory: nextOrder };
    }),

  markAutoDetection: (fileId, isWhiteBg, hasTopText) =>
    set((state) => {
      if (!state.scan) return state;
      const update = <T extends ImageFile | VideoFile>(arr: T[]): T[] =>
        arr.map((f) => (f.id === fileId && "isWhiteBg" in f ? { ...f, isWhiteBg, hasTopText } : f));
      return {
        scan: {
          ...state.scan,
          folder1200: update(state.scan.folder1200) as ImageFile[],
        },
      };
    }),

  setPair: (index, field, fileId) =>
    set((state) => {
      const next: [PairGroup, PairGroup] = [
        { ...state.pairs[0] },
        { ...state.pairs[1] },
      ];
      // 同一图片不能同时占据两个角色
      const other: PairGroup = next[index === 0 ? 1 : 0];
      if (fileId && (other.square === fileId || other.first === fileId)) {
        return state;
      }
      // 同组内另一字段若与 fileId 相同则清空
      const otherField = field === "square" ? "first" : "square";
      if (next[index][otherField] === fileId) {
        next[index][otherField] = null;
      }
      next[index][field] = fileId;
      return { pairs: next };
    }),

  swapPairMember: (fileId) =>
    set((state) => {
      const next: [PairGroup, PairGroup] = [
        { ...state.pairs[0] },
        { ...state.pairs[1] },
      ];
      for (let i = 0; i < 2; i++) {
        if (next[i].square === fileId) {
          next[i].square = next[i].first;
          next[i].first = fileId;
        } else if (next[i].first === fileId) {
          next[i].first = next[i].square;
          next[i].square = fileId;
        }
      }
      return { pairs: next };
    }),

  setStep: (step) => set({ currentStep: step }),
  setSteps: (steps) => set({ steps }),
  updateStep: (id, patch) =>
    set((state) => ({
      steps: state.steps.map((s) => (s.id === id ? { ...s, ...patch } : s)),
    })),
  addLog: (level, message) =>
    set((state) => ({
      logs: [
        ...state.logs.slice(-200),
        { time: new Date().toLocaleTimeString("zh-CN", { hour12: false }), level, message },
      ],
    })),
  clearLogs: () => set({ logs: [] }),
  setProcessing: (v) => set({ processing: v }),

  reset: () =>
    set({
      productCode: "",
      styleCode: "",
      inputDirName: null,
      outputDirName: null,
      inputDirHandle: null,
      outputDirHandle: null,
      scan: null,
      classification: {},
      orderInCategory: { ...emptyOrder },
      pairs: [{ square: null, first: null }, { square: null, first: null }],
      steps: [],
      logs: [],
      processing: false,
      currentStep: "home",
    }),
}));

// 选择器辅助
export const selectUnclassified = (s: WorkflowState): ImageFile[] => {
  if (!s.scan) return [];
  return s.scan.folder1200.filter((f) => !s.classification[f.id]);
};

export const selectByCategory = (s: WorkflowState, cat: CategoryId): ImageFile[] => {
  if (!s.scan) return [];
  const ids = s.orderInCategory[cat] || [];
  return ids
    .map((id) => s.scan!.folder1200.find((f) => f.id === id))
    .filter((f): f is ImageFile => Boolean(f));
};
