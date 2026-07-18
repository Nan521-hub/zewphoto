import { IMAGE_EXTS, VIDEO_EXTS, type ImageFile, type ScanResult, type VideoFile } from "@/types";

// 生成短唯一 ID
const genId = () => `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

const getExt = (name: string): string => {
  const idx = name.lastIndexOf(".");
  return idx >= 0 ? name.slice(idx + 1).toLowerCase() : "";
};

// 校验浏览器是否支持
export function isFsApiSupported(): boolean {
  return typeof window !== "undefined" && typeof window.showDirectoryPicker === "function";
}

// 选择输入文件夹
export async function pickInputDirectory(): Promise<FileSystemDirectoryHandle> {
  if (!isFsApiSupported()) {
    throw new Error("当前浏览器不支持 File System Access API，请使用 Chrome 或 Edge 浏览器");
  }
  const handle = await window.showDirectoryPicker({ mode: "read", id: "input-dir" });
  return handle;
}

// 选择输出文件夹
export async function pickOutputDirectory(): Promise<FileSystemDirectoryHandle> {
  if (!isFsApiSupported()) {
    throw new Error("当前浏览器不支持 File System Access API，请使用 Chrome 或 Edge 浏览器");
  }
  const handle = await window.showDirectoryPicker({ mode: "readwrite", id: "output-dir" });
  return handle;
}

// 获取图片宽高
async function getImageSize(file: File): Promise<{ width: number; height: number }> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      resolve({ width: img.naturalWidth, height: img.naturalHeight });
      URL.revokeObjectURL(url);
    };
    img.onerror = () => {
      resolve({ width: 0, height: 0 });
      URL.revokeObjectURL(url);
    };
    img.src = url;
  });
}

// 扫描根目录下的 1200/1688 子文件夹及视频文件
export async function scanDirectory(root: FileSystemDirectoryHandle): Promise<ScanResult> {
  const folder1200: ImageFile[] = [];
  const folder1688: ImageFile[] = [];
  const videos: VideoFile[] = [];

  let dir1200: FileSystemDirectoryHandle | null = null;
  let dir1688: FileSystemDirectoryHandle | null = null;
  let dirOzon: FileSystemDirectoryHandle | null = null;

  // 遍历根目录，先找子文件夹，再处理根目录下的视频
  const rootVideoEntries: { name: string; file: File }[] = [];

  for await (const entry of root.values()) {
    if (entry.kind === "directory") {
      const name = entry.name.trim().toLowerCase();
      if (name === "1200") dir1200 = entry as FileSystemDirectoryHandle;
      else if (name === "1688") dir1688 = entry as FileSystemDirectoryHandle;
      else if (name === "ozon") dirOzon = entry as FileSystemDirectoryHandle;
    } else if (entry.kind === "file") {
      const ext = getExt(entry.name);
      if (VIDEO_EXTS.includes(ext)) {
        const file = await (entry as FileSystemFileHandle).getFile();
        rootVideoEntries.push({ name: entry.name, file });
      }
    }
  }

  // 扫描 1200
  if (dir1200) {
    for await (const entry of dir1200.values()) {
      if (entry.kind !== "file") continue;
      const ext = getExt(entry.name);
      if (!IMAGE_EXTS.includes(ext)) continue;
      const file = await (entry as FileSystemFileHandle).getFile();
      const { width, height } = await getImageSize(file);
      folder1200.push({
        id: genId(),
        name: entry.name,
        ext,
        file,
        url: URL.createObjectURL(file),
        width,
        height,
      });
    }
    // 按文件名自然排序
    folder1200.sort((a, b) => a.name.localeCompare(b.name, "zh-Hans-CN", { numeric: true }));
  }

  // 扫描 1688
  if (dir1688) {
    for await (const entry of dir1688.values()) {
      if (entry.kind !== "file") continue;
      const ext = getExt(entry.name);
      if (!IMAGE_EXTS.includes(ext)) continue;
      const file = await (entry as FileSystemFileHandle).getFile();
      const { width, height } = await getImageSize(file);
      folder1688.push({
        id: genId(),
        name: entry.name,
        ext,
        file,
        url: URL.createObjectURL(file),
        width,
        height,
      });
    }
    folder1688.sort((a, b) => a.name.localeCompare(b.name, "zh-Hans-CN", { numeric: true }));
  }

  // 根目录视频
  for (const v of rootVideoEntries) {
    const ext = getExt(v.name);
    videos.push({
      id: genId(),
      name: v.name,
      ext,
      file: v.file,
      url: URL.createObjectURL(v.file),
    });
  }

  // 扫描 ozon 文件夹（只记录文件名清单，不处理内容）
  const ozonFileNames: string[] = [];
  if (dirOzon) {
    for await (const entry of dirOzon.values()) {
      if (entry.kind === "file") {
        ozonFileNames.push(entry.name);
      }
    }
    ozonFileNames.sort((a, b) => a.localeCompare(b, "zh-Hans-CN", { numeric: true }));
  }

  return {
    folder1200,
    folder1688,
    videos,
    rootName: root.name,
    hasOzon: dirOzon !== null,
    ozonFileNames,
  };
}

// 创建子文件夹（如已存在则获取）
export async function ensureFolder(
  parent: FileSystemDirectoryHandle,
  name: string,
): Promise<FileSystemDirectoryHandle> {
  return await parent.getDirectoryHandle(name, { create: true });
}

// 写入文件
export async function writeFile(
  dir: FileSystemDirectoryHandle,
  name: string,
  data: Blob | ArrayBuffer,
): Promise<void> {
  const fileHandle = await dir.getFileHandle(name, { create: true });
  const writable = await fileHandle.createWritable();
  await writable.write(data);
  await writable.close();
}

// 复制源文件到目标（保持原始二进制）
export async function copyFile(
  src: FileSystemDirectoryHandle,
  srcName: string,
  dst: FileSystemDirectoryHandle,
  dstName: string,
): Promise<void> {
  const srcHandle = await src.getFileHandle(srcName);
  const file = await srcHandle.getFile();
  await writeFile(dst, dstName, file);
}

// 递归删除目录（用于清理）
export async function removeDir(parent: FileSystemDirectoryHandle, name: string): Promise<void> {
  try {
    await parent.removeEntry(name, { recursive: true });
  } catch {
    /* 忽略不存在 */
  }
}

// 验证目录是否可写
export async function verifyWritable(dir: FileSystemDirectoryHandle): Promise<boolean> {
  try {
    const perm = await dir.requestPermission({ mode: "readwrite" });
    return perm === "granted";
  } catch {
    return false;
  }
}
