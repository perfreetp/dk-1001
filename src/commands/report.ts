import chalk from 'chalk';
import { scan } from './scan';
import { formatFileSize } from '../utils/fileUtils';

interface Stats {
  total: number;
  totalSize: number;
  formats: Record<string, number>;
  languages: Record<string, number>;
  categories: Record<string, number>;
}

export async function generateReport(directory: string): Promise<void> {
  const ebooks = await scan({ directory, recursive: true });
  
  const stats: Stats = {
    total: ebooks.length,
    totalSize: ebooks.reduce((sum, e) => sum + e.size, 0),
    formats: {},
    languages: {},
    categories: {}
  };

  ebooks.forEach(ebook => {
    const format = ebook.extension.slice(1);
    stats.formats[format] = (stats.formats[format] || 0) + 1;
    
    const lang = ebook.tags.includes('zh') ? '中文' : ebook.tags.includes('en') ? '英文' : '其他';
    stats.languages[lang] = (stats.languages[lang] || 0) + 1;
    
    const category = ebook.tags.find(t => !['zh', 'en', 'other'].includes(t)) || '其他';
    stats.categories[category] = (stats.categories[category] || 0) + 1;
  });

  console.log(chalk.bold('\n整理报告'));
  console.log(chalk.gray('='.repeat(80)));
  
  console.log(chalk.cyan('\n📚 总体统计'));
  console.log(`  书籍总数: ${chalk.yellow(stats.total)} 本`);
  console.log(`  总大小: ${chalk.yellow(formatFileSize(stats.totalSize))}`);

  console.log(chalk.cyan('\n📖 格式分布'));
  Object.entries(stats.formats).forEach(([format, count]) => {
    const percentage = ((count / stats.total) * 100).toFixed(1);
    console.log(`  ${format.padEnd(6)}: ${count} 本 (${percentage}%)`);
  });

  console.log(chalk.cyan('\n🌍 语言分布'));
  Object.entries(stats.languages).forEach(([lang, count]) => {
    const percentage = ((count / stats.total) * 100).toFixed(1);
    console.log(`  ${lang.padEnd(4)}: ${count} 本 (${percentage}%)`);
  });

  console.log(chalk.cyan('\n📁 分类分布'));
  Object.entries(stats.categories).forEach(([category, count]) => {
    const percentage = ((count / stats.total) * 100).toFixed(1);
    console.log(`  ${category.padEnd(6)}: ${count} 本 (${percentage}%)`);
  });

  console.log(chalk.gray('\n' + '='.repeat(80)));
}