export interface EbookInfo {
  filePath: string;
  fileName: string;
  extension: string;
  title: string;
  author: string;
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
}

export interface RenameOptions {
  directory: string;
  pattern?: string;
  move?: boolean;
  preview?: boolean;
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
}

export interface ExportOptions {
  directory: string;
  output: string;
  format?: 'json' | 'yaml' | 'csv' | 'md';
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