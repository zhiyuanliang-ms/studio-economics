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
let quotePickerTrigger = null
let quotePickerOptions = []
let activeQuoteOption = -1

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
  chevron: `
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="m7 10 5 5 5-5"></path>
    </svg>
  `,
  search: `
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="10.5" cy="10.5" r="6.5"></circle>
      <path d="m16 16 4 4"></path>
    </svg>
  `,
  check: `
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="m5 12 4 4L19 6"></path>
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
      <div class="price-fields revenue-fields">
        <div class="revenue-heading">
          <h2 id="revenue-heading">月营收</h2>
          <label class="revenue-mode-toggle">
            <input type="checkbox" role="switch" data-setting="useModelRevenue">
            <span class="mini-toggle" aria-hidden="true"></span>
            <span>订单</span>
          </label>
        </div>
        <label class="field" id="manual-revenue-input">
          <span class="sr-only">月营收</span>
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
        <div id="model-revenue-inputs" hidden>
          <div class="revenue-input-summary">
            <output id="calculated-revenue" aria-labelledby="revenue-heading">—</output>
            <button
              type="button"
              class="icon-button add-button"
              id="add-revenue-item"
              aria-label="添加代工模型"
              title="添加代工模型"
            >${icons.plus}</button>
          </div>
          <div id="revenue-item-rows"></div>
          <p class="revenue-error" id="revenue-error" role="status" hidden></p>
        </div>
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
        <div id="monthly-piecework-row" hidden>
          <dt>画师计件成本</dt>
          <dd id="monthly-piecework-cost">—</dd>
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
        <button
          type="button"
          class="quote-trigger"
          id="saved-model-quotes"
          data-quote-picker
          aria-label="已保存报价方案"
          aria-haspopup="listbox"
          aria-expanded="false"
          aria-controls="quote-picker-options"
        ></button>
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

  <div class="quote-picker" id="quote-picker" popover="auto">
    <div class="quote-picker-search">
      ${icons.search}
      <input
        type="search"
        id="quote-picker-search"
        role="combobox"
        aria-label="搜索报价方案"
        aria-autocomplete="list"
        aria-controls="quote-picker-options"
        aria-expanded="false"
        autocomplete="off"
        placeholder="搜索方案"
      >
    </div>
    <div
      class="quote-picker-options"
      id="quote-picker-options"
      role="listbox"
      aria-label="已保存的报价方案"
    ></div>
    <p class="quote-picker-empty" id="quote-picker-empty" role="status" hidden></p>
  </div>
  <div class="sr-only" id="live-status" aria-live="polite"></div>
`

const quotePicker = document.querySelector('#quote-picker')
const quoteSearch = document.querySelector('#quote-picker-search')

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

function formatSignedMoney(value, maximumFractionDigits = 0) {
  const prefix = value > 0 ? '+' : value < 0 ? '−' : ''
  return `${prefix}${formatMoney(Math.abs(value), maximumFractionDigits)}`
}

function formatProfit(value, maximumFractionDigits = 0) {
  return `${formatSignedMoney(value, maximumFractionDigits)} / 月`
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

function createRevenueItem() {
  return { id: createId('revenue'), savedQuoteId: null, quantity: 1 }
}

function renderRevenueItems() {
  closeQuotePicker()
  const quoteMap = new Map(state.savedModelQuotes.map((quote) => [quote.id, quote]))
  document.querySelector('#revenue-item-rows').innerHTML = state.revenueItems
    .map((item) => {
      const quote = quoteMap.get(item.savedQuoteId)
      const label = quote?.name || (item.savedQuoteId ? '方案已删除' : '选择报价方案')
      return `
        <div class="revenue-row" data-revenue-row="${escapeHtml(item.id)}">
          <button
            type="button"
            class="quote-trigger"
            data-quote-picker
            data-revenue-quote="${escapeHtml(item.id)}"
            aria-label="报价方案：${escapeHtml(label)}"
            aria-haspopup="listbox"
            aria-expanded="false"
            aria-controls="quote-picker-options"
            aria-describedby="revenue-error"
            title="${escapeHtml(label)}"
          ><span>${escapeHtml(label)}</span>${icons.chevron}</button>
          <label class="revenue-quantity">
            <span aria-hidden="true">×</span>
            <input
              type="number"
              min="1"
              step="1"
              inputmode="numeric"
              aria-label="模型数量"
              aria-describedby="revenue-error"
              data-revenue-quantity="${escapeHtml(item.id)}"
              value="${escapeHtml(item.quantity ?? '')}"
            >
          </label>
          <output class="revenue-subtotal" aria-label="营收小计">—</output>
          <button
            type="button"
            class="icon-button remove-button"
            data-remove-revenue="${escapeHtml(item.id)}"
            aria-label="删除代工模型：${escapeHtml(label)}"
            title="删除代工模型"
          >${icons.trash}</button>
        </div>
      `
    }).join('')
}

function closeQuotePicker({ restoreFocus = false } = {}) {
  const trigger = quotePickerTrigger
  if (quotePicker.matches(':popover-open')) quotePicker.hidePopover()
  trigger?.setAttribute('aria-expanded', 'false')
  quoteSearch.setAttribute('aria-expanded', 'false')
  quoteSearch.removeAttribute('aria-activedescendant')
  quotePickerTrigger = null
  if (restoreFocus) trigger?.focus({ preventScroll: true })
}

function positionQuotePicker() {
  if (!quotePicker.matches(':popover-open') || !quotePickerTrigger) return
  const rect = quotePickerTrigger.getBoundingClientRect()
  const viewport = globalThis.visualViewport
  const left = viewport?.offsetLeft ?? 0
  const top = viewport?.offsetTop ?? 0
  const width = viewport?.width ?? document.documentElement.clientWidth
  const height = viewport?.height ?? document.documentElement.clientHeight
  if (rect.bottom <= top || rect.top >= top + height) {
    closeQuotePicker()
    return
  }
  const belowSpace = Math.max(0, top + height - rect.bottom - 18)
  const aboveSpace = Math.max(0, rect.top - top - 18)
  const below = belowSpace >= 294 || belowSpace >= aboveSpace
  const menuWidth = Math.min(Math.max(rect.width, 320), width - 24)
  quotePicker.style.width = `${menuWidth}px`
  quotePicker.style.maxHeight = `${Math.min(294, below ? belowSpace : aboveSpace)}px`
  quotePicker.style.left = `${Math.max(left + 12, Math.min(rect.left, left + width - menuWidth - 12))}px`
  quotePicker.style.top = below
    ? `${rect.bottom + 6}px`
    : `${rect.top - quotePicker.getBoundingClientRect().height - 6}px`
}

function setActiveQuoteOption(index, scroll = false) {
  activeQuoteOption = index
  const options = quotePicker.querySelectorAll('[role="option"]')
  options.forEach((option, optionIndex) => {
    option.classList.toggle('is-active', optionIndex === index)
  })
  const activeOption = options[index]
  if (activeOption) {
    quoteSearch.setAttribute('aria-activedescendant', activeOption.id)
    if (scroll) activeOption.scrollIntoView({ block: 'nearest' })
  } else {
    quoteSearch.removeAttribute('aria-activedescendant')
  }
}

function renderQuotePickerOptions() {
  const search = quoteSearch.value.trim().toLocaleLowerCase()
  const revenueItemId = quotePickerTrigger?.dataset.revenueQuote
  const quotes = revenueItemId ? state.savedModelQuotes : [
    { id: '', name: '新方案' },
    ...state.savedModelQuotes,
  ]
  quotePickerOptions = quotes.filter((quote) => (
    quote.name.toLocaleLowerCase().includes(search)
  ))
  const selectedId = revenueItemId
    ? state.revenueItems.find((item) => item.id === revenueItemId)?.savedQuoteId
    : state.modelQuoteDraft.sourceSavedQuoteId ?? ''
  document.querySelector('#quote-picker-options').innerHTML = quotePickerOptions
    .map((quote, index) => `
      <button
        type="button"
        class="quote-picker-option"
        id="quote-option-${index}"
        role="option"
        tabindex="-1"
        aria-selected="${quote.id === selectedId}"
        data-select-quote="${escapeHtml(quote.id)}"
        title="${escapeHtml(quote.name)}"
      >
        <span class="quote-option-check" aria-hidden="true">${icons.check}</span>
        <span class="quote-option-name">${escapeHtml(quote.name)}</span>
        <span class="quote-option-price">${quote.id ? formatMoney(quote.externalPrice, 2) : ''}</span>
      </button>
    `).join('')
  const empty = document.querySelector('#quote-picker-empty')
  empty.hidden = quotePickerOptions.length > 0
  empty.textContent = revenueItemId && state.savedModelQuotes.length === 0
    ? '请先在模型报价中保存方案'
    : '无匹配方案'
  const selectedIndex = quotePickerOptions.findIndex((quote) => quote.id === selectedId)
  positionQuotePicker()
  setActiveQuoteOption(
    quotePickerOptions.length ? Math.max(0, selectedIndex) : -1,
    true,
  )
}

function openQuotePicker(trigger) {
  if (
    quotePickerTrigger === trigger
    && quotePicker.matches(':popover-open')
  ) {
    closeQuotePicker({ restoreFocus: true })
    return
  }
  closeQuotePicker()
  quotePickerTrigger = trigger
  quoteSearch.value = ''
  renderQuotePickerOptions()
  quotePicker.showPopover()
  trigger.setAttribute('aria-expanded', 'true')
  quoteSearch.setAttribute('aria-expanded', 'true')
  positionQuotePicker()
  quoteSearch.focus({ preventScroll: true })
  setActiveQuoteOption(activeQuoteOption, true)
}

function selectQuoteOption(quoteId) {
  const trigger = quotePickerTrigger
  if (!trigger) return
  const revenueItemId = trigger.dataset.revenueQuote
  if (!revenueItemId) {
    closeQuotePicker()
    loadSavedQuote(quoteId)
    if (quoteId) trigger.focus({ preventScroll: true })
    return
  }
  const item = state.revenueItems.find((entry) => entry.id === revenueItemId)
  const quote = state.savedModelQuotes.find((entry) => entry.id === quoteId)
  if (!item || !quote) {
    globalThis.alert('该明细或报价方案已不存在，请重新选择。')
    closeQuotePicker()
    recalculate({ renderAll: true })
    return
  }
  item.savedQuoteId = quote.id
  recalculate({ renderAll: true })
  document.querySelector(
    `[data-revenue-quote="${CSS.escape(item.id)}"]`,
  )?.focus({ preventScroll: true })
}

function addRevenueItem() {
  const item = createRevenueItem()
  state.revenueItems.push(item)
  recalculate({ renderAll: true })
  openQuotePicker(document.querySelector(
    `[data-revenue-quote="${CSS.escape(item.id)}"]`,
  ))
}

function removeRevenueItem(id) {
  const index = state.revenueItems.findIndex((item) => item.id === id)
  if (index === -1) {
    globalThis.alert('未找到要删除的营收明细。')
    return
  }
  state.revenueItems.splice(index, 1)
  recalculate({ renderAll: true })
  document.querySelector('#add-revenue-item').focus()
}

function updateRevenueQuantity(input) {
  const item = state.revenueItems.find(
    (entry) => entry.id === input.dataset.revenueQuantity,
  )
  if (!item) {
    globalThis.alert('营收明细已不存在。')
    recalculate({ renderAll: true })
    return
  }
  item.quantity = Number.isFinite(input.valueAsNumber) ? input.valueAsNumber : null
  recalculate()
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
  const quote = state.savedModelQuotes.find((item) => item.id === selectedId)
  const label = quote?.name ?? '新方案'
  const trigger = document.querySelector('#saved-model-quotes')
  trigger.innerHTML = `<span>${escapeHtml(label)}</span>${icons.chevron}`
  trigger.title = label
  trigger.setAttribute('aria-label', `已保存报价方案：${label}`)
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
  const hasErrors = profitResult.errors.length > 0
  const precision = profitResult.usesModelRevenue ? 2 : 0
  document.querySelector('#manual-revenue-input').hidden = profitResult.usesModelRevenue
  document.querySelector('#model-revenue-inputs').hidden = !profitResult.usesModelRevenue
  document.querySelector('#calculated-revenue').textContent = formatMoney(
    profitResult.monthlyRevenue,
    2,
  )
  const revenueError = document.querySelector('#revenue-error')
  revenueError.hidden = !hasErrors
  revenueError.textContent = profitResult.errors[0] ?? ''
  profitResult.revenueItemResults.forEach((item) => {
    const row = document.querySelector(`[data-revenue-row="${CSS.escape(item.id)}"]`)
    row.querySelector('.revenue-subtotal').textContent = formatMoney(item.revenue, 2)
    row.querySelector('[data-revenue-quote]').setAttribute(
      'aria-invalid', String(Boolean(item.quoteError)),
    )
    row.querySelector('[data-revenue-quantity]').setAttribute(
      'aria-invalid', String(Boolean(item.quantityError)),
    )
  })

  const panel = document.querySelector('#profit-panel .result-panel')
  panel.classList.toggle('is-loss', profitResult.status === 'loss')
  panel.classList.toggle('has-error', hasErrors)
  panel.classList.toggle(
    'is-break-even',
    profitResult.status === 'break-even',
  )

  const labels = {
    profit: '预计月利润',
    loss: '预计月亏损',
    'break-even': '月度盈亏平衡',
    invalid: '待完善营收明细',
  }
  document.querySelector('#profit-label').textContent = labels[profitResult.status]
  document.querySelector('#monthly-profit').textContent = hasErrors ? '—' : formatProfit(
    profitResult.monthlyProfit,
    precision,
  )
  document.querySelector('#monthly-revenue').textContent = formatMoney(
    profitResult.monthlyRevenue,
    precision,
  )
  document.querySelector('#monthly-piecework-row').hidden = !profitResult.usesModelRevenue
  document.querySelector('#monthly-piecework-cost').textContent = formatMoney(
    profitResult.monthlyPieceworkCost,
    2,
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
  document.querySelector('#payback-period').textContent = hasErrors ? '—' : formatPaybackPeriod(
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
    renderRevenueItems()
    renderFixedCosts()
    renderOneTimeCosts()
    renderQuoteEditor()
  }
  renderProfitResults()
  renderQuoteResults()
  if (persistState) persist()
}

function setActiveTab(tabName) {
  closeQuotePicker()
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
  const references = state.revenueItems.filter((item) => item.savedQuoteId === id).length
  const warning = references > 0
    ? `有 ${references} 条营收明细引用此方案，删除后需要重新选择。`
    : ''
  if (!globalThis.confirm(`删除“${quote.name}”？${warning}`)) return

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
    const changedRevenueMode = input.dataset.setting === 'useModelRevenue'
    if (changedRevenueMode && input.checked && state.revenueItems.length === 0) {
      state.revenueItems.push(createRevenueItem())
    }
    recalculate({ renderAll: changedRevenueMode })
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
  if (input.matches('input[data-revenue-quantity]')) {
    updateRevenueQuantity(input)
  } else if (input.matches('input[data-quote-field]')) {
    updateQuoteInput(input)
  } else if (input.matches('input[data-step-field]')) {
    updateQuoteStepInput(input)
  } else if (input.matches('input[data-setting], input[data-collection]')) {
    updateInput(input)
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
  if (event.target.closest('#add-revenue-item')) {
    addRevenueItem()
    return
  }
  const pickerTrigger = event.target.closest('[data-quote-picker]')
  if (pickerTrigger) {
    openQuotePicker(pickerTrigger)
    return
  }
  const quoteOption = event.target.closest('[data-select-quote]')
  if (quoteOption) {
    selectQuoteOption(quoteOption.dataset.selectQuote)
    return
  }
  const removeRevenueButton = event.target.closest('[data-remove-revenue]')
  if (removeRevenueButton) {
    removeRevenueItem(removeRevenueButton.dataset.removeRevenue)
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

quoteSearch.addEventListener('input', renderQuotePickerOptions)
quoteSearch.addEventListener('keydown', (event) => {
  if (event.isComposing) return
  if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
    event.preventDefault()
    const count = quotePickerOptions.length
    if (count > 0) {
      const delta = event.key === 'ArrowDown' ? 1 : -1
      setActiveQuoteOption((activeQuoteOption + delta + count) % count, true)
    }
  } else if (event.key === 'Enter') {
    event.preventDefault()
    const quote = quotePickerOptions[activeQuoteOption]
    if (quote) selectQuoteOption(quote.id)
  } else if (event.key === 'Escape') {
    event.preventDefault()
    closeQuotePicker({ restoreFocus: true })
  } else if (event.key === 'Tab') {
    closeQuotePicker({ restoreFocus: true })
  }
})

app.addEventListener('keydown', (event) => {
  const trigger = event.target.closest('[data-quote-picker]')
  if (trigger && (event.key === 'ArrowDown' || event.key === 'ArrowUp')) {
    event.preventDefault()
    openQuotePicker(trigger)
  }
})

quotePicker.addEventListener('toggle', (event) => {
  if (event.newState === 'closed' && !quotePicker.matches(':popover-open')) {
    closeQuotePicker()
  }
})

globalThis.addEventListener('resize', positionQuotePicker)
globalThis.visualViewport?.addEventListener('resize', positionQuotePicker)
globalThis.addEventListener('scroll', (event) => {
  if (!(event.target instanceof Node) || !quotePicker.contains(event.target)) {
    positionQuotePicker()
  }
}, true)

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
