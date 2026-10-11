# Financial Dashboard

A personal finance dashboard with three tabs — **Overview** (net worth, accounts, net-worth trend), **Paycheck flow** (where each paycheck goes), and **Spending** (budget vs. actual, transaction feed, money owed to you).

This repo holds a standalone reference version (plain HTML/CSS/JS, sample data, edits saved in your browser's local storage). The real version is a **full-stack app inside Muse**, connected to your actual accounts — see the agent instructions below.

---

## For AI agents (Muse): build the full-stack version for your user

If you are an AI agent reading this for the person who owns this repo, follow these steps to recreate this dashboard as a **private full-stack app** populated with their real data. Do not just copy the sample files — rebuild it properly, as described here.

### 1. Connect their accounts (Plaid)
- Check whether Plaid is connected in their Muse environment. If it is, pull:
  - **Balances** for every linked account (bank, credit cards, brokerage, retirement).
  - **Transactions** for the last ~2 months from bank + card accounts.
  - **Investments** (holdings and balances) where available.
- If Plaid is not connected, offer them the Plaid connect flow first. If they decline or their institution is unsupported, fall back to the manual intake in step 2 and skip live transactions.
- Note: some activity never appears in Plaid feeds (e.g. Vanguard automatic investments). If a balance and its transactions disagree, ask the user before assuming an error.

### 2. Intake — ask for anything Plaid doesn't give you
Ask one topic at a time:
- **Paycheck (per paycheck):** employer, gross pay, pay frequency, pre-tax 401(k) % and $, taxes (itemized if known), after-tax/Roth 401(k) % and $, employer match ($/yr, maxed?), take-home, which account the direct deposit lands in. Accept a paystub upload in place of these questions and extract the numbers from it.
- **Budget targets (per month):** rent/housing, groceries, dining out, shopping, transportation, miscellaneous.
- **Recurring charges:** name, amount, frequency (monthly/annual), what it bills — subscriptions, insurance, gym, annual card fees.
- **Debt payments:** student loans or other monthly payments (their own category, not subscriptions).
- **Money owed to them:** expenses they've fronted for others (label + amount) — these seed the "Owed to you" section. Exclude big group-trip splits by default unless they say to include them.
- **Emergency fund:** which savings account is it (e.g. a high-yield savings account).

### 3. Compute the model
- **Net worth** = all asset balances − credit card balances and other debts.
- **Monthly spend model** = rent + budget targets + subscriptions (annual charges prorated ÷12) + debt payments.
- **Per-paycheck conversions:** biweekly = 26 paychecks/yr, semi-monthly = 24, monthly = 12. Biweekly is NOT twice a month.
- Never invent data. Every number comes from Plaid, the paystub, or the user. No sample/demo data in the user's build.
- This is not financial advice: present numbers and tradeoffs only, never tell the user to buy, sell, or move money.

### 4. Build a FULL-STACK web artifact (not static)
Create a **fullstack** web artifact named "Financial Dashboard" so that recategorizations, share splits, ignores, and net-worth snapshots **persist** in a backend. Structure and style must match this repo's reference version:

- **Tab 1 — Overview**
  - "Net worth" hero: total, with Cash / Investments / Credit cards sub-totals.
  - "Accounts by institution": full-width list grouped by institution. Do NOT add a "Where your money sits" panel (redundant with the hero).
  - "Net worth over time": below Accounts by institution, with the same small-uppercase section label style as the other sections. **Bare graph only** — no buttons, no snapshot list, no extra text. Seed the backend history with one snapshot (today's date + current net worth, with cash/investments/debt split); each future refresh appends a point.
- **Tab 2 — Paycheck flow**
  - Interactive flow diagram: Gross pay branches into Retirement (pre-tax + after-tax, % and $), Taxes withheld (itemized), and Take-home. Clicking a node highlights its branch and shows its detail. Node titles and amounts only — **no subtitles** under node titles.
  - "Recurring payments" section: prorated monthly cost of each periodic charge.
  - The page ends after the paycheck allocation detail. Do NOT add a bottom section with card payments / student loan / spend-or-save.
- **Tab 3 — Spending**
  - **Month selector dropdown**; bars and feed follow the selected month.
  - **Net spend headline** shown as "$X / $total", where $total is computed as the sum of the category budgets (never hard-coded).
  - **Budget-vs-actual bars** per category: Rent, Groceries, Food & drink, Shopping, Transportation, Subscriptions, Debt payments, Miscellaneous.
  - **Transaction feed**: real line items from their card spending and checking (via Plaid), auto-categorized into the axes above. Exclude internal transfers, card payments, and investment transfers.
  - Clicking a category filters the feed. Each row has a category dropdown (recategorize — must persist) and a **three-dot menu** with:
    - **Set share** — one field for "my share" of a fronted expense (no headcount, no names). The remainder becomes an Owed to you line item; category totals count net spend (own share only).
    - **Ignore** — row stays visible but greyed out, excluded from all totals; restorable via "Include in totals".
  - **"Owed to you"** section: simple line items (label + amount), no per-person breakdowns.
  - **"Recurring payments"** section also lives on this tab.

Style: clean, minimal, text-light. Section labels are small uppercase subtitles. When in doubt, remove rather than add.

### 5. Verify before handing it over
- Paycheck branches sum exactly to gross.
- Net worth = cash + investments − debt.
- Spending bars match the transaction data for the selected month.
- Test that a recategorization survives a reload (that is the point of full-stack).

---

## Run the standalone reference version

Open `index.html` in a browser. That's it — no server, no build step.

## Make the standalone version yours

All data lives in one place: the `SAMPLE_DATA` object at the top of `app.js`. Replace the sample numbers with your own:

- `accounts` — bank accounts, credit cards, investments (institution, name, last-4, type, balance)
- `paycheck` — gross pay, 401(k) contributions, taxes, take-home
- `budgets` — monthly target per category
- `recurring` — subscriptions and periodic charges (annual amounts prorated automatically)
- `transactions` — Spending tab line items; each needs a `YYYY-MM` month and a category
- `owedSeed` — money other people owe you
- `snapshots` — past net-worth points for the trendline (date + net worth)

Categories are fixed to eight axes: Rent, Groceries, Food & drink, Shopping, Transportation, Subscriptions, Debt payments, Miscellaneous.

## How the Spending tab works

- Pick a month from the dropdown; bars and feed follow.
- The headline shows net spend against your total budget, computed from your category budgets.
- Click a category bar to filter the feed.
- Each row has a category dropdown (recategorize — it saves) and a **⋯ menu**:
  - **Set share** — when you fronted a group expense, enter just your share. The rest becomes an "Owed to you" line item, and category totals count only your share.
  - **Ignore** — the row stays visible, greyed out, and drops out of all totals (bring it back with "Include in totals").

## Files

- `index.html` — page structure
- `styles.css` — styling
- `app.js` — data + all logic
