/// <reference types="vite/client" />

// File System Access API 类型声明（Chromium 浏览器支持）
interface FileSystemHandlePermissionDescriptor {
  mode?: "read" | "readwrite";
}

interface FileSystemHandle {
  queryPermission(descriptor?: FileSystemHandlePermissionDescriptor): Promise<PermissionState>;
  requestPermission(descriptor?: FileSystemHandlePermissionDescriptor): Promise<PermissionState>;
}

// FileSystemDirectoryHandle 异步迭代器方法（部分 TS lib 未包含）
interface FileSystemDirectoryHandle {
  values(): AsyncIterableIterator<FileSystemHandle>;
  keys(): AsyncIterableIterator<string>;
  entries(): AsyncIterableIterator<[string, FileSystemHandle]>;
  [Symbol.asyncIterator](): AsyncIterableIterator<[string, FileSystemHandle]>;
}

// 可写文件流类型
interface FileSystemWritableFileStream extends WritableStream {
  write(data: BufferSource | Blob | string | { type: string; position?: number; size?: number; data: BufferSource | Blob | string }): Promise<void>;
  seek(position: number): Promise<void>;
  truncate(size: number): Promise<void>;
}

interface FileSystemFileHandle {
  createWritable(): Promise<FileSystemWritableFileStream>;
}

interface Window {
  showDirectoryPicker(options?: {
    id?: string;
    mode?: "read" | "readwrite";
    startIn?: FileSystemHandle | string;
  }): Promise<FileSystemDirectoryHandle>;
}
