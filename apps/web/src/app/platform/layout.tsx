import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import Link from 'next/link';
import { LogoutButton } from '@/components/auth/LogoutButton';

export default async function PlatformLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect('/login');
  const role = (session.user as { role?: string }).role;
  if (role !== 'PLATFORM_ADMIN') redirect('/app/dashboard');

  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b px-4 py-3 flex items-center gap-2 md:gap-4 min-w-0">
        <Link href="/platform/tenants" className="font-semibold shrink-0 text-sm sm:text-base">Athletic Bharat (Platform)</Link>
        <details className="md:hidden relative shrink-0">
          <summary className="cursor-pointer rounded-md border border-input bg-background px-3 py-1.5 text-sm font-medium text-foreground list-none [&::-webkit-details-marker]:hidden">
            Menu
          </summary>
          <nav className="absolute left-0 top-full z-50 mt-1 flex min-w-[12rem] flex-col gap-2 rounded-md border bg-background p-3 shadow-lg">
            <Link href="/platform/tenants" className="text-sm text-muted-foreground hover:text-foreground">🏢 Tenants</Link>
            <Link href="/platform/sports" className="text-sm text-muted-foreground hover:text-foreground">📚 Sports Library</Link>
          </nav>
        </details>
        <nav className="hidden md:flex flex-1 gap-4 justify-center min-w-0">
          <Link href="/platform/tenants" className="text-sm text-muted-foreground hover:text-foreground">🏢 Tenants</Link>
          <Link href="/platform/sports" className="text-sm text-muted-foreground hover:text-foreground">📚 Sports Library</Link>
        </nav>
        <div className="ml-auto flex min-w-0 items-center gap-2 sm:gap-4 text-sm text-muted-foreground shrink-0">
          <span className="truncate max-w-[10rem] sm:max-w-[12rem] md:max-w-[16rem] lg:max-w-none">{session.user.email}</span>
          <LogoutButton />
        </div>
      </header>
      <main className="flex-1 p-4">{children}</main>
    </div>
  );
}
