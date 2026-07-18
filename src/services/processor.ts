import { RENAME_ORDER, IMAGE_EXTS, type CategoryId, type ImageFile } from "@/types";
import { useWorkflow } from "@/store/useWorkflow";
import { ensureFolder, writeFile } from "@/services/fileSystem";
import { resizeToSquare, resizeWithBottomPad } from "@/services/imageProcess";

const getExt = (name: string): string => {
  const idx = name.lastIndexOf(".");
  return idx >= 0 ? name.slice(idx + 1).toLowerCase() : "";
};

// 命名规则：1200 重命名 -> {款式编号}-00-{顺序2位}.jpg
function buildRenameMap(
  styleCode: string,
  orderInCategory: Record<CategoryId, string[]>,
  scan: { folder1200: ImageFile[] },
  attributeId: string | null,
): Map<string, string> {
  const map = new Map<string, string>();
  let seq = 1;
  for (const cat of RENAME_ORDER) {
    const ids = orderInCategory[cat] || [];
    for (const id of ids) {
      if (id === attributeId) continue; // 属性图单独处理
      const seqStr = String(seq).padStart(2, "0");
      map.set(id, `${styleCode}-00-${seqStr}.jpg`);
      seq++;
    }
  }
  return map;
}

export interface ProcessOptions {
  productCode: string;
  styleCode: string;
}

export async function runProcessing(opts: ProcessOptions): Promise<void> {
  const store = useWorkflow.getState();
  const { scan, orderInCategory, pairs, inputDirHandle, outputDirHandle } = store;

  if (!scan || !inputDirHandle || !outputDirHandle) {
    throw new Error("缺少必要数据：扫描结果或文件夹未就绪");
  }

  const { productCode, styleCode } = opts;

  // 定义步骤
  const steps = [
    { id: "rename-1200", label: "重命名 1200 图片", status: "pending" as const },
    { id: "gen-800", label: "生成 800×800 方图", status: "pending" as const },
    { id: "gen-750", label: "生成 750×757 扩边图", status: "pending" as const },
    { id: "rename-1688", label: "重命名 1688 图片", status: "pending" as const },
    { id: "video-folder", label: "创建视频文件夹", status: "pending" as const },
    { id: "rename-ozon", label: "ozon 文件夹改名 900 1200", status: "pending" as const },
  ];
  store.setSteps(steps);
  store.clearLogs();
  store.setProcessing(true);
  store.addLog("info", `开始处理：商品=${productCode}，款式=${styleCode}`);

  // 检测输入目录下的 1200 / 1688 / ozon 子文件夹
  const dir1200 = await ensureFolder(inputDirHandle, "1200");
  const has1688Dir = await hasSubdir(inputDirHandle, "1688");
  let dir1688: FileSystemDirectoryHandle | null = null;
  if (has1688Dir) {
    dir1688 = await inputDirHandle.getDirectoryHandle("1688");
  }
  // ozon 文件夹（大小写不敏感）
  const ozonDirName = await findSubdirIgnoreCase(inputDirHandle, "ozon");
  let dirOzon: FileSystemDirectoryHandle | null = null;
  if (ozonDirName) {
    dirOzon = await inputDirHandle.getDirectoryHandle(ozonDirName);
  }

  try {
    // ============ 步骤1：重命名 1200 ============
    store.updateStep("rename-1200", { status: "running" });
    store.addLog("info", "正在重命名 1200 文件夹图片...");

    // 属性图：白底+有顶部文字 -> 单独命名 {商品编码}.jpg
    const attributeIds = orderInCategory.attribute || [];
    const attributeId = attributeIds[0] || null;
    const attributeImg = attributeId
      ? scan.folder1200.find((f) => f.id === attributeId) || null
      : null;

    const renameMap = buildRenameMap(styleCode, orderInCategory, scan, attributeId);
    const folder1200Out = await ensureFolder(outputDirHandle, "1200");

    let done = 0;
    const total = renameMap.size + (attributeImg ? 1 : 0);
    for (const [id, newName] of renameMap) {
      const img = scan.folder1200.find((f) => f.id === id);
      if (!img) continue;
      await writeFile(folder1200Out, newName, img.file);
      done++;
      store.updateStep("rename-1200", { count: { done, total } });
    }
    // 属性图单独命名
    if (attributeImg) {
      const attrName = `${productCode}.jpg`;
      await writeFile(folder1200Out, attrName, attributeImg.file);
      done++;
      store.updateStep("rename-1200", { count: { done, total } });
      store.addLog("success", `属性图已单独命名为 ${attrName}`);
    }
    store.updateStep("rename-1200", { status: "done", detail: `共 ${done} 张` });
    store.addLog("success", `1200 文件夹处理完成，共 ${done} 张图片`);

    // ============ 步骤2：生成 800×800 ============
    store.updateStep("gen-800", { status: "running" });
    store.addLog("info", "正在生成 800×800 方图...");
    const folder800 = await ensureFolder(outputDirHandle, "800");
    const entries800 = [...renameMap.entries()]; // [id, newName]
    let d2 = 0;
    const total2 = entries800.length;
    for (const [id, newName] of entries800) {
      const img = scan.folder1200.find((f) => f.id === id);
      if (!img) continue;
      const blob = await resizeToSquare(img.file, 800);
      await writeFile(folder800, newName, blob);
      d2++;
      store.updateStep("gen-800", { count: { done: d2, total: total2 } });
    }
    // 属性图也生成 800 版本（保持命名 {商品编码}.jpg）
    if (attributeImg) {
      const blob = await resizeToSquare(attributeImg.file, 800);
      await writeFile(folder800, `${productCode}.jpg`, blob);
    }
    store.updateStep("gen-800", { status: "done", detail: `共 ${d2} 张` });
    store.addLog("success", `800 文件夹生成完成，共 ${d2} 张方图`);

    // ============ 步骤3：生成 750×757 ============
    store.updateStep("gen-750", { status: "running" });
    store.addLog("info", "正在生成 750×757 扩边图...");
    const folder750 = await ensureFolder(outputDirHandle, "750");
    let d3 = 0;
    const total3 = entries800.length;
    for (const [id, newName] of entries800) {
      const img = scan.folder1200.find((f) => f.id === id);
      if (!img) continue;
      const blob = await resizeWithBottomPad(img.file, 750, 757);
      await writeFile(folder750, newName, blob);
      d3++;
      store.updateStep("gen-750", { count: { done: d3, total: total3 } });
    }
    if (attributeImg) {
      const blob = await resizeWithBottomPad(attributeImg.file, 750, 757);
      await writeFile(folder750, `${productCode}.jpg`, blob);
    }
    store.updateStep("gen-750", { status: "done", detail: `共 ${d3} 张` });
    store.addLog("success", `750 文件夹生成完成，共 ${d3} 张扩边图`);

    // ============ 步骤4：重命名 1688 ============
    store.updateStep("rename-1688", { status: "running" });
    if (dir1688) {
      store.addLog("info", "正在处理 1688 文件夹...");
      const targetFolder = await ensureFolder(outputDirHandle, productCode);
      // 先收集 1688 文件夹内所有图片文件
      const allFiles: FileSystemFileHandle[] = [];
      for await (const entry of dir1688.values()) {
        if (entry.kind === "file") {
          const ext = getExt(entry.name);
          if (IMAGE_EXTS.includes(ext)) {
            allFiles.push(entry as FileSystemFileHandle);
          }
        }
      }
      // 构建「配对图片 ID → 新文件名」映射
      const pairNames = ["陈悦组方图", "陈悦组首图", "杜青组方图", "杜青组首图"];
      const pairTargets: { id: string | null; newName: string }[] = [
        { id: pairs[0].square, newName: pairNames[0] },
        { id: pairs[0].first, newName: pairNames[1] },
        { id: pairs[1].square, newName: pairNames[2] },
        { id: pairs[1].first, newName: pairNames[3] },
      ];
      // 找到每个配对图片在 1688 文件夹内对应的原始文件名（通过 id 匹配 scan 中的记录）
      const renamedOriginals = new Set<string>();
      for (const t of pairTargets) {
        if (!t.id) continue;
        const img = scan.folder1688.find((f) => f.id === t.id);
        if (img) renamedOriginals.add(img.name);
      }
      let d4 = 0;
      const total4 = allFiles.length;
      // 遍历 1688 所有图片：配对的重命名，其余保留原名
      for (const fh of allFiles) {
        const file = await fh.getFile();
        const ext = getExt(fh.name);
        let outName: string;
        // 判断是否为某张配对图片
        let isPair = false;
        for (const t of pairTargets) {
          if (!t.id) continue;
          const img = scan.folder1688.find((f) => f.id === t.id);
          if (img && img.name === fh.name) {
            outName = `${t.newName}.${ext}`;
            isPair = true;
            break;
          }
        }
        if (!isPair) {
          outName = fh.name; // 其他图片保留原名
        }
        await writeFile(targetFolder, outName, file);
        d4++;
        store.updateStep("rename-1688", { count: { done: d4, total: total4 } });
      }
      const pairCount = renamedOriginals.size;
      store.updateStep("rename-1688", { status: "done", detail: `共 ${d4} 张（${pairCount} 张重命名）` });
      store.addLog("success", `1688 文件夹已改名为 ${productCode}，共 ${d4} 张图，其中 ${pairCount} 张已重命名`);
    } else {
      store.updateStep("rename-1688", { status: "done", detail: "无 1688 文件夹，跳过" });
      store.addLog("warn", "未发现 1688 文件夹，已跳过");
    }

    // ============ 步骤5：视频文件夹 ============
    store.updateStep("video-folder", { status: "running" });
    if (scan.videos.length > 0) {
      const videoFolderName = `${productCode}视频`;
      const videoFolder = await ensureFolder(outputDirHandle, videoFolderName);
      let d5 = 0;
      const total5 = scan.videos.length;
      for (const v of scan.videos) {
        await writeFile(videoFolder, v.name, v.file);
        d5++;
        store.updateStep("video-folder", { count: { done: d5, total: total5 } });
      }
      store.updateStep("video-folder", { status: "done", detail: `共 ${d5} 个视频` });
      store.addLog("success", `视频文件夹 ${videoFolderName} 已创建，共 ${d5} 个视频`);
    } else {
      store.updateStep("video-folder", { status: "done", detail: "无视频，跳过" });
      store.addLog("warn", "未发现视频文件，已跳过");
    }

    // ============ 步骤6：ozon 文件夹改名为 "900 1200" ============
    // 仅复制原文件到输出目录下的 "900 1200" 文件夹，不做任何处理
    store.updateStep("rename-ozon", { status: "running" });
    if (dirOzon) {
      store.addLog("info", `正在处理 ozon 文件夹 → 改名为 "900 1200"...`);
      const OZON_OUT_NAME = "900 1200";
      const ozonOut = await ensureFolder(outputDirHandle, OZON_OUT_NAME);
      let d6 = 0;
      const ozonFiles: FileSystemFileHandle[] = [];
      for await (const entry of dirOzon.values()) {
        if (entry.kind === "file") {
          ozonFiles.push(entry as FileSystemFileHandle);
        }
      }
      const total6 = ozonFiles.length;
      for (const fh of ozonFiles) {
        const file = await fh.getFile();
        await writeFile(ozonOut, fh.name, file);
        d6++;
        store.updateStep("rename-ozon", { count: { done: d6, total: total6 } });
      }
      store.updateStep("rename-ozon", { status: "done", detail: `共 ${d6} 个文件` });
      store.addLog("success", `ozon 已改名为 "${OZON_OUT_NAME}"，共复制 ${d6} 个文件`);
    } else {
      store.updateStep("rename-ozon", { status: "done", detail: "无 ozon 文件夹，跳过" });
      store.addLog("warn", "未发现 ozon 文件夹，已跳过");
    }

    store.addLog("success", "全部处理完成！输出目录：" + outputDirHandle.name);
    store.setProcessing(false);
    store.setStep("done");
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    store.addLog("error", `处理失败：${msg}`);
    store.setProcessing(false);
    throw e;
  }
}

// 辅助：检查子目录是否存在
async function hasSubdir(parent: FileSystemDirectoryHandle, name: string): Promise<boolean> {
  try {
    await parent.getDirectoryHandle(name);
    return true;
  } catch {
    return false;
  }
}

// 辅助：大小写不敏感地查找子目录，返回实际目录名（未找到返回 null）
async function findSubdirIgnoreCase(
  parent: FileSystemDirectoryHandle,
  target: string,
): Promise<string | null> {
  const lower = target.toLowerCase();
  for await (const entry of parent.values()) {
    if (entry.kind === "directory" && entry.name.toLowerCase() === lower) {
      return entry.name;
    }
  }
  return null;
}


