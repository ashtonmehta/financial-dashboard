"use strict";
/* ============================================================
   Financial Dashboard — standalone version.
   Replace SAMPLE_DATA with your own numbers (see README.md).
   Your edits in the UI are saved to localStorage.
   ============================================================ */

const CATEGORIES = ["Rent","Groceries","Food & drink","Shopping","Transportation","Subscriptions","Debt payments","Miscellaneous"];

const SAMPLE_DATA = {
  accounts: [
    { institution:"First Bank", name:"Everyday Checking", mask:"4102", type:"checking", balance:2450.10 },
    { institution:"First Bank", name:"Savings", mask:"7731", type:"savings", balance:8120.55 },
    { institution:"Online Bank", name:"High-Yield Savings", mask:"2094", type:"savings", balance:15000.00 },
    { institution:"Rewards Card", name:"Rewards Visa", mask:"8810", type:"credit", balance:612.40 },
    { institution:"Travel Card", name:"Travel Mastercard", mask:"3355", type:"credit", balance:128.99 },
    { institution:"Brokerage", name:"Individual Brokerage", mask:"9021", type:"investment", balance:24310.20 },
    { institution:"Brokerage", name:"Roth IRA", mask:"9045", type:"investment", balance:12480.33 },
    { institution:"Employer Plan", name:"401(k)", mask:"6110", type:"investment", balance:58940.00 }
  ],
  paycheck: {
    frequency:"Biweekly",
    gross:6200.00,
    pretax:{ label:"Pre-tax 401(k)", pct:10, amount:620.00 },
    aftertax:{ label:"Roth 401(k)", pct:5, amount:310.00 },
    taxes:[ {label:"Federal income tax", amount:820.00}, {label:"State income tax", amount:210.00}, {label:"Social Security + Medicare", amount:210.00} ],
    depositTo:"First Bank Savings ··7731"
  },
  budgets: { "Rent":1650, "Groceries":350, "Food & drink":220, "Shopping":300, "Transportation":120, "Subscriptions":90, "Debt payments":150, "Miscellaneous":100 },
  recurring: [
    { label:"Renters insurance", amount:12.00, period:"monthly" },
    { label:"Gym", amount:45.00, period:"monthly" },
    { label:"Streaming", amount:15.49, period:"monthly" },
    { label:"Music", amount:11.99, period:"monthly" },
    { label:"Rewards card annual fee", amount:95.00, period:"annual" },
    { label:"Cloud storage", amount:19.99, period:"annual" }
  ],
  owedSeed: [ { label:"Concert tickets (fronted)", amount:85.00 } ],
  snapshots: [
    { date:"2026-05-01", net:104200 }, { date:"2026-06-01", net:108450 },
    { date:"2026-07-01", net:110980 }, { date:"2026-08-01", net:114260 },
    { date:"2026-09-01", net:117530 }, { date:"2026-10-01", net:120559.79 }
  ],
  transactions: [
    { id:"t1",  date:"2026-10-03", month:"2026-10", desc:"Corner Market", account:"Rewards Visa", category:"Groceries", amount:86.20 },
    { id:"t2",  date:"2026-10-05", month:"2026-10", desc:"City Bistro (group dinner)", account:"Rewards Visa", category:"Food & drink", amount:118.40 },
    { id:"t3",  date:"2026-10-06", month:"2026-10", desc:"Rideshare", account:"Travel Mastercard", category:"Transportation", amount:24.60 },
    { id:"t4",  date:"2026-10-08", month:"2026-10", desc:"Online Store", account:"Rewards Visa", category:"Shopping", amount:64.99 },
    { id:"t5",  date:"2026-10-09", month:"2026-10", desc:"Coffee Shop", account:"Travel Mastercard", category:"Food & drink", amount:13.75 },
    { id:"t6",  date:"2026-09-02", month:"2026-09", desc:"Grocery Store", account:"Rewards Visa", category:"Groceries", amount:132.47 },
    { id:"t7",  date:"2026-09-04", month:"2026-09", desc:"Gas Station", account:"Travel Mastercard", category:"Transportation", amount:48.10 },
    { id:"t8",  date:"2026-09-07", month:"2026-09", desc:"Taqueria", account:"Rewards Visa", category:"Food & drink", amount:31.20 },
    { id:"t9",  date:"2026-09-11", month:"2026-09", desc:"Bookstore", account:"Rewards Visa", category:"Shopping", amount:42.00 },
    { id:"t10", date:"2026-09-14", month:"2026-09", desc:"Grocery Store", account:"Travel Mastercard", category:"Groceries", amount:97.85 },
    { id:"t11", date:"2026-09-18", month:"2026-09", desc:"Airline Ticket", account:"Travel Mastercard", category:"Transportation", amount:212.00 },
    { id:"t12", date:"2026-09-21", month:"2026-09", desc:"Pharmacy", account:"Rewards Visa", category:"Miscellaneous", amount:27.36 },
    { id:"t13", date:"2026-09-25", month:"2026-09", desc:"Sushi Place (group)", account:"Rewards Visa", category:"Food & drink", amount:96.00 },
    { id:"t14", date:"2026-09-28", month:"2026-09", desc:"Student Loan Payment", account:"Everyday Checking", category:"Debt payments", amount:150.00 }
  ]
};

/* ---------- state (persisted) ---------- */
const LS_KEY = "fin-dash-v1";
let state = { cats:{}, shares:{}, ignored:[], owed:null };
try { const s = JSON.parse(localStorage.getItem(LS_KEY)); if (s) state = Object.assign(state, s); } catch(e) {}
if (!Array.isArray(state.owed)) state.owed = SAMPLE_DATA.owedSeed.map(o => ({...o}));
function save(){ localStorage.setItem(LS_KEY, JSON.stringify(state)); }

const fmt = n => (n<0?"−$":"$") + Math.abs(n).toLocaleString("en-US",{minimumFractionDigits:2, maximumFractionDigits:2});
const $ = id => document.getElementById(id);

/* ---------- tabs ---------- */
document.querySelectorAll(".tab").forEach(btn => btn.addEventListener("click", () => {
  document.querySelectorAll(".tab").forEach(b => b.classList.toggle("active", b===btn));
  document.querySelectorAll(".tab-panel").forEach(p => p.classList.toggle("active", p.id === "tab-"+btn.dataset.tab));
}));

/* ---------- overview ---------- */
function totals(){
  let cash=0, invest=0, debt=0;
  for (const a of SAMPLE_DATA.accounts){
    if (a.type==="checking"||a.type==="savings") cash += a.balance;
    else if (a.type==="investment") invest += a.balance;
    else if (a.type==="credit") debt += a.balance;
  }
  return { cash, invest, debt, net: cash+invest-debt };
}
function renderOverview(){
  const t = totals();
  $("nw-total").textContent = fmt(t.net);
  $("nw-cash").textContent = fmt(t.cash);
  $("nw-invest").textContent = fmt(t.invest);
  $("nw-debt").textContent = "−"+fmt(t.debt).slice(0);
  const byInst = {};
  for (const a of SAMPLE_DATA.accounts){ (byInst[a.institution] = byInst[a.institution]||[]).push(a); }
  $("accounts").innerHTML = Object.entries(byInst).map(([inst, accts]) => `
    <div class="card inst"><h3>${inst}</h3>
    ${accts.map(a => `<div class="acct-row"><span>${a.name} <span class="mask">··${a.mask}</span></span><span class="bal">${a.type==="credit" ? "−"+fmt(a.balance) : fmt(a.balance)}</span></div>`).join("")}
    </div>`).join("");
  // trendline
  const pts = SAMPLE_DATA.snapshots, W=720, H=220, P=14;
  const vals = pts.map(p=>p.net), min = Math.min(...vals)*0.98, max = Math.max(...vals)*1.01;
  const X = i => P + i*(W-2*P)/(pts.length-1), Y = v => H-P - (v-min)*(H-2*P)/(max-min);
  const line = pts.map((p,i)=>`${X(i)},${Y(p.net)}`).join(" ");
  $("nw-chart").innerHTML = `
    <polygon points="${P},${H-P} ${line} ${W-P},${H-P}" fill="rgba(37,99,235,.12)"></polygon>
    <polyline points="${line}" fill="none" stroke="#2563eb" stroke-width="2.5"></polyline>
    ${pts.map((p,i)=>`<circle cx="${X(i)}" cy="${Y(p.net)}" r="4" fill="#2563eb"><title>${p.date}: ${fmt(p.net)}</title></circle>`).join("")}`;
}

/* ---------- paycheck flow ---------- */
function renderPaycheck(){
  const p = SAMPLE_DATA.paycheck;
  const taxTotal = p.taxes.reduce((s,t)=>s+t.amount,0);
  const retirement = p.pretax.amount + p.aftertax.amount;
  const takeHome = p.gross - retirement - taxTotal;
  const branches = [
    { key:"ret", t:"Retirement", a:retirement, detail:`<h4>Retirement — ${fmt(retirement)}</h4><ul><li>${p.pretax.label} (${p.pretax.pct}%): ${fmt(p.pretax.amount)}</li><li>${p.aftertax.label} (${p.aftertax.pct}%): ${fmt(p.aftertax.amount)}</li></ul>` },
    { key:"tax", t:"Taxes withheld", a:taxTotal, detail:`<h4>Taxes withheld — ${fmt(taxTotal)}</h4><ul>${p.taxes.map(t=>`<li>${t.label}: ${fmt(t.amount)}</li>`).join("")}</ul>` },
    { key:"home", t:"Take-home", a:takeHome, detail:`<h4>Take-home — ${fmt(takeHome)}</h4><ul><li>Deposited to ${p.depositTo}</li><li>${p.frequency} pay</li></ul>` }
  ];
  $("flow").innerHTML = `
    <div class="flow-node selected" data-k="gross"><div class="t">Gross pay</div><div class="a">${fmt(p.gross)}</div></div>
    <div class="flow-link"></div>
    <div class="flow-branches">${branches.map(b=>`<div class="flow-node" data-k="${b.key}"><div class="t">${b.t}</div><div class="a">${fmt(b.a)}</div></div>`).join("")}</div>`;
  const detail = $("flow-detail");
  const show = k => {
    detail.innerHTML = k==="gross"
      ? `<h4>Gross pay — ${fmt(p.gross)}</h4><ul><li>Retirement: ${fmt(retirement)}</li><li>Taxes withheld: ${fmt(taxTotal)}</li><li>Take-home: ${fmt(takeHome)}</li></ul>`
      : branches.find(b=>b.key===k).detail;
    document.querySelectorAll(".flow-node").forEach(n => n.classList.toggle("selected", n.dataset.k===k));
  };
  document.querySelectorAll(".flow-node").forEach(n => n.addEventListener("click", ()=>show(n.dataset.k)));
  show("gross");
  renderRecurring();
}

function monthlyCost(r){ return r.period==="annual" ? r.amount/12 : r.amount; }
function renderRecurring(){
  const html = SAMPLE_DATA.recurring.map(r =>
    `<li><span>${r.label}</span><span class="amt">${fmt(monthlyCost(r))}/mo</span></li>`).join("") +
    `<li class="total"><span>Total</span><span class="amt">${fmt(SAMPLE_DATA.recurring.reduce((s,r)=>s+monthlyCost(r),0))}/mo</span></li>`;
  $("recurring-paycheck").innerHTML = html;
  $("recurring-spending").innerHTML = html;
}

/* ---------- spending ---------- */
let activeCategory = null;
const catOf = tx => state.cats[tx.id] || tx.category;
const shareOf = tx => (tx.id in state.shares) ? state.shares[tx.id] : tx.amount;
const isIgnored = tx => state.ignored.includes(tx.id);
function months(){ return [...new Set(SAMPLE_DATA.transactions.map(t=>t.month))].sort().reverse(); }
function monthLabel(m){ const [y,mo] = m.split("-"); return new Date(y, mo-1).toLocaleString("en-US",{month:"long", year:"numeric"}); }

function actuals(month){
  const out = {}; CATEGORIES.forEach(c => out[c]=0);
  for (const tx of SAMPLE_DATA.transactions){
    if (tx.month !== month || isIgnored(tx)) continue;
    out[catOf(tx)] += shareOf(tx);
  }
  return out;
}

function renderSpending(){
  const sel = $("month-select");
  if (!sel.options.length){
    sel.innerHTML = months().map(m=>`<option value="${m}">${monthLabel(m)}</option>`).join("");
    sel.addEventListener("change", renderSpending);
  }
  const month = sel.value, act = actuals(month);
  const totalBudget = Object.values(SAMPLE_DATA.budgets).reduce((s,v)=>s+v,0);
  // Rent is paid outside the card feed in this model; count the budget as actual when a month has any activity.
  const monthTx = SAMPLE_DATA.transactions.filter(t=>t.month===month);
  if (monthTx.length && act["Rent"]===0) act["Rent"] = SAMPLE_DATA.budgets["Rent"];
  const netSpend = CATEGORIES.reduce((s,c)=>s+act[c],0);
  $("spend-net").textContent = fmt(netSpend);
  $("spend-budget").textContent = fmt(totalBudget);

  $("budget-bars").innerHTML = CATEGORIES.map(c => {
    const b = SAMPLE_DATA.budgets[c]||0, a = act[c], pct = b ? Math.min(100, a/b*100) : 0;
    return `<div class="bar-row ${activeCategory===c?"active":""}" data-cat="${c}">
      <span>${c}</span>
      <span class="bar-track"><span class="bar-fill ${a>b?"over":""}" style="display:block;width:${pct}%"></span></span>
      <span class="bar-nums"><b>${fmt(a)}</b> / ${fmt(b)}</span></div>`;
  }).join("");
  document.querySelectorAll(".bar-row").forEach(r => r.addEventListener("click", () => {
    activeCategory = activeCategory===r.dataset.cat ? null : r.dataset.cat;
    renderSpending();
  }));

  const rows = monthTx.filter(tx => !activeCategory || catOf(tx)===activeCategory);
  $("tx-body").innerHTML = rows.map(tx => `
    <tr class="${isIgnored(tx)?"ignored":""}">
      <td>${tx.date.slice(5)}</td>
      <td>${tx.desc}${tx.id in state.shares ? ` <span style="color:var(--muted)">(your share ${fmt(state.shares[tx.id])})</span>` : ""}</td>
      <td>${tx.account}</td>
      <td><select data-tx="${tx.id}">${CATEGORIES.map(c=>`<option ${c===catOf(tx)?"selected":""}>${c}</option>`).join("")}</select></td>
      <td class="num">${fmt(tx.amount)}</td>
      <td><button class="dots" data-tx="${tx.id}" aria-label="More actions">⋯</button></td>
    </tr>`).join("");
  document.querySelectorAll("#tx-body select").forEach(s => s.addEventListener("change", () => {
    state.cats[s.dataset.tx] = s.value; save(); renderSpending();
  }));
  document.querySelectorAll(".dots").forEach(b => b.addEventListener("click", e => { e.stopPropagation(); openMenu(b); }));

  const shareItems = SAMPLE_DATA.transactions.filter(tx => tx.id in state.shares && !isIgnored(tx))
    .map(tx => ({ label: tx.desc, amount: tx.amount - state.shares[tx.id] }));
  const allOwed = [...state.owed, ...shareItems];
  $("owed-list").innerHTML = allOwed.map(o =>
    `<li><span>${o.label}</span><span class="amt">${fmt(o.amount)}</span></li>`).join("") +
    `<li class="total"><span>Total owed to you</span><span class="amt">${fmt(allOwed.reduce((s,o)=>s+o.amount,0))}</span></li>`;
}

/* ---------- row menu + share modal ---------- */
let menuTx = null;
function openMenu(btn){
  menuTx = SAMPLE_DATA.transactions.find(t=>t.id===btn.dataset.tx);
  const menu = $("row-menu"), r = btn.getBoundingClientRect();
  menu.style.left = (window.scrollX + r.left - 130) + "px";
  menu.style.top = (window.scrollY + r.bottom + 4) + "px";
  menu.querySelector('[data-action="ignore"]').style.display = isIgnored(menuTx) ? "none" : "";
  menu.querySelector('[data-action="include"]').style.display = isIgnored(menuTx) ? "" : "none";
  menu.classList.remove("hidden");
}
document.addEventListener("click", () => $("row-menu").classList.add("hidden"));
$("row-menu").addEventListener("click", e => {
  const a = e.target.dataset.action; if (!a || !menuTx) return;
  if (a==="ignore"){ state.ignored.push(menuTx.id); }
  if (a==="include"){ state.ignored = state.ignored.filter(id=>id!==menuTx.id); }
  if (a==="share"){
    $("share-modal-sub").textContent = `${menuTx.desc} — ${fmt(menuTx.amount)} total`;
    $("share-input").value = shareOf(menuTx);
    $("share-modal").classList.remove("hidden");
    $("row-menu").classList.add("hidden");
    return;
  }
  save(); renderSpending();
});
$("share-cancel").addEventListener("click", () => $("share-modal").classList.add("hidden"));
$("share-save").addEventListener("click", () => {
  const v = parseFloat($("share-input").value);
  if (!isNaN(v) && menuTx){
    if (v >= menuTx.amount) delete state.shares[menuTx.id]; else state.shares[menuTx.id] = v;
    save(); renderSpending();
  }
  $("share-modal").classList.add("hidden");
});

/* ---------- init ---------- */
renderOverview();
renderPaycheck();
renderSpending();
