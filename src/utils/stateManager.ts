import * as fs from 'fs-extra';
import * as path from 'path';
import { OperationRecord, ChangeRecord } from '../types';

const STATE_FILE = '.ebook-organizer.json';
const TRASH_DIR = '.ebook-organizer-trash';

interface State {
  lastOperation: OperationRecord | null;
  history: OperationRecord[];
}

let state: State = {
  lastOperation: null,
  history: []
};

export async function loadState(directory: string): Promise<void> {
  const statePath = path.join(directory, STATE_FILE);
  if (await fs.pathExists(statePath)) {
    const content = await fs.readFile(statePath, 'utf-8');
    state = JSON.parse(content);
  } else {
    state = { lastOperation: null, history: [] };
  }
}

export async function saveState(directory: string): Promise<void> {
  const statePath = path.join(directory, STATE_FILE);
  await fs.writeFile(statePath, JSON.stringify(state, null, 2));
}

export function createOperationRecord(type: string, changes: ChangeRecord[]): OperationRecord {
  return {
    id: generateId(),
    type,
    timestamp: new Date(),
    changes
  };
}

export function addOperation(record: OperationRecord): void {
  state.lastOperation = record;
  state.history.unshift(record);
  if (state.history.length > 10) {
    state.history = state.history.slice(0, 10);
  }
}

export function getLastOperation(): OperationRecord | null {
  return state.lastOperation;
}

export function undoLastOperation(): OperationRecord | null {
  const lastOp = state.lastOperation;
  if (lastOp) {
    state.lastOperation = state.history.length > 1 ? state.history[1] : null;
    state.history = state.history.slice(1);
  }
  return lastOp;
}

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

export function getHistory(): OperationRecord[] {
  return state.history;
}

export async function moveToTrash(sourcePath: string, directory: string, conflict: 'skip' | 'rename' | 'overwrite' = 'rename'): Promise<{ success: boolean; trashPath?: string }> {
  const trashDir = path.join(directory, TRASH_DIR);
  await fs.ensureDir(trashDir);
  
  const fileName = path.basename(sourcePath);
  const timestamp = Date.now();
  let trashFileName = `${timestamp}-${fileName}`;
  let trashPath = path.join(trashDir, trashFileName);
  
  const targetExists = await fs.pathExists(trashPath);
  
  if (targetExists) {
    if (conflict === 'skip') {
      return { success: false };
    } else if (conflict === 'rename') {
      const ext = path.extname(trashFileName);
      const base = path.basename(trashFileName, ext);
      let counter = 1;
      while (await fs.pathExists(trashPath)) {
        trashFileName = `${base}_${counter}${ext}`;
        trashPath = path.join(trashDir, trashFileName);
        counter++;
      }
    }
  }
  
  await fs.move(sourcePath, trashPath, { overwrite: conflict === 'overwrite' });
  
  return { success: true, trashPath };
}

export async function restoreFromTrash(trashPath: string, originalPath: string): Promise<void> {
  await fs.move(trashPath, originalPath, { overwrite: true });
  
  const trashDir = path.dirname(trashPath);
  if ((await fs.readdir(trashDir)).length === 0) {
    await fs.remove(trashDir);
  }
}

export async function cleanTrash(directory: string): Promise<void> {
  const trashDir = path.join(directory, TRASH_DIR);
  if (await fs.pathExists(trashDir)) {
    await fs.remove(trashDir);
  }
}

export function getTrashDirectory(directory: string): string {
  return path.join(directory, TRASH_DIR);
}