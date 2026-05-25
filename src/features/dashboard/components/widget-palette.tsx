import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Plus, Search } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { WIDGETS } from '../widgets/widget-registry';
import { shortId } from '@/lib/utils';
import type { LayoutItem } from '../widgets/widget-types';

interface WidgetPaletteProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  existing: LayoutItem[];
  onAdd: (item: LayoutItem) => void;
}

const CATEGORY_LABELS: Record<string, string> = {
  kpi: 'KPIs',
  chart: 'Gráficos',
  list: 'Listas',
  envelope: 'Envelope',
  projection: 'Proyección',
};

export function WidgetPalette({
  open,
  onOpenChange,
  existing,
  onAdd,
}: WidgetPaletteProps) {
  const { t: _t } = useTranslation();
  const [search, setSearch] = useState('');

  const placedWidgetIds = useMemo(
    () => new Set(existing.map((e) => e.widgetId)),
    [existing],
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return Object.values(WIDGETS).filter((w) => {
      if (q && !w.label.toLowerCase().includes(q) && !w.description.toLowerCase().includes(q))
        return false;
      // Hide single-instance widgets that are already placed
      if (!w.multiple && placedWidgetIds.has(w.id)) return false;
      return true;
    });
  }, [search, placedWidgetIds]);

  const grouped = useMemo(() => {
    const map = new Map<string, typeof filtered>();
    for (const w of filtered) {
      if (!map.has(w.category)) map.set(w.category, []);
      map.get(w.category)!.push(w);
    }
    return Array.from(map.entries());
  }, [filtered]);

  const handleAdd = (widgetId: string) => {
    const def = WIDGETS[widgetId];
    if (!def) return;
    onAdd({
      instanceId: `${widgetId}-${shortId(6)}`,
      widgetId,
      // Place at the bottom — react-grid-layout will compact upward
      x: 0,
      y: Number.POSITIVE_INFINITY,
      w: def.defaultW,
      h: def.defaultH,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] w-[95vw] max-w-3xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Agregar widget</DialogTitle>
          <DialogDescription>
            Selecciona un widget para añadirlo a tu dashboard. Después arrástralo a donde lo quieras.
          </DialogDescription>
        </DialogHeader>

        <div className="relative mb-3">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Buscar widget…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
            autoFocus
          />
        </div>

        {grouped.length === 0 && (
          <p className="py-8 text-center text-sm text-muted-foreground">
            {placedWidgetIds.size === Object.keys(WIDGETS).length
              ? 'Ya agregaste todos los widgets disponibles.'
              : 'Sin resultados para tu búsqueda.'}
          </p>
        )}

        {grouped.map(([cat, items]) => (
          <div key={cat} className="space-y-2">
            <div className="flex items-center gap-2 pt-2">
              <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                {CATEGORY_LABELS[cat] ?? cat}
              </span>
              <div className="h-px flex-1 bg-border" />
              <Badge variant="outline" className="text-[10px]">
                {items.length}
              </Badge>
            </div>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {items.map((w) => (
                <Card key={w.id} className="card-hover">
                  <CardContent className="flex items-start justify-between gap-3 p-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{w.label}</p>
                      <p className="text-xs text-muted-foreground">{w.description}</p>
                      <p className="mt-1 text-[10px] text-muted-foreground">
                        {w.defaultW}×{w.defaultH}
                      </p>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleAdd(w.id)}
                    >
                      <Plus className="h-3.5 w-3.5" />
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        ))}
      </DialogContent>
    </Dialog>
  );
}
