export interface EbookInfo {
  filePath: string;
  fileName: string;
  extension: string;
  title: string;
  author: string;
  category: string;
  size: number;
  lastModified: Date;
  hasCover: boolean;
  tags: string[];
}

export interface ScanOptions {
  directory: string;
  format?: string;
  language?: string;
  recursive?: boolean;
  updateIndex?: boolean;
}

export interface RenameOptions {
  directory: string;
  pattern?: string;
  move?: boolean;
  preview?: boolean;
  conflict?: 'skip' | 'rename' | 'overwrite';
}

export interface TagOptions {
  directory: string;
  add?: string[];
  remove?: string[];
  listMissingCovers?: boolean;
  preview?: boolean;
}

export interface DedupeOptions {
  directory: string;
  threshold?: number;
  preview?: boolean;
  conflict?: 'skip' | 'rename' | 'overwrite';
}

export interface ExportOptions {
  directory: string;
  output: string;
  format?: 'json' | 'yaml' | 'csv' | 'md';
  tag?: string;
  category?: string;
  author?: string;
}

export interface OperationRecord {
  id: string;
  type: string;
  timestamp: Date;
  changes: ChangeRecord[];
}

export interface ChangeRecord {
  type: 'rename' | 'move' | 'tag' | 'delete';
  source: string;
  target?: string;
  metadata?: Record<string, unknown>;
}

export interface ConflictResult {
  source: string;
  target: string;
  action: 'skip' | 'rename' | 'overwrite';
  finalPath?: string;
}