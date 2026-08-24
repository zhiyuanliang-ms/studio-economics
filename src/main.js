import './style.css'
import { calculateMargin } from './calculator.js'
import {
  cloneState,
  createId,
  SKILL_LEVELS,
} from './state.js'
import {
  loadPersistedState,
  parseImportedState,
  savePersistedState,
  STORAGE_KEY,
} from './persistence.js'

const app = document.querySelector('#app')
let state = loadState()
let result = calculateMargin(state)
let saveFailureNotified = false

app.innerHTML = `
  <header class="app-header">
    <div>
      <h1>模型涂装工作室毛利计算器</h1>
      <p class="header-description">
        主页面只计算预期月营收、人员、固定成本、订单费用和月折旧之间的关系。
      </p>
    </div>
    <div class="header-side">
      <nav class="page-nav" aria-label="计算器页面">
        <a class="active" href="./index.html">毛利计算器</a>
        <a href="./pricing.html">等级定价与订单</a>
        <a href="./model-quote.html">模型报价</a>
      </nav>
      <div class="header-actions">
        <button type="button" class="button" id="export-data">导出参数</button>
        <button type="button" class="button" id="import-data">导入参数</button>
        <input type="file" id="import-file" accept="application/json" hidden>
      </div>
    </div>
  </header>

  <main>
    <section class="summary-section" aria-labelledby="summary-title">
      <div class="section-heading">
        <h2 id="summary-title">盈亏表</h2>
        <div class="summary-controls">
          <label class="toggle-control">
            <input type="checkbox" data-setting="excludeDepreciation">
            <span class="toggle-track" aria-hidden="true"></span>
            <span>剔除月折旧</span>
          </label>
        </div>
      </div>
      <div class="calculation-table-wrap">
        <table class="result-table calculation-table">
          <tbody id="profit-statement"></tbody>
        </table>
      </div>
    </section>

    <section class="input-section" id="revenue-section">
      <div class="section-heading">
        <div>
          <p class="section-kicker">营收假设</p>
          <h2>1. 预期月营收</h2>
        </div>
        <a class="button button-primary button-link" href="./pricing.html">精细测算订单结构</a>
      </div>
      <p class="section-description">
        输入希望达到的目标月利润，系统会结合全部成本自动反推所需月营收。
      </p>
      <div class="field-grid two-fields">
        <label class="field important-field">
          <span>目标月利润（元）</span>
          <input type="number" step="100" data-setting="targetMonthlyProfit">
          <small>毛利计算器中唯一可编辑的收入目标</small>
        </label>
        <div class="field readonly-field">
          <span>所需预期月营收</span>
          <output id="required-monthly-revenue">—</output>
          <small>根据目标利润和当前成本自动计算</small>
        </div>
      </div>
    </section>

    <section class="input-section" id="employees-section">
      <div class="section-heading">
        <div>
          <p class="section-kicker">人员开支</p>
          <h2>2. 员工、工资与有效工时</h2>
        </div>
        <button type="button" class="button button-primary" data-add="employees">添加员工</button>
      </div>
      <p class="section-description">
        月工资 = 有效工作天数 × 每日有效模型制作工时 × 工资系数。技能字段同时提供给模型定价页面使用。
      </p>
      <div class="table-scroll">
        <table class="input-table">
          <thead>
            <tr>
              <th>员工名称</th>
              <th>全职</th>
              <th>技能</th>
              <th>有效天数</th>
              <th>小时/天</th>
              <th>工资系数<br>元/有效小时</th>
              <th>月有效工时</th>
              <th>月工资</th>
              <th></th>
            </tr>
          </thead>
          <tbody id="employee-rows"></tbody>
        </table>
      </div>
    </section>

    <section class="input-section" id="one-time-section">
      <div class="section-heading">
        <div>
          <p class="section-kicker">一次性投入</p>
          <h2>3. 一次性投入与月折旧</h2>
        </div>
        <button type="button" class="button button-primary" data-add="oneTimeCosts">添加投入</button>
      </div>
      <div class="table-scroll">
        <table class="input-table">
          <thead><tr><th>项目</th><th>投入金额</th><th>折旧月数</th><th>月折旧</th><th></th></tr></thead>
          <tbody id="one-time-rows"></tbody>
        </table>
      </div>
    </section>

    <section class="input-section" id="fixed-section">
      <div class="section-heading">
        <div>
          <p class="section-kicker">每月固定开支</p>
          <h2>4. 房租及其他固定成本</h2>
        </div>
        <button type="button" class="button button-primary" data-add="fixedCosts">添加开支</button>
      </div>
      <div class="table-scroll compact-table">
        <table class="input-table">
          <thead><tr><th>项目</th><th>每月金额</th><th></th></tr></thead>
          <tbody id="fixed-cost-rows"></tbody>
        </table>
      </div>
    </section>

    <section class="input-section" id="fees-section">
      <div class="section-heading">
        <div>
          <p class="section-kicker">每笔订单额外费用率</p>
          <h2>5. 耗材、运费、退货与平台费</h2>
        </div>
        <button type="button" class="button button-primary" data-add="orderFeeRates">添加费用率</button>
      </div>
      <div class="table-scroll compact-table">
        <table class="input-table">
          <thead><tr><th>费用项目</th><th>占订单收入</th><th>按当前营收折算</th><th></th></tr></thead>
          <tbody id="fee-rate-rows"></tbody>
        </table>
      </div>
    </section>
  </main>

  <footer>
    所有参数会在修改时自动保存，下次用同一浏览器打开会继续显示上次的数据。本工具不含税费和融资成本。
  </footer>
`

function loadState() {
  try {
    return loadPersistedState()
  } catch (error) {
    globalThis.localStorage?.removeItem(STORAGE_KEY)
    globalThis.setTimeout(() => {
      globalThis.alert(`本地自动保存数据已损坏，已创建空白示例副本：${error.message}`)
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

function formatHours(value) {
  if (!Number.isFinite(value)) return '无法计算'
  return `${value.toLocaleString('zh-CN', { maximumFractionDigits: 1 })}h`
}

function signedMoney(value) {
  if (!Number.isFinite(value)) return '无法计算'
  return `${value >= 0 ? '+' : '−'}${formatMoney(Math.abs(value))}`
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

function renderSettings() {
  document.querySelectorAll('[data-setting]').forEach((input) => {
    if (input.type === 'checkbox') {
      input.checked = Boolean(state.settings[input.dataset.setting])
    } else {
      input.value = state.settings[input.dataset.setting]
    }
  })
}

function renderEmployees() {
  const resultMap = new Map(
    result.employeeResults.map((employee) => [employee.employeeId, employee]),
  )
  document.querySelector('#employee-rows').innerHTML = state.employees.map((employee) => {
    const computed = resultMap.get(employee.id)
    return `
      <tr>
        <td><input class="text-input" ${inputAttributes('employees', employee, 'name')} value="${escapeHtml(employee.name)}"></td>
        <td class="center-cell"><input class="checkbox-input" type="checkbox" ${inputAttributes('employees', employee, 'fullTime')} ${employee.fullTime ? 'checked' : ''} aria-label="全职"></td>
        <td><select ${inputAttributes('employees', employee, 'skillRank')}>${getSkillOptions(employee.skillRank)}</select></td>
        <td><input type="number" min="0" step="0.5" ${inputAttributes('employees', employee, 'effectiveDays')} value="${employee.effectiveDays}"></td>
        <td><input type="number" min="0" step="0.5" ${inputAttributes('employees', employee, 'effectiveHoursPerDay')} value="${employee.effectiveHoursPerDay}"></td>
        <td><input type="number" min="0" step="1" ${inputAttributes('employees', employee, 'wageCoefficient')} value="${employee.wageCoefficient}"></td>
        <td class="computed" id="employee-hours-${employee.id}">${formatHours(computed?.capacityHours ?? 0)}</td>
        <td class="computed" id="employee-wage-${employee.id}">${formatMoney(computed?.monthlyWage ?? 0)}</td>
        <td><button type="button" class="icon-button" data-remove="employees" data-id="${employee.id}" aria-label="删除员工">×</button></td>
      </tr>
    `
  }).join('')
}

function renderOneTimeCosts() {
  document.querySelector('#one-time-rows').innerHTML = state.oneTimeCosts.map((item) => {
    const months = toNumber(item.depreciationMonths)
    const monthlyDepreciation = months > 0 ? toNumber(item.amount) / months : 0
    return `
      <tr>
        <td><input class="text-input" ${inputAttributes('oneTimeCosts', item, 'name')} value="${escapeHtml(item.name)}"></td>
        <td><input type="number" min="0" step="100" ${inputAttributes('oneTimeCosts', item, 'amount')} value="${item.amount}"></td>
        <td><input type="number" min="0" step="1" ${inputAttributes('oneTimeCosts', item, 'depreciationMonths')} value="${item.depreciationMonths}"></td>
        <td class="computed" id="investment-monthly-${item.id}">${formatMoney(monthlyDepreciation)}</td>
        <td><button type="button" class="icon-button" data-remove="oneTimeCosts" data-id="${item.id}" aria-label="删除投入">×</button></td>
      </tr>
    `
  }).join('')
}

function renderFixedCosts() {
  document.querySelector('#fixed-cost-rows').innerHTML = state.fixedCosts.map((item) => `
    <tr>
      <td><input class="text-input" ${inputAttributes('fixedCosts', item, 'name')} value="${escapeHtml(item.name)}"></td>
      <td><input type="number" min="0" step="100" ${inputAttributes('fixedCosts', item, 'amount')} value="${item.amount}"></td>
      <td><button type="button" class="icon-button" data-remove="fixedCosts" data-id="${item.id}" aria-label="删除固定开支">×</button></td>
    </tr>
  `).join('')
}

function renderFeeRates() {
  const feeMap = new Map(result.feeResults.map((fee) => [fee.feeId, fee]))
  document.querySelector('#fee-rate-rows').innerHTML = state.orderFeeRates.map((fee) => `
    <tr>
      <td><input class="text-input" ${inputAttributes('orderFeeRates', fee, 'name')} value="${escapeHtml(fee.name)}"></td>
      <td class="input-with-suffix"><input type="number" min="0" step="0.1" ${inputAttributes('orderFeeRates', fee, 'ratePct')} value="${fee.ratePct}"><span>%</span></td>
      <td class="computed" id="fee-cost-${fee.id}">${formatMoney(feeMap.get(fee.id)?.cost ?? 0)}</td>
      <td><button type="button" class="icon-button" data-remove="orderFeeRates" data-id="${fee.id}" aria-label="删除费用率">×</button></td>
    </tr>
  `).join('')
}

function renderInputs() {
  renderSettings()
  renderEmployees()
  renderOneTimeCosts()
  renderFixedCosts()
  renderFeeRates()
}

function resultRow(label, value, className = '') {
  return `<tr><th>${escapeHtml(label)}</th><td class="${className}">${escapeHtml(value)}</td></tr>`
}

function renderResults() {
  const rows = [
    resultRow('预期月营收', formatMoney(result.expectedMonthlyRevenue)),
    resultRow('− 订单额外费用', formatMoney(result.variableCost)),
    resultRow('− 人员工资', formatMoney(result.salaryCost)),
    resultRow('− 每月固定开支', formatMoney(result.fixedCost)),
    resultRow(
      '− 月折旧',
      result.excludeDepreciation
        ? `已剔除（原 ${formatMoney(result.scheduledDepreciation)}）`
        : formatMoney(result.monthlyDepreciation),
    ),
    resultRow('当前月利润', signedMoney(result.netProfit), `${result.netProfit >= 0 ? 'positive-text' : 'negative-text'} result-total`),
  ]
  if (result.errors.length > 0) {
    rows.unshift(resultRow('计算状态', result.errors.join('；'), 'negative-text'))
  }
  document.querySelector('#profit-statement').innerHTML = rows.join('')

  document.querySelector('#required-monthly-revenue').textContent = formatMoney(
    result.expectedMonthlyRevenue,
  )
}

function updateDerivedCells() {
  const employeeMap = new Map(result.employeeResults.map((employee) => [employee.employeeId, employee]))
  state.employees.forEach((employee) => {
    document.querySelector(`#employee-hours-${CSS.escape(employee.id)}`)?.replaceChildren(document.createTextNode(formatHours(employeeMap.get(employee.id)?.capacityHours ?? 0)))
    document.querySelector(`#employee-wage-${CSS.escape(employee.id)}`)?.replaceChildren(document.createTextNode(formatMoney(employeeMap.get(employee.id)?.monthlyWage ?? 0)))
  })

  state.oneTimeCosts.forEach((item) => {
    const months = toNumber(item.depreciationMonths)
    const monthly = months > 0 ? toNumber(item.amount) / months : 0
    document.querySelector(`#investment-monthly-${CSS.escape(item.id)}`)?.replaceChildren(document.createTextNode(formatMoney(monthly)))
  })

  const feeMap = new Map(result.feeResults.map((fee) => [fee.feeId, fee]))
  state.orderFeeRates.forEach((fee) => {
    document.querySelector(`#fee-cost-${CSS.escape(fee.id)}`)?.replaceChildren(document.createTextNode(formatMoney(feeMap.get(fee.id)?.cost ?? 0)))
  })
}

function recalculate({ renderAll = false } = {}) {
  result = calculateMargin(state)
  state.settings.expectedMonthlyRevenue = result.expectedMonthlyRevenue
  if (renderAll) {
    renderInputs()
  } else {
    document.querySelector('[data-setting="targetMonthlyProfit"]').value = state.settings.targetMonthlyProfit
    updateDerivedCells()
  }
  renderResults()
  persist()
}

function addItem(collection) {
  const additions = {
    employees: {
      id: createId('employee'),
      name: '新员工',
      fullTime: true,
      skillRank: 1,
      effectiveDays: 20,
      effectiveHoursPerDay: 8,
      wageCoefficient: 30,
    },
    oneTimeCosts: {
      id: createId('investment'),
      name: '新投入',
      amount: 0,
      depreciationMonths: 24,
    },
    fixedCosts: {
      id: createId('fixed'),
      name: '新固定开支',
      amount: 0,
    },
    orderFeeRates: {
      id: createId('fee'),
      name: '新订单费用',
      ratePct: 0,
    },
  }
  state[collection].push(additions[collection])
  recalculate({ renderAll: true })
}

function removeItem(collection, id) {
  const index = state[collection].findIndex((item) => item.id === id)
  if (index === -1) {
    globalThis.alert('未找到要删除的项目，页面将重新加载当前数据。')
    recalculate({ renderAll: true })
    return
  }
  state[collection].splice(index, 1)
  recalculate({ renderAll: true })
}

function updateInput(input) {
  if (input.dataset.setting) {
    const setting = input.dataset.setting
    state.settings[setting] = input.type === 'checkbox'
      ? input.checked
      : toNumber(input.value)
    recalculate()
    return
  }

  const { collection, id, field } = input.dataset
  if (!collection || !id || !field) return
  const item = getItem(collection, id)
  if (!item) {
    globalThis.alert('输入项已经不存在，页面将重新加载当前数据。')
    recalculate({ renderAll: true })
    return
  }

  if (input.type === 'checkbox') item[field] = input.checked
  else if (input.type === 'number' || input.tagName === 'SELECT') item[field] = toNumber(input.value)
  else item[field] = input.value
  recalculate()
}

app.addEventListener('input', (event) => updateInput(event.target))
app.addEventListener('change', (event) => {
  if (event.target.type === 'checkbox' || event.target.tagName === 'SELECT') {
    updateInput(event.target)
  }
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

document.querySelector('#export-data').addEventListener('click', () => {
  const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' })
  const link = document.createElement('a')
  link.href = URL.createObjectURL(blob)
  link.download = `painting-studio-calculator-${new Date().toISOString().slice(0, 10)}.json`
  link.click()
  URL.revokeObjectURL(link.href)
})

document.querySelector('#import-data').addEventListener('click', () => {
  document.querySelector('#import-file').click()
})

document.querySelector('#import-file').addEventListener('change', async (event) => {
  const [file] = event.target.files
  if (!file) return
  try {
    state = parseImportedState(await file.text())
    recalculate({ renderAll: true })
  } catch (error) {
    globalThis.alert(`导入失败：${error.message}`)
  } finally {
    event.target.value = ''
  }
})

globalThis.addEventListener('storage', (event) => {
  if (event.key !== STORAGE_KEY) return
  state = loadState()
  recalculate({ renderAll: true })
})

recalculate({ renderAll: true })
