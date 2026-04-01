import Link from 'next/link';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { FixedMarketingBackground } from '@/components/marketing/FixedMarketingBackground';
import { AbMarketingAssistant } from '@/components/marketing/AbMarketingAssistant';

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
      <FixedMarketingBackground />
      <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto flex h-16 min-w-0 items-center justify-between gap-2 px-4">
          <Link href="/" className="flex items-center gap-2 shrink-0 min-w-0" aria-label="Athletic Bharat home">
            <Image src="/logo.svg" alt="" width={180} height={40} className="h-8 w-auto max-sm:h-7 sm:h-9" priority />
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
          <div className="flex items-center gap-1 sm:gap-2 shrink-0">
            <details className="md:hidden relative">
              <summary className="cursor-pointer rounded-md border border-input bg-background px-2.5 py-2 text-sm font-medium text-foreground list-none [&::-webkit-details-marker]:hidden">
                Menu
              </summary>
              <nav className="absolute right-0 top-full z-50 mt-2 flex min-w-[10rem] flex-col gap-1 rounded-md border bg-background p-2 shadow-lg">
                {nav.map(({ href, label }) => (
                  <Link
                    key={href}
                    href={href}
                    className="rounded-md px-3 py-2 text-sm text-muted-foreground hover:bg-accent hover:text-foreground"
                  >
                    {label}
                  </Link>
                ))}
              </nav>
            </details>
            <Link href="/login">
              <Button variant="ghost" className="max-sm:h-9 max-sm:px-2.5 max-sm:text-xs">
                Sign in
              </Button>
            </Link>
            <Link href="/signup">
              <Button className="max-sm:h-9 max-sm:px-2.5 max-sm:text-xs whitespace-nowrap">
                Start free trial
              </Button>
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
      <AbMarketingAssistant />
    </div>
  );
}
