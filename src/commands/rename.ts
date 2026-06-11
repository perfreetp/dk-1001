import chalk from 'chalk';
import * as path from 'path';
import { EbookInfo, RenameOptions, ChangeRecord } from '../types';
import { scan } from './scan';
import { renameFile, moveFile, sanitizeFileName } from '../utils/fileUtils';
import { getBookCategory } from '../utils/ebookParser';
import { createOperationRecord, addOperation, saveState } from '../utils/stateManager';

export async function rename(options: RenameOptions): Promise<void> {
  const { directory, pattern = '{author} - {title}', move = false, preview = false } = options;
  
  const ebooks = await scan({ directory, recursive: true });
  const changes: ChangeRecord[] = [];
  
  console.log(chalk.bold('\n重命名预览:'));
  console.log(chalk.gray('='.repeat(80)));

  for (const ebook of ebooks) {
    const newName = pattern
      .replace('{author}', ebook.author || '未知作者')
      .replace('{title}', ebook.title || '未知书名')
      .replace('{extension}', ebook.extension.slice(1));
    
    const sanitizedName = sanitizeFileName(newName) + ebook.extension;
    const category = getBookCategory(ebook.title);
    
    let newPath: string;
    if (move) {
      newPath = path.join(directory, category, sanitizedName);
    } else {
      newPath = path.join(path.dirname(ebook.filePath), sanitizedName);
    }

    if (ebook.filePath !== newPath) {
      changes.push({
        type: move ? 'move' : 'rename',
        source: ebook.filePath,
        target: newPath
      });

      console.log(chalk.yellow(ebook.fileName));
      console.log(chalk.green(`  -> ${sanitizedName}`));
      if (move) {
        console.log(chalk.blue(`     分类: ${category}`));
      }
    }
  }

  console.log(chalk.gray('='.repeat(80)));
  console.log(chalk.cyan(`将修改 ${changes.length} 个文件`));

  if (!preview && changes.length > 0) {
    const operation = createOperationRecord('rename', changes);
    addOperation(operation);
    
    for (const change of changes) {
      if (change.type === 'move') {
        await moveFile(change.source, change.target!);
      } else {
        await renameFile(change.source, change.target!);
      }
    }
    
    await saveState(directory);
    console.log(chalk.green('\n操作已完成!'));
  } else if (preview) {
    console.log(chalk.yellow('\n预览模式 - 未执行实际操作'));
  }
}