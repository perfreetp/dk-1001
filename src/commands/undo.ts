import chalk from 'chalk';
import * as fs from 'fs-extra';
import { loadState, undoLastOperation, saveState, restoreFromTrash } from '../utils/stateManager';
import { moveFile } from '../utils/fileUtils';

export async function undo(directory: string): Promise<void> {
  await loadState(directory);
  
  const lastOp = undoLastOperation();
  
  if (!lastOp) {
    console.log(chalk.yellow('没有可撤销的操作'));
    return;
  }

  console.log(chalk.bold('\n撤销操作:'));
  console.log(chalk.gray('='.repeat(100)));
  console.log(chalk.cyan(`操作类型: ${lastOp.type}`));
  console.log(chalk.cyan(`时间: ${new Date(lastOp.timestamp).toLocaleString()}`));

  let successCount = 0;
  let failCount = 0;

  for (const change of lastOp.changes) {
    console.log(chalk.yellow(`\n撤销: ${change.type}`));
    
    if (change.type === 'rename' || change.type === 'move') {
      console.log(`  从: ${change.target}`);
      console.log(`  到: ${change.source}`);
      
      try {
        if (await fs.pathExists(change.target!)) {
          await moveFile(change.target!, change.source);
          console.log(chalk.green('  ✓ 已恢复'));
          successCount++;
        } else {
          console.log(chalk.red(`  ✗ 源文件不存在: ${change.target}`));
          failCount++;
        }
      } catch (error) {
        console.log(chalk.red(`  ✗ 恢复失败: ${error}`));
        failCount++;
      }
    } else if (change.type === 'tag') {
      console.log(`  文件: ${change.source}`);
      
      try {
        const oldTags = change.metadata?.oldTags as string[];
        const tagFilePath = change.source + '.tags';
        
        if (oldTags && oldTags.length > 0) {
          await fs.writeFile(tagFilePath, oldTags.join(','));
        } else if (await fs.pathExists(tagFilePath)) {
          await fs.remove(tagFilePath);
        }
        console.log(chalk.green('  ✓ 标签已恢复'));
        successCount++;
      } catch (error) {
        console.log(chalk.red(`  ✗ 恢复失败: ${error}`));
        failCount++;
      }
    } else if (change.type === 'delete') {
      const trashPath = change.target || change.metadata?.trashPath as string;
      console.log(`  从恢复区域恢复: ${trashPath}`);
      console.log(`  到: ${change.source}`);
      
      try {
        if (await fs.pathExists(trashPath)) {
          await restoreFromTrash(trashPath, change.source);
          console.log(chalk.green('  ✓ 已恢复'));
          successCount++;
        } else {
          console.log(chalk.red(`  ✗ 恢复区域中文件不存在: ${trashPath}`));
          failCount++;
        }
      } catch (error) {
        console.log(chalk.red(`  ✗ 恢复失败: ${error}`));
        failCount++;
      }
    }
  }

  await saveState(directory);
  console.log(chalk.gray('='.repeat(100)));
  
  if (failCount === 0) {
    console.log(chalk.green(`\n撤销完成! 成功恢复 ${successCount} 个项目`));
  } else {
    console.log(chalk.yellow(`\n撤销完成! 成功恢复 ${successCount} 个项目，${failCount} 个失败`));
  }
}