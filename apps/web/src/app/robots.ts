import { MetadataRoute } from 'next';

const BASE = process.env.APP_URL ?? 'https://athleticbharat.com';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: '*', allow: '/', disallow: ['/app/', '/platform/', '/api/'] },
    sitemap: `${BASE}/sitemap.xml`,
  };
}
