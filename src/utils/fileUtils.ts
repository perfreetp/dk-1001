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

export async function renameFile(oldPath: string, newPath: string, conflictStrategy: 'skip' | 'rename' | 'overwrite' = 'rename'): Promise<{ success: boolean; finalPath: string }> {
  const targetExists = await fs.pathExists(newPath);
  
  if (targetExists && conflictStrategy === 'skip') {
    return { success: false, finalPath: oldPath };
  }
  
  let finalPath = newPath;
  if (targetExists && conflictStrategy === 'rename') {
    const ext = path.extname(newPath);
    const base = path.basename(newPath, ext);
    const dir = path.dirname(newPath);
    let counter = 1;
    while (await fs.pathExists(finalPath)) {
      finalPath = path.join(dir, `${base} (${counter})${ext}`);
      counter++;
    }
  }
  
  await fs.move(oldPath, finalPath, { overwrite: conflictStrategy === 'overwrite' });
  
  const tagFileOld = oldPath + '.tags';
  const tagFileNew = finalPath + '.tags';
  if (await fs.pathExists(tagFileOld)) {
    await fs.move(tagFileOld, tagFileNew, { overwrite: true });
  }
  
  return { success: true, finalPath };
}

export async function moveFile(source: string, destination: string, conflictStrategy: 'skip' | 'rename' | 'overwrite' = 'rename'): Promise<{ success: boolean; finalPath: string }> {
  await fs.ensureDir(path.dirname(destination));
  
  const targetExists = await fs.pathExists(destination);
  
  if (targetExists && conflictStrategy === 'skip') {
    return { success: false, finalPath: source };
  }
  
  let finalPath = destination;
  if (targetExists && conflictStrategy === 'rename') {
    const ext = path.extname(destination);
    const base = path.basename(destination, ext);
    const dir = path.dirname(destination);
    let counter = 1;
    while (await fs.pathExists(finalPath)) {
      finalPath = path.join(dir, `${base} (${counter})${ext}`);
      counter++;
    }
  }
  
  await fs.move(source, finalPath, { overwrite: conflictStrategy === 'overwrite' });
  
  const tagFileSource = source + '.tags';
  const tagFileDest = finalPath + '.tags';
  if (await fs.pathExists(tagFileSource)) {
    await fs.move(tagFileSource, tagFileDest, { overwrite: true });
  }
  
  return { success: true, finalPath };
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