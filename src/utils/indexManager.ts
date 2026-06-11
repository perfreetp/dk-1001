import * as fs from 'fs-extra';
import * as path from 'path';
import { EbookInfo } from '../types';

const INDEX_FILE = '.ebook-index.json';

export interface IndexEntry extends Omit<EbookInfo, 'lastModified'> {
  lastModified: string;
}

export interface LibraryIndex {
  version: string;
  lastUpdated: string;
  books: IndexEntry[];
}

let currentIndex: LibraryIndex | null = null;

export async function loadIndex(directory: string): Promise<LibraryIndex | null> {
  const indexPath = path.join(directory, INDEX_FILE);
  if (await fs.pathExists(indexPath)) {
    const content = await fs.readFile(indexPath, 'utf-8');
    const parsed = JSON.parse(content);
    for (const book of parsed.books) {
      if (!book.category) {
        book.category = book.tags?.find((t: string) => !['zh', 'en', 'other'].includes(t)) || '其他';
      }
    }
    currentIndex = parsed;
    return currentIndex;
  }
  return null;
}

export async function saveIndex(directory: string, books: EbookInfo[]): Promise<void> {
  const index: LibraryIndex = {
    version: '1.0',
    lastUpdated: new Date().toISOString(),
    books: books.map(book => ({
      ...book,
      lastModified: book.lastModified.toISOString()
    }))
  };
  
  const indexPath = path.join(directory, INDEX_FILE);
  await fs.writeFile(indexPath, JSON.stringify(index, null, 2));
  currentIndex = index;
}

export function getCurrentIndex(): LibraryIndex | null {
  return currentIndex;
}

export async function updateIndexPath(directory: string, oldPath: string, newPath: string): Promise<void> {
  const index = await loadIndex(directory);
  if (!index) return;
  
  const book = index.books.find(b => b.filePath === oldPath);
  if (book) {
    book.filePath = newPath;
    book.fileName = path.basename(newPath);
    const indexPath = path.join(directory, INDEX_FILE);
    await fs.writeFile(indexPath, JSON.stringify(index, null, 2));
    currentIndex = index;
  }
}

export async function updateIndexTags(directory: string, filePath: string, tags: string[]): Promise<void> {
  const index = await loadIndex(directory);
  if (!index) return;
  
  const book = index.books.find(b => b.filePath === filePath);
  if (book) {
    book.tags = tags;
    const indexPath = path.join(directory, INDEX_FILE);
    await fs.writeFile(indexPath, JSON.stringify(index, null, 2));
    currentIndex = index;
  }
}

export async function updateIndexCategory(directory: string, filePath: string, category: string): Promise<void> {
  const index = await loadIndex(directory);
  if (!index) return;
  
  const book = index.books.find(b => b.filePath === filePath);
  if (book) {
    book.category = category;
    const indexPath = path.join(directory, INDEX_FILE);
    await fs.writeFile(indexPath, JSON.stringify(index, null, 2));
    currentIndex = index;
  }
}

export async function removeFromIndex(directory: string, filePath: string): Promise<void> {
  const index = await loadIndex(directory);
  if (!index) return;
  
  index.books = index.books.filter(b => b.filePath !== filePath);
  const indexPath = path.join(directory, INDEX_FILE);
  await fs.writeFile(indexPath, JSON.stringify(index, null, 2));
  currentIndex = index;
}

export async function addToIndex(directory: string, book: EbookInfo): Promise<void> {
  const index = await loadIndex(directory);
  if (!index) return;
  
  const existing = index.books.find(b => b.filePath === book.filePath);
  if (!existing) {
    index.books.push({
      ...book,
      lastModified: book.lastModified.toISOString()
    });
    const indexPath = path.join(directory, INDEX_FILE);
    await fs.writeFile(indexPath, JSON.stringify(index, null, 2));
    currentIndex = index;
  }
}

export async function getIndexAge(directory: string): Promise<number | null> {
  const indexPath = path.join(directory, INDEX_FILE);
  if (await fs.pathExists(indexPath)) {
    const stats = await fs.stat(indexPath);
    return Date.now() - stats.mtime.getTime();
  }
  return null;
}

export function findBooksByTag(books: EbookInfo[], tag: string): EbookInfo[] {
  return books.filter(book => book.tags.includes(tag));
}

export function findBooksByCategory(books: EbookInfo[], category: string): EbookInfo[] {
  return books.filter(book => book.category === category);
}

export function findBooksByAuthor(books: EbookInfo[], author: string): EbookInfo[] {
  return books.filter(book => 
    book.author.toLowerCase().includes(author.toLowerCase())
  );
}