import './style.css'
import {
  calculateMargin,
  calculateOrderStructure,
} from './calculator.js'
import { createId, SKILL_LEVELS } from './state.js'
import {
  loadPersistedState,
  savePersistedState,
  STORAGE_KEY,
} from './persistence.js'

const app = document.querySelector('#app')
let state = loadState()
let orderResult = calculateOrderStructure(state)
let saveFailureNotified = false

app.innerHTML = `
  <header class="app-header">
    <div>
      <h1>涂装等级定价与月度订单</h1>
      <p class="header-description">
        为每个涂装等级设置明确时薪和最低画师技能，再录入月度订单的数量与报价。
      </p>
    </div>
    <div class="header-side">
      <nav class="page-nav" aria-label="计算器页面">
        <a href="./index.html">毛利计算器</a>
        <a class="active" href="./pricing.html">等级定价与订单</a>
        <a href="./model-quote.html">模型报价</a>
      </nav>
    </div>
  </header>

  <main>
    <section class="summary-section">
      <div class="section-heading">
        <div>
          <p class="section-kicker">月度订单结果</p>
          <h2>订单结构与目标差额</h2>
        </div>
      </div>
      <div id="model-status" class="model-status"></div>
      <div class="summary-grid" id="order-summary"></div>
    </section>

    <section class="input-section">
      <div class="section-heading">
        <div>
          <p class="section-kicker">涂装等级定价</p>
          <h2>涂装等级定价</h2>
        </div>
      </div>
      <p class="section-description">
        每小时报价会直接用于具体模型的工序报价。
      </p>
      <div class="table-scroll">
        <table class="input-table level-pricing-table">
          <thead>
            <tr>
              <th>等级名称</th>
              <th>每小时报价</th>
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
          <p class="section-kicker">月度订单</p>
          <h2>每月订单结构</h2>
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
              <th>订单 / 模型名称</th>
              <th>数量</th>
              <th>涂装等级</th>
              <th>报价</th>
              <th></th>
            </tr>
          </thead>
          <tbody id="order-rows"></tbody>
        </table>
      </div>
    </section>
  </main>

  <footer>
    等级定价和月度订单会自动保存。具体模型需要多少工时，请在“模型报价”页面单独测算。
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

function getLevelOptions(selectedId) {
  return [...state.paintingLevels]
    .sort((left, right) => toNumber(left.rank) - toNumber(right.rank))
    .map((level) => (
      `<option value="${escapeHtml(level.id)}" ${level.id === selectedId ? 'selected' : ''}>`
      + `${escapeHtml(level.rank)} · ${escapeHtml(level.name)}</option>`
    ))
    .join('')
}

function renderLevels() {
  document.querySelector('#level-rows').innerHTML = [...state.paintingLevels]
    .sort((left, right) => toNumber(left.rank) - toNumber(right.rank))
    .map((level) => `
      <tr>
        <td><strong>${escapeHtml(level.name)}</strong></td>
        <td class="input-with-suffix"><input type="number" min="0" step="10" ${inputAttributes('paintingLevels', level, 'hourlyRate')} value="${level.hourlyRate}"><span>元/h</span></td>
        <td><select ${inputAttributes('paintingLevels', level, 'requiredSkillRank')}>${getSkillOptions(level.requiredSkillRank)}</select></td>
      </tr>
    `).join('')
}

function renderOrders() {
  document.querySelector('#order-rows').innerHTML = state.orders.map((order) => `
    <tr>
      <td><input class="text-input order-name" ${inputAttributes('orders', order, 'name')} value="${escapeHtml(order.name)}"></td>
      <td><input type="number" min="0" step="1" ${inputAttributes('orders', order, 'quantity')} value="${order.quantity}"></td>
      <td><select ${inputAttributes('orders', order, 'paintingLevelId')}>${getLevelOptions(order.paintingLevelId)}</select></td>
      <td class="input-with-suffix"><input type="number" min="0" step="10" ${inputAttributes('orders', order, 'unitPrice')} value="${order.unitPrice}"><span>元</span></td>
      <td><button type="button" class="icon-button" data-remove="orders" data-id="${order.id}" aria-label="删除订单">×</button></td>
    </tr>
  `).join('')
}

function summaryCard(label, value, detail, variant = '') {
  return `<article class="summary-card ${variant}"><span>${escapeHtml(label)}</span><strong>${escapeHtml(value)}</strong><small>${escapeHtml(detail)}</small></article>`
}

function renderResults() {
  const marginResult = calculateMargin(state)
  const revenueGap = orderResult.monthlyRevenue - marginResult.expectedMonthlyRevenue
  const status = document.querySelector('#model-status')

  if (orderResult.errors.length > 0) {
    status.className = 'model-status status-error'
    status.innerHTML = `<strong>订单结构存在问题</strong><ul>${orderResult.errors.map((message) => `<li>${escapeHtml(message)}</li>`).join('')}</ul>`
  } else if (revenueGap >= 0) {
    status.className = 'model-status status-positive'
    status.innerHTML = `<strong>订单结构达到目标</strong><span>当前月度订单营收比目标所需营收高 ${formatMoney(revenueGap)}。</span>`
  } else {
    status.className = 'model-status status-warning'
    status.innerHTML = `<strong>订单结构尚未达到目标</strong><span>距离目标所需月营收还差 ${formatMoney(Math.abs(revenueGap))}。</span>`
  }

  document.querySelector('#order-summary').innerHTML = [
    summaryCard('月度订单营收', formatMoney(orderResult.monthlyRevenue), `${orderResult.totalQuantity} 个模型`, 'primary-card'),
    summaryCard('目标所需月营收', formatMoney(marginResult.expectedMonthlyRevenue), `目标月利润 ${formatMoney(marginResult.targetMonthlyProfit)}`),
    summaryCard('营收差额', `${revenueGap >= 0 ? '+' : '−'}${formatMoney(Math.abs(revenueGap))}`, revenueGap >= 0 ? '高于目标' : '低于目标', revenueGap >= 0 ? 'positive-card' : 'negative-card'),
    summaryCard('平均报价', formatMoney(orderResult.averageUnitPrice, 1), `${state.paintingLevels.length} 个涂装等级`),
  ].join('')
}

function recalculate({ renderAll = false } = {}) {
  orderResult = calculateOrderStructure(state)
  if (renderAll) {
    renderLevels()
    renderOrders()
  }
  renderResults()
  persist()
}

function addItem(collection) {
  if (collection === 'orders') {
    state.orders.push({
      id: createId('order'),
      name: '新订单',
      quantity: 1,
      paintingLevelId: [...state.paintingLevels]
        .sort((left, right) => toNumber(left.rank) - toNumber(right.rank))[0]?.id ?? '',
      unitPrice: 0,
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
  const { collection, id, field } = input.dataset
  if (!collection || !id || !field) return
  const item = getItem(collection, id)
  if (!item) {
    globalThis.alert('输入项已经不存在。')
    recalculate({ renderAll: true })
    return
  }

  if (input.type === 'number' || input.tagName === 'SELECT') {
    item[field] = toNumber(input.value)
  } else {
    item[field] = input.value
  }
  if (field.endsWith('Id')) item[field] = input.value
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
