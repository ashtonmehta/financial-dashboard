# Financial Dashboard

A personal finance dashboard with three tabs — **Overview** (net worth, accounts, net-worth trend), **Paycheck flow** (where each paycheck goes), and **Spending** (budget vs. actual, transaction feed, money owed to you).

This is a standalone version: no server, no build step, no accounts to connect. Your edits (recategorizing, setting your share of a split expense, ignoring a transaction) are saved in your browser's local storage.

## Run it

Open `index.html` in a browser. That's it.

## Make it yours

All the data lives in one place: the `SAMPLE_DATA` object at the top of `app.js`. Replace the sample numbers with your own:

- `accounts` — your bank accounts, credit cards, and investments (institution, name, last-4, type, balance)
- `paycheck` — gross pay, 401(k) contributions, taxes, take-home
- `budgets` — your monthly target per category
- `recurring` — subscriptions and periodic charges (annual amounts are prorated automatically)
- `transactions` — line items for the Spending tab; give each a `YYYY-MM` month and a category
- `owedSeed` — money other people owe you
- `snapshots` — past net-worth points for the trendline (date + net worth)

Categories are fixed to eight axes: Rent, Groceries, Food & drink, Shopping, Transportation, Subscriptions, Debt payments, Miscellaneous.

## How the Spending tab works

- Pick a month from the dropdown; the bars and the feed follow.
- The headline shows net spend against your total budget, computed from your category budgets.
- Click a category bar to filter the feed to that category.
- Each transaction row has a category dropdown (recategorize — it saves), and a **⋯ menu**:
  - **Set share** — when you fronted a group expense, enter just your share. The rest becomes an "Owed to you" line item, and the category totals count only your share.
  - **Ignore** — the row stays visible, greyed out, and drops out of all totals (bring it back with "Include in totals").

## Files

- `index.html` — page structure
- `styles.css` — styling
- `app.js` — data + all logic
