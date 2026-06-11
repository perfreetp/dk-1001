import chalk from 'chalk';
import { EbookInfo, ScanOptions } from '../types';
import { scanDirectory, getFileExtension, getFileSize, getFileModifiedTime, formatFileSize } from '../utils/fileUtils';
import { parseFileName, detectLanguage, getBookCategory } from '../utils/ebookParser';

const EBOOK_EXTENSIONS = ['.epub', '.mobi', '.pdf', '.azw', '.azw3', '.txt', '.doc', '.docx'];

export async function scan(options: ScanOptions): Promise<EbookInfo[]> {
  const { directory, format, language, recursive = true } = options;
  
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
    
    ebooks.push({
      filePath,
      fileName: filePath.split('\\').pop() || '',
      extension,
      title,
      author,
      size,
      lastModified,
      hasCover: false,
      tags: [getBookCategory(title), detectedLanguage]
    });
  }

  return ebooks;
}

export function printScanResults(ebooks: EbookInfo[]): void {
  console.log(chalk.bold('\n扫描结果:'));
  console.log(chalk.gray('='.repeat(80)));
  
  const headers = ['序号', '书名', '作者', '格式', '大小', '语言', '分类'];
  console.log(
    chalk.cyan(headers.map(h => h.padEnd(15)).join(' | '))
  );
  console.log(chalk.gray('-'.repeat(80)));

  ebooks.forEach((ebook, index) => {
    console.log(
      `${(index + 1).toString().padEnd(6)} | ` +
      `${ebook.title.padEnd(20).slice(0, 20)} | ` +
      `${ebook.author.padEnd(12).slice(0, 12)} | ` +
      `${ebook.extension.padEnd(8)} | ` +
      `${formatFileSize(ebook.size).padEnd(10)} | ` +
      `${ebook.tags.includes('zh') ? '中文' : ebook.tags.includes('en') ? '英文' : '其他'}`
    );
  });

  console.log(chalk.gray('='.repeat(80)));
  console.log(chalk.green(`共找到 ${ebooks.length} 本电子书`));
}