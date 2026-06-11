import * as fs from 'fs-extra';
import * as path from 'path';
import { EbookInfo, ScanOptions } from '../types';
import { scanDirectory, getFileExtension, getFileSize, getFileModifiedTime, formatFileSize } from '../utils/fileUtils';
import { parseFileName, detectLanguage, getBookCategory } from '../utils/ebookParser';
import { saveIndex, loadIndex } from '../utils/indexManager';

const EBOOK_EXTENSIONS = ['.epub', '.mobi', '.pdf', '.azw', '.azw3', '.txt', '.doc', '.docx'];

export async function scan(options: ScanOptions, useIndex: boolean = false): Promise<EbookInfo[]> {
  const { directory, format, language, recursive = true, updateIndex = true } = options;
  
  if (useIndex) {
    const index = await loadIndex(directory);
    if (index) {
      return index.books.map(book => ({
        ...book,
        lastModified: new Date(book.lastModified)
      }));
    }
  }

  const allFiles = await scanDirectory(directory, recursive);
  const ebookFiles = allFiles.filter(file => 
    EBOOK_EXTENSIONS.includes(getFileExtension(file))
  );

  const ebooks: EbookInfo[] = [];
  
  for (const filePath of ebookFiles) {
    const extension = getFileExtension(filePath);
    
    if (format && extension !== `.${format.toLowerCase()}`) {
      continue;
    }

    const { title, author } = parseFileName(filePath);
    const detectedLanguage = detectLanguage(title + author);
    
    if (language && detectedLanguage !== language) {
      continue;
    }

    const size = await getFileSize(filePath);
    const lastModified = await getFileModifiedTime(filePath);
    const tags = await loadTags(filePath);
    const hasCover = await checkCover(filePath);
    
    const category = getBookCategory(title);
    const autoTags = [detectedLanguage];
    const allTags = [...new Set([...autoTags, ...tags])];
    
    ebooks.push({
      filePath,
      fileName: filePath.split('\\').pop() || '',
      extension,
      title,
      author,
      category,
      size,
      lastModified,
      hasCover,
      tags: allTags
    });
  }

  if (updateIndex) {
    await saveIndex(directory, ebooks);
  }

  return ebooks;
}

async function loadTags(filePath: string): Promise<string[]> {
  const tagFilePath = filePath + '.tags';
  if (await fs.pathExists(tagFilePath)) {
    const content = await fs.readFile(tagFilePath, 'utf-8');
    return content.split(',').map(t => t.trim()).filter(Boolean);
  }
  return [];
}

async function checkCover(filePath: string): Promise<boolean> {
  const dir = path.dirname(filePath);
  const baseName = path.basename(filePath, path.extname(filePath));
  const coverExtensions = ['.jpg', '.jpeg', '.png'];
  
  for (const ext of coverExtensions) {
    const coverPath = path.join(dir, `${baseName}${ext}`);
    if (await fs.pathExists(coverPath)) {
      return true;
    }
  }
  
  const genericCovers = ['cover.jpg', 'cover.png', 'Cover.jpg', 'Cover.png'];
  for (const coverName of genericCovers) {
    const coverPath = path.join(dir, coverName);
    if (await fs.pathExists(coverPath)) {
      return true;
    }
  }
  
  return false;
}

export function printScanResults(ebooks: EbookInfo[], chalk: any): void {
  console.log(chalk.bold('\n扫描结果:'));
  console.log(chalk.gray('='.repeat(100)));
  
  const headers = ['序号', '书名', '作者', '格式', '大小', '语言', '分类', '标签', '封面'];
  console.log(
    chalk.cyan(headers.map(h => h.padEnd(12)).join(' | '))
  );
  console.log(chalk.gray('-'.repeat(100)));

  ebooks.forEach((ebook, index) => {
    const lang = ebook.tags.includes('zh') ? '中文' : ebook.tags.includes('en') ? '英文' : '其他';
    const category = ebook.tags.find((t: string) => !['zh', 'en', 'other'].includes(t)) || '其他';
    const customTags = ebook.tags.filter((t: string) => !['zh', 'en', 'other', category].includes(t));
    
    console.log(
      `${(index + 1).toString().padEnd(6)} | ` +
      `${ebook.title.padEnd(18).slice(0, 18)} | ` +
      `${ebook.author.padEnd(10).slice(0, 10)} | ` +
      `${ebook.extension.padEnd(8)} | ` +
      `${formatFileSize(ebook.size).padEnd(10)} | ` +
      `${lang.padEnd(8)} | ` +
      `${category.padEnd(8)} | ` +
      `${customTags.join(',').padEnd(12).slice(0, 12)} | ` +
      `${ebook.hasCover ? chalk.green('有') : chalk.red('无')}`
    );
  });

  console.log(chalk.gray('='.repeat(100)));
  console.log(chalk.green(`共找到 ${ebooks.length} 本电子书`));
}