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
      <header className="border-b px-4 py-3 flex items-center gap-4">
        <Link href="/platform/tenants" className="font-semibold">Athletic Bharat (Platform)</Link>
        <nav className="flex gap-4">
          <Link href="/platform/tenants" className="text-sm text-muted-foreground hover:text-foreground">Tenants</Link>
          <Link href="/platform/sports" className="text-sm text-muted-foreground hover:text-foreground">Sports Library</Link>
        </nav>
        <div className="ml-auto flex items-center gap-4 text-sm text-muted-foreground">
          {session.user.email}
          <LogoutButton />
        </div>
      </header>
      <main className="flex-1 p-4">{children}</main>
    </div>
  );
}
