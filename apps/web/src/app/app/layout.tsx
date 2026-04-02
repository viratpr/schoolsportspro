import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import Link from 'next/link';
import { LogoutButton } from '@/components/auth/LogoutButton';

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect('/login');
  const role = (session.user as { role?: string }).role;
  if (role === 'PLATFORM_ADMIN') redirect('/platform/tenants');
  const tenantId = (session.user as { tenantId?: string }).tenantId;
  if (!tenantId) redirect('/login');

  return (
    <div
      className="min-h-screen flex flex-col"
      style={{
        backgroundImage: 'url("/images/school-sports-saas-dashboard-bg-16x9.png")',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      }}
    >
      <header className="border-b px-4 py-3 flex items-center gap-2 md:gap-4 bg-background/60 backdrop-blur-sm min-w-0">
        <Link href="/app/dashboard" className="font-semibold shrink-0">Athletic Bharat</Link>
        <details className="md:hidden relative shrink-0">
          <summary className="cursor-pointer rounded-md border border-input bg-background px-3 py-1.5 text-sm font-medium text-foreground list-none [&::-webkit-details-marker]:hidden">
            Menu
          </summary>
          <nav className="absolute left-0 top-full z-[10060] mt-1 flex min-w-[12rem] flex-col gap-2 rounded-md border bg-background p-3 shadow-lg ring-1 ring-border/60">
            <Link href="/app/dashboard" className="text-sm text-muted-foreground hover:text-foreground">📊 Dashboard</Link>
            <Link href="/app/students" className="text-sm text-muted-foreground hover:text-foreground">👥 Students</Link>
            <Link href="/app/competitions" className="text-sm text-muted-foreground hover:text-foreground">🏆 Competitions</Link>
            <Link href="/app/inventory" className="text-sm text-muted-foreground hover:text-foreground">📦 Inventory</Link>
            <Link href="/app/billing" className="text-sm text-muted-foreground hover:text-foreground">💳 Billing</Link>
            <Link href="/app/settings" className="text-sm text-muted-foreground hover:text-foreground">⚙️ School Profile</Link>
          </nav>
        </details>
        <nav className="hidden md:flex flex-1 flex-wrap gap-x-4 gap-y-1 justify-center min-w-0">
          <Link href="/app/dashboard" className="text-sm text-muted-foreground hover:text-foreground">📊 Dashboard</Link>
          <Link href="/app/students" className="text-sm text-muted-foreground hover:text-foreground">👥 Students</Link>
          <Link href="/app/competitions" className="text-sm text-muted-foreground hover:text-foreground">🏆 Competitions</Link>
          <Link href="/app/inventory" className="text-sm text-muted-foreground hover:text-foreground">📦 Inventory</Link>
          <Link href="/app/billing" className="text-sm text-muted-foreground hover:text-foreground">💳 Billing</Link>
          <Link href="/app/settings" className="text-sm text-muted-foreground hover:text-foreground">⚙️ School Profile</Link>
        </nav>
        <div className="ml-auto flex min-w-0 items-center gap-2 sm:gap-4 text-sm text-muted-foreground shrink-0">
          <span className="truncate max-w-[10rem] sm:max-w-[12rem] md:max-w-[16rem] lg:max-w-none">{session.user.email}</span>
          <LogoutButton />
        </div>
      </header>
      <main className="flex-1 p-4">
        <div className="mx-auto max-w-6xl bg-background/70 backdrop-blur-sm rounded-xl shadow-sm">
          {children}
        </div>
      </main>
    </div>
  );
}
