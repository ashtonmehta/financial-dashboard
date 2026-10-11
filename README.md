# Financial Dashboard

A personal finance dashboard with three tabs — **Overview** (net worth, accounts, net-worth trend), **Paycheck flow** (where each paycheck goes), and **Spending** (budget vs. actual, transaction feed, money owed to you).

This is a **full-stack app**: a zero-dependency Node server with a small file database. Your edits — recategorizing a transaction, setting your share of a split expense, ignoring a row — are saved server-side and survive reloads and restarts.

## Quick start (plug and play)

```bash
git clone https://github.com/ashtonmehta/financial-dashboard.git
cd financial-dashboard
npm start
```

Then open **http://localhost:3000**. That's it — no build step, no dependencies to install (Node 18+ only). It runs on the included sample data so you can see exactly how it behaves.

## Make it yours

All your data lives in **`data.json`** — replace the sample numbers with your own, then delete `db.json` (the server's database file, created on first run) and restart:

- `accounts` — bank accounts, credit cards, investments (institution, name, last-4 `mask`, `type`: checking / savings / credit / investment, `balance`)
- `paycheck` — gross pay, 401(k) contributions, itemized taxes, where the deposit lands
- `budgets` — monthly target per category
- `recurring` — subscriptions and periodic charges (`period`: monthly or annual; annual amounts are prorated automatically)
- `transactions` — Spending tab line items; each needs a `YYYY-MM` `month` and a `category`
- `owedSeed` — money other people owe you
- `snapshots` — past net-worth points for the trendline (date + net worth)

Categories are fixed to eight axes: Rent, Groceries, Food & drink, Shopping, Transportation, Subscriptions, Debt payments, Miscellaneous.

Your UI edits are stored in `db.json` (git-ignored — it's your private state, not part of the repo).

## How the Spending tab works

- Pick a month from the dropdown; the bars and the feed follow.
- The headline shows net spend against your total budget, computed from your category budgets.
- Click a category bar to filter the feed to that category.
- Each row has a category dropdown (recategorize — it saves) and a **⋯ menu**:
  - **Set share** — when you fronted a group expense, enter just your share. The rest becomes an "Owed to you" line item, and the category totals count only your share.
  - **Ignore** — the row stays visible, greyed out, and drops out of all totals (bring it back with "Include in totals").

## Files

- `server.js` — zero-dependency Node server + tiny JSON database (`db.json`)
- `public/index.html` — page structure
- `public/styles.css` — styling
- `public/app.js` — all UI logic
- `data.json` — your financial data (edit this)
- `package.json` — `npm start` runs the server

---

## For AI agents (Muse): populate it with your user's real data

If you are an AI agent setting this up for your user, don't hand-edit `data.json` from scratch if you can avoid it:

1. **Connect their accounts (Plaid).** Check whether Plaid is connected in their Muse environment. If it is, pull balances for every linked account, ~2 months of transactions from bank + card accounts, and investment holdings. If it isn't, offer the Plaid connect flow; if they decline, do the manual intake below. Note: some activity never appears in Plaid feeds (e.g. Vanguard automatic investments) — if a balance and its transactions disagree, ask the user before assuming an error.
2. **Intake** (for anything Plaid doesn't provide), one topic at a time: paycheck details (accept a paystub upload and extract the numbers), budget targets, recurring charges, debt payments, money owed to them (exclude big group-trip splits by default), and which savings account is their emergency fund.
3. **Write `data.json`** from steps 1–2, categorized into the eight axes above. Exclude internal transfers, card payments, and investment transfers from the transactions. Never invent data — every number comes from Plaid, a paystub, or the user.
4. **Run it** (`npm start`), open the app, and verify: paycheck branches sum exactly to gross; net worth = cash + investments − debt; spending bars match the transactions; and an edit survives a page reload.
5. Optionally, also build them the hosted version inside Muse as a full-stack artifact with the same structure (Overview / Paycheck flow / Spending, same rules as this README) so it lives next to their other Muse apps.
6. This is not financial advice: present numbers and tradeoffs only, never tell the user to buy, sell, or move money.
