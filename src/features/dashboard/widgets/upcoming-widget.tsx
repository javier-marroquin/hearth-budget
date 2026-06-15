import { GripVertical, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { UpcomingTimeline } from '../components/upcoming-timeline';
import type { WidgetProps } from './widget-types';

interface UpcomingWidgetProps extends WidgetProps {
  onRemove?: () => void;
}

/**
 * Upcoming timeline is already a Card, so the widget wrapper is minimal —
 * just the edit-mode overlay.
 */
export function UpcomingWidget({ ctx, config, onRemove }: UpcomingWidgetProps) {
  const windowDays = (config?.windowDays as number) ?? 14;
  return (
    <div className="relative h-full overflow-hidden">
      {ctx.editing && (
        <>
          <span
            className="widget-drag-handle absolute left-2 top-2 z-10 cursor-move rounded bg-background/80 p-1 text-muted-foreground backdrop-blur"
            aria-label="Mover widget"
          >
            <GripVertical className="h-4 w-4" />
          </span>
          {onRemove && (
            <Button
              variant="ghost"
              size="icon"
              className="absolute right-2 top-2 z-10 h-7 w-7 bg-background/80 backdrop-blur"
              onClick={(e) => {
                e.stopPropagation();
                onRemove();
              }}
              aria-label="Quitar widget"
            >
              <X className="h-3.5 w-3.5" />
            </Button>
          )}
        </>
      )}
      <div className="h-full overflow-auto">
        <UpcomingTimeline
          householdId={ctx.householdId}
          currency={ctx.currency}
          windowDays={windowDays}
          variant="sidebar"
        />
      </div>
    </div>
  );
}
