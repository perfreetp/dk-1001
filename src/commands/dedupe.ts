import chalk from 'chalk';
import { DedupeOptions, ChangeRecord } from '../types';
import { scan } from './scan';
import { formatFileSize } from '../utils/fileUtils';
import { createOperationRecord, addOperation, saveState, moveToTrash } from '../utils/stateManager';

export interface DuplicateGroup {
  title: string;
  author: string;
  books: {
    filePath: string;
    fileName: string;
    size: number;
    extension: string;
  }[];
}

export async function dedupe(options: DedupeOptions): Promise<void> {
  const { directory, threshold = 0.9, preview = false } = options;
  
  const ebooks = await scan({ directory, recursive: true });
  const duplicates = await findDuplicates(ebooks, threshold);

  console.log(chalk.bold('\n重复书籍检测结果:'));
  console.log(chalk.gray('='.repeat(100)));

  const changes: ChangeRecord[] = [];
  let totalDuplicates = 0;

  duplicates.forEach((group, index) => {
    if (group.books.length > 1) {
      console.log(chalk.cyan(`\n重复组 ${index + 1}:`));
      console.log(chalk.yellow(`  书名: ${group.title}`));
      if (group.author) {
        console.log(chalk.yellow(`  作者: ${group.author}`));
      }
      console.log(chalk.gray('  文件:'));
      
      group.books.forEach((book, idx) => {
        const status = idx === 0 ? chalk.green('(保留)') : chalk.red('(重复)');
        console.log(`    ${idx + 1}. ${book.fileName}`);
        console.log(`       大小: ${formatFileSize(book.size)}`);
        console.log(`       ${status}`);
        
        if (idx > 0) {
          changes.push({
            type: 'delete',
            source: book.filePath,
            target: '',
            metadata: {
              keepPath: group.books[0].filePath,
              trashPath: ''
            }
          });
          totalDuplicates++;
        }
      });
    }
  });

  console.log(chalk.gray('='.repeat(100)));
  console.log(chalk.cyan(`共发现 ${duplicates.length} 组重复，${totalDuplicates} 个重复文件`));

  if (!preview && changes.length > 0) {
    for (const change of changes) {
      const trashPath = await moveToTrash(change.source, directory);
      change.target = trashPath;
      change.metadata = change.metadata || {};
      change.metadata.trashPath = trashPath;
    }
    
    const operation = createOperationRecord('dedupe', changes);
    addOperation(operation);
    await saveState(directory);
    
    console.log(chalk.green('\n操作已完成!'));
    console.log(chalk.blue(`重复文件已移至恢复区域: .ebook-organizer-trash/`));
  } else if (preview) {
    console.log(chalk.yellow('\n预览模式 - 未执行实际操作'));
  }
}

async function findDuplicates(ebooks: any[], threshold: number): Promise<DuplicateGroup[]> {
  const groups: Record<string, DuplicateGroup> = {};

  for (const ebook of ebooks) {
    const key = ebook.title.toLowerCase().trim();
    
    if (!groups[key]) {
      groups[key] = {
        title: ebook.title,
        author: ebook.author,
        books: []
      };
    }
    
    groups[key].books.push({
      filePath: ebook.filePath,
      fileName: ebook.fileName,
      size: ebook.size,
      extension: ebook.extension
    });
  }

  return Object.values(groups).filter(g => g.books.length > 1);
}