# Painting Studio Calculator

A browser-based calculator for a miniature painting studio with two tabs:

- **Studio profit** — manual monthly revenue or a model-by-model production
  estimate, recurring costs, depreciation, monthly profit or loss, and payback.
- **Model quote** — user-defined production steps, painter piecework cost,
  estimated hours, external price, and quote difference.

```text
monthly depreciation = depreciable investment / depreciation months
model-mode revenue = sum of saved model external prices × quantities
model-mode piecework costs = sum of saved model step costs × quantities
monthly profit or loss = revenue - piecework costs - fixed costs - depreciation
payback period = one-time investment / pre-depreciation monthly cash surplus
model cost = sum of step piecework costs
quote difference = external price - model cost
```

Manual mode keeps the original fixed-cost calculation and does not deduct model
piecework costs. Switching modes preserves both the manual revenue and the model
rows. In model mode, each row selects a saved quote and a positive whole-number
quantity. Both tabs share a saved-quote picker with name search, selected-state
checkmarks, keyboard navigation (arrow keys, Enter, Escape), and a scrollable
list capped at 224px. The quote tab also keeps a "new scheme" option.

Model rows use the latest **saved** quote prices and step costs, never unsaved
draft edits. Deleting a referenced quote asks for confirmation; affected rows
must be reselected or removed before calculated revenue, profit, and payback can
be shown. Payback deducts piecework costs but adds back non-cash depreciation.

Model quote schemes can be saved, selected, updated, and deleted. All inputs and
saved schemes are stored in the current browser. The header action clears the
application's local data after confirmation. No backend or account is required.

## Development

```bash
npm install
npm run dev
```

## Validation

```bash
npm test
npm run build
```
