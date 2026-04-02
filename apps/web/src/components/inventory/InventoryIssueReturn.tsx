'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiGet, apiPost, ApiClientError, ApiResult } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { formatClassSection, StudentBorrowerCombobox, type StudentPickerRow } from '@/components/inventory/StudentBorrowerCombobox';
import { useState } from 'react';

type InventoryItemRow = {
  id: string;
  name: string;
  category: string;
  quantityTotal: number;
  quantityDamaged: number;
  quantityOnLoan: number;
  quantityAvailable: number;
};

type ItemsRes = { data: InventoryItemRow[] };

type LoanRow = {
  id: string;
  quantity: number;
  borrowerName: string;
  classSection: string;
  issuedAt: string;
  item: { id: string; name: string; category: string };
};

type LoansRes = { data: LoanRow[] };

function assertOk<T>(r: ApiResult<T>): T {
  if (!r.ok) throw new ApiClientError(r.error.message, r.error.statusCode, r.error.code, r.error.details);
  return r.data;
}

function invalidateInventory(qc: ReturnType<typeof useQueryClient>, tenantId: string) {
  qc.invalidateQueries({ queryKey: ['tenants', tenantId, 'inventory'] });
}

export function InventoryIssueReturn({
  tenantId,
  canMutate,
}: {
  tenantId: string;
  canMutate: boolean;
}) {
  const queryClient = useQueryClient();
  const [itemId, setItemId] = useState<string>('');
  const [quantity, setQuantity] = useState<string>('1');
  const [borrowerName, setBorrowerName] = useState('');
  const [classSection, setClassSection] = useState('');
  const [borrowerStudentId, setBorrowerStudentId] = useState<string | null>(null);
  const [manualBorrower, setManualBorrower] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const { data: itemsRes, isLoading: itemsLoading } = useQuery({
    queryKey: ['tenants', tenantId, 'inventory', 'items'],
    queryFn: async () => assertOk(await apiGet<ItemsRes>(`/tenants/${tenantId}/inventory/items`)),
    enabled: !!tenantId,
  });

  const { data: loansRes, isLoading: loansLoading } = useQuery({
    queryKey: ['tenants', tenantId, 'inventory', 'loans', 'open'],
    queryFn: async () =>
      assertOk(await apiGet<LoansRes>(`/tenants/${tenantId}/inventory/loans`, { open: '1' })),
    enabled: !!tenantId,
  });

  const items = itemsRes?.data ?? [];
  const issuable = items.filter((i) => i.quantityAvailable > 0);
  const selected = items.find((i) => i.id === itemId);
  const maxQty = selected?.quantityAvailable ?? 0;

  const issueMutation = useMutation({
    mutationFn: async () => {
      const q = Math.max(1, parseInt(quantity, 10) || 0);
      if (!itemId) throw new Error('Select an item');
      if (!manualBorrower && !borrowerStudentId) throw new Error('Select a student from the list');
      if (!borrowerName.trim() || !classSection.trim()) throw new Error('Borrower and class/section are required');
      return assertOk(
        await apiPost(`/tenants/${tenantId}/inventory/loans`, {
          itemId,
          quantity: q,
          borrowerName: borrowerName.trim(),
          classSection: classSection.trim(),
          ...(borrowerStudentId ? { studentId: borrowerStudentId } : {}),
        })
      );
    },
    onSuccess: () => {
      invalidateInventory(queryClient, tenantId);
      setFormError(null);
      setBorrowerName('');
      setClassSection('');
      setBorrowerStudentId(null);
      setManualBorrower(false);
      setQuantity('1');
      setItemId('');
    },
    onError: (err) => {
      const msg =
        err instanceof ApiClientError
          ? err.message
          : err instanceof Error
            ? err.message
            : 'Issue failed';
      setFormError(msg);
    },
  });

  const returnMutation = useMutation({
    mutationFn: async (loanId: string) =>
      assertOk(await apiPost(`/tenants/${tenantId}/inventory/loans/${loanId}/return`, {})),
    onSuccess: () => invalidateInventory(queryClient, tenantId),
  });

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Issue equipment</CardTitle>
          <p className="text-sm text-muted-foreground">Record what goes out for games or PT class</p>
        </CardHeader>
        <CardContent className="space-y-4">
          {!canMutate && (
            <p className="text-sm text-muted-foreground">Your role can view open issues but cannot issue or return.</p>
          )}
          {canMutate && (
            <form
              className="space-y-4"
              onSubmit={(e) => {
                e.preventDefault();
                setFormError(null);
                issueMutation.mutate();
              }}
            >
              <div className="space-y-2">
                <Label>Item</Label>
                {itemsLoading ? (
                  <p className="text-sm text-muted-foreground">Loading items…</p>
                ) : issuable.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No items with available quantity. Add stock in the register.</p>
                ) : (
                  <Select value={itemId || undefined} onValueChange={setItemId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Choose item" />
                    </SelectTrigger>
                    <SelectContent>
                      {issuable.map((i) => (
                        <SelectItem key={i.id} value={i.id}>
                          {i.name} · {i.quantityAvailable} available
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>
              <div className="space-y-2">
                <Label>Quantity</Label>
                <Input
                  type="number"
                  min={1}
                  max={maxQty || undefined}
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                  disabled={!itemId}
                />
                {selected ? (
                  <p className="text-xs text-muted-foreground">Up to {maxQty} for this item</p>
                ) : null}
              </div>
              <div className="space-y-2">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <Label>{manualBorrower ? 'Borrower name' : 'Borrower (student)'}</Label>
                  <Button
                    type="button"
                    variant="link"
                    className="h-auto p-0 text-xs"
                    onClick={() => {
                      if (manualBorrower) {
                        setManualBorrower(false);
                        setBorrowerName('');
                        setClassSection('');
                        setBorrowerStudentId(null);
                      } else {
                        setManualBorrower(true);
                        setBorrowerStudentId(null);
                      }
                    }}
                  >
                    {manualBorrower ? 'Pick from student list' : 'Staff / guest (manual)'}
                  </Button>
                </div>
                {manualBorrower ? (
                  <Input
                    value={borrowerName}
                    onChange={(e) => setBorrowerName(e.target.value)}
                    placeholder="Name"
                  />
                ) : (
                  <StudentBorrowerCombobox
                    preferOpenAbove
                    tenantId={tenantId}
                    selectedStudentId={borrowerStudentId}
                    triggerSummary={
                      borrowerStudentId ? `${borrowerName} · ${classSection}` : ''
                    }
                    onSelectStudent={(s: StudentPickerRow) => {
                      setBorrowerStudentId(s.id);
                      setBorrowerName(s.fullName);
                      setClassSection(formatClassSection(s));
                    }}
                    onClearStudent={() => {
                      setBorrowerStudentId(null);
                      setBorrowerName('');
                      setClassSection('');
                    }}
                  />
                )}
              </div>
              <div className="space-y-2">
                <Label>Class / section</Label>
                <Input
                  value={classSection}
                  onChange={(e) => setClassSection(e.target.value)}
                  placeholder="e.g. 8-A"
                />
              </div>
              {formError ? <p className="text-sm text-destructive">{formError}</p> : null}
              <Button type="submit" disabled={issueMutation.isPending || issuable.length === 0 || !itemId}>
                {issueMutation.isPending ? 'Issuing…' : 'Issue'}
              </Button>
            </form>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Active issues</CardTitle>
          <p className="text-sm text-muted-foreground">Receive returns when equipment comes back</p>
        </CardHeader>
        <CardContent>
          {loansLoading ? (
            <p className="text-sm text-muted-foreground">Loading…</p>
          ) : !(loansRes?.data.length) ? (
            <p className="text-sm text-muted-foreground">No open issues.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-muted-foreground">
                    <th className="py-2 pr-3 font-medium">Item</th>
                    <th className="py-2 pr-3 font-medium">Qty</th>
                    <th className="py-2 pr-3 font-medium">Borrower</th>
                    <th className="py-2 pr-3 font-medium">Class</th>
                    <th className="py-2 font-medium" />
                  </tr>
                </thead>
                <tbody>
                  {loansRes!.data.map((row) => (
                    <tr key={row.id} className="border-b border-border/60">
                      <td className="py-2 pr-3">{row.item.name}</td>
                      <td className="py-2 pr-3 tabular-nums">{row.quantity}</td>
                      <td className="py-2 pr-3">{row.borrowerName}</td>
                      <td className="py-2 pr-3">{row.classSection}</td>
                      <td className="py-2">
                        {canMutate ? (
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={returnMutation.isPending}
                            onClick={() => returnMutation.mutate(row.id)}
                          >
                            Receive back
                          </Button>
                        ) : null}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {returnMutation.isError ? (
            <p className="mt-2 text-sm text-destructive">
              {returnMutation.error instanceof ApiClientError
                ? returnMutation.error.message
                : 'Return failed'}
            </p>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}
