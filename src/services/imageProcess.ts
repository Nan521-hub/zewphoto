import type { ImageFile } from "@/types";

// 加载图片
function loadImage(file: File | Blob): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      resolve(img);
      // 不立刻 revoke，由调用方管理；这里小图处理快可延后
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    };
    img.onerror = (e) => {
      URL.revokeObjectURL(url);
      reject(e);
    };
    img.src = url;
  });
}

// 等比缩放方图：1200×1200 -> size×size
export async function resizeToSquare(file: File, size: number, quality = 0.92): Promise<Blob> {
  const img = await loadImage(file);
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d")!;
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  // 直接绘制为目标尺寸（已假设源图为方图；若非方图则居中裁剪）
  const sw = img.naturalWidth;
  const sh = img.naturalHeight;
  const sSize = Math.min(sw, sh);
  const sx = (sw - sSize) / 2;
  const sy = (sh - sSize) / 2;
  ctx.drawImage(img, sx, sy, sSize, sSize, 0, 0, size, size);
  return await new Promise<Blob>((resolve) => {
    canvas.toBlob((b) => resolve(b!), "image/jpeg", quality);
  });
}

// 缩放并向下扩边：1200×1200 -> W×H（底部留白）
// 规则：将原图等比缩放到 W×W（占满宽度），然后画在 W×H 画布顶部，底部 (H-W) 像素填充白色
export async function resizeWithBottomPad(
  file: File,
  width: number,
  height: number,
  bg: string = "#FFFFFF",
  quality = 0.92,
): Promise<Blob> {
  const img = await loadImage(file);
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d")!;
  // 先填背景
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, width, height);
  // 等比缩放到 width×width，绘制在 (0,0)
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  const sw = img.naturalWidth;
  const sh = img.naturalHeight;
  // 假设源为方图，按 width 缩放
  const sSize = Math.min(sw, sh);
  const sx = (sw - sSize) / 2;
  const sy = (sh - sSize) / 2;
  ctx.drawImage(img, sx, sy, sSize, sSize, 0, 0, width, width);
  return await new Promise<Blob>((resolve) => {
    canvas.toBlob((b) => resolve(b!), "image/jpeg", quality);
  });
}

// 直接复制原图（用于 1200 重命名场景，保留 1200×1200 原尺寸）
export async function cloneImageBlob(file: File): Promise<Blob> {
  return file;
}

// 白底检测：分析顶部、底部、四角像素
export async function detectWhiteBackground(file: File): Promise<boolean> {
  try {
    const img = await loadImage(file);
    const w = img.naturalWidth;
    const h = img.naturalHeight;
    if (w === 0 || h === 0) return false;
    const canvas = document.createElement("canvas");
    // 缩到 200×200 加速
    const SS = 200;
    canvas.width = SS;
    canvas.height = SS;
    const ctx = canvas.getContext("2d", { willReadFrequently: true })!;
    ctx.drawImage(img, 0, 0, SS, SS);
    const data = ctx.getImageData(0, 0, SS, SS).data;

    // 取顶部 10%、底部 10%、四角 16×16
    const topH = Math.floor(SS * 0.1);
    const botStart = SS - topH;
    const cornerSize = 16;
    const samples: [number, number, number, number][] = [
      [0, 0, cornerSize, cornerSize],
      [SS - cornerSize, 0, SS, cornerSize],
      [0, SS - cornerSize, cornerSize, SS],
      [SS - cornerSize, SS - cornerSize, cornerSize, SS],
      [0, 0, SS, topH],
      [0, botStart, SS, SS],
    ];

    let sumR = 0,
      sumG = 0,
      sumB = 0,
      sumSq = 0,
      n = 0;
    for (const [x0, y0, x1, y1] of samples) {
      for (let y = y0; y < y1; y++) {
        for (let x = x0; x < x1; x++) {
          const idx = (y * SS + x) * 4;
          const r = data[idx];
          const g = data[idx + 1];
          const b = data[idx + 2];
          const lum = 0.299 * r + 0.587 * g + 0.114 * b;
          sumR += r;
          sumG += g;
          sumB += b;
          sumSq += lum * lum;
          n++;
        }
      }
    }
    if (n === 0) return false;
    const meanLum = (0.299 * sumR + 0.587 * sumG + 0.114 * sumB) / n;
    const variance = sumSq / n - meanLum * meanLum;
    // 白底：平均亮度高，方差小
    return meanLum > 240 && variance < 100;
  } catch {
    return false;
  }
}

// 顶部文字检测：顶部 15% 区域是否存在显著的暗色像素簇
export async function detectTopText(file: File): Promise<boolean> {
  try {
    const img = await loadImage(file);
    const w = img.naturalWidth;
    const h = img.naturalHeight;
    if (w === 0 || h === 0) return false;
    const canvas = document.createElement("canvas");
    const SS = 240;
    canvas.width = SS;
    canvas.height = SS;
    const ctx = canvas.getContext("2d", { willReadFrequently: true })!;
    ctx.drawImage(img, 0, 0, SS, SS);
    const topBandH = Math.floor(SS * 0.15);
    const data = ctx.getImageData(0, 0, SS, topBandH).data;

    // 统计暗像素（亮度 < 180）数量，并检测列分布
    let darkCount = 0;
    const colDark = new Array(SS).fill(0);
    for (let y = 0; y < topBandH; y++) {
      for (let x = 0; x < SS; x++) {
        const idx = (y * SS + x) * 4;
        const r = data[idx];
        const g = data[idx + 1];
        const b = data[idx + 2];
        const lum = 0.299 * r + 0.587 * g + 0.114 * b;
        if (lum < 180) {
          darkCount++;
          colDark[x] = 1;
        }
      }
    }
    // 暗像素占比超过 1% 且分布在 5 列以上 -> 判为有文字
    const totalPixels = SS * topBandH;
    const ratio = darkCount / totalPixels;
    const colSum = colDark.reduce((a, b) => a + b, 0);
    return ratio > 0.01 && colSum > 5;
  } catch {
    return false;
  }
}

// 批量检测白底图和顶部文字
export async function batchDetect(
  files: ImageFile[],
  onProgress?: (idx: number, total: number, file: ImageFile) => void,
): Promise<{ fileId: string; isWhiteBg: boolean; hasTopText: boolean }[]> {
  const results: { fileId: string; isWhiteBg: boolean; hasTopText: boolean }[] = [];
  for (let i = 0; i < files.length; i++) {
    const f = files[i];
    onProgress?.(i, files.length, f);
    try {
      const isWhiteBg = await detectWhiteBackground(f.file);
      const hasTopText = isWhiteBg ? await detectTopText(f.file) : false;
      results.push({ fileId: f.id, isWhiteBg, hasTopText });
    } catch {
      results.push({ fileId: f.id, isWhiteBg: false, hasTopText: false });
    }
  }
  return results;
}
