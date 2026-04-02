'use client';

import { useQuery } from '@tanstack/react-query';
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { apiGet, ApiClientError, ApiResult } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { ChevronDown, Search } from 'lucide-react';

export type StudentPickerRow = {
  id: string;
  admissionNo: string;
  fullName: string;
  classStandard: string;
  section?: string | null;
};

type StudentsListRes = { data: StudentPickerRow[]; nextCursor: string | null };

function assertOk<T>(r: ApiResult<T>): T {
  if (!r.ok) throw new ApiClientError(r.error.message, r.error.statusCode, r.error.code, r.error.details);
  return r.data;
}

export function formatClassSection(s: Pick<StudentPickerRow, 'classStandard' | 'section'>): string {
  const sec = (s.section ?? '').trim();
  return sec ? `${s.classStandard}-${sec}` : s.classStandard;
}

function useDebouncedValue<T>(value: T, ms: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), ms);
    return () => clearTimeout(t);
  }, [value, ms]);
  return debounced;
}

type Props = {
  tenantId: string;
  selectedStudentId: string | null;
  /** Shown on the trigger when a student is linked */
  triggerSummary: string;
  onSelectStudent: (s: StudentPickerRow) => void;
  onClearStudent: () => void;
  disabled?: boolean;
  /**
   * When true, the list opens **above** the trigger so it does not cover fields
   * immediately below (e.g. class / submit on issue forms).
   */
  preferOpenAbove?: boolean;
};

export function StudentBorrowerCombobox({
  tenantId,
  selectedStudentId,
  triggerSummary,
  onSelectStudent,
  onClearStudent,
  disabled,
  preferOpenAbove = false,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [searchInput, setSearchInput] = useState('');
  const debouncedSearch = useDebouncedValue(searchInput.trim(), 280);
  const [panelRect, setPanelRect] = useState<{
    placement: 'above' | 'below';
    left: number;
    width: number;
    maxHeight: number;
    top?: number;
    bottom?: number;
  } | null>(null);

  const { data, isFetching } = useQuery({
    queryKey: ['tenants', tenantId, 'students', 'inventory-borrower', debouncedSearch],
    queryFn: async () =>
      assertOk(
        await apiGet<StudentsListRes>(`/tenants/${tenantId}/students`, {
          limit: '50',
          active: 'true',
          ...(debouncedSearch ? { q: debouncedSearch } : {}),
        })
      ),
    enabled: !!tenantId && open,
    staleTime: 30_000,
  });

  const rows = data?.data ?? [];

  const updatePanelPosition = useCallback(() => {
    const el = triggerRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const gap = 8;
    const viewportPad = 12;
    const spaceBelow = window.innerHeight - r.bottom - viewportPad;
    const spaceAbove = r.top - viewportPad;
    const openAbove =
      preferOpenAbove ||
      (spaceBelow < 340 && spaceAbove > spaceBelow) ||
      (spaceBelow < 220 && spaceAbove >= 160);
    const width = Math.max(r.width, 240);
    let left = r.left;
    left = Math.max(viewportPad, Math.min(left, window.innerWidth - width - viewportPad));

    if (openAbove) {
      const maxHeight = Math.max(160, Math.min(spaceAbove - gap, window.innerHeight * 0.55));
      setPanelRect({
        placement: 'above',
        left,
        width,
        maxHeight,
        bottom: window.innerHeight - r.top + gap,
      });
    } else {
      const maxHeight = Math.max(160, Math.min(spaceBelow - gap, window.innerHeight * 0.55));
      setPanelRect({
        placement: 'below',
        left,
        width,
        maxHeight,
        top: r.bottom + gap,
      });
    }
  }, [preferOpenAbove]);

  useLayoutEffect(() => {
    if (!open) {
      setPanelRect(null);
      return;
    }
    updatePanelPosition();
    window.addEventListener('scroll', updatePanelPosition, true);
    window.addEventListener('resize', updatePanelPosition);
    return () => {
      window.removeEventListener('scroll', updatePanelPosition, true);
      window.removeEventListener('resize', updatePanelPosition);
    };
  }, [open, updatePanelPosition]);

  useEffect(() => {
    if (!open) return;
    function onDocDown(e: MouseEvent) {
      const t = e.target as Node;
      if (containerRef.current?.contains(t)) return;
      if (panelRef.current?.contains(t)) return;
      setOpen(false);
    }
    document.addEventListener('mousedown', onDocDown);
    return () => document.removeEventListener('mousedown', onDocDown);
  }, [open]);

  const handleOpen = useCallback(() => {
    if (disabled) return;
    setOpen(true);
    setSearchInput('');
  }, [disabled]);

  const openAbovePanel = panelRect?.placement === 'above';

  const panelContent =
    open && panelRect && typeof document !== 'undefined' ? (
      <div
        ref={panelRef}
        className={cn(
          'fixed z-[10050] flex gap-3 rounded-md border bg-popover p-3 text-popover-foreground shadow-xl outline-none ring-1 ring-border/60',
          openAbovePanel ? 'flex-col-reverse' : 'flex-col'
        )}
        style={{
          left: panelRect.left,
          width: panelRect.width,
          maxHeight: panelRect.maxHeight,
          ...(panelRect.placement === 'below'
            ? { top: panelRect.top, bottom: 'auto' }
            : { bottom: panelRect.bottom, top: 'auto' }),
        }}
        role="listbox"
      >
        <div className="relative shrink-0">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 z-10 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="h-10 pl-8"
            placeholder="Type to search…"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            autoFocus
            aria-label="Search students"
          />
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain rounded-md border border-border/60 bg-background">
          {isFetching && rows.length === 0 ? (
            <p className="px-3 py-4 text-sm text-muted-foreground">Loading…</p>
          ) : rows.length === 0 ? (
            <p className="px-3 py-4 text-sm text-muted-foreground">
              {debouncedSearch ? 'No matches. Try a different name or admission number.' : 'No students found.'}
            </p>
          ) : (
            <ul className="divide-y divide-border/50">
              {rows.map((s) => (
                <li key={s.id} role="none">
                  <button
                    type="button"
                    role="option"
                    aria-selected={selectedStudentId === s.id}
                    className="flex w-full cursor-pointer flex-col gap-1 px-3 py-3 text-left text-sm leading-snug hover:bg-accent"
                    onClick={() => {
                      onSelectStudent(s);
                      setOpen(false);
                      setSearchInput('');
                    }}
                  >
                    <span className="block font-medium">{s.fullName}</span>
                    <span className="block text-xs leading-normal text-muted-foreground">
                      {formatClassSection(s)} · Adm. {s.admissionNo}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
        {!debouncedSearch ? (
          <p
            className={cn(
              'shrink-0 px-1 text-xs leading-relaxed text-muted-foreground',
              openAbovePanel ? 'border-b border-border/40 pb-2' : 'border-t border-border/40 pt-2'
            )}
          >
            Showing up to 50 students. Type to narrow by name or admission number.
          </p>
        ) : null}
      </div>
    ) : null;

  return (
    <div ref={containerRef} className="relative">
      <Button
        ref={triggerRef}
        type="button"
        variant="outline"
        disabled={disabled}
        className={cn(
          'h-10 w-full justify-between font-normal',
          !triggerSummary && 'text-muted-foreground'
        )}
        onClick={() => (open ? setOpen(false) : handleOpen())}
        aria-expanded={open}
        aria-haspopup="listbox"
      >
        <span className="truncate text-left">
          {triggerSummary || 'Search students by name or admission no…'}
        </span>
        <ChevronDown className="h-4 w-4 shrink-0 opacity-50" />
      </Button>
      {selectedStudentId ? (
        <Button
          type="button"
          variant="link"
          className="mt-1 h-auto p-0 text-xs text-muted-foreground"
          onClick={() => {
            onClearStudent();
            setOpen(false);
          }}
        >
          Clear student
        </Button>
      ) : null}

      {panelContent ? createPortal(panelContent, document.body) : null}
    </div>
  );
}
