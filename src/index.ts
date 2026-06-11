#!/usr/bin/env node

import { Command } from 'commander';
import chalk from 'chalk';
import { scan, printScanResults } from './commands/scan';
import { rename } from './commands/rename';
import { tag } from './commands/tag';
import { dedupe } from './commands/dedupe';
import { exportList } from './commands/export';
import { undo } from './commands/undo';
import { generateReport } from './commands/report';

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
    const ebooks = await scan({
      directory,
      format: options.format,
      language: options.language,
      recursive: options.recursive
    });
    printScanResults(ebooks);
  });

program
  .command('rename')
  .description('按规则重命名电子书')
  .argument('<directory>', '要处理的目录路径')
  .option('-p, --pattern <pattern>', '重命名模式，支持 {author}, {title}', '{author} - {title}')
  .option('-m, --move', '移动到分类文件夹')
  .option('--preview', '预览模式，不执行实际操作')
  .action(async (directory, options) => {
    await rename({
      directory,
      pattern: options.pattern,
      move: options.move,
      preview: options.preview
    });
  });

program
  .command('tag')
  .description('管理书籍标签')
  .argument('<directory>', '要处理的目录路径')
  .option('-a, --add <tags...>', '添加标签')
  .option('-r, --remove <tags...>', '删除标签')
  .option('--list-missing-covers', '列出缺少封面的书籍')
  .action(async (directory, options) => {
    await tag({
      directory,
      add: options.add || [],
      remove: options.remove || [],
      listMissingCovers: options.listMissingCovers
    });
  });

program
  .command('dedupe')
  .description('查找并删除重复书籍')
  .argument('<directory>', '要处理的目录路径')
  .option('-t, --threshold <number>', '相似度阈值', (value: string) => parseFloat(value), 0.9)
  .option('--preview', '预览模式，不执行实际操作')
  .action(async (directory, options) => {
    await dedupe({
      directory,
      threshold: options.threshold,
      preview: options.preview
    });
  });

program
  .command('export')
  .description('导出书单清单')
  .argument('<directory>', '要导出的目录路径')
  .argument('<output>', '输出文件路径')
  .option('-f, --format <format>', '输出格式 (json, yaml, csv)', 'json')
  .action(async (directory, output, options) => {
    await exportList({
      directory,
      output,
      format: options.format as 'json' | 'yaml' | 'csv'
    });
  });

program
  .command('undo')
  .description('撤销最近一次批量操作')
  .argument('<directory>', '操作所在的目录路径')
  .action(async (directory) => {
    await undo(directory);
  });

program
  .command('report')
  .description('生成整理报告')
  .argument('<directory>', '要生成报告的目录路径')
  .action(async (directory) => {
    await generateReport(directory);
  });

program.parse();

if (!process.argv.slice(2).length) {
  program.outputHelp();
}