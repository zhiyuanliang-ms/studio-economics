import './style.css'
import {
  calculateModelQuote,
  calculateStudioProfit,
} from './calculator.js'
import { cloneState, createId } from './state.js'
import {
  loadPersistedState,
  savePersistedState,
  STORAGE_KEY,
} from './persistence.js'

const app = document.querySelector('#app')
let state = loadState()
let profitResult = calculateStudioProfit(state)
let quoteResult = calculateModelQuote(state.modelQuoteDraft)
let activeTab = 'profit'
let saveFailureNotified = false

const icons = {
  calculator: `
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <rect x="4" y="2.75" width="16" height="18.5" rx="3"></rect>
      <path d="M8 7.5h8M8 12h.01M12 12h.01M16 12h.01M8 16h.01M12 16h.01M16 16h.01"></path>
    </svg>
  `,
  plus: `
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 5v14M5 12h14"></path>
    </svg>
  `,
  trash: `
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M4 7h16M9 7V4h6v3M7 7l1 13h8l1-13M10 11v5M14 11v5"></path>
    </svg>
  `,
  save: `
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M5 3h11l3 3v15H5zM8 3v6h8V3M8 21v-7h8v7"></path>
    </svg>
  `,
  clear: `
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M4 6c0-1.7 3.6-3 8-3s8 1.3 8 3-3.6 3-8 3-8-1.3-8-3Z"></path>
      <path d="M4 6v5c0 1.7 3.6 3 8 3M4 11v5c0 1.5 2.8 2.7 6.5 3M17 16l4 4M21 16l-4 4"></path>
    </svg>
  `,
}

app.innerHTML = `
  <header class="app-header">
    <div class="brand-mark">${icons.calculator}</div>
    <h1>工作室计算器</h1>
    <button
      type="button"
      class="icon-button header-action"
      id="clear-storage"
      aria-label="清空本地数据"
      title="清空本地数据"
    >${icons.clear}</button>
  </header>

  <nav class="tab-list" role="tablist" aria-label="计算器">
    <button
      type="button"
      class="tab-button active"
      id="profit-tab"
      role="tab"
      aria-selected="true"
      aria-controls="profit-panel"
      data-tab="profit"
    >工作室利润</button>
    <button
      type="button"
      class="tab-button"
      id="quote-tab"
      role="tab"
      aria-selected="false"
      aria-controls="quote-panel"
      data-tab="quote"
    >模型报价</button>
  </nav>

  <main
    class="calculator"
    id="profit-panel"
    role="tabpanel"
    aria-labelledby="profit-tab"
    data-tab-panel="profit"
  >
    <div class="input-panel">
      <div class="price-fields">
        <label class="field">
          <span>月营收</span>
          <span class="money-input">
            <span aria-hidden="true">¥</span>
            <input
              type="number"
              min="0"
              step="100"
              inputmode="decimal"
              data-setting="monthlyRevenue"
            >
          </span>
        </label>
      </div>

      <div class="cost-block">
        <div class="cost-heading">
          <h2>每月固定成本</h2>
          <button
            type="button"
            class="icon-button add-button"
            data-add="fixedCosts"
            aria-label="添加每月固定成本"
            title="添加每月固定成本"
          >${icons.plus}</button>
        </div>
        <div class="cost-list">
          <div id="fixed-cost-rows"></div>
        </div>
      </div>

      <div class="cost-block">
        <div class="cost-heading">
          <h2>一次性投入</h2>
          <button
            type="button"
            class="icon-button add-button"
            data-add="oneTimeCosts"
            aria-label="添加一次性投入"
            title="添加一次性投入"
          >${icons.plus}</button>
        </div>
        <div class="cost-list">
          <div id="one-time-cost-rows"></div>
        </div>
      </div>
    </div>

    <aside class="result-panel" aria-live="polite">
      <span class="result-label" id="profit-label">预计月利润</span>
      <output class="profit-result" id="monthly-profit">—</output>
      <div class="result-divider"></div>
      <dl class="result-details">
        <div>
          <dt>月营收</dt>
          <dd id="monthly-revenue">—</dd>
        </div>
        <div>
          <dt>每月固定成本</dt>
          <dd id="monthly-fixed-cost">—</dd>
        </div>
        <div>
          <dt>月折旧</dt>
          <dd id="monthly-depreciation">—</dd>
        </div>
        <div>
          <dt>一次性投入</dt>
          <dd id="one-time-investment">—</dd>
        </div>
      </dl>
      <div class="result-footer">
        <div class="payback-result">
          <span>回本周期</span>
          <strong id="payback-period">—</strong>
        </div>
      </div>
    </aside>
  </main>

  <main
    class="calculator quote-calculator"
    id="quote-panel"
    role="tabpanel"
    aria-labelledby="quote-tab"
    data-tab-panel="quote"
    hidden
  >
    <div class="input-panel">
      <div class="quote-toolbar">
        <select id="saved-model-quotes" aria-label="已保存报价方案"></select>
        <div class="quote-actions">
          <button
            type="button"
            class="icon-button add-button"
            data-quote-action="new"
            aria-label="新建报价方案"
            title="新建报价方案"
          >${icons.plus}</button>
          <button
            type="button"
            class="icon-button save-button"
            data-quote-action="save"
            aria-label="保存报价方案"
            title="保存报价方案"
          >${icons.save}</button>
          <button
            type="button"
            class="icon-button remove-button"
            id="delete-saved-quote"
            data-quote-action="delete"
            aria-label="删除报价方案"
            title="删除报价方案"
          >${icons.trash}</button>
        </div>
      </div>

      <div class="price-fields quote-fields">
        <label class="field">
          <span>模型名称</span>
          <input
            class="large-text-input"
            type="text"
            data-quote-field="name"
            placeholder="模型名称"
          >
        </label>
        <label class="field">
          <span>对外报价</span>
          <span class="money-input">
            <span aria-hidden="true">¥</span>
            <input
              type="number"
              min="0"
              step="10"
              inputmode="decimal"
              data-quote-field="externalPrice"
            >
          </span>
        </label>
      </div>

      <div class="cost-block">
        <div class="cost-heading">
          <h2>制作步骤</h2>
          <button
            type="button"
            class="icon-button add-button"
            data-quote-action="add-step"
            aria-label="添加制作步骤"
            title="添加制作步骤"
          >${icons.plus}</button>
        </div>
        <div class="cost-list" id="quote-step-rows"></div>
      </div>
    </div>

    <aside class="result-panel quote-result-panel" aria-live="polite">
      <span class="result-label">模型总成本</span>
      <output class="profit-result" id="model-total-cost">—</output>
      <div class="result-divider"></div>
      <dl class="result-details">
        <div>
          <dt>预计总工时</dt>
          <dd id="model-total-hours">—</dd>
        </div>
        <div>
          <dt>对外报价</dt>
          <dd id="model-external-price">—</dd>
        </div>
        <div>
          <dt>报价差额</dt>
          <dd id="model-quote-difference">—</dd>
        </div>
      </dl>
    </aside>
  </main>

  <div class="sr-only" id="live-status" aria-live="polite"></div>
`

function loadState() {
  try {
    return loadPersistedState()
  } catch (error) {
    globalThis.localStorage?.removeItem(STORAGE_KEY)
    globalThis.setTimeout(() => {
      globalThis.alert(`本地数据无法读取，已恢复默认值：${error.message}`)
    }, 0)
    return cloneState()
  }
}

function persist() {
  try {
    savePersistedState(state)
    saveFailureNotified = false
  } catch (error) {
    console.error('自动保存失败', error)
    if (!saveFailureNotified) {
      saveFailureNotified = true
      globalThis.alert(`自动保存失败：${error.message}`)
    }
  }
}

function announce(message) {
  document.querySelector('#live-status').textContent = message
}

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, (character) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  })[character])
}

function toNonNegativeNumber(value) {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? Math.max(0, parsed) : 0
}

function formatMoney(value, maximumFractionDigits = 0) {
  if (!Number.isFinite(value)) return '—'
  return `¥${value.toLocaleString('zh-CN', { maximumFractionDigits })}`
}

function formatSignedMoney(value) {
  const prefix = value > 0 ? '+' : value < 0 ? '−' : ''
  return `${prefix}${formatMoney(Math.abs(value))}`
}

function formatProfit(value) {
  return `${formatSignedMoney(value)} / 月`
}

function formatHours(value) {
  if (!Number.isFinite(value)) return '—'
  return `${value.toLocaleString('zh-CN', { maximumFractionDigits: 1 })} h`
}

function formatPaybackPeriod(months) {
  if (months === 0) return '无一次性投入'
  if (!Number.isFinite(months)) return '当前无法回本'
  if (months < 1) return `约 ${Math.max(1, Math.ceil(months * 30))} 天`
  if (months < 24) {
    return `约 ${months.toLocaleString('zh-CN', { maximumFractionDigits: 1 })} 个月`
  }
  return `约 ${(months / 12).toLocaleString('zh-CN', { maximumFractionDigits: 1 })} 年`
}

function inputAttributes(collection, item, field) {
  return `data-collection="${collection}" data-id="${escapeHtml(item.id)}" data-field="${field}"`
}

function quoteStepAttributes(step, field) {
  return `data-step-id="${escapeHtml(step.id)}" data-step-field="${field}"`
}

function createQuoteDraft() {
  return {
    sourceSavedQuoteId: null,
    name: '',
    externalPrice: 0,
    steps: [{
      id: createId('quote-step'),
      name: '步骤 1',
      pieceworkCost: 0,
      estimatedHours: 0,
    }],
  }
}

function renderSettings() {
  document.querySelectorAll('[data-setting]').forEach((input) => {
    if (input.type === 'checkbox') {
      input.checked = Boolean(state.settings[input.dataset.setting])
    } else {
      input.value = state.settings[input.dataset.setting]
    }
  })
}

function renderFixedCosts() {
  document.querySelector('#fixed-cost-rows').innerHTML = state.fixedCosts
    .map((item) => `
      <div class="cost-row monthly-grid" data-row-id="${escapeHtml(item.id)}">
        <label class="cost-cell name-cell">
          <span class="sr-only">项目</span>
          <input
            class="text-input"
            type="text"
            placeholder="项目"
            ${inputAttributes('fixedCosts', item, 'name')}
            value="${escapeHtml(item.name)}"
          >
        </label>
        <label class="cost-cell amount-cell">
          <span class="compact-money-input">
            <span aria-hidden="true">¥</span>
            <input
              type="number"
              min="0"
              step="100"
              inputmode="decimal"
              aria-label="每月金额"
              ${inputAttributes('fixedCosts', item, 'amount')}
              value="${item.amount}"
            >
          </span>
        </label>
        <button
          type="button"
          class="icon-button remove-button"
          data-remove="fixedCosts"
          data-id="${escapeHtml(item.id)}"
          aria-label="删除${escapeHtml(item.name || '固定成本')}"
          title="删除"
        >${icons.trash}</button>
      </div>
    `).join('')
}

function renderOneTimeCosts() {
  document.querySelector('#one-time-cost-rows').innerHTML = state.oneTimeCosts
    .map((item) => `
      <div class="cost-row investment-grid" data-row-id="${escapeHtml(item.id)}">
        <label class="cost-cell name-cell">
          <span class="sr-only">项目</span>
          <input
            class="text-input"
            type="text"
            placeholder="项目"
            ${inputAttributes('oneTimeCosts', item, 'name')}
            value="${escapeHtml(item.name)}"
          >
        </label>
        <label class="cost-cell amount-cell">
          <span class="compact-money-input">
            <span aria-hidden="true">¥</span>
            <input
              type="number"
              min="0"
              step="100"
              inputmode="decimal"
              aria-label="投入金额"
              ${inputAttributes('oneTimeCosts', item, 'amount')}
              value="${item.amount}"
            >
          </span>
        </label>
        <div class="depreciation-controls">
          <label class="depreciation-toggle">
            <input
              type="checkbox"
              ${inputAttributes('oneTimeCosts', item, 'depreciates')}
              ${item.depreciates ? 'checked' : ''}
            >
            <span class="mini-toggle" aria-hidden="true"></span>
            <span>折旧</span>
          </label>
          <label class="depreciation-months" ${item.depreciates ? '' : 'hidden'}>
            <input
              type="number"
              min="1"
              step="1"
              inputmode="numeric"
              aria-label="折旧月数"
              ${inputAttributes('oneTimeCosts', item, 'depreciationMonths')}
              value="${item.depreciationMonths}"
            >
            <span aria-hidden="true">月</span>
          </label>
        </div>
        <button
          type="button"
          class="icon-button remove-button"
          data-remove="oneTimeCosts"
          data-id="${escapeHtml(item.id)}"
          aria-label="删除${escapeHtml(item.name || '一次性投入')}"
          title="删除"
        >${icons.trash}</button>
      </div>
    `).join('')
}

function renderQuoteToolbar() {
  const selectedId = state.modelQuoteDraft.sourceSavedQuoteId ?? ''
  document.querySelector('#saved-model-quotes').innerHTML = [
    '<option value="">新方案</option>',
    ...state.savedModelQuotes.map((quote) => (
      `<option value="${escapeHtml(quote.id)}" ${quote.id === selectedId ? 'selected' : ''}>`
      + `${escapeHtml(quote.name)}</option>`
    )),
  ].join('')
  document.querySelector('#delete-saved-quote').disabled = !selectedId
}

function renderQuoteSteps() {
  document.querySelector('#quote-step-rows').innerHTML = (
    state.modelQuoteDraft.steps.map((step) => `
      <div class="cost-row quote-step-grid" data-quote-step-id="${escapeHtml(step.id)}">
        <label class="cost-cell name-cell">
          <span class="sr-only">步骤名称</span>
          <input
            class="text-input"
            type="text"
            placeholder="步骤"
            ${quoteStepAttributes(step, 'name')}
            value="${escapeHtml(step.name)}"
          >
        </label>
        <label class="cost-cell">
          <span class="compact-money-input">
            <span aria-hidden="true">¥</span>
            <input
              type="number"
              min="0"
              step="10"
              inputmode="decimal"
              aria-label="画师计件报价"
              ${quoteStepAttributes(step, 'pieceworkCost')}
              value="${step.pieceworkCost}"
            >
          </span>
        </label>
        <label class="cost-cell">
          <span class="compact-hours-input">
            <input
              type="number"
              min="0"
              step="0.1"
              inputmode="decimal"
              aria-label="预估用时"
              ${quoteStepAttributes(step, 'estimatedHours')}
              value="${step.estimatedHours}"
            >
            <span aria-hidden="true">h</span>
          </span>
        </label>
        <button
          type="button"
          class="icon-button remove-button"
          data-remove-quote-step="${escapeHtml(step.id)}"
          aria-label="删除${escapeHtml(step.name || '制作步骤')}"
          title="删除"
        >${icons.trash}</button>
      </div>
    `).join('')
  )
}

function renderQuoteEditor() {
  renderQuoteToolbar()
  document.querySelector('[data-quote-field="name"]').value = (
    state.modelQuoteDraft.name
  )
  document.querySelector('[data-quote-field="externalPrice"]').value = (
    state.modelQuoteDraft.externalPrice
  )
  renderQuoteSteps()
}

function renderProfitResults() {
  const panel = document.querySelector('#profit-panel .result-panel')
  panel.classList.toggle('is-loss', profitResult.status === 'loss')
  panel.classList.toggle(
    'is-break-even',
    profitResult.status === 'break-even',
  )

  const labels = {
    profit: '预计月利润',
    loss: '预计月亏损',
    'break-even': '月度盈亏平衡',
  }
  document.querySelector('#profit-label').textContent = labels[profitResult.status]
  document.querySelector('#monthly-profit').textContent = formatProfit(
    profitResult.monthlyProfit,
  )
  document.querySelector('#monthly-revenue').textContent = formatMoney(
    profitResult.monthlyRevenue,
  )
  document.querySelector('#monthly-fixed-cost').textContent = formatMoney(
    profitResult.monthlyFixedCost,
  )
  document.querySelector('#monthly-depreciation').textContent = formatMoney(
    profitResult.monthlyDepreciation,
  )
  document.querySelector('#one-time-investment').textContent = formatMoney(
    profitResult.oneTimeInvestment,
  )
  document.querySelector('#payback-period').textContent = formatPaybackPeriod(
    profitResult.paybackMonths,
  )
}

function renderQuoteResults() {
  document.querySelector('#model-total-cost').textContent = formatMoney(
    quoteResult.totalCost,
  )
  document.querySelector('#model-total-hours').textContent = formatHours(
    quoteResult.totalHours,
  )
  document.querySelector('#model-external-price').textContent = formatMoney(
    quoteResult.externalPrice,
  )
  const difference = document.querySelector('#model-quote-difference')
  difference.textContent = formatSignedMoney(quoteResult.quoteDifference)
  difference.classList.toggle('negative-result', quoteResult.quoteDifference < 0)
}

function recalculate({ renderAll = false, persistState = true } = {}) {
  profitResult = calculateStudioProfit(state)
  quoteResult = calculateModelQuote(state.modelQuoteDraft)
  if (renderAll) {
    renderSettings()
    renderFixedCosts()
    renderOneTimeCosts()
    renderQuoteEditor()
  }
  renderProfitResults()
  renderQuoteResults()
  if (persistState) persist()
}

function setActiveTab(tabName) {
  activeTab = tabName === 'quote' ? 'quote' : 'profit'
  document.querySelectorAll('[data-tab]').forEach((button) => {
    const selected = button.dataset.tab === activeTab
    button.classList.toggle('active', selected)
    button.setAttribute('aria-selected', String(selected))
  })
  document.querySelectorAll('[data-tab-panel]').forEach((panel) => {
    panel.hidden = panel.dataset.tabPanel !== activeTab
  })
}

function addItem(collection) {
  const additions = {
    fixedCosts: {
      id: createId('fixed'),
      name: '',
      amount: 0,
    },
    oneTimeCosts: {
      id: createId('investment'),
      name: '',
      amount: 0,
      depreciates: false,
      depreciationMonths: 36,
    },
  }
  const item = additions[collection]
  if (!item) return

  state[collection].push(item)
  recalculate({ renderAll: true })
  document.querySelector(
    `[data-row-id="${CSS.escape(item.id)}"] .text-input`,
  )?.focus()
}

function removeItem(collection, id) {
  const index = state[collection]?.findIndex((item) => item.id === id) ?? -1
  if (index === -1) {
    globalThis.alert('未找到要删除的项目。')
    recalculate({ renderAll: true })
    return
  }
  state[collection].splice(index, 1)
  recalculate({ renderAll: true })
}

function addQuoteStep() {
  const step = {
    id: createId('quote-step'),
    name: `步骤 ${state.modelQuoteDraft.steps.length + 1}`,
    pieceworkCost: 0,
    estimatedHours: 0,
  }
  state.modelQuoteDraft.steps.push(step)
  recalculate({ renderAll: true })
  document.querySelector(
    `[data-quote-step-id="${CSS.escape(step.id)}"] .text-input`,
  )?.focus()
}

function removeQuoteStep(id) {
  const index = state.modelQuoteDraft.steps.findIndex((step) => step.id === id)
  if (index === -1) {
    globalThis.alert('未找到要删除的步骤。')
    recalculate({ renderAll: true })
    return
  }
  state.modelQuoteDraft.steps.splice(index, 1)
  recalculate({ renderAll: true })
}

function startNewQuote() {
  state.modelQuoteDraft = createQuoteDraft()
  recalculate({ renderAll: true })
  document.querySelector('[data-quote-field="name"]').focus()
}

function saveQuote() {
  const name = state.modelQuoteDraft.name.trim()
  if (!name) {
    globalThis.alert('请先填写模型名称。')
    document.querySelector('[data-quote-field="name"]').focus()
    return
  }

  const sourceId = state.modelQuoteDraft.sourceSavedQuoteId
  const existingIndex = state.savedModelQuotes.findIndex(
    (quote) => quote.id === sourceId,
  )
  const id = existingIndex >= 0 ? sourceId : createId('saved-model-quote')
  const savedQuote = {
    id,
    name,
    externalPrice: state.modelQuoteDraft.externalPrice,
    updatedAt: new Date().toISOString(),
    steps: cloneState(state.modelQuoteDraft.steps),
  }
  if (existingIndex >= 0) {
    state.savedModelQuotes[existingIndex] = savedQuote
  } else {
    state.savedModelQuotes.push(savedQuote)
  }
  state.modelQuoteDraft.name = name
  state.modelQuoteDraft.sourceSavedQuoteId = id
  recalculate({ renderAll: true })
  announce(`已保存${name}`)
}

function loadSavedQuote(id) {
  if (!id) {
    startNewQuote()
    return
  }
  const savedQuote = state.savedModelQuotes.find((quote) => quote.id === id)
  if (!savedQuote) {
    globalThis.alert('未找到已保存的报价方案。')
    recalculate({ renderAll: true })
    return
  }
  state.modelQuoteDraft = {
    sourceSavedQuoteId: savedQuote.id,
    name: savedQuote.name,
    externalPrice: savedQuote.externalPrice,
    steps: cloneState(savedQuote.steps),
  }
  recalculate({ renderAll: true })
}

function deleteSavedQuote() {
  const id = state.modelQuoteDraft.sourceSavedQuoteId
  const index = state.savedModelQuotes.findIndex((quote) => quote.id === id)
  if (index === -1) return
  const quote = state.savedModelQuotes[index]
  if (!globalThis.confirm(`删除“${quote.name}”？`)) return

  state.savedModelQuotes.splice(index, 1)
  state.modelQuoteDraft = createQuoteDraft()
  recalculate({ renderAll: true })
  announce(`已删除${quote.name}`)
}

function clearStoredData() {
  if (!globalThis.confirm('清空本地保存的所有数据？此操作无法撤销。')) return
  try {
    globalThis.localStorage?.removeItem(STORAGE_KEY)
  } catch (error) {
    globalThis.alert(`清空失败：${error.message}`)
    return
  }
  state = cloneState()
  saveFailureNotified = false
  recalculate({ renderAll: true, persistState: false })
  setActiveTab(activeTab)
  announce('本地数据已清空')
}

function updateInput(input) {
  if (input.dataset.setting) {
    state.settings[input.dataset.setting] = input.type === 'checkbox'
      ? input.checked
      : toNonNegativeNumber(input.value)
    recalculate()
    return
  }

  const { collection, id, field } = input.dataset
  if (!collection || !id || !field) return
  const item = state[collection]?.find((entry) => entry.id === id)
  if (!item) {
    globalThis.alert('输入项已不存在。')
    recalculate({ renderAll: true })
    return
  }

  if (input.type === 'checkbox') {
    item[field] = input.checked
    const monthsInput = input.closest('.cost-row')
      ?.querySelector('.depreciation-months')
    if (monthsInput) monthsInput.hidden = !input.checked
  } else if (input.type === 'number') {
    item[field] = field === 'depreciationMonths'
      ? Math.max(1, toNonNegativeNumber(input.value))
      : toNonNegativeNumber(input.value)
    if (field === 'depreciationMonths' && toNonNegativeNumber(input.value) < 1) {
      input.value = item[field]
    }
  } else {
    item[field] = input.value
  }
  recalculate()
}

function updateQuoteInput(input) {
  const field = input.dataset.quoteField
  state.modelQuoteDraft[field] = input.type === 'number'
    ? toNonNegativeNumber(input.value)
    : input.value
  recalculate()
}

function updateQuoteStepInput(input) {
  const step = state.modelQuoteDraft.steps.find(
    (item) => item.id === input.dataset.stepId,
  )
  if (!step) {
    globalThis.alert('输入步骤已不存在。')
    recalculate({ renderAll: true })
    return
  }
  const field = input.dataset.stepField
  step[field] = input.type === 'number'
    ? toNonNegativeNumber(input.value)
    : input.value
  recalculate()
}

app.addEventListener('input', (event) => {
  const input = event.target
  if (input.matches('input[data-quote-field]')) {
    updateQuoteInput(input)
  } else if (input.matches('input[data-step-field]')) {
    updateQuoteStepInput(input)
  } else if (input.matches('input[data-setting], input[data-collection]')) {
    updateInput(input)
  }
})

app.addEventListener('change', (event) => {
  if (event.target.matches('#saved-model-quotes')) {
    loadSavedQuote(event.target.value)
  }
})

app.addEventListener('click', (event) => {
  const tabButton = event.target.closest('[data-tab]')
  if (tabButton) {
    setActiveTab(tabButton.dataset.tab)
    return
  }
  if (event.target.closest('#clear-storage')) {
    clearStoredData()
    return
  }

  const quoteAction = event.target.closest('[data-quote-action]')
  if (quoteAction) {
    const actions = {
      new: startNewQuote,
      save: saveQuote,
      delete: deleteSavedQuote,
      'add-step': addQuoteStep,
    }
    actions[quoteAction.dataset.quoteAction]?.()
    return
  }

  const removeQuoteStepButton = event.target.closest('[data-remove-quote-step]')
  if (removeQuoteStepButton) {
    removeQuoteStep(removeQuoteStepButton.dataset.removeQuoteStep)
    return
  }

  const addButton = event.target.closest('[data-add]')
  if (addButton) {
    addItem(addButton.dataset.add)
    return
  }

  const removeButton = event.target.closest('[data-remove]')
  if (removeButton) {
    removeItem(removeButton.dataset.remove, removeButton.dataset.id)
  }
})

globalThis.addEventListener('storage', (event) => {
  if (event.key !== STORAGE_KEY) return
  if (event.newValue === null) {
    state = cloneState()
    recalculate({ renderAll: true, persistState: false })
    return
  }
  state = loadState()
  recalculate({ renderAll: true })
})

recalculate({ renderAll: true })
setActiveTab(activeTab)
