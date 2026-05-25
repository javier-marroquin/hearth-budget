# Importar / Exportar

PresupuestoHogar permite mover datos hacia y desde el hogar de tres formas:

| Formato | Para qué | Dónde |
|---|---|---|
| **CSV** (por entidad) | Exportar listado individual de ingresos / gastos / aportes a Excel o Google Sheets | Botón **Exportar CSV** en cada página (`/incomes`, `/expenses`, `/contributions`) |
| **JSON** (backup completo) | Backup total del hogar — incluye todas las entidades en un solo archivo | Settings → **Importar / Exportar** → "Descargar backup" |
| **CSV** (importación masiva) | Cargar muchos ingresos o gastos desde un archivo (p. ej. extracto bancario) | Settings → **Importar / Exportar** → "Importar ingresos / gastos" |

## Exportar CSV (por entidad)

En cada página de lista (Ingresos, Gastos, Aportes) hay un botón **Exportar CSV** que descarga un `.csv` con todas las filas visibles. El archivo:

- Tiene BOM UTF-8 para que Excel lo abra bien en español.
- Usa separador coma y comillas dobles donde sea necesario.
- Resuelve nombres legibles para perceptor, categoría, estado, etc.

Útil para análisis ad-hoc en Excel/Sheets, declaraciones, o como respaldo previo a operaciones masivas.

## Backup completo (JSON)

En **Settings → Importar / Exportar → Descargar backup** se baja un único archivo `presupuesto-hogar-NOMBRE-YYYY-MM-DD.json` con:

- `household` — fila del hogar
- `members` — todas las membresías (activas + invitadas)
- `categories` — categorías + presupuestos mensuales
- `incomes`, `expenses`, `expense_splits`, `contributions`
- `savings_goals`, `calendar_events`, `recurring_rules`
- `recurring_templates` (si aplica)

Es un snapshot completo del estado actual. Guárdalo periódicamente (mensual recomendado) como respaldo offline. El esquema tiene `schema_version: 1` para soportar restauraciones futuras.

> Nota: el JSON contiene los IDs originales. La restauración (próxima versión) sabrá si re-insertar o ignorar duplicados.

## Importar CSV (masivo)

### Plantillas

Antes de importar, descarga la plantilla CSV correspondiente (botón **Plantilla CSV**). Tienen los encabezados exactos que la app reconoce automáticamente.

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
