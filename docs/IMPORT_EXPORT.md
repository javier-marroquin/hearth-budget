# Import / export

Open Hearth Budget supports three ways to move data:

| Format | Use case | Where |
|--------|----------|--------|
| **CSV** (per entity) | Export incomes / expenses / contributions to Excel or Sheets | **Export CSV** on each list page |
| **JSON** (full backup) | Complete household snapshot | Settings → Import / export → Download backup |
| **CSV** (bulk import) | Load many rows from a spreadsheet | Settings → Import / export → Import incomes / expenses |

## CSV export (per entity)

Each list page exports a UTF-8 CSV (with BOM for Excel). Columns include human-readable category, member, and status names.

## Full backup (JSON)

Downloads `hearth-budget-NAME-YYYY-MM-DD.json` containing household, members, categories, incomes, expenses, splits, contributions, goals, calendar events, and recurring data. Schema version: `schema_version: 1`.

Store monthly backups offline. Restore UI may arrive in a future release.

## CSV import (bulk)

Download the **CSV template** first — headers must match exactly. See Settings → Import / export for column reference and validation errors.

### Plantilla de ingresos

```csv
Fecha,Monto,Moneda,Perceptor,Categoría,Fuente,Notas
2026-05-15,3500000,COP,javier@correo.com,Salario,Empresa X,Pago mensual
```

| Columna | Obligatorio | Notas |
|---|---|---|
| Fecha | ✓ | Acepta `YYYY-MM-DD`, `DD/MM/YYYY`, `D/M/YY` |
| Monto | ✓ | Acepta `1500`, `1.500`, `1,500.50`, `$ 3.500.000` |
| Moneda | — | Default: la del hogar |
| Perceptor | ✓ | Nombre completo o email exacto de un miembro activo |
| Categoría | — | Nombre exacto de una categoría tipo `income` |
| Fuente | — | Texto libre |
| Notas | — | Texto libre |

### Plantilla de gastos

```csv
Fecha,Monto,Moneda,Fecha límite,Descripción,Categoría,Tipo,Notas
2026-05-15,180000,COP,2026-05-20,Internet,Servicios,fixed,Plan hogar
```

| Columna | Obligatorio | Notas |
|---|---|---|
| Fecha | ✓ | Fecha del gasto |
| Monto | ✓ | — |
| Moneda | — | Default: la del hogar |
| Fecha límite | — | Si está vacío, no aplica vencimiento |
| Descripción | — | — |
| Categoría | — | Nombre exacto de una categoría tipo `expense` |
| Tipo | — | `fixed`, `variable`, `debt`, `one_time` (default: `variable`) |
| Notas | — | — |

Cada gasto importado se divide automáticamente entre **todos los miembros activos del hogar** en partes iguales. Si necesitas una división distinta, edítalo después en la UI.

### Flujo

1. **Settings → Importar / Exportar → Importar gastos** (o ingresos).
2. **Elegir archivo** → selecciona el `.csv`.
3. La app autodetecta las columnas; ajusta el mapeo si alguno quedó como "— Ignorar —".
4. Revisa la vista previa de las primeras 5 filas.
5. Si hay errores de validación (perceptor inexistente, fecha mal formada, monto vacío…) aparecen listados con número de fila. Corrige el CSV o el mapeo y vuelve a cargar.
6. **Importar N filas** → inserta una por una. Al final verás cuántas se insertaron y cuántas fallaron.

### Tips

- Los CSVs de bancos suelen tener montos negativos para gastos y positivos para ingresos: separa los flujos en dos archivos antes de importar.
- Si una categoría en el CSV no existe, el campo queda vacío (no falla la importación). Después puedes asignarla manualmente.
- Para nombres con tildes y acentos asegúrate de guardar el CSV como **UTF-8** desde Excel (Guardar como → CSV UTF-8).

## Errores comunes

| Mensaje | Causa | Solución |
|---|---|---|
| `Perceptor no resuelto` | El nombre o email no coincide exactamente con un miembro activo | Usa el email del miembro (más confiable que el nombre con tildes) |
| `Fecha no reconocida` | Formato fuera de los soportados | Convierte a `YYYY-MM-DD` o `DD/MM/YYYY` |
| `No es un número válido` | El monto trae texto raro | Elimina símbolos extra; deja solo número, comas y puntos |
| `Hay N errores de validación` | El mapeo deja campos requeridos sin asignar | Asocia la columna correcta a cada campo marcado con * |
