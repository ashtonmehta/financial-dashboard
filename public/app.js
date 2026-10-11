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
const esc = s => String(s).replace(/[&<>"]/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));

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
const markClass = t => t==="credit" ? "mark-debt" : (t==="investment" ? "mark-invest" : "mark-cash");

function renderOverview(){
  const t = totals();
  $("nw-total").textContent = fmt(t.net);
  $("nw-cash").textContent = fmt(t.cash);
  $("nw-invest").textContent = fmt(t.invest);
  $("nw-debt").textContent = "−" + fmt(t.debt);
  const grossTotal = t.cash + t.invest + t.debt || 1;
  $("allocation").innerHTML =
    `<div class="seg-cash" style="width:${t.cash/grossTotal*100}%"></div>` +
    `<div class="seg-invest" style="width:${t.invest/grossTotal*100}%"></div>` +
    `<div class="seg-debt" style="width:${t.debt/grossTotal*100}%"></div>`;

  const byInst = {};
  for (const a of DATA.accounts){ (byInst[a.institution] = byInst[a.institution]||[]).push(a); }
  $("accounts").innerHTML = Object.entries(byInst).map(([inst, accts]) => {
    const total = accts.reduce((s,a)=> s + (a.type==="credit" ? -a.balance : a.balance), 0);
    return `<div class="inst-card">
      <div class="inst-head"><h3>${esc(inst)}</h3><span class="inst-total">${fmt(total)}</span></div>
      ${accts.map(a => `<div class="acct-row"><span class="acct-mark ${markClass(a.type)}"></span><span>${esc(a.name)} <span class="mask">··${esc(a.mask)}</span></span><span class="bal">${a.type==="credit" ? "−"+fmt(a.balance) : fmt(a.balance)}</span></div>`).join("")}
    </div>`;
  }).join("");

  // trend chart — accent gradient area, dashed grid, axes
  const pts = DATA.snapshots, W=720, H=240, PL=58, PR=12, PT=12, PB=26;
  const vals = pts.map(p=>p.net);
  let min = Math.min(...vals), max = Math.max(...vals);
  const pad = (max-min)*0.15 || 1000; min -= pad; max += pad;
  const X = i => PL + i*(W-PL-PR)/(pts.length-1);
  const Y = v => PT + (max-v)*(H-PT-PB)/(max-min);
  const line = pts.map((p,i)=>`${X(i)},${Y(p.net)}`).join(" ");
  const gridVals = [0,1,2,3].map(i => min + (max-min)*i/3);
  $("nw-chart").innerHTML = `
    <defs><linearGradient id="nwg" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#0d6b43" stop-opacity="0.28"></stop>
      <stop offset="100%" stop-color="#0d6b43" stop-opacity="0.02"></stop>
    </linearGradient></defs>
    ${gridVals.map(v => `<line x1="${PL}" x2="${W-PR}" y1="${Y(v)}" y2="${Y(v)}" stroke="#dbe2db" stroke-dasharray="4 4"></line>
      <text x="${PL-8}" y="${Y(v)+4}" text-anchor="end" font-size="11" fill="#87928b">$${Math.round(v/1000)}k</text>`).join("")}
    <polygon points="${PL},${H-PB} ${line} ${W-PR},${H-PB}" fill="url(#nwg)"></polygon>
    <polyline points="${line}" fill="none" stroke="#0d6b43" stroke-width="2.5"></polyline>
    ${pts.map((p,i)=>`<circle cx="${X(i)}" cy="${Y(p.net)}" r="3.5" fill="#0d6b43"><title>${p.date}: ${fmt(p.net)}</title></circle>
      <text x="${X(i)}" y="${H-6}" text-anchor="middle" font-size="11" fill="#87928b">${p.date.slice(0,7)}</text>`).join("")}`;
}

/* ---------- paycheck flow ---------- */
function renderPaycheck(){
  const p = DATA.paycheck;
  const taxTotal = p.taxes.reduce((s,t)=>s+t.amount,0);
  const retirement = p.pretax.amount + p.aftertax.amount;
  const takeHome = p.gross - retirement - taxTotal;
  const branches = [
    { key:"ret", t:"Retirement", a:retirement, detail:`<h4>Retirement — ${fmt(retirement)}</h4><ul><li>${esc(p.pretax.label)} (${p.pretax.pct}%): ${fmt(p.pretax.amount)}</li><li>${esc(p.aftertax.label)} (${p.aftertax.pct}%): ${fmt(p.aftertax.amount)}</li></ul>` },
    { key:"tax", t:"Taxes withheld", a:taxTotal, detail:`<h4>Taxes withheld — ${fmt(taxTotal)}</h4><ul>${p.taxes.map(t=>`<li>${esc(t.label)}: ${fmt(t.amount)}</li>`).join("")}</ul>` },
    { key:"home", t:"Take-home", a:takeHome, detail:`<h4>Take-home — ${fmt(takeHome)}</h4><ul><li>Deposited to ${esc(p.depositTo)}</li><li>${esc(p.frequency)} pay</li></ul>` }
  ];
  $("flow").innerHTML = `
    <div class="flow-gross"><div class="t">Gross pay</div><div class="a">${fmt(p.gross)}</div></div>
    <div class="flow-rail"></div>
    <div class="flow-branches">${branches.map((b,i)=>`<button class="flow-branch ${i===0?"selected":""}" data-k="${b.key}"><div class="t">${b.t}</div><div class="a">${fmt(b.a)}</div></button>`).join("")}</div>
    <div class="flow-detail" id="flow-detail"></div>`;
  const detail = $("flow-detail");
  const show = k => {
    detail.innerHTML = branches.find(b=>b.key===k).detail;
    document.querySelectorAll(".flow-branch").forEach(n => n.classList.toggle("selected", n.dataset.k===k));
  };
  document.querySelectorAll(".flow-branch").forEach(n => n.addEventListener("click", ()=>show(n.dataset.k)));
  show("ret");
  renderRecurring();
}

function monthlyCost(r){ return r.period==="annual" ? r.amount/12 : r.amount; }
function renderRecurring(){
  const html = DATA.recurring.map(r =>
    `<li><span>${esc(r.label)}</span><span class="amt">${fmt(monthlyCost(r))}/mo</span></li>`).join("") +
    `<li class="total"><span>Total</span><span class="amt">${fmt(DATA.recurring.reduce((s,r)=>s+monthlyCost(r),0))}/mo</span></li>`;
  $("recurring-paycheck").innerHTML = html;
  $("recurring-spending").innerHTML = html;
}

/* ---------- spending ---------- */
let activeCategory = null;
let editingShareId = null;
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
    return `<div class="budget-row ${activeCategory===c?"active":""}" data-cat="${c}">
      <div class="top"><span>${c}</span><span class="nums"><b>${fmt(a)}</b> / ${fmt(b)}</span></div>
      <div class="track"><div class="fill ${a>b?"over":""}" style="width:${pct}%"></div></div></div>`;
  }).join("");
  document.querySelectorAll(".budget-row").forEach(r => r.addEventListener("click", () => {
    activeCategory = activeCategory===r.dataset.cat ? null : r.dataset.cat;
    renderSpending();
  }));

  const rows = monthTx.filter(tx => !activeCategory || catOf(tx)===activeCategory);
  $("tx-list").innerHTML = rows.map(tx => `
    <article class="tx-article ${isIgnored(tx)?"ignored":""}">
      <div class="tx-main">
        <div><div class="tx-desc">${esc(tx.desc)}${tx.id in state.shares ? ` <span style="color:var(--muted);font-weight:400">(your share ${fmt(state.shares[tx.id])})</span>` : ""}</div>
        <div class="tx-sub">${tx.date} · ${esc(tx.account)}</div></div>
        <select data-tx="${tx.id}">${CATEGORIES.map(c=>`<option ${c===catOf(tx)?"selected":""}>${c}</option>`).join("")}</select>
        <span class="tx-amt">${fmt(tx.amount)}</span>
        <button class="dots" data-tx="${tx.id}" aria-label="More actions">⋯</button>
      </div>
      ${editingShareId===tx.id ? `<div class="share-editor">
        <label>Your share ($) <input type="number" class="share-input" min="0" step="0.01" value="${shareOf(tx)}"></label>
        <button class="save" data-tx="${tx.id}">Save</button>
        <button class="cancel">Cancel</button>
      </div>` : ""}
    </article>`).join("");
  document.querySelectorAll("#tx-list select").forEach(s => s.addEventListener("change", () => {
    state.cats[s.dataset.tx] = s.value; save(); renderSpending();
  }));
  document.querySelectorAll(".dots").forEach(b => b.addEventListener("click", e => { e.stopPropagation(); openMenu(b); }));
  const saveBtn = document.querySelector(".share-editor .save");
  if (saveBtn) saveBtn.addEventListener("click", () => {
    const tx = DATA.transactions.find(t=>t.id===saveBtn.dataset.tx);
    const v = parseFloat(document.querySelector(".share-editor .share-input").value);
    if (!isNaN(v) && tx){
      if (v >= tx.amount) delete state.shares[tx.id]; else state.shares[tx.id] = v;
      save();
    }
    editingShareId = null; renderSpending();
  });
  const cancelBtn = document.querySelector(".share-editor .cancel");
  if (cancelBtn) cancelBtn.addEventListener("click", () => { editingShareId = null; renderSpending(); });

  const shareItems = DATA.transactions.filter(tx => tx.id in state.shares && !isIgnored(tx))
    .map(tx => ({ label: tx.desc, amount: tx.amount - state.shares[tx.id] }));
  const allOwed = [...state.owed, ...shareItems];
  $("owed-list").innerHTML = allOwed.map(o =>
    `<li><span>${esc(o.label)}</span><span class="amt">${fmt(o.amount)}</span></li>`).join("") +
    `<li class="total"><span>Total owed to you</span><span class="amt">${fmt(allOwed.reduce((s,o)=>s+o.amount,0))}</span></li>`;
}

/* ---------- row menu ---------- */
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
  if (a==="ignore"){ state.ignored.push(menuTx.id); save(); }
  if (a==="include"){ state.ignored = state.ignored.filter(id=>id!==menuTx.id); save(); }
  if (a==="share"){ editingShareId = menuTx.id; $("row-menu").classList.add("hidden"); renderSpending(); return; }
  renderSpending();
});

/* ---------- fallback sample (only used if the server is unreachable) ---------- */
const FALLBACK_DATA = { accounts:[], paycheck:{gross:0,pretax:{label:"Pre-tax 401(k)",pct:0,amount:0},aftertax:{label:"Roth 401(k)",pct:0,amount:0},taxes:[],depositTo:"",frequency:""}, budgets:{}, recurring:[], owedSeed:[], snapshots:[{date:"2026-01-01",net:0},{date:"2026-02-01",net:0}], transactions:[] };

/* ---------- init ---------- */
loadState().then(() => { renderOverview(); renderPaycheck(); renderSpending(); });
