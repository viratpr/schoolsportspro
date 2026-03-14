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
      <header className="border-b px-4 py-3 flex items-center gap-4 bg-background/60 backdrop-blur-sm">
        <Link href="/app/dashboard" className="font-semibold">Athletic Bharat</Link>
        <nav className="flex gap-4">
          <Link href="/app/dashboard" className="text-sm text-muted-foreground hover:text-foreground">Dashboard</Link>
          <Link href="/app/students" className="text-sm text-muted-foreground hover:text-foreground">Students</Link>
          <Link href="/app/competitions" className="text-sm text-muted-foreground hover:text-foreground">Competitions</Link>
          <Link href="/app/cricket/matches" className="text-sm text-muted-foreground hover:text-foreground">Cricket scorecards</Link>
          <Link href="/app/billing" className="text-sm text-muted-foreground hover:text-foreground">Billing</Link>
          <Link href="/app/settings" className="text-sm text-muted-foreground hover:text-foreground">School profile</Link>
        </nav>
        <div className="ml-auto flex items-center gap-4 text-sm text-muted-foreground">
          {session.user.email}
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
