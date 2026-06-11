import * as fs from 'fs-extra';
import * as path from 'path';
import { OperationRecord, ChangeRecord } from '../types';

const STATE_FILE = '.ebook-organizer.json';

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