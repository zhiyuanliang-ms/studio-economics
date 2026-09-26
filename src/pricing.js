import './style.css'
import {
  calculateMargin,
  calculateOrderStructure,
  calculateQuoteSchemes,
} from './calculator.js'
import { createId, SKILL_LEVELS } from './state.js'
import {
  loadPersistedState,
  savePersistedState,
  STORAGE_KEY,
} from './persistence.js'

const app = document.querySelector('#app')
let state = loadState()
let quoteResult = calculateQuoteSchemes(state)
let orderResult = calculateOrderStructure(state)
let saveFailureNotified = false

app.innerHTML = `
  <header class="app-header">
    <div>
      <p class="eyebrow">Monthly production plan</p>
      <h1>月度生产与派单成本</h1>
      <p class="header-description">
        选择已经完成工序估价的模型，录入本月数量与成交价。计件工资由各工序的承接画师和标准工时自动带入。
      </p>
    </div>
    <div class="header-side">
      <nav class="page-nav" aria-label="计算器页面">
        <a href="./index.html">经营总览</a>
        <a class="active" href="./pricing.html">月度生产</a>
        <a href="./model-quote.html">计件报价</a>
      </nav>
    </div>
  </header>

  <main>
    <section class="summary-section">
      <div class="section-heading">
        <div>
          <p class="section-kicker">月度订单结果</p>
          <h2>排产收入、计件支出与目标差额</h2>
        </div>
      </div>
      <div id="model-status" class="model-status"></div>
      <div class="summary-grid" id="order-summary"></div>
    </section>

    <section class="input-section">
      <div class="section-heading">
        <div>
          <p class="section-kicker">报价策略</p>
          <h2>目标贡献毛利率</h2>
        </div>
      </div>
      <p class="section-description">
        推荐报价 = 单件计件工资 ÷（1 − 订单费率 − 目标贡献毛利率）。贡献毛利用于覆盖房租、折旧并形成利润。
      </p>
      <div class="field-grid single-field">
        <label class="field important-field">
          <span>目标贡献毛利率</span>
          <div class="input-with-suffix">
            <input type="number" min="0" max="99" step="1" data-setting="targetContributionMarginPct">
            <span>%</span>
          </div>
          <small>它与订单额外费用率之和必须低于 100%</small>
        </label>
      </div>
    </section>

    <section class="input-section">
      <div class="section-heading">
        <div>
          <p class="section-kicker">质量与派单门槛</p>
          <h2>涂装等级</h2>
        </div>
      </div>
      <p class="section-description">
        等级不再定义客户时薪，只定义工序质量标准与最低技能。真正的计件工资取决于所选画师的核定标准。
      </p>
      <div class="table-scroll">
        <table class="input-table level-pricing-table">
          <thead>
            <tr>
              <th>等级名称</th>
              <th>最低画师技能</th>
            </tr>
          </thead>
          <tbody id="level-rows"></tbody>
        </table>
      </div>
    </section>

    <section class="input-section">
      <div class="section-heading">
        <div>
          <p class="section-kicker">实际排产</p>
          <h2>本月模型生产计划</h2>
        </div>
        <div class="section-actions">
          <a class="button button-link" href="./model-quote.html">转到报价计算器</a>
          <button type="button" class="button button-primary" data-add="orders">添加订单</button>
        </div>
      </div>
      <div class="table-scroll">
        <table class="input-table">
          <thead>
            <tr>
              <th>已估价模型</th>
              <th>数量</th>
              <th>成交单价</th>
              <th>单件计件工资</th>
              <th>订单收入</th>
              <th>计件工资小计</th>
              <th></th>
            </tr>
          </thead>
          <tbody id="order-rows"></tbody>
        </table>
      </div>
    </section>
  </main>

  <footer>
    月度生产计划会自动保存。调整成交价不会改变已由标准工时核定的单件计件工资。
  </footer>
`

function loadState() {
  try {
    return loadPersistedState()
  } catch (error) {
    throw new Error(`无法读取自动保存数据：${error.message}`)
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

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, (character) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  })[character])
}

function toNumber(value) {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : 0
}

function formatMoney(value, maximumFractionDigits = 0) {
  if (!Number.isFinite(value)) return '无法计算'
  return `¥${value.toLocaleString('zh-CN', { maximumFractionDigits })}`
}

function signedMoney(value) {
  if (!Number.isFinite(value)) return '无法计算'
  return `${value >= 0 ? '+' : '−'}${formatMoney(Math.abs(value))}`
}

function formatHours(value) {
  if (!Number.isFinite(value)) return '无法计算'
  return `${value.toLocaleString('zh-CN', { maximumFractionDigits: 1 })}h`
}

function getItem(collectionName, id) {
  return state[collectionName].find((item) => item.id === id)
}

function inputAttributes(collection, item, field) {
  return `data-collection="${collection}" data-id="${escapeHtml(item.id)}" data-field="${field}"`
}

function getSkillOptions(selectedRank) {
  return SKILL_LEVELS.map((skill) => (
    `<option value="${skill.rank}" ${skill.rank === toNumber(selectedRank) ? 'selected' : ''}>`
    + `${escapeHtml(skill.name)}</option>`
  )).join('')
}

function getQuoteModels() {
  return state.quoteSchemes.flatMap((scheme) => scheme.models)
}

function getQuoteModelResult(modelId) {
  return quoteResult.schemeResults
    .flatMap((scheme) => scheme.modelResults)
    .find((model) => model.modelId === modelId)
}

function getModelOptions(selectedId) {
  const models = getQuoteModels()
  if (models.length === 0) {
    return '<option value="">请先创建模型报价</option>'
  }
  return models.map((model) => (
    `<option value="${escapeHtml(model.id)}" ${model.id === selectedId ? 'selected' : ''}>`
    + `${escapeHtml(model.name)}</option>`
  )).join('')
}

function renderLevels() {
  document.querySelector('#level-rows').innerHTML = [...state.paintingLevels]
    .sort((left, right) => toNumber(left.rank) - toNumber(right.rank))
    .map((level) => `
      <tr>
        <td><strong>${escapeHtml(level.name)}</strong></td>
        <td><select ${inputAttributes('paintingLevels', level, 'requiredSkillRank')}>${getSkillOptions(level.requiredSkillRank)}</select></td>
      </tr>
    `).join('')
}

function renderOrders() {
  const resultMap = new Map(
    orderResult.orderResults.map((order) => [order.orderId, order]),
  )
  document.querySelector('#order-rows').innerHTML = state.orders.map((order) => {
    const computed = resultMap.get(order.id)
    return `
    <tr>
      <td><select class="order-model-select" ${inputAttributes('orders', order, 'quoteModelId')}>${getModelOptions(order.quoteModelId)}</select></td>
      <td><input type="number" min="0" step="1" ${inputAttributes('orders', order, 'quantity')} value="${order.quantity}"></td>
      <td class="input-with-suffix"><input type="number" min="0" step="10" ${inputAttributes('orders', order, 'unitPrice')} value="${order.unitPrice}"><span>元</span></td>
      <td class="computed" id="order-unit-cost-${order.id}">${formatMoney(computed?.unitPieceworkCost ?? 0)}</td>
      <td class="computed" id="order-revenue-${order.id}">${formatMoney(computed?.revenue ?? 0)}</td>
      <td class="computed" id="order-piecework-${order.id}">${formatMoney(computed?.pieceworkCost ?? 0)}</td>
      <td><button type="button" class="icon-button" data-remove="orders" data-id="${order.id}" aria-label="删除订单">×</button></td>
    </tr>
  `
  }).join('')
}

function renderSettings() {
  document.querySelector('[data-setting="targetContributionMarginPct"]').value = (
    state.settings.targetContributionMarginPct
  )
}

function updateOrderDerivedCells() {
  const resultMap = new Map(
    orderResult.orderResults.map((order) => [order.orderId, order]),
  )
  state.orders.forEach((order) => {
    const computed = resultMap.get(order.id)
    replaceText(`#order-unit-cost-${CSS.escape(order.id)}`, formatMoney(computed?.unitPieceworkCost ?? 0))
    replaceText(`#order-revenue-${CSS.escape(order.id)}`, formatMoney(computed?.revenue ?? 0))
    replaceText(`#order-piecework-${CSS.escape(order.id)}`, formatMoney(computed?.pieceworkCost ?? 0))
  })
}

function replaceText(selector, value) {
  document.querySelector(selector)?.replaceChildren(document.createTextNode(value))
}

function summaryCard(label, value, detail, variant = '') {
  return `<article class="summary-card ${variant}"><span>${escapeHtml(label)}</span><strong>${escapeHtml(value)}</strong><small>${escapeHtml(detail)}</small></article>`
}

function renderResults() {
  const marginResult = calculateMargin(state)
  const status = document.querySelector('#model-status')

  if (marginResult.errors.length > 0) {
    status.className = 'model-status status-error'
    status.innerHTML = `<strong>生产计划存在问题</strong><ul>${marginResult.errors.map((message) => `<li>${escapeHtml(message)}</li>`).join('')}</ul>`
  } else if (marginResult.targetProfitGap >= 0) {
    status.className = 'model-status status-positive'
    status.innerHTML = `<strong>本月生产计划达到利润目标</strong><span>预计高出目标 ${formatMoney(marginResult.targetProfitGap)}。</span>`
  } else {
    status.className = 'model-status status-warning'
    status.innerHTML = `<strong>本月生产计划尚未达到利润目标</strong><span>预计还差 ${formatMoney(Math.abs(marginResult.targetProfitGap))}。</span>`
  }

  const contribution = orderResult.monthlyRevenue
    - marginResult.variableCost
    - orderResult.totalPieceworkCost
  document.querySelector('#order-summary').innerHTML = [
    summaryCard('月度订单营收', formatMoney(orderResult.monthlyRevenue), `${orderResult.totalQuantity} 个模型`, 'primary-card'),
    summaryCard('应付计件工资', formatMoney(orderResult.totalPieceworkCost), `${formatHours(orderResult.totalHours)} 标准工时`),
    summaryCard('订单贡献毛利', formatMoney(contribution), '扣除订单费用与计件工资'),
    summaryCard('预计月利润', signedMoney(marginResult.netProfit), `目标 ${formatMoney(marginResult.targetMonthlyProfit)}`, marginResult.targetProfitGap >= 0 ? 'positive-card' : 'negative-card'),
  ].join('')
}

function recalculate({ renderAll = false } = {}) {
  quoteResult = calculateQuoteSchemes(state)
  orderResult = calculateOrderStructure(state)
  if (renderAll) {
    renderSettings()
    renderLevels()
    renderOrders()
  } else updateOrderDerivedCells()
  renderResults()
  persist()
}

function addItem(collection) {
  if (collection === 'orders') {
    const firstModel = getQuoteModels()[0]
    if (!firstModel) {
      globalThis.alert('请先在“计件报价”页面创建至少一个模型。')
      return
    }
    const computed = getQuoteModelResult(firstModel.id)
    state.orders.push({
      id: createId('order'),
      name: firstModel.name,
      quantity: 1,
      quoteModelId: firstModel.id,
      paintingLevelId: firstModel.targetLevelId,
      unitPrice: Math.ceil(computed?.unitPrice ?? 0),
    })
  }
  recalculate({ renderAll: true })
}

function removeItem(collection, id) {
  const index = state[collection].findIndex((item) => item.id === id)
  if (index === -1) {
    globalThis.alert('未找到要删除的项目。')
    return
  }
  state[collection].splice(index, 1)
  recalculate({ renderAll: true })
}

function updateInput(input) {
  if (input.dataset.setting) {
    state.settings[input.dataset.setting] = toNumber(input.value)
    recalculate()
    return
  }

  const { collection, id, field } = input.dataset
  if (!collection || !id || !field) return
  const item = getItem(collection, id)
  if (!item) {
    globalThis.alert('输入项已经不存在。')
    recalculate({ renderAll: true })
    return
  }

  if (input.type === 'number') {
    item[field] = toNumber(input.value)
  } else {
    item[field] = input.value
  }
  if (field === 'quoteModelId') {
    const model = getQuoteModels().find((candidate) => candidate.id === input.value)
    const computed = getQuoteModelResult(input.value)
    item.name = model?.name ?? item.name
    item.paintingLevelId = model?.targetLevelId ?? item.paintingLevelId
    item.unitPrice = Math.ceil(computed?.unitPrice ?? 0)
    recalculate({ renderAll: true })
    return
  }
  recalculate()
}

app.addEventListener('input', (event) => updateInput(event.target))
app.addEventListener('change', (event) => {
  if (event.target.tagName === 'SELECT') updateInput(event.target)
})
app.addEventListener('click', (event) => {
  const addButton = event.target.closest('[data-add]')
  if (addButton) {
    addItem(addButton.dataset.add)
    return
  }
  const removeButton = event.target.closest('[data-remove]')
  if (removeButton) removeItem(removeButton.dataset.remove, removeButton.dataset.id)
})

globalThis.addEventListener('storage', (event) => {
  if (event.key !== STORAGE_KEY) return
  state = loadState()
  recalculate({ renderAll: true })
})

recalculate({ renderAll: true })
