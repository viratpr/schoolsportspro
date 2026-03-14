import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';

const BLOG_DIR = path.join(process.cwd(), 'content', 'blog');

export type PostMeta = {
  title: string;
  description: string;
  date: string;
  author: string;
  tags: string[];
  image?: string;
};

export type Post = PostMeta & { slug: string; content: string };

export function getPostSlugs(): string[] {
  if (!fs.existsSync(BLOG_DIR)) return [];
  return fs.readdirSync(BLOG_DIR)
    .filter((f) => f.endsWith('.mdx') || f.endsWith('.md'))
    .map((f) => f.replace(/\.(mdx|md)$/, ''));
}

export function getPostBySlug(slug: string): Post | null {
  for (const ext of ['.mdx', '.md']) {
    const fullPath = path.join(BLOG_DIR, slug + ext);
    if (fs.existsSync(fullPath)) {
      const raw = fs.readFileSync(fullPath, 'utf-8');
      const { data, content } = matter(raw);
      const rawDate = data.date ?? '';
      const dateStr =
        typeof rawDate === 'string'
          ? rawDate
          : rawDate instanceof Date
            ? rawDate.toISOString().slice(0, 10)
            : String(rawDate);
      return {
        slug,
        title: data.title ?? '',
        description: data.description ?? '',
        date: dateStr,
        author: data.author ?? '',
        tags: Array.isArray(data.tags) ? data.tags : [],
        image: typeof data.image === 'string' ? data.image : undefined,
        content,
      };
    }
  }
  return null;
}

export function getAllPosts(): Post[] {
  const slugs = getPostSlugs();
  const posts = slugs
    .map((slug) => getPostBySlug(slug))
    .filter((p): p is Post => p !== null)
    .sort((a, b) => (b.date > a.date ? 1 : -1));
  return posts;
}
