# Envelope budgeting mode

The Envelope mode is an optional method (off by default) inspired by [Actual Budget](https://actualbudget.org/docs/getting-started/envelope-budgeting). When enabled, each category becomes a virtual "envelope" with a monthly budget. Every peso of income should have a job — and the dashboard shows you how much is still unassigned.

## How it works

1. Go to **Settings → Hogar** and toggle **Modo Envelope** on.
2. Open **Categorías**, edit a category and set its **Monthly budget**.
3. (Optional) Toggle **Rollover** on the category — if budget is left over (or overspent) at month-end, it carries to the next month.
4. The **Budget** view shows progress bars per category: green (under), amber (>85 %), red (over).
5. The **Dashboard** gains a new widget: **"Sin asignar"** showing income minus total allocated.
6. The KPI **"Cumplimiento del presupuesto"** is computed only when envelope mode is on and at least one category has a budget.

## Zero-sum philosophy

> Every peso has a job.

If your monthly income is $3,000,000 and you've assigned $2,400,000 across all categories, you have $600,000 unassigned — that's still your money but it has no purpose yet. Decide: more savings, another expense category, a debt repayment? Drag it out of "unallocated" by adjusting category budgets.

## Differences vs Actual Budget

- Self-hosted web app (PostgreSQL + API), not a local-first desktop sync model.
- Envelope mode is optional — you can track income vs expense without category envelopes.
- Rollover is per-category opt-in, not global.

## Quick math

```
unallocated = totalIncome - sum(category.monthly_budget for expense categories)
remaining(category) = (monthly_budget + rollover_in) - spent_this_month
utilization_ratio = spent / effective_budget   // capped at 2 in UI
compliance = sum(spent) / sum(monthly_budget)  // only for budgeted categories
```

When `compliance > 1` you're collectively over budget; when `< 1` you're under. When envelope mode is off, the compliance KPI shows `—`.
