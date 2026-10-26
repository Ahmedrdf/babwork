import type { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  const base = process.env.APP_URL || 'http://localhost:3000';
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/api/', '/profile', '/applications', '/recommendations', '/admin/', '/login', '/register', '/forgot', '/reset', '/verify'],
    },
    sitemap: `${base}/sitemap.xml`,
  };
}
