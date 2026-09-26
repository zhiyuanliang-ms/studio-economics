# Painting Studio Calculator

A browser-based calculator for a miniature painting studio with two tabs:

- **Studio profit** — recurring costs, one-time investment depreciation,
  monthly profit or loss, and payback period.
- **Model quote** — user-defined production steps, painter piecework cost,
  estimated hours, external price, and quote difference.

```text
monthly depreciation = depreciable investment / depreciation months
monthly profit or loss = monthly revenue - monthly fixed costs - monthly depreciation
payback period = one-time investment / pre-depreciation monthly cash surplus
model cost = sum of step piecework costs
quote difference = external price - model cost
```

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
