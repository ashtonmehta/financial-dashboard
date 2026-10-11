"use strict";
/* ============================================================
   Financial Dashboard — full-stack version.
   Data comes from the server (/api/bootstrap), which reads
   data.json. Edits (recategorize / set share / ignore) are
   posted back to /api/edits and persist in db.json.
   If the page is opened without the server (file://), it
   falls back to the embedded sample + localStorage.
   ============================================================ */

const CATEGORIES = ["Rent","Groceries","Food & drink","Shopping","Transportation","Subscriptions","Debt payments","Miscellaneous"];
const LS_KEY = "fin-dash-v1";

let DATA = null;
let state = { cats:{}, shares:{}, ignored:[], owed:[] };

async function loadState(){
  try {
    const r = await fetch("/api/bootstrap");
    if (!r.ok) throw new Error("no server");
    const db = await r.json();
    DATA = db.data;
    state = Object.assign(state, db.edits);
    if (!Array.isArray(state.owed) || !state.owed.length) state.owed = (DATA.owedSeed||[]).map(o=>({...o}));
  } catch(e) {
    DATA = FALLBACK_DATA;
    try { const s = JSON.parse(localStorage.getItem(LS_KEY)); if (s) state = Object.assign(state, s); } catch(_){}
    if (!Array.isArray(state.owed) || !state.owed.length) state.owed = (DATA.owedSeed||[]).map(o=>({...o}));
  }
}
function save(){
  fetch("/api/edits", { method:"POST", headers:{ "Content-Type":"application/json" }, body: JSON.stringify(state) })
    .catch(() => { try { localStorage.setItem(LS_KEY, JSON.stringify(state)); } catch(_){}} );
}

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
  for (const a of DATA.accounts){
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
  $("nw-debt").textContent = "−" + fmt(t.debt);
  const byInst = {};
  for (const a of DATA.accounts){ (byInst[a.institution] = byInst[a.institution]||[]).push(a); }
  $("accounts").innerHTML = Object.entries(byInst).map(([inst, accts]) => `
    <div class="card inst"><h3>${inst}</h3>
    ${accts.map(a => `<div class="acct-row"><span>${a.name} <span class="mask">··${a.mask}</span></span><span class="bal">${a.type==="credit" ? "−"+fmt(a.balance) : fmt(a.balance)}</span></div>`).join("")}
    </div>`).join("");
  const pts = DATA.snapshots, W=720, H=220, P=14;
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
  const p = DATA.paycheck;
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
  const html = DATA.recurring.map(r =>
    `<li><span>${r.label}</span><span class="amt">${fmt(monthlyCost(r))}/mo</span></li>`).join("") +
    `<li class="total"><span>Total</span><span class="amt">${fmt(DATA.recurring.reduce((s,r)=>s+monthlyCost(r),0))}/mo</span></li>`;
  $("recurring-paycheck").innerHTML = html;
  $("recurring-spending").innerHTML = html;
}

/* ---------- spending ---------- */
let activeCategory = null;
const catOf = tx => state.cats[tx.id] || tx.category;
const shareOf = tx => (tx.id in state.shares) ? state.shares[tx.id] : tx.amount;
const isIgnored = tx => state.ignored.includes(tx.id);
function months(){ return [...new Set(DATA.transactions.map(t=>t.month))].sort().reverse(); }
function monthLabel(m){ const [y,mo] = m.split("-"); return new Date(y, mo-1).toLocaleString("en-US",{month:"long", year:"numeric"}); }

function actuals(month){
  const out = {}; CATEGORIES.forEach(c => out[c]=0);
  for (const tx of DATA.transactions){
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
  const totalBudget = Object.values(DATA.budgets).reduce((s,v)=>s+v,0);
  const monthTx = DATA.transactions.filter(t=>t.month===month);
  if (monthTx.length && act["Rent"]===0) act["Rent"] = DATA.budgets["Rent"];
  const netSpend = CATEGORIES.reduce((s,c)=>s+act[c],0);
  $("spend-net").textContent = fmt(netSpend);
  $("spend-budget").textContent = fmt(totalBudget);

  $("budget-bars").innerHTML = CATEGORIES.map(c => {
    const b = DATA.budgets[c]||0, a = act[c], pct = b ? Math.min(100, a/b*100) : 0;
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

  const shareItems = DATA.transactions.filter(tx => tx.id in state.shares && !isIgnored(tx))
    .map(tx => ({ label: tx.desc, amount: tx.amount - state.shares[tx.id] }));
  const allOwed = [...state.owed, ...shareItems];
  $("owed-list").innerHTML = allOwed.map(o =>
    `<li><span>${o.label}</span><span class="amt">${fmt(o.amount)}</span></li>`).join("") +
    `<li class="total"><span>Total owed to you</span><span class="amt">${fmt(allOwed.reduce((s,o)=>s+o.amount,0))}</span></li>`;
}

/* ---------- row menu + share modal ---------- */
let menuTx = null;
function openMenu(btn){
  menuTx = DATA.transactions.find(t=>t.id===btn.dataset.tx);
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

/* ---------- fallback sample (only used if the server is unreachable) ---------- */
const FALLBACK_DATA = { accounts:[], paycheck:{gross:0,pretax:{label:"Pre-tax 401(k)",pct:0,amount:0},aftertax:{label:"Roth 401(k)",pct:0,amount:0},taxes:[],depositTo:"",frequency:""}, budgets:{}, recurring:[], owedSeed:[], snapshots:[{date:"2026-01-01",net:0},{date:"2026-02-01",net:0}], transactions:[] };

/* ---------- init ---------- */
loadState().then(() => { renderOverview(); renderPaycheck(); renderSpending(); });
