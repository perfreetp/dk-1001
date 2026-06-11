import * as fs from 'fs-extra';
import * as path from 'path';
import { TagOptions, ChangeRecord } from '../types';
import { scan } from './scan';
import { createOperationRecord, addOperation, saveState } from '../utils/stateManager';
import { updateIndexTags } from '../utils/indexManager';

export async function tag(options: TagOptions, chalk: any): Promise<void> {
  const { directory, add = [], remove = [], listMissingCovers = false, preview = false } = options;
  
  if (listMissingCovers) {
    await listBooksWithoutCovers(directory, chalk);
    return;
  }

  if (add.length === 0 && remove.length === 0) {
    console.log(chalk.yellow('请指定要添加或删除的标签'));
    return;
  }

  const ebooks = await scan({ directory, recursive: true });
  const changes: ChangeRecord[] = [];

  console.log(chalk.bold('\n标签操作预览:'));
  console.log(chalk.gray('='.repeat(100)));

  let hasChanges = false;

  for (const ebook of ebooks) {
    const tagFilePath = ebook.filePath + '.tags';
    let currentTags: string[] = [];

    if (await fs.pathExists(tagFilePath)) {
      const content = await fs.readFile(tagFilePath, 'utf-8');
      currentTags = content.split(',').map(t => t.trim()).filter(Boolean);
    }

    const newTags = [...currentTags];
    const addedTags: string[] = [];
    const removedTags: string[] = [];
    
    for (const tag of add) {
      if (!newTags.includes(tag)) {
        newTags.push(tag);
        addedTags.push(tag);
      }
    }

    for (const tag of remove) {
      const index = newTags.indexOf(tag);
      if (index !== -1) {
        newTags.splice(index, 1);
        removedTags.push(tag);
      }
    }

    if (addedTags.length > 0 || removedTags.length > 0) {
      hasChanges = true;
      changes.push({
        type: 'tag',
        source: ebook.filePath,
        target: tagFilePath,
        metadata: {
          oldTags: [...currentTags],
          newTags: [...newTags],
          addedTags,
          removedTags
        }
      });

      console.log(chalk.cyan(ebook.title));
      console.log(chalk.gray(`  当前标签: [${currentTags.join(', ') || '无'}]`));
      console.log(chalk.green(`  新标签: [${newTags.join(', ') || '无'}]`));
      if (addedTags.length > 0) {
        console.log(chalk.blue(`  添加: +${addedTags.join(', +')}`));
      }
      if (removedTags.length > 0) {
        console.log(chalk.red(`  删除: -${removedTags.join(', -')}`));
      }
    }
  }

  console.log(chalk.gray('='.repeat(100)));
  console.log(chalk.cyan(`将修改 ${changes.length} 个文件的标签`));

  if (!preview && hasChanges && changes.length > 0) {
    const operation = createOperationRecord('tag', changes);
    addOperation(operation);
    
    for (const change of changes) {
      const tagFilePath = change.source + '.tags';
      const newTags = change.metadata?.newTags as string[];
      if (newTags.length > 0) {
        await fs.writeFile(tagFilePath, newTags.join(','));
      } else if (await fs.pathExists(tagFilePath)) {
        await fs.remove(tagFilePath);
      }
      await updateIndexTags(directory, change.source, newTags);
    }
    
    await saveState(directory);
    console.log(chalk.green('\n操作已完成!'));
  } else if (preview) {
    console.log(chalk.yellow('\n预览模式 - 未执行实际操作'));
  }
}

async function listBooksWithoutCovers(directory: string, chalk: any): Promise<void> {
  const ebooks = await scan({ directory, recursive: true });
  
  console.log(chalk.bold('\n缺少封面的书籍:'));
  console.log(chalk.gray('='.repeat(100)));

  let count = 0;
  for (const ebook of ebooks) {
    if (!ebook.hasCover) {
      console.log(chalk.yellow(`${ebook.title}`));
      console.log(chalk.gray(`  作者: ${ebook.author || '未知'}`));
      console.log(chalk.gray(`  路径: ${ebook.filePath}`));
      count++;
    }
  }

  console.log(chalk.gray('='.repeat(100)));
  console.log(chalk.green(`共找到 ${count} 本缺少封面的书籍`));
}