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

export async function moveToTrash(sourcePath: string, directory: string): Promise<string> {
  const trashDir = path.join(directory, TRASH_DIR);
  await fs.ensureDir(trashDir);
  
  const fileName = path.basename(sourcePath);
  const timestamp = Date.now();
  const trashFileName = `${timestamp}-${fileName}`;
  const trashPath = path.join(trashDir, trashFileName);
  
  await fs.move(sourcePath, trashPath, { overwrite: true });
  
  return trashPath;
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