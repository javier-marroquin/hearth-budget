import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Plus, Pencil, Trash2, Tags } from 'lucide-react';
import { PageHeader } from '@/components/layout/page-header';
import { EmptyState } from '@/components/layout/empty-state';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { useHouseholdStore } from '@/features/households/stores/household.store';
import { useCategories, useDeleteCategory } from '../hooks/use-categories';
import { CategoryFormDialog } from '../components/category-form-dialog';
import { usePermissions } from '@/hooks/use-permissions';
import { formatCurrency } from '@/lib/format';
import type { CategoryRow, CategoryType } from '@/lib/supabase/database.types';

export function CategoriesPage() {
  const { t } = useTranslation();
  const activeHousehold = useHouseholdStore((s) => s.activeHousehold);
  const { canManageCategories } = usePermissions();
  const householdId = activeHousehold?.id ?? '';
  const [activeTab, setActiveTab] = useState<CategoryType>('expense');

  const { data: categories, isLoading } = useCategories(householdId, activeTab);
  const remove = useDeleteCategory(householdId);

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<CategoryRow | null>(null);
  const [toDelete, setToDelete] = useState<CategoryRow | null>(null);

  return (
    <>
      <PageHeader
        title={t('nav.categories')}
        actions={
          canManageCategories && (
            <Button
              onClick={() => {
                setEditing(null);
                setOpen(true);
              }}
            >
              <Plus className="h-4 w-4" />
              Nueva categoría
            </Button>
          )
        }
      />

      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as CategoryType)}>
        <TabsList>
          <TabsTrigger value="expense">Gasto</TabsTrigger>
          <TabsTrigger value="income">Ingreso</TabsTrigger>
          <TabsTrigger value="savings">Ahorro</TabsTrigger>
        </TabsList>
        <TabsContent value={activeTab} className="mt-4">
          {isLoading && (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <Skeleton key={i} className="h-24" />
              ))}
            </div>
          )}

          {!isLoading && (!categories || categories.length === 0) && (
            <EmptyState
              icon={Tags}
              title="Sin categorías"
              description="Los hogares nuevos se crean con un set de categorías por defecto."
            />
          )}

          {!isLoading && categories && categories.length > 0 && (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {categories.map((c) => (
                <Card key={c.id} className="card-hover">
                  <CardContent className="flex items-center justify-between p-4">
                    <div className="flex items-center gap-3">
                      <span
                        className="flex h-10 w-10 items-center justify-center rounded-md text-white"
                        style={{ backgroundColor: c.color }}
                        aria-hidden
                      >
                        <Tags className="h-5 w-5" />
                      </span>
                      <div>
                        <p className="font-semibold">{c.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {c.monthly_budget
                            ? `${formatCurrency(Number(c.monthly_budget), { currency: activeHousehold?.currency })} / mes`
                            : 'Sin presupuesto'}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      {c.is_system && <Badge variant="outline">Default</Badge>}
                      {canManageCategories && (
                        <>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                              setEditing(c);
                              setOpen(true);
                            }}
                            aria-label="Editar"
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          {!c.is_system && (
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => setToDelete(c)}
                              aria-label="Eliminar"
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          )}
                        </>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      <CategoryFormDialog
        open={open}
        onOpenChange={setOpen}
        category={editing}
        defaultType={activeTab}
      />

      <ConfirmDialog
        open={Boolean(toDelete)}
        onOpenChange={(o) => !o && setToDelete(null)}
        title="Eliminar categoría"
        description="Las transacciones asociadas quedarán sin categoría."
        destructive
        confirmLabel="Eliminar"
        onConfirm={() => {
          if (toDelete) remove.mutate(toDelete.id);
          setToDelete(null);
        }}
      />
    </>
  );
}
