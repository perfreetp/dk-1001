import chalk from 'chalk';
import * as fs from 'fs-extra';
import * as yaml from 'js-yaml';
import { ExportOptions } from '../types';
import { scan } from './scan';
import { formatFileSize } from '../utils/fileUtils';

export async function exportList(options: ExportOptions): Promise<void> {
  const { directory, output, format = 'json' } = options;
  
  const ebooks = await scan({ directory, recursive: true });

  const exportData = ebooks.map(ebook => ({
    title: ebook.title,
    author: ebook.author,
    format: ebook.extension.slice(1),
    size: ebook.size,
    sizeFormatted: formatFileSize(ebook.size),
    lastModified: ebook.lastModified.toISOString(),
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
    default:
      content = JSON.stringify(exportData, null, 2);
  }

  await fs.writeFile(output, content, 'utf-8');
  
  console.log(chalk.green(`\n书单已导出到: ${output}`));
  console.log(chalk.cyan(`共导出 ${ebooks.length} 本书籍`));
}

function generateCSV(data: any[]): string {
  const headers = ['书名', '作者', '格式', '大小', '修改时间', '标签'];
  const rows = data.map(item => [
    `"${item.title}"`,
    `"${item.author}"`,
    item.format,
    item.sizeFormatted,
    new Date(item.lastModified).toLocaleString(),
    `"${item.tags.join(', ')}"`
  ]);
  
  return [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
}