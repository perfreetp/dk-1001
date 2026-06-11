#!/usr/bin/env node

import { Command } from 'commander';
import { scan, printScanResults } from './commands/scan';
import { rename } from './commands/rename';
import { tag } from './commands/tag';
import { dedupe } from './commands/dedupe';
import { exportList } from './commands/export';
import { undo } from './commands/undo';
import { generateReport } from './commands/report';

async function initChalk() {
  const chalk = await import('chalk');
  return chalk.default || chalk;
}

async function main() {
  const chalk = await initChalk();
  const program = new Command();

  program
    .name('ebook-organizer')
    .description('命令行工具，用于个人整理本地电子书文件夹')
    .version('1.0.0');

  program
    .command('scan')
    .description('扫描目录识别电子书')
    .argument('<directory>', '要扫描的目录路径')
    .option('-f, --format <format>', '按格式过滤 (epub, mobi, pdf等)')
    .option('-l, --language <lang>', '按语言过滤 (zh, en)')
    .option('-r, --recursive', '递归扫描子目录', true)
    .action(async (directory, options) => {
      try {
        const ebooks = await scan({
          directory,
          format: options.format,
          language: options.language,
          recursive: options.recursive
        });
        printScanResults(ebooks, chalk);
      } catch (error) {
        console.error(chalk.red(`扫描失败: ${error}`));
        process.exit(1);
      }
    });

  program
    .command('rename')
    .description('按规则重命名电子书')
    .argument('<directory>', '要处理的目录路径')
    .option('-p, --pattern <pattern>', '重命名模式，支持 {author}, {title}', '{author} - {title}')
    .option('-m, --move', '移动到分类文件夹')
    .option('--preview', '预览模式，不执行实际操作')
    .option('--conflict <strategy>', '冲突处理策略: skip(跳过), rename(自动重命名), overwrite(覆盖)', 'rename')
    .action(async (directory, options) => {
      try {
        await rename({
          directory,
          pattern: options.pattern,
          move: options.move,
          preview: options.preview,
          conflict: options.conflict as 'skip' | 'rename' | 'overwrite'
        }, chalk);
      } catch (error) {
        console.error(chalk.red(`重命名失败: ${error}`));
        process.exit(1);
      }
    });

  program
    .command('tag')
    .description('管理书籍标签')
    .argument('<directory>', '要处理的目录路径')
    .option('-a, --add <tags...>', '添加标签')
    .option('-r, --remove <tags...>', '删除标签')
    .option('--list-missing-covers', '列出缺少封面的书籍')
    .option('--preview', '预览模式，不执行实际操作')
    .action(async (directory, options) => {
      try {
        await tag({
          directory,
          add: options.add || [],
          remove: options.remove || [],
          listMissingCovers: options.listMissingCovers,
          preview: options.preview
        }, chalk);
      } catch (error) {
        console.error(chalk.red(`标签操作失败: ${error}`));
        process.exit(1);
      }
    });

  program
    .command('dedupe')
    .description('查找并删除重复书籍')
    .argument('<directory>', '要处理的目录路径')
    .option('-t, --threshold <number>', '相似度阈值', (value: string) => parseFloat(value), 0.9)
    .option('--preview', '预览模式，不执行实际操作')
    .option('--conflict <strategy>', '冲突处理策略: skip(跳过), rename(自动重命名), overwrite(覆盖)', 'rename')
    .action(async (directory, options) => {
      try {
        await dedupe({
          directory,
          threshold: options.threshold,
          preview: options.preview,
          conflict: options.conflict as 'skip' | 'rename' | 'overwrite'
        }, chalk);
      } catch (error) {
        console.error(chalk.red(`去重失败: ${error}`));
        process.exit(1);
      }
    });

  program
    .command('export')
    .description('导出书单清单')
    .argument('<directory>', '要导出的目录路径')
    .argument('<output>', '输出文件路径')
    .option('-f, --format <format>', '输出格式 (json, yaml, csv, md)', 'json')
    .option('--tag <tag>', '按标签筛选')
    .option('--category <category>', '按分类筛选')
    .option('--author <author>', '按作者关键字筛选')
    .action(async (directory, output, options) => {
      try {
        await exportList({
          directory,
          output,
          format: options.format as 'json' | 'yaml' | 'csv' | 'md',
          tag: options.tag,
          category: options.category,
          author: options.author
        }, chalk);
      } catch (error) {
        console.error(chalk.red(`导出失败: ${error}`));
        process.exit(1);
      }
    });

  program
    .command('undo')
    .description('撤销最近一次批量操作')
    .argument('<directory>', '操作所在的目录路径')
    .action(async (directory) => {
      try {
        await undo(directory, chalk);
      } catch (error) {
        console.error(chalk.red(`撤销失败: ${error}`));
        process.exit(1);
      }
    });

  program
    .command('report')
    .description('生成整理报告')
    .argument('<directory>', '要生成报告的目录路径')
    .action(async (directory) => {
      try {
        await generateReport(directory, chalk);
      } catch (error) {
        console.error(chalk.red(`生成报告失败: ${error}`));
        process.exit(1);
      }
    });

  program.parse();

  if (!process.argv.slice(2).length) {
    program.outputHelp(chalk.cyan);
  }
}

main().catch(error => {
  console.error(`启动失败: ${error}`);
  process.exit(1);
});