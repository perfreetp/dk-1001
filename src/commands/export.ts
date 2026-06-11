import * as fs from 'fs-extra';
import * as yaml from 'js-yaml';
import { ExportOptions } from '../types';
import { scan } from './scan';
import { formatFileSize } from '../utils/fileUtils';
import { findBooksByTag, findBooksByCategory, findBooksByAuthor } from '../utils/indexManager';

export async function exportList(options: ExportOptions, chalk: any): Promise<void> {
  const { directory, output, format = 'json', tag, category, author } = options;
  
  const ebooks = await scan({ directory, recursive: true });

  let filteredBooks = [...ebooks];
  
  if (tag) {
    filteredBooks = findBooksByTag(filteredBooks, tag);
  }
  if (category) {
    filteredBooks = findBooksByCategory(filteredBooks, category);
  }
  if (author) {
    filteredBooks = findBooksByAuthor(filteredBooks, author);
  }

  const exportData = filteredBooks.map(ebook => ({
    title: ebook.title,
    author: ebook.author,
    format: ebook.extension.slice(1),
    size: ebook.size,
    sizeFormatted: formatFileSize(ebook.size),
    lastModified: ebook.lastModified.toISOString(),
    filePath: ebook.filePath,
    hasCover: ebook.hasCover,
    tags: ebook.tags
  }));

  let content: string;
  switch (format) {
    case 'yaml':
      content = yaml.dump(exportData, { indent: 2 });
      break;
    case 'csv':
      content = generateCSV(exportData);
      break;
    case 'md':
      content = generateMarkdown(exportData, tag, category, author);
      break;
    default:
      content = JSON.stringify(exportData, null, 2);
  }

  await fs.writeFile(output, content, 'utf-8');
  
  console.log(chalk.green(`\n书单已导出到: ${output}`));
  console.log(chalk.cyan(`共导出 ${filteredBooks.length} 本书籍`));
  if (tag || category || author) {
    console.log(chalk.blue(`筛选条件: ${tag ? `标签=${tag} ` : ''}${category ? `分类=${category} ` : ''}${author ? `作者=${author}` : ''}`));
  }
}

function generateCSV(data: any[]): string {
  const headers = ['书名', '作者', '格式', '大小', '修改时间', '标签', '封面', '路径'];
  const rows = data.map(item => [
    `"${item.title}"`,
    `"${item.author}"`,
    item.format,
    item.sizeFormatted,
    new Date(item.lastModified).toLocaleString(),
    `"${item.tags.join(', ')}"`,
    item.hasCover ? '有' : '无',
    `"${item.filePath}"`
  ]);
  
  return [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
}

function generateMarkdown(data: any[], tag?: string, category?: string, author?: string): string {
  const sortedByCategory = data.reduce((acc, item) => {
    const bookCategory = item.tags.find((t: string) => !['zh', 'en', 'other'].includes(t)) || '其他';
    if (!acc[bookCategory]) {
      acc[bookCategory] = [];
    }
    acc[bookCategory].push(item);
    return acc;
  }, {} as Record<string, any[]>);

  const lines: string[] = [];
  lines.push('# 我的电子书库');
  lines.push('');
  
  const filterInfo: string[] = [];
  if (tag) filterInfo.push(`标签: ${tag}`);
  if (category) filterInfo.push(`分类: ${category}`);
  if (author) filterInfo.push(`作者: ${author}`);
  
  lines.push(`> 共 ${data.length} 本书籍 | 生成时间: ${new Date().toLocaleString()}${filterInfo.length > 0 ? ` | ${filterInfo.join(' | ')}` : ''}`);
  lines.push('');
  lines.push('---');
  lines.push('');

  const categories = Object.keys(sortedByCategory).sort();
  categories.forEach(cat => {
    const books = sortedByCategory[cat];
    lines.push(`## 📁 ${cat}`);
    lines.push(`> ${books.length} 本书`);
    lines.push('');
    
    books.forEach((book: any, index: number) => {
      const coverStatus = book.hasCover ? '✅' : '❌';
      const lang = book.tags.includes('zh') ? '中' : book.tags.includes('en') ? '英' : '?';
      const customTags = book.tags.filter((t: string) => !['zh', 'en', 'other', cat].includes(t));
      
      lines.push(`${index + 1}. **${book.title}**`);
      lines.push(`   - 作者: ${book.author || '未知作者'}`);
      lines.push(`   - 格式: ${book.format.toUpperCase()} | 大小: ${book.sizeFormatted} | 语言: ${lang}`);
      if (customTags.length > 0) {
        lines.push(`   - 标签: \`${customTags.join('` `')}\``);
      }
      lines.push(`   - 封面: ${coverStatus}`);
      lines.push(`   - 路径: \`${book.filePath}\``);
      lines.push('');
    });
  });

  lines.push('---');
  lines.push('');
  lines.push('## 📊 统计信息');
  lines.push('');
  lines.push('| 分类 | 数量 |');
  lines.push('|------|------|');
  categories.forEach(cat => {
    lines.push(`| ${cat} | ${sortedByCategory[cat].length} |`);
  });
  lines.push('');

  const formatStats = data.reduce((acc, item) => {
    acc[item.format] = (acc[item.format] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  
  lines.push('## 📖 格式分布');
  lines.push('');
  lines.push('| 格式 | 数量 |');
  lines.push('|------|------|');
  Object.entries(formatStats).forEach(([fmt, count]) => {
    lines.push(`| ${fmt.toUpperCase()} | ${count} |`);
  });

  return lines.join('\n');
}