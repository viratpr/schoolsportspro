import { MetadataRoute } from 'next';
import { getPostSlugs } from '@/lib/blog';

const BASE = process.env.APP_URL ?? 'https://athleticbharat.com';

export default function sitemap(): MetadataRoute.Sitemap {
  const slugs = getPostSlugs();
  const blogUrls = slugs.map((slug) => ({ url: `${BASE}/blog/${slug}`, lastModified: new Date(), changeFrequency: 'monthly' as const, priority: 0.7 }));
  return [
    { url: BASE, lastModified: new Date(), changeFrequency: 'weekly', priority: 1 },
    { url: `${BASE}/features`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.8 },
    { url: `${BASE}/pricing`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.8 },
    { url: `${BASE}/about`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.6 },
    { url: `${BASE}/contact`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.6 },
    { url: `${BASE}/blog`, lastModified: new Date(), changeFrequency: 'weekly', priority: 0.8 },
    ...blogUrls,
    { url: `${BASE}/legal/privacy`, lastModified: new Date(), changeFrequency: 'yearly', priority: 0.3 },
    { url: `${BASE}/legal/terms`, lastModified: new Date(), changeFrequency: 'yearly', priority: 0.3 },
  ];
}
