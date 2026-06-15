import { type ReactNode } from 'react';
import { GripVertical, X } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface WidgetShellProps {
  title?: string;
  subtitle?: string;
  /** Right-side header content (badges, actions). */
  actions?: ReactNode;
  /** Are we in edit mode (show drag/remove affordances). */
  editing?: boolean;
  /** Called when the user removes this widget instance. */
  onRemove?: () => void;
  /** Optional className for the inner content. */
  contentClassName?: string;
  /** Make the whole widget body click-through. */
  onActivate?: () => void;
  children: ReactNode;
}

/**
 * Standard chrome for every dashboard widget. Provides a drag handle in
 * edit mode and a remove button. The drag handle uses the className
 * `widget-drag-handle` which react-grid-layout listens for via
 * `draggableHandle="\.widget-drag-handle"`.
 */
export function WidgetShell({
  title,
  subtitle,
  actions,
  editing = false,
  onRemove,
  contentClassName,
  onActivate,
  children,
}: WidgetShellProps) {
  const clickable = Boolean(onActivate) && !editing;

  const hasHeader = Boolean(title || editing);

  return (
    <Card
      className={cn(
        'flex h-full flex-col overflow-hidden border-border shadow-none transition-shadow duration-150',
        editing && 'ring-1 ring-primary/40',
        clickable && 'cursor-pointer hover:border-border/80',
      )}
      onClick={clickable ? onActivate : undefined}
    >
      {hasHeader && (
        <div className="flex shrink-0 items-center justify-between gap-2 border-b border-border/60 px-3 py-2">
          <div className="flex min-w-0 items-center gap-1.5">
            {editing && (
              <span
                className="widget-drag-handle cursor-move rounded p-1 text-muted-foreground hover:bg-accent"
                aria-label="Mover widget"
                onClick={(e) => e.stopPropagation()}
              >
                <GripVertical className="h-3.5 w-3.5" />
              </span>
            )}
            <div className="min-w-0">
              {title && (
                <p className="truncate text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                  {title}
                </p>
              )}
              {subtitle && (
                <p className="truncate text-[10px] text-muted-foreground/70">
                  {subtitle}
                </p>
              )}
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-1">
            {actions}
            {editing && onRemove && (
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                onClick={(e) => {
                  e.stopPropagation();
                  onRemove();
                }}
                aria-label="Quitar widget"
              >
                <X className="h-3.5 w-3.5" />
              </Button>
            )}
          </div>
        </div>
      )}
      <CardContent
        className={cn('min-h-0 flex-1 overflow-auto p-3', contentClassName)}
      >
        {children}
      </CardContent>
    </Card>
  );
}
