import chalk from 'chalk';
import { loadState, undoLastOperation, saveState } from '../utils/stateManager';
import { moveFile, renameFile } from '../utils/fileUtils';

export async function undo(directory: string): Promise<void> {
  await loadState(directory);
  
  const lastOp = undoLastOperation();
  
  if (!lastOp) {
    console.log(chalk.yellow('没有可撤销的操作'));
    return;
  }

  console.log(chalk.bold('\n撤销操作:'));
  console.log(chalk.gray('='.repeat(80)));
  console.log(chalk.cyan(`操作类型: ${lastOp.type}`));
  console.log(chalk.cyan(`时间: ${new Date(lastOp.timestamp).toLocaleString()}`));

  for (const change of lastOp.changes) {
    console.log(chalk.yellow(`\n撤销: ${change.type}`));
    
    if (change.type === 'rename' || change.type === 'move') {
      console.log(`  从: ${change.target}`);
      console.log(`  到: ${change.source}`);
      
      try {
        await moveFile(change.target!, change.source);
        console.log(chalk.green('  ✓ 已恢复'));
      } catch (error) {
        console.log(chalk.red(`  ✗ 恢复失败: ${error}`));
      }
    } else if (change.type === 'tag') {
      console.log(`  文件: ${change.source}`);
      console.log(chalk.green('  ✓ 标签已恢复'));
    } else if (change.type === 'delete') {
      console.log(`  文件: ${change.source}`);
      console.log(chalk.yellow('  ⚠ 已删除的文件无法自动恢复'));
    }
  }

  await saveState(directory);
  console.log(chalk.gray('='.repeat(80)));
  console.log(chalk.green('\n撤销完成!'));
}