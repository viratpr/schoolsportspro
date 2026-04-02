'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiGet, apiPatch, apiPost, ApiClientError, ApiResult } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useState } from 'react';

type InventoryItemStored = {
  id: string;
  name: string;
  category: string;
  quantityTotal: number;
  quantityDamaged: number;
  createdAt: string;
  updatedAt: string;
};

type InventoryItemRow = InventoryItemStored & {
  quantityOnLoan: number;
  quantityAvailable: number;
};

type ItemsRes = { data: InventoryItemRow[] };

function assertOk<T>(r: ApiResult<T>): T {
  if (!r.ok) throw new ApiClientError(r.error.message, r.error.statusCode, r.error.code, r.error.details);
  return r.data;
}

function invalidateInventory(qc: ReturnType<typeof useQueryClient>, tenantId: string) {
  qc.invalidateQueries({ queryKey: ['tenants', tenantId, 'inventory'] });
}

export function InventoryRegister({ tenantId, canMutate }: { tenantId: string; canMutate: boolean }) {
  const queryClient = useQueryClient();
  const [addOpen, setAddOpen] = useState(false);
  const [editRow, setEditRow] = useState<InventoryItemRow | null>(null);

  const [addName, setAddName] = useState('');
  const [addCategory, setAddCategory] = useState('');
  const [addTotal, setAddTotal] = useState('0');
  const [addDamaged, setAddDamaged] = useState('0');

  const [editTotal, setEditTotal] = useState('');
  const [editDamaged, setEditDamaged] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['tenants', tenantId, 'inventory', 'items'],
    queryFn: async () => assertOk(await apiGet<ItemsRes>(`/tenants/${tenantId}/inventory/items`)),
    enabled: !!tenantId,
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      const quantityTotal = Math.max(0, parseInt(addTotal, 10) || 0);
      const quantityDamaged = Math.max(0, parseInt(addDamaged, 10) || 0);
      return assertOk(
        await apiPost<InventoryItemStored>(`/tenants/${tenantId}/inventory/items`, {
          name: addName.trim(),
          category: addCategory.trim(),
          quantityTotal,
          quantityDamaged,
        })
      );
    },
    onSuccess: () => {
      invalidateInventory(queryClient, tenantId);
      setAddOpen(false);
      setAddName('');
      setAddCategory('');
      setAddTotal('0');
      setAddDamaged('0');
    },
  });

  const patchMutation = useMutation({
    mutationFn: async () => {
      if (!editRow) return null;
      return assertOk(
        await apiPatch<InventoryItemStored>(`/tenants/${tenantId}/inventory/items/${editRow.id}`, {
          quantityTotal: Math.max(0, parseInt(editTotal, 10) || 0),
          quantityDamaged: Math.max(0, parseInt(editDamaged, 10) || 0),
        })
      );
    },
    onSuccess: () => {
      invalidateInventory(queryClient, tenantId);
      setEditRow(null);
    },
  });

  const rows = data?.data ?? [];

  return (
    <Card>
      <CardHeader className="flex flex-row flex-wrap items-start justify-between gap-4 space-y-0">
        <div>
          <CardTitle className="text-base">Master register</CardTitle>
          <p className="text-sm text-muted-foreground">Line items and stock levels</p>
        </div>
        {canMutate ? (
          <Button onClick={() => setAddOpen(true)}>Add asset</Button>
        ) : null}
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : rows.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No items yet.{canMutate ? ' Use Add asset to create your first line.' : ''}
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-muted-foreground">
                  <th className="py-2 pr-3 font-medium">Name</th>
                  <th className="py-2 pr-3 font-medium">Category</th>
                  <th className="py-2 pr-3 font-medium text-right">Total</th>
                  <th className="py-2 pr-3 font-medium text-right">Available</th>
                  <th className="py-2 pr-3 font-medium text-right">On loan</th>
                  <th className="py-2 pr-3 font-medium text-right">Damaged</th>
                  <th className="py-2 font-medium" />
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.id} className="border-b border-border/60">
                    <td className="py-2 pr-3 font-medium">{row.name}</td>
                    <td className="py-2 pr-3">{row.category}</td>
                    <td className="py-2 pr-3 text-right tabular-nums">{row.quantityTotal}</td>
                    <td className="py-2 pr-3 text-right tabular-nums">{row.quantityAvailable}</td>
                    <td className="py-2 pr-3 text-right tabular-nums">{row.quantityOnLoan}</td>
                    <td className="py-2 pr-3 text-right tabular-nums">{row.quantityDamaged}</td>
                    <td className="py-2">
                      {canMutate ? (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => {
                            setEditRow(row);
                            setEditTotal(String(row.quantityTotal));
                            setEditDamaged(String(row.quantityDamaged));
                          }}
                        >
                          Edit
                        </Button>
                      ) : null}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>

      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add asset</DialogTitle>
            <DialogDescription>One row per equipment type (e.g. “Nivia Football Size 5”).</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Name</Label>
              <Input value={addName} onChange={(e) => setAddName(e.target.value)} placeholder="Item name" />
            </div>
            <div>
              <Label>Category</Label>
              <Input value={addCategory} onChange={(e) => setAddCategory(e.target.value)} placeholder="e.g. Ball Sports" />
            </div>
            <div>
              <Label>Total quantity</Label>
              <Input type="number" min={0} value={addTotal} onChange={(e) => setAddTotal(e.target.value)} />
            </div>
            <div>
              <Label>Damaged (needs repair)</Label>
              <Input type="number" min={0} value={addDamaged} onChange={(e) => setAddDamaged(e.target.value)} />
            </div>
            {createMutation.isError ? (
              <p className="text-sm text-destructive">
                {createMutation.error instanceof ApiClientError
                  ? createMutation.error.message
                  : 'Could not create item'}
              </p>
            ) : null}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddOpen(false)}>
              Cancel
            </Button>
            <Button
              disabled={createMutation.isPending || !addName.trim() || !addCategory.trim()}
              onClick={() => createMutation.mutate()}
            >
              {createMutation.isPending ? 'Saving…' : 'Save'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!editRow} onOpenChange={(o) => !o && setEditRow(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit quantities</DialogTitle>
            <DialogDescription>
              {editRow ? `${editRow.name} · ${editRow.quantityOnLoan} currently on loan` : ''}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Total quantity</Label>
              <Input type="number" min={0} value={editTotal} onChange={(e) => setEditTotal(e.target.value)} />
            </div>
            <div>
              <Label>Damaged</Label>
              <Input type="number" min={0} value={editDamaged} onChange={(e) => setEditDamaged(e.target.value)} />
            </div>
            {patchMutation.isError ? (
              <p className="text-sm text-destructive">
                {patchMutation.error instanceof ApiClientError
                  ? patchMutation.error.message
                  : 'Could not update'}
              </p>
            ) : null}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditRow(null)}>
              Cancel
            </Button>
            <Button disabled={patchMutation.isPending} onClick={() => patchMutation.mutate()}>
              {patchMutation.isPending ? 'Saving…' : 'Save'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
