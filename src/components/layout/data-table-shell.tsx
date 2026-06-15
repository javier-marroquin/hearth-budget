import { type ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface DataTableShellProps {
  children: ReactNode;
  className?: string;
  /** Enable vertical scroll with sticky header */
  scrollable?: boolean;
}

/** Notion-style table container for list views. */
export function DataTableShell({
  children,
  className,
  scrollable = true,
}: DataTableShellProps) {
  return (
    <div className={cn('data-table-shell', className)}>
      <div className={cn(scrollable && 'table-scroll')}>{children}</div>
    </div>
  );
}
