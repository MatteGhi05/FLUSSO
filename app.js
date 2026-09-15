const categories = [
  ['Casa', 800], ['Bollette', 180], ['Alimentari', 350], ['Trasporti', 180],
  ['Salute', 100], ['Tempo libero', 100], ['Ristoranti', 120], ['Shopping', 100],
  ['Viaggi', 100], ['Abbonamenti', 50], ['Famiglia', 120], ['Altro', 100]
];

const seed = {
  salary: 1850,
  openingBalance: 4300,
  movements: [
    { id: 1, type: 'expense', category: 'Alimentari', description: 'Spesa settimanale', amount: 72.4, date: '2026-09-03' },
    { id: 2, type: 'expense', category: 'Trasporti', description: 'Rifornimento', amount: 55, date: '2026-09-05' },
    { id: 3, type: 'expense', category: 'Abbonamenti', description: 'Streaming', amount: 12.99, date: '2026-09-08' },
    { id: 4, type: 'expense', category: 'Casa', description: 'Affitto', amount: 780, date: '2026-09-01' },
    { id: 5, type: 'expense', category: 'Ristoranti', description: 'Cena', amount: 38, date: '2026-08-27' },
    { id: 6, type: 'expense', category: 'Alimentari', description: 'Spesa', amount: 64, date: '2026-08-20' }
  ],
  budgets: Object.fromEntries(categories)
};

const state = JSON.parse(localStorage.getItem('flusso-state') || 'null') || seed;
let currentView = 'dashboard';
let currentFilter = 'all';
let movementType = 'expense';

const $ = selector => document.querySelector(selector);
const $$ = selector => [...document.querySelectorAll(selector)];
const money = value => new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR' }).format(value || 0);
const shortMoney = value => new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(value || 0);
const selectedMonth = () => $('#monthPicker').value;
const selectedMovements = () => state.movements.filter(m => m.date.startsWith(selectedMonth()));
const persist = () => localStorage.setItem('flusso-state', JSON.stringify(state));
const escapeHTML = value => String(value).replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[char]));

function monthSettings(month = selectedMonth()) {
  state.months ||= {};
  if (!state.months[month]) {
    state.months[month] = {
      salary: Number(state.salary ?? seed.salary),
      openingBalance: Number(state.openingBalance ?? seed.openingBalance),
      budgets: { ...(state.budgets || seed.budgets) }
    };
  }
  return state.months[month];
}

function totals(month = selectedMonth()) {
  const settings = monthSettings(month);
  const items = state.movements.filter(m => m.date.startsWith(month));
  const extras = items.filter(m => m.type === 'income').reduce((s,m) => s + m.amount, 0);
  const expenses = items.filter(m => m.type === 'expense').reduce((s,m) => s + m.amount, 0);
  const income = settings.salary + extras;
  return { income, expenses, saving: income - expenses, items };
}

function render() {
  renderDashboard();
  renderTransactions();
  renderBudget();
  renderSettings();
}

function renderDashboard() {
  const t = totals();
  const settings = monthSettings();
  const totalBudget = Object.values(settings.budgets).reduce((a,b) => a + Number(b), 0);
  const rate = t.income ? Math.max(-100, Math.round((t.saving / t.income) * 100)) : 0;
  const balance = settings.openingBalance + t.saving;
  $('#balanceValue').textContent = money(balance);
  $('#incomeValue').textContent = shortMoney(t.income);
  $('#expenseValue').textContent = shortMoney(t.expenses);
  $('#incomeCard').textContent = money(t.income);
  $('#expenseCard').textContent = money(t.expenses);
  $('#expenseCount').textContent = `${t.items.filter(m => m.type === 'expense').length} operazioni`;
  $('#savingValue').textContent = money(t.saving);
  $('#savingRate').textContent = `${rate}%`;
  $('#scoreRing').style.background = `conic-gradient(var(--blue) 0 ${Math.max(0, Math.min(100, rate)) * 3.6}deg, var(--ice) 0deg)`;
  $('#savingMessage').textContent = rate >= 20 ? 'Stai mantenendo un ottimo margine questo mese.' : rate > 0 ? 'Buon inizio. C’è ancora spazio per migliorare.' : 'Le spese stanno superando le entrate del mese.';
  const left = totalBudget - t.expenses;
  $('#budgetLeft').textContent = money(left);
  $('#budgetRate').textContent = `${totalBudget ? Math.max(0, Math.round(left / totalBudget * 100)) : 0}% disponibile`;
  $('#donutTotal').textContent = shortMoney(t.expenses);
  renderCategoryVisual(t);
  renderLineChart();
  renderList($('#recentTransactions'), [...t.items].sort((a,b) => b.date.localeCompare(a.date)).slice(0,4), false);
}

function renderCategoryVisual(t) {
  const spent = {};
  t.items.filter(m => m.type === 'expense').forEach(m => spent[m.category] = (spent[m.category] || 0) + m.amount);
  const top = Object.entries(spent).sort((a,b) => b[1]-a[1]).slice(0,3);
  const total = t.expenses || 1;
  const tones = ['#0ea5e9','#38bdf8','#7dd3fc'];
  let acc = 0;
  const segments = top.map(([_,v],i) => { const start=acc; acc += v/total*100; return `${tones[i]} ${start}% ${acc}%`; });
  if (segments.length) $('#donut').style.background = `conic-gradient(${segments.join(',')}, #e0f2fe ${acc}% 100%)`;
  else $('#donut').style.background = '#e0f2fe';
  $('#categoryList').innerHTML = top.length ? top.map(([name,value],i) => `<div class="category-row"><span>${name}</span><strong>${shortMoney(value)}</strong><div class="category-track"><i style="width:${value/(top[0]?.[1]||1)*100}%;opacity:${1-i*.18}"></i></div></div>`).join('') : '<p class="muted">Nessuna spesa nel mese.</p>';
}

function monthOffset(value, delta) {
  const [y,m] = value.split('-').map(Number);
  const d = new Date(y, m - 1 + delta, 1);
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;
}

function renderLineChart() {
  const months = Array.from({length:6}, (_,i) => monthOffset(selectedMonth(), i-5));
  const data = months.map(m => totals(m));
  const max = Math.max(1, ...data.flatMap(d => [d.income,d.expenses]));
  const width=620, height=220, padX=28, padY=22, plotW=width-padX*2, plotH=height-padY*2;
  const point = (v,i) => [padX + (plotW/(months.length-1))*i, padY + plotH - (v/max)*plotH];
  const points = key => data.map((d,i)=>point(d[key],i));
  const path = pts => pts.map((p,i)=>`${i?'L':'M'}${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(' ');
  const income = points('income'), expense = points('expenses');
  const labels = months.map(m => new Date(`${m}-02`).toLocaleDateString('it-IT',{month:'short'}).replace('.',''));
  $('#lineChart').innerHTML = `<svg viewBox="0 0 ${width} ${height}" preserveAspectRatio="none"><defs><linearGradient id="incomeArea" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#38bdf8" stop-opacity=".23"/><stop offset="1" stop-color="#38bdf8" stop-opacity="0"/></linearGradient></defs>${[0,.5,1].map(n=>`<line class="grid-line" x1="${padX}" x2="${width-padX}" y1="${padY+plotH*n}" y2="${padY+plotH*n}"/>`).join('')}<path class="area-income" d="${path(income)} L${income.at(-1)[0]},${height-padY} L${income[0][0]},${height-padY}Z"/><path class="line-income" d="${path(income)}"/><path class="line-expense" d="${path(expense)}"/>${expense.map(p=>`<circle class="chart-dot" cx="${p[0]}" cy="${p[1]}" r="5" fill="#0a3156"/>`).join('')}${labels.map((l,i)=>`<text class="axis-label" x="${point(0,i)[0]}" y="${height-2}" text-anchor="middle">${l}</text>`).join('')}</svg>`;
}

function renderList(container, items, canDelete=true) {
  container.innerHTML = items.map(m => `<div class="transaction-row"><span class="transaction-icon">${m.type==='income'?'↗':escapeHTML(m.category.slice(0,1))}</span><div class="transaction-main"><strong>${escapeHTML(m.description)}</strong><small>${new Date(m.date+'T12:00:00').toLocaleDateString('it-IT',{day:'numeric',month:'long'})}</small></div><span class="transaction-category">${escapeHTML(m.category)}</span><span class="transaction-value ${m.type}">${m.type==='income'?'+':'−'} ${money(m.amount)}</span>${canDelete?`<button class="delete-btn" data-delete="${m.id}" aria-label="Elimina ${escapeHTML(m.description)}">×</button>`:''}</div>`).join('');
}

function renderTransactions() {
  let items = [...selectedMovements()].sort((a,b)=>b.date.localeCompare(a.date));
  if (currentFilter !== 'all') items = items.filter(m => m.type === currentFilter);
  renderList($('#allTransactions'), items);
  $('#emptyTransactions').style.display = items.length ? 'none' : 'block';
  $('#allTransactions').style.display = items.length ? 'grid' : 'none';
}

function renderBudget() {
  const t = totals();
  const settings = monthSettings();
  const spent = {};
  t.items.filter(m=>m.type==='expense').forEach(m=>spent[m.category]=(spent[m.category]||0)+m.amount);
  const total = Object.values(settings.budgets).reduce((a,b)=>a+Number(b),0);
  $('#budgetTotal').textContent = money(total);
  $('#budgetMonthLabel').textContent = monthName(selectedMonth());
  $('#budgetGrid').innerHTML = categories.map(([name]) => { const limit=Number(settings.budgets[name]||0), used=spent[name]||0, rate=limit?Math.min(100,used/limit*100):0; return `<article class="budget-item"><div class="budget-item-top"><h3>${name}</h3><input type="number" min="0" step="10" value="${limit}" data-budget="${name}" aria-label="Budget ${name}" /></div><div class="budget-numbers"><span>${money(used)} spesi</span><strong>${money(Math.max(0,limit-used))} liberi</strong></div><div class="budget-track"><i style="width:${rate}%"></i></div></article>`; }).join('');
}

function monthName(month) {
  return new Date(`${month}-02T12:00:00`).toLocaleDateString('it-IT', { month: 'long', year: 'numeric' });
}

function renderSettings() {
  const settings = monthSettings();
  $('#settingsMonthLabel').textContent = monthName(selectedMonth());
  $('#salaryInput').value = settings.salary;
  $('#openingBalanceInput').value = settings.openingBalance;
  $('#settingsBudgetTotal').textContent = money(Object.values(settings.budgets).reduce((a,b)=>a+Number(b),0));
}

function switchView(view) {
  currentView = view;
  $$('.nav-item').forEach(b => b.classList.toggle('active', b.dataset.view === view));
  $$('.view').forEach(v => v.classList.remove('active'));
  $(`#${view}View`).classList.add('active');
  const map = { dashboard:['IL TUO MESE','Panoramica'], movements:['REGISTRO PERSONALE','Movimenti'], budget:['PIANIFICAZIONE','Budget'], settings:['CONFIGURAZIONE','Impostazioni'] };
  $('#viewEyebrow').textContent = map[view][0]; $('#viewTitle').textContent = map[view][1];
  window.scrollTo({top:0,behavior:'smooth'});
}

function openModal() {
  $('#transactionModal').classList.add('open'); $('#transactionModal').setAttribute('aria-hidden','false');
  $('#date').value = `${selectedMonth()}-${String(new Date().getDate()).padStart(2,'0')}`;
  setTimeout(()=>$('#amount').focus(),100);
}
function closeModal() { $('#transactionModal').classList.remove('open'); $('#transactionModal').setAttribute('aria-hidden','true'); }
function showToast(text) { const el=$('#toast'); el.textContent=text; el.classList.add('show'); setTimeout(()=>el.classList.remove('show'),2200); }

function exportBackup() {
  const backup = { format: 'flusso-backup', version: 1, exportedAt: new Date().toISOString(), data: state };
  const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `flusso-backup-${new Date().toISOString().slice(0,10)}.json`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
  showToast('Backup scaricato');
}

function normalizeBackup(raw) {
  const source = raw?.format === 'flusso-backup' ? raw.data : raw;
  if (!source || !Array.isArray(source.movements)) throw new Error('Struttura non valida');
  const categoryNames = new Set(categories.map(([name]) => name));
  const movements = source.movements.map((movement, index) => {
    const amount = Number(movement.amount);
    if (!['expense','income'].includes(movement.type) || !categoryNames.has(movement.category) || !Number.isFinite(amount) || amount <= 0 || typeof movement.description !== 'string' || !movement.description.trim() || !/^\d{4}-\d{2}-\d{2}$/.test(movement.date || '')) throw new Error(`Movimento ${index + 1} non valido`);
    return { id: Number.isFinite(Number(movement.id)) ? Number(movement.id) : Date.now() + index, type: movement.type, category: movement.category, description: movement.description.trim().slice(0,120), amount, date: movement.date };
  });
  const cleanBudgets = budgets => Object.fromEntries(categories.map(([name, fallback]) => { const value = Number(budgets?.[name]); return [name, Number.isFinite(value) && value >= 0 ? value : fallback]; }));
  const months = {};
  if (source.months && typeof source.months === 'object') Object.entries(source.months).forEach(([month, settings]) => {
    if (!/^\d{4}-\d{2}$/.test(month) || !settings || typeof settings !== 'object') throw new Error('Impostazioni mensili non valide');
    const salary = Number(settings.salary), openingBalance = Number(settings.openingBalance);
    if (!Number.isFinite(salary) || salary < 0 || !Number.isFinite(openingBalance)) throw new Error('Importi mensili non validi');
    months[month] = { salary, openingBalance, budgets: cleanBudgets(settings.budgets) };
  });
  const salary = Number(source.salary), openingBalance = Number(source.openingBalance);
  return { salary: Number.isFinite(salary) && salary >= 0 ? salary : seed.salary, openingBalance: Number.isFinite(openingBalance) ? openingBalance : seed.openingBalance, movements, budgets: cleanBudgets(source.budgets), months };
}

async function importBackupFile(file) {
  try {
    const imported = normalizeBackup(JSON.parse(await file.text()));
    if (!window.confirm('Caricare questo backup? I dati presenti su questo dispositivo verranno sostituiti.')) return;
    Object.keys(state).forEach(key => delete state[key]);
    Object.assign(state, imported);
    persist();
    render();
    showToast('Backup caricato correttamente');
  } catch (error) {
    showToast('Backup non valido');
  }
}

$$('.nav-item').forEach(b=>b.addEventListener('click',()=>switchView(b.dataset.view)));
$$('[data-view-link]').forEach(b=>b.addEventListener('click',()=>switchView(b.dataset.viewLink)));
$('#monthPicker').addEventListener('change',render);
$('#openTransaction').addEventListener('click',openModal); $('#closeModal').addEventListener('click',closeModal);
$('#transactionModal').addEventListener('click',e=>{if(e.target===e.currentTarget)closeModal()});
document.addEventListener('keydown',e=>{if(e.key==='Escape')closeModal()});
$$('.type-switch button').forEach(b=>b.addEventListener('click',()=>{$$('.type-switch button').forEach(x=>x.classList.remove('active'));b.classList.add('active');movementType=b.dataset.type;}));
$$('.filter').forEach(b=>b.addEventListener('click',()=>{$$('.filter').forEach(x=>x.classList.remove('active'));b.classList.add('active');currentFilter=b.dataset.filter;renderTransactions();}));
$('#category').innerHTML = categories.map(([name])=>`<option>${name}</option>`).join('');
$('#transactionForm').addEventListener('submit',e=>{e.preventDefault();state.movements.push({id:Date.now(),type:movementType,category:$('#category').value,description:$('#description').value.trim(),amount:Number($('#amount').value),date:$('#date').value});persist();render();e.target.reset();closeModal();showToast('Movimento salvato');});
$('#allTransactions').addEventListener('click',e=>{const id=e.target.dataset.delete;if(!id)return;state.movements=state.movements.filter(m=>String(m.id)!==id);persist();render();showToast('Movimento eliminato');});
$('#budgetGrid').addEventListener('change',e=>{const name=e.target.dataset.budget;if(!name)return;monthSettings().budgets[name]=Math.max(0,Number(e.target.value)||0);persist();render();showToast('Budget aggiornato');});
$('#salaryInput').addEventListener('change',e=>{monthSettings().salary=Math.max(0,Number(e.target.value)||0);persist();render();showToast('Stipendio aggiornato');});
$('#openingBalanceInput').addEventListener('change',e=>{monthSettings().openingBalance=Number(e.target.value)||0;persist();render();showToast('Saldo iniziale aggiornato');});
$('#copyPrevious').addEventListener('click',()=>{const source=monthSettings(monthOffset(selectedMonth(),-1));state.months[selectedMonth()]={salary:source.salary,openingBalance:source.openingBalance,budgets:{...source.budgets}};persist();render();showToast('Valori del mese precedente copiati');});
$('#exportBackup').addEventListener('click',exportBackup);
$('#importBackup').addEventListener('click',()=>$('#backupFile').click());
$('#backupFile').addEventListener('change',e=>{const file=e.target.files?.[0];if(file)importBackupFile(file);e.target.value='';});

render();

function registerWebMCP() {
  const context = document.modelContext;
  if (!context?.registerTool) return;
  const lifecycle = new AbortController();

  Promise.resolve(context.registerTool({
    name: 'get_month_summary',
    title: 'Leggi riepilogo mensile',
    description: 'Restituisce entrate, spese, risparmio e numero di movimenti per un mese della dashboard.',
    inputSchema: {
      type: 'object',
      properties: { month: { type: 'string', pattern: '^\\d{4}-\\d{2}$', description: 'Mese in formato YYYY-MM' } },
      required: ['month'],
      additionalProperties: false
    },
    annotations: { readOnlyHint: true, untrustedContentHint: false },
    execute(input) {
      if (!input || !/^\d{4}-\d{2}$/.test(input.month || '')) throw new Error('Mese non valido');
      const result = totals(input.month);
      return { month: input.month, income: result.income, expenses: result.expenses, saving: result.saving, movementCount: result.items.length };
    }
  }, { signal: lifecycle.signal })).catch(() => {});

  Promise.resolve(context.registerTool({
    name: 'add_transaction',
    title: 'Aggiungi movimento',
    description: 'Registra una nuova entrata o spesa e aggiorna la dashboard visibile.',
    inputSchema: {
      type: 'object',
      properties: {
        type: { type: 'string', enum: ['expense', 'income'] },
        amount: { type: 'number', exclusiveMinimum: 0 },
        category: { type: 'string' },
        description: { type: 'string', minLength: 1, maxLength: 60 },
        date: { type: 'string', pattern: '^\\d{4}-\\d{2}-\\d{2}$' }
      },
      required: ['type', 'amount', 'category', 'description', 'date'],
      additionalProperties: false
    },
    annotations: { readOnlyHint: false, untrustedContentHint: false },
    execute(input) {
      const validCategory = categories.some(([name]) => name === input?.category);
      if (!input || !['expense','income'].includes(input.type) || !(input.amount > 0) || !validCategory || !input.description?.trim() || !/^\d{4}-\d{2}-\d{2}$/.test(input.date || '')) throw new Error('Dati del movimento non validi');
      const movement = { id: Date.now(), type: input.type, amount: Number(input.amount), category: input.category, description: input.description.trim(), date: input.date };
      state.movements.push(movement); persist(); render();
      return { id: movement.id, saved: true };
    }
  }, { signal: lifecycle.signal })).catch(() => {});
}

registerWebMCP();
