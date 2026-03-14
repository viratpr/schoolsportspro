import { getAllPosts } from '@/lib/blog';

const BASE = process.env.APP_URL ?? 'https://athleticbharat.com';

export async function GET() {
  const posts = getAllPosts();
  const rss = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>Athletic Bharat Blog</title>
    <link>${BASE}/blog</link>
    <description>Tips and guides for running school sports events.</description>
    <language>en</language>
    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
    ${posts
      .map(
        (p) => `
    <item>
      <title>${escapeXml(p.title)}</title>
      <link>${BASE}/blog/${p.slug}</link>
      <description>${escapeXml(p.description)}</description>
      <pubDate>${new Date(p.date).toUTCString()}</pubDate>
      <guid>${BASE}/blog/${p.slug}</guid>
    </item>`
      )
      .join('')}
  </channel>
</rss>`;
  return new Response(rss, {
    headers: { 'Content-Type': 'application/xml; charset=utf-8' },
  });
}

function escapeXml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}
