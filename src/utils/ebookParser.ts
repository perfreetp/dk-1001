import * as path from 'path';
import { getFileNameWithoutExtension } from './fileUtils';

const AUTHOR_SEPARATORS = ['-', '—', '–', '_', ' by ', ' By ', ' 著', '著', ' 编', '编', '译', '译者'];

export interface ParsedEbookInfo {
  title: string;
  author: string;
}

export function parseFileName(filePath: string): ParsedEbookInfo {
  const fileName = getFileNameWithoutExtension(filePath);
  let title = fileName;
  let author = '';

  for (const separator of AUTHOR_SEPARATORS) {
    const index = fileName.indexOf(separator);
    if (index !== -1) {
      const potentialAuthor = fileName.substring(index + separator.length).trim();
      const potentialTitle = fileName.substring(0, index).trim();
      
      if (potentialAuthor && potentialAuthor.length > 1 && potentialTitle.length > 1) {
        author = cleanAuthorName(potentialAuthor);
        title = cleanTitle(potentialTitle);
        break;
      }
    }
  }

  if (!author) {
    const bracketMatch = fileName.match(/\[([^\]]+)\]/);
    if (bracketMatch) {
      author = cleanAuthorName(bracketMatch[1]);
      title = cleanTitle(fileName.replace(/\[[^\]]+\]/g, '').trim());
    }
  }

  if (!author) {
    const parenMatch = fileName.match(/\(([^)]+)\)/);
    if (parenMatch) {
      author = cleanAuthorName(parenMatch[1]);
      title = cleanTitle(fileName.replace(/\([^)]+\)/g, '').trim());
    }
  }

  title = cleanTitle(title);
  author = cleanAuthorName(author);

  return { title, author };
}

function cleanTitle(title: string): string {
  return title
    .replace(/^\s+|\s+$/g, '')
    .replace(/[._]+/g, ' ')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

function cleanAuthorName(name: string): string {
  return name
    .replace(/^\s+|\s+$/g, '')
    .replace(/[._]+/g, ' ')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

export function detectLanguage(text: string): 'zh' | 'en' | 'other' {
  const chineseChars = text.match(/[\u4e00-\u9fa5]/g);
  const englishChars = text.match(/[a-zA-Z]/g);

  if (chineseChars && englishChars) {
    return chineseChars.length > englishChars.length ? 'zh' : 'en';
  } else if (chineseChars) {
    return 'zh';
  } else if (englishChars) {
    return 'en';
  }
  return 'other';
}

export function getBookCategory(title: string): string {
  const categories: Record<string, string[]> = {
    '小说': ['小说', '故事', '文学', '名著', '长篇', '短篇', '连载'],
    '技术': ['编程', '代码', '技术', '计算机', '编程', '算法', '数据', 'AI', '人工智能', '机器学习', '深入理解'],
    '历史': ['历史', '古代', '文明', '战争', '朝代'],
    '哲学': ['哲学', '思想', '逻辑', '思考'],
    '传记': ['传记', '自传', '回忆录', '生平'],
    '商业': ['商业', '管理', '营销', '创业', '投资'],
    '科学': ['科学', '科普', '物理', '化学', '生物'],
    '艺术': ['艺术', '绘画', '音乐', '设计'],
    '生活': ['生活', '健康', '美食', '旅行', '心理']
  };

  for (const [category, keywords] of Object.entries(categories)) {
    if (keywords.some(keyword => title.includes(keyword))) {
      return category;
    }
  }
  return '其他';
}