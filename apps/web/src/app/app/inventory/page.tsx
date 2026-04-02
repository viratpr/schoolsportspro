'use client';

import { useSession } from 'next-auth/react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { InventoryDashboard } from '@/components/inventory/InventoryDashboard';
import { InventoryIssueReturn } from '@/components/inventory/InventoryIssueReturn';
import { InventoryRegister } from '@/components/inventory/InventoryRegister';

export default function InventoryPage() {
  const { data: session, status } = useSession();
  const tenantId = (session?.user as { tenantId?: string })?.tenantId ?? '';
  const role = (session?.user as { role?: string })?.role ?? '';
  const canMutate = role !== 'VIEWER';

  if (status === 'loading') {
    return <p className="p-8 text-sm text-muted-foreground">Loading…</p>;
  }

  if (!tenantId) {
    return (
      <div className="p-8 text-center text-muted-foreground">
        <p>No school workspace linked to this account.</p>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8 max-w-6xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Sports inventory</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Track games and PE equipment—issue, return, and maintain your school register.
        </p>
      </div>

      <Tabs defaultValue="dashboard" className="w-full">
        <TabsList className="grid w-full max-w-xl grid-cols-3">
          <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
          <TabsTrigger value="issue">Issue &amp; return</TabsTrigger>
          <TabsTrigger value="register">Register</TabsTrigger>
        </TabsList>
        <TabsContent value="dashboard" className="mt-6">
          <InventoryDashboard tenantId={tenantId} />
        </TabsContent>
        <TabsContent value="issue" className="mt-6">
          <InventoryIssueReturn tenantId={tenantId} canMutate={canMutate} />
        </TabsContent>
        <TabsContent value="register" className="mt-6">
          <InventoryRegister tenantId={tenantId} canMutate={canMutate} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
