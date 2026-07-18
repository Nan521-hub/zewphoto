// 图片分类类别
export type CategoryId =
  | "main" // 主图（首图）
  | "scene" // 场景图（效果图）
  | "detail" // 产品详情（四宫格）
  | "micro" // 细节图
  | "whitebg" // 白底图（白底，上方无说明）
  | "attribute"; // 属性图（白底，上方有说明）

export interface CategoryDef {
  id: CategoryId;
  label: string;
  shortLabel: string;
  description: string;
  optional: boolean; // 是否可选类别
}

// 扫描到的图片文件
export interface ImageFile {
  id: string; // 唯一标识
  name: string; // 原始文件名
  ext: string; // 扩展名（小写，不带点）
  file: File; // 原始 File 对象
  url: string; // ObjectURL 用于预览
  width: number;
  height: number;
  isWhiteBg?: boolean; // 自动检测结果
  hasTopText?: boolean; // 自动检测结果
  category?: CategoryId; // 用户分配的类别
  order?: number; // 在类别中的顺序
}

export interface VideoFile {
  id: string;
  name: string;
  ext: string;
  file: File;
  url: string;
}

export interface ScanResult {
  folder1200: ImageFile[];
  folder1688: ImageFile[];
  videos: VideoFile[];
  rootName: string;
  hasOzon: boolean;                  // 是否存在 ozon 文件夹
  ozonFileNames: string[];           // ozon 文件夹内文件名清单（用于展示）
}

// 1688 配对
export interface PairGroup {
  square: string | null; // 方图 imageId
  first: string | null; // 首图 imageId
}

// 处理步骤状态
export type StepStatus = "pending" | "running" | "done" | "error";

export interface ProcessStep {
  id: string;
  label: string;
  status: StepStatus;
  detail?: string;
  count?: { done: number; total: number };
}

export interface ProcessLog {
  time: string;
  level: "info" | "success" | "warn" | "error";
  message: string;
}

// 类别定义常量
export const CATEGORY_DEFS: CategoryDef[] = [
  {
    id: "main",
    label: "主图 / 首图",
    shortLabel: "主图",
    description: "商品主图，列表展示用",
    optional: false,
  },
  {
    id: "scene",
    label: "场景图 / 效果图",
    shortLabel: "场景图",
    description: "商品使用场景图",
    optional: false,
  },
  {
    id: "detail",
    label: "产品详情 / 四宫格",
    shortLabel: "产品详情",
    description: "四宫格组合图，如有",
    optional: true,
  },
  {
    id: "micro",
    label: "细节图",
    shortLabel: "细节图",
    description: "局部细节展示，如有",
    optional: true,
  },
  {
    id: "whitebg",
    label: "白底图",
    shortLabel: "白底图",
    description: "白底，上方无说明文字",
    optional: false,
  },
  {
    id: "attribute",
    label: "属性图",
    shortLabel: "属性图",
    description: "白底，上方有说明文字，单独命名",
    optional: true,
  },
];

// 重命名顺序
export const RENAME_ORDER: CategoryId[] = ["main", "scene", "detail", "micro", "whitebg"];

// 图片扩展名
export const IMAGE_EXTS = ["jpg", "jpeg", "png", "webp", "bmp", "gif"];
export const VIDEO_EXTS = ["mp4", "mov", "avi", "mkv", "webm", "flv", "m4v", "wmv"];
