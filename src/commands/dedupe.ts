import * as path from 'path';
import { DedupeOptions, ChangeRecord } from '../types';
import { scan } from './scan';
import { formatFileSize, fileExists } from '../utils/fileUtils';
import { createOperationRecord, addOperation, saveState, moveToTrash } from '../utils/stateManager';
import { removeFromIndex } from '../utils/indexManager';

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

export async function dedupe(options: DedupeOptions, chalk: any): Promise<void> {
  const { directory, threshold = 0.9, preview = false, conflict = 'rename' } = options;
  
  const ebooks = await scan({ directory, recursive: true });
  const duplicates = await findDuplicates(ebooks, threshold);

  console.log(chalk.bold('\n重复书籍检测结果:'));
  console.log(chalk.gray('='.repeat(100)));

  const changes: ChangeRecord[] = [];
  const skippedFiles: { source: string; target: string }[] = [];
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
              trashPath: '',
              finalName: ''
            }
          });
          totalDuplicates++;
        }
      });
    }
  });

  console.log(chalk.gray('='.repeat(100)));
  console.log(chalk.cyan(`共发现 ${duplicates.length} 组重复，${totalDuplicates} 个重复文件`));
  console.log(chalk.blue(`相似度阈值: ${(threshold * 100).toFixed(0)}%`));

  if (!preview && changes.length > 0) {
    const trashDir = path.join(directory, '.ebook-organizer-trash');
    
    for (const change of changes) {
      const result = await moveToTrash(change.source, directory, conflict);
      
      if (result.success && result.trashPath) {
        change.target = result.trashPath;
        change.metadata = change.metadata || {};
        change.metadata.trashPath = result.trashPath;
        change.metadata.finalName = path.basename(result.trashPath);
        await removeFromIndex(directory, change.source);
      } else if (!result.success) {
        skippedFiles.push({ source: change.source, target: path.join(trashDir, path.basename(change.source)) });
      }
    }
    
    const operation = createOperationRecord('dedupe', changes.filter(c => c.target));
    addOperation(operation);
    await saveState(directory);
    
    console.log(chalk.green('\n操作已完成!'));
    console.log(chalk.blue(`重复文件已移至恢复区域: .ebook-organizer-trash/`));
    
    if (skippedFiles.length > 0) {
      console.log(chalk.yellow(`\n跳过的文件（恢复区域已存在）:`));
      skippedFiles.forEach(f => {
        console.log(`  ${path.basename(f.source)}`);
      });
    }
  } else if (preview) {
    console.log(chalk.yellow('\n预览模式 - 未执行实际操作'));
    console.log(chalk.blue('\n将移至恢复区域的文件:'));
    changes.forEach((change, idx) => {
      const trashFileName = `${Date.now()}-${path.basename(change.source)}`;
      console.log(`  ${idx + 1}. ${path.basename(change.source)} -> ${trashFileName}`);
    });
    if (conflict === 'skip') {
      console.log(chalk.yellow('\n注意: 若恢复区域存在同名文件，将跳过'));
    } else if (conflict === 'rename') {
      console.log(chalk.yellow('\n注意: 若恢复区域存在同名文件，将自动重命名'));
    }
  }
}

function calculateSimilarity(str1: string, str2: string): number {
  const s1 = str1.toLowerCase().trim();
  const s2 = str2.toLowerCase().trim();
  
  if (s1 === s2) return 1.0;
  
  const longer = s1.length > s2.length ? s1 : s2;
  const shorter = s1.length > s2.length ? s2 : s1;
  
  const longerLength = longer.length;
  
  if (longerLength === 0) return 1.0;
  
  const editDistance = levenshteinDistance(s1, s2);
  return (longerLength - editDistance) / longerLength;
}

function levenshteinDistance(s1: string, s2: string): number {
  const costs: number[] = [];
  
  for (let i = 0; i <= s1.length; i++) {
    let lastValue = i;
    for (let j = 0; j <= s2.length; j++) {
      if (i === 0) {
        costs[j] = j;
      } else if (j > 0) {
        let newValue = costs[j - 1];
        if (s1.charAt(i - 1) !== s2.charAt(j - 1)) {
          newValue = Math.min(Math.min(newValue, lastValue), costs[j]) + 1;
        }
        costs[j - 1] = lastValue;
        lastValue = newValue;
      }
    }
    if (i > 0) {
      costs[s2.length] = lastValue;
    }
  }
  
  return costs[s2.length];
}

async function findDuplicates(ebooks: any[], threshold: number): Promise<DuplicateGroup[]> {
  const groups: Record<string, DuplicateGroup> = {};

  for (const ebook of ebooks) {
    let matched = false;
    
    for (const existingTitle of Object.keys(groups)) {
      const similarity = calculateSimilarity(ebook.title, existingTitle);
      if (similarity >= threshold) {
        groups[existingTitle].books.push({
          filePath: ebook.filePath,
          fileName: ebook.fileName,
          size: ebook.size,
          extension: ebook.extension
        });
        matched = true;
        break;
      }
    }
    
    if (!matched) {
      const key = ebook.title.toLowerCase().trim();
      groups[key] = {
        title: ebook.title,
        author: ebook.author,
        books: [{
          filePath: ebook.filePath,
          fileName: ebook.fileName,
          size: ebook.size,
          extension: ebook.extension
        }]
      };
    }
  }

  return Object.values(groups).filter(g => g.books.length > 1);
}