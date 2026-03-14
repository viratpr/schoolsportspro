import Link from 'next/link';
import Image from 'next/image';
import { Button } from '@/components/ui/button';

const nav = [
  { href: '/features', label: 'Features' },
  { href: '/pricing', label: 'Pricing' },
  { href: '/about', label: 'About' },
  { href: '/contact', label: 'Contact' },
  { href: '/blog', label: 'Blog' },
];

const footerLinks = [
  { href: '/features', label: 'Features' },
  { href: '/pricing', label: 'Pricing' },
  { href: '/about', label: 'About' },
  { href: '/contact', label: 'Contact' },
  { href: '/blog', label: 'Blog' },
  { href: '/legal/privacy', label: 'Privacy' },
  { href: '/legal/terms', label: 'Terms' },
];

export default function MarketingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex flex-col relative">
      {/* Background image: fixed, full cover, with overlay for readability */}
      <div
        className="fixed inset-0 -z-10 bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: 'url(/images/school-sports-saas-dashboard-bg-16x9.png)' }}
        aria-hidden
      />
      {/* Light tint so text stays readable; background image remains visible */}
      <div
        className="fixed inset-0 -z-10 bg-gradient-to-b from-white/25 via-white/15 to-white/30"
        aria-hidden
      />
      <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <Link href="/" className="flex items-center gap-2 shrink-0" aria-label="Athletic Bharat home">
            <Image src="/logo.svg" alt="" width={180} height={40} className="h-9 w-auto" priority />
          </Link>
          <nav className="hidden md:flex items-center gap-6">
            {nav.map(({ href, label }) => (
              <Link
                key={href}
                href={href}
                className="text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                {label}
              </Link>
            ))}
          </nav>
          <div className="flex items-center gap-2">
            <Link href="/login">
              <Button variant="ghost">Sign in</Button>
            </Link>
            <Link href="/signup">
              <Button>Start free trial</Button>
            </Link>
          </div>
        </div>
      </header>
      <main className="flex-1">{children}</main>
      <footer className="border-t bg-background/90 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-12">
          <div className="flex flex-col md:flex-row justify-between items-center gap-6">
            <div className="font-semibold">Athletic Bharat</div>
            <nav className="flex flex-wrap justify-center gap-x-6 gap-y-2">
              {footerLinks.map(({ href, label }) => (
                <Link
                  key={href}
                  href={href}
                  className="text-sm text-muted-foreground hover:text-foreground"
                >
                  {label}
                </Link>
              ))}
            </nav>
          </div>
          <p className="text-center text-sm text-muted-foreground mt-6">
            Contact:{' '}
            <a href="mailto:support@athleticbharat.com" className="underline hover:text-foreground">
              support@athleticbharat.com
            </a>
          </p>
        </div>
      </footer>
    </div>
  );
}
