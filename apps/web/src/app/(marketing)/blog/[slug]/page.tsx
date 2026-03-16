import { notFound } from 'next/navigation';
import Link from 'next/link';
import { getPostBySlug, getPostSlugs } from '@/lib/blog';
import ReactMarkdown from 'react-markdown';
import type { Components } from 'react-markdown';
import MermaidDiagram from '@/components/mermaid/MermaidDiagram';

type Props = { params: Promise<{ slug: string }> };

export async function generateStaticParams() {
  return getPostSlugs().map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: Props) {
  const { slug } = await params;
  const post = getPostBySlug(slug);
  if (!post) return { title: 'Blog | Athletic Bharat' };
  return {
    title: `${post.title} | Athletic Bharat`,
    description: post.description,
  };
}

const markdownComponents: Components = {
  code({ node, className, children, ...props }) {
    const match = /language-(\w+)/.exec(className || '');
    if (match?.[1] === 'mermaid') {
      const chart = typeof children === 'string' ? children : Array.isArray(children) ? children.join('') : String(children ?? '');
      return <MermaidDiagram chart={chart} className="my-6" />;
    }
    return <code className={className} {...props}>{children}</code>;
  },
};

export default async function BlogPostPage({ params }: Props) {
  const { slug } = await params;
  const post = getPostBySlug(slug);
  if (!post) notFound();
  return (
    <div className="container mx-auto px-4 py-16 max-w-2xl">
      <Link href="/blog" className="text-sm text-muted-foreground hover:underline">← Blog</Link>
      <article className="mt-6">
        {post.image && (
          <div className="mb-8 overflow-hidden rounded-lg border bg-muted aspect-video">
            <img src={post.image} alt="" className="h-full w-full object-cover" />
          </div>
        )}
        <h1 className="text-3xl font-bold">{post.title}</h1>
        <p className="text-sm text-muted-foreground mt-2">{typeof post.date === 'string' ? post.date : post.date instanceof Date ? post.date.toISOString().slice(0, 10) : ''} · {post.author}</p>
        <div className="prose prose-sm mt-8 max-w-none dark:prose-invert [&_pre:has([data-mermaid])]:p-0 [&_pre:has([data-mermaid])]:bg-transparent [&_pre:has([data-mermaid])]:border-0">
          <ReactMarkdown components={markdownComponents}>{post.content}</ReactMarkdown>
        </div>
      </article>
    </div>
  );
}
