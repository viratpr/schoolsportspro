import Link from 'next/link';
import { getAllPosts } from '@/lib/blog';

export const metadata = {
  title: 'Blog | Athletic Bharat',
  description: 'Articles on running school sports tournaments, scoring, and categories.',
};

export default function BlogListPage() {
  const posts = getAllPosts();
  return (
    <div className="container mx-auto px-4 py-16">
      <h1 className="text-3xl font-bold mb-4">Blog</h1>
      <p className="text-muted-foreground mb-10">Tips and guides for running school sports events.</p>
      <ul className="space-y-8 max-w-2xl">
        {posts.map((post) => (
          <li key={post.slug}>
            <Link href={`/blog/${post.slug}`} className="block group">
              {post.image && (
                <div className="mb-3 overflow-hidden rounded-lg border bg-muted aspect-video">
                  <img
                    src={post.image}
                    alt=""
                    className="h-full w-full object-cover transition group-hover:scale-[1.02]"
                  />
                </div>
              )}
              <h2 className="font-semibold text-lg group-hover:underline">{post.title}</h2>
              <p className="text-sm text-muted-foreground mt-1">{post.description}</p>
              <p className="text-xs text-muted-foreground mt-2">{typeof post.date === 'string' ? post.date : post.date instanceof Date ? post.date.toISOString().slice(0, 10) : ''} · {post.author}</p>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
