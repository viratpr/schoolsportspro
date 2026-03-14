import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { DashboardStats } from './DashboardStats';

export default async function AppDashboardPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect('/login');
  const tenantId = (session.user as { tenantId?: string }).tenantId;
  if (!tenantId) redirect('/login');

  return (
    <div>
      <h1 className="text-2xl font-bold mb-4">Dashboard</h1>
      <DashboardStats tenantId={tenantId} />
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Students</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground text-sm mb-4">Manage student master data and import from CSV.</p>
            <Link href="/app/students">
              <Button variant="outline">Go to Students</Button>
            </Link>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Competitions</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground text-sm mb-4">
              Create and manage yearly competitions, sports, categories, and results.
            </p>
            <Link href="/app/competitions">
              <Button variant="outline">Go to Competitions</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
