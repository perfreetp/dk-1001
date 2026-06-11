import * as fs from 'fs-extra';
import * as path from 'path';

const IGNORED_DIRECTORIES = ['.ebook-organizer-trash', '.git', 'node_modules'];

export async function scanDirectory(directory: string, recursive: boolean = true): Promise<string[]> {
  const files: string[] = [];
  const entries = await fs.readdir(directory, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(directory, entry.name);
    
    if (entry.isDirectory()) {
      if (IGNORED_DIRECTORIES.includes(entry.name)) {
        continue;
      }
      if (recursive) {
        const subFiles = await scanDirectory(fullPath, recursive);
        files.push(...subFiles);
      }
    } else if (entry.isFile()) {
      files.push(fullPath);
    }
  }

  return files;
}

export function getFileExtension(filePath: string): string {
  return path.extname(filePath).toLowerCase();
}

export function getFileNameWithoutExtension(filePath: string): string {
  return path.basename(filePath, path.extname(filePath));
}

export async function getFileSize(filePath: string): Promise<number> {
  const stats = await fs.stat(filePath);
  return stats.size;
}

export async function getFileModifiedTime(filePath: string): Promise<Date> {
  const stats = await fs.stat(filePath);
  return stats.mtime;
}

export async function fileExists(filePath: string): Promise<boolean> {
  return fs.pathExists(filePath);
}

export async function renameFile(oldPath: string, newPath: string): Promise<void> {
  await fs.move(oldPath, newPath, { overwrite: true });
  
  const tagFileOld = oldPath + '.tags';
  const tagFileNew = newPath + '.tags';
  if (await fs.pathExists(tagFileOld)) {
    await fs.move(tagFileOld, tagFileNew, { overwrite: true });
  }
}

export async function moveFile(source: string, destination: string): Promise<void> {
  await fs.ensureDir(path.dirname(destination));
  await fs.move(source, destination, { overwrite: true });
  
  const tagFileSource = source + '.tags';
  const tagFileDest = destination + '.tags';
  if (await fs.pathExists(tagFileSource)) {
    await fs.move(tagFileSource, tagFileDest, { overwrite: true });
  }
}

export async function deleteFile(filePath: string): Promise<void> {
  await fs.remove(filePath);
  
  const tagFile = filePath + '.tags';
  if (await fs.pathExists(tagFile)) {
    await fs.remove(tagFile);
  }
}

export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

export function sanitizeFileName(name: string): string {
  return name.replace(/[\\/:*?"<>|]/g, '_');
}