import * as path from 'path';
import { EbookInfo, RenameOptions, ChangeRecord } from '../types';
import { scan } from './scan';
import { renameFile, moveFile, sanitizeFileName, fileExists } from '../utils/fileUtils';
import { getBookCategory } from '../utils/ebookParser';
import { createOperationRecord, addOperation, saveState } from '../utils/stateManager';
import { updateIndexPath } from '../utils/indexManager';

export async function rename(options: RenameOptions, chalk: any): Promise<void> {
  const { directory, pattern = '{author} - {title}', move = false, preview = false, conflict = 'rename' } = options;
  
  const ebooks = await scan({ directory, recursive: true });
  const changes: ChangeRecord[] = [];
  
  console.log(chalk.bold('\n重命名预览:'));
  console.log(chalk.gray('='.repeat(80)));

  const conflicts: { source: string; target: string }[] = [];

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
      const targetExists = await fileExists(newPath);
      
      let finalPath = newPath;
      if (targetExists && conflict === 'rename') {
        const ext = path.extname(newPath);
        const base = path.basename(newPath, ext);
        const dir = path.dirname(newPath);
        let counter = 1;
        while (await fileExists(finalPath)) {
          finalPath = path.join(dir, `${base} (${counter})${ext}`);
          counter++;
        }
      }

      if (targetExists && conflict === 'skip') {
        conflicts.push({ source: ebook.filePath, target: newPath });
        continue;
      }

      changes.push({
        type: move ? 'move' : 'rename',
        source: ebook.filePath,
        target: finalPath
      });

      console.log(chalk.yellow(ebook.fileName));
      console.log(chalk.green(`  -> ${path.basename(finalPath)}`));
      if (move) {
        console.log(chalk.blue(`     分类: ${category}`));
      }
      if (targetExists) {
        console.log(chalk.yellow(`     ⚠ 目标存在，${conflict === 'overwrite' ? '将覆盖' : `将重命名为 ${path.basename(finalPath)}`}`));
      }
    }
  }

  if (conflicts.length > 0) {
    console.log(chalk.yellow('\n冲突文件（已跳过）:'));
    conflicts.forEach(c => {
      console.log(`  ${path.basename(c.source)} -> ${path.basename(c.target)} (已存在)`);
    });
  }

  console.log(chalk.gray('='.repeat(80)));
  console.log(chalk.cyan(`将修改 ${changes.length} 个文件${conflicts.length > 0 ? `，跳过 ${conflicts.length} 个冲突文件` : ''}`));

  if (!preview && changes.length > 0) {
    const operation = createOperationRecord('rename', changes);
    addOperation(operation);
    
    for (const change of changes) {
      if (change.type === 'move') {
        const result = await moveFile(change.source, change.target!, conflict);
        if (result.success && result.finalPath !== change.target) {
          change.target = result.finalPath;
        }
        await updateIndexPath(directory, change.source, result.finalPath);
      } else {
        const result = await renameFile(change.source, change.target!, conflict);
        if (result.success && result.finalPath !== change.target) {
          change.target = result.finalPath;
        }
        await updateIndexPath(directory, change.source, result.finalPath);
      }
    }
    
    await saveState(directory);
    console.log(chalk.green('\n操作已完成!'));
  } else if (preview) {
    console.log(chalk.yellow('\n预览模式 - 未执行实际操作'));
  }
}