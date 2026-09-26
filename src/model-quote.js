import './style.css'
import {
  calculateQuoteSchemes,
  createSavedQuoteSchemeSnapshot,
} from './calculator.js'
import { createId, SKILL_LEVELS } from './state.js'
import {
  loadPersistedState,
  savePersistedState,
  STORAGE_KEY,
} from './persistence.js'

const app = document.querySelector('#app')
let state = loadState()
let schemeResult = calculateQuoteSchemes(state)
let saveFailureNotified = false
let activeSavedQuoteId = null

app.innerHTML = `
  <header class="app-header">
    <div>
      <p class="eyebrow">Quote and dispatch</p>
      <h1>模型计件报价与工序派单</h1>
      <p class="header-description">
        先拆解标准工序并指定承接画师，再由计件工资和目标贡献毛利率反推客户报价。画师拿固定件工资，工作室承担估时风险与经营利润。
      </p>
    </div>
    <div class="header-side">
      <nav class="page-nav" aria-label="计算器页面">
        <a href="./index.html">经营总览</a>
        <a href="./pricing.html">月度生产</a>
        <a class="active" href="./model-quote.html">计件报价</a>
      </nav>
    </div>
  </header>

  <main>
    <section class="summary-section">
      <div class="section-heading">
        <div>
          <p class="section-kicker">统一报价策略</p>
          <h2>从计件成本反推售价</h2>
        </div>
        <a class="button button-link" href="./pricing.html">管理等级与月度生产</a>
      </div>
      <div class="pricing-policy-grid">
        <label class="field important-field">
          <span>目标贡献毛利率</span>
          <div class="input-with-suffix">
            <input type="number" min="0" max="99" step="1" data-setting="targetContributionMarginPct">
            <span>%</span>
          </div>
        </label>
        <div class="policy-metric">
          <span>订单额外费用率</span>
          <strong id="policy-fee-rate">—</strong>
        </div>
        <div class="policy-metric">
          <span>售价中的计件成本上限</span>
          <strong id="policy-cost-rate">—</strong>
        </div>
        <div class="policy-formula">
          <span>推荐报价</span>
          <strong>计件工资 ÷ 计件成本上限</strong>
        </div>
      </div>
      <div id="quote-status" class="model-status quote-status"></div>
    </section>

    <section class="input-section">
      <div class="section-heading">
        <div>
          <p class="section-kicker">报价方案</p>
          <h2>模型、数量与工序</h2>
        </div>
        <div class="section-actions">
          <select id="saved-quotes-select" class="saved-quotes-select" aria-label="已保存报价"></select>
          <button type="button" class="button button-danger" id="delete-saved-quote" disabled>删除已保存报价</button>
          <button type="button" class="button" id="export-saved-quotes">导出已保存报价</button>
        </div>
      </div>
      <div id="quote-scheme-list" class="quote-scheme-list"></div>
    </section>
  </main>

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

function formatHours(value) {
  if (!Number.isFinite(value)) return '无法计算'
  return `${value.toLocaleString('zh-CN', { maximumFractionDigits: 1 })}h`
}

function formatPercent(value) {
  if (!Number.isFinite(value)) return '无法计算'
  return `${value.toLocaleString('zh-CN', { maximumFractionDigits: 1 })}%`
}

function getLevelOptions(selectedId) {
  return [...state.paintingLevels]
    .sort((left, right) => toNumber(left.rank) - toNumber(right.rank))
    .map((level) => (
      `<option value="${escapeHtml(level.id)}" ${level.id === selectedId ? 'selected' : ''}>`
      + `${escapeHtml(level.name)}</option>`
    ))
    .join('')
}

function skillName(rank) {
  return SKILL_LEVELS.find((skill) => skill.rank === toNumber(rank))?.name ?? ''
}

function getEmployeeOptions(selectedId, requiredSkillRank) {
  if (state.employees.length === 0) {
    return '<option value="">请先在经营总览添加画师</option>'
  }
  return [...state.employees]
    .sort((left, right) => toNumber(left.skillRank) - toNumber(right.skillRank))
    .map((employee) => {
      const qualified = toNumber(employee.skillRank) >= toNumber(requiredSkillRank)
      const selected = employee.id === selectedId
      return `<option value="${escapeHtml(employee.id)}" ${selected ? 'selected' : ''} ${qualified ? '' : 'disabled'}>`
        + `${escapeHtml(employee.name)} · ${escapeHtml(skillName(employee.skillRank))} · ${formatMoney(toNumber(employee.pieceRate))}/h`
        + `${qualified ? '' : '（技能不足）'}</option>`
    })
    .join('')
}

function getDefaultPainterId(levelId) {
  const requiredSkillRank = toNumber(
    state.paintingLevels.find((level) => level.id === levelId)?.requiredSkillRank,
  )
  return [...state.employees]
    .filter((employee) => toNumber(employee.skillRank) >= requiredSkillRank)
    .sort((left, right) => toNumber(left.pieceRate) - toNumber(right.pieceRate))[0]?.id ?? ''
}

function getSchemeResult(schemeId) {
  return schemeResult.schemeResults.find((scheme) => scheme.schemeId === schemeId)
}

function getScheme(schemeId) {
  return state.quoteSchemes.find((scheme) => scheme.id === schemeId)
}

function getModel(scheme, modelId) {
  return scheme?.models.find((model) => model.id === modelId)
}

function renderPricingPolicy() {
  const totalFeeRatePct = state.orderFeeRates.reduce(
    (sum, fee) => sum + Math.max(0, toNumber(fee.ratePct)),
    0,
  )
  const targetMarginPct = Math.max(
    0,
    toNumber(state.settings.targetContributionMarginPct),
  )
  document.querySelector('[data-setting="targetContributionMarginPct"]').value = targetMarginPct
  document.querySelector('#policy-fee-rate').textContent = formatPercent(totalFeeRatePct)
  document.querySelector('#policy-cost-rate').textContent = formatPercent(
    100 - totalFeeRatePct - targetMarginPct,
  )
  const status = document.querySelector('#quote-status')
  if (schemeResult.errors.length > 0) {
    status.className = 'model-status quote-status status-error'
    status.innerHTML = `<strong>报价方案需要处理</strong><span>${escapeHtml(schemeResult.errors.join('；'))}</span>`
  } else {
    status.className = 'model-status quote-status status-positive'
    status.innerHTML = '<strong>计件报价模型有效</strong><span>所有工序均已分配给技能达标的画师。</span>'
  }
}

function renderSchemes() {
  document.querySelector('#quote-scheme-list').innerHTML = state.quoteSchemes
    .map((scheme) => {
      const computedScheme = getSchemeResult(scheme.id)
      const modelResultMap = new Map(
        (computedScheme?.modelResults ?? []).map((model) => [model.modelId, model]),
      )
      return `
        <article class="quote-scheme-card" data-scheme-card="${scheme.id}">
          <div class="quote-scheme-header">
            <label class="field">
              <span>报价方案名称</span>
              <input class="text-input scheme-name-input" data-scheme-id="${scheme.id}" data-scheme-field="name" value="${escapeHtml(scheme.name)}">
            </label>
          </div>

          <div class="scheme-model-list">
            ${scheme.models.map((model) => renderModel(
              scheme,
              model,
              modelResultMap.get(model.id),
            )).join('')}
          </div>

          <div class="quote-scheme-total">
            <div class="quote-total-actions">
              <button type="button" class="button" data-add-model="${scheme.id}">添加模型</button>
              <button type="button" class="button button-primary" data-save-scheme="${scheme.id}">保存报价</button>
            </div>
            <span>模型总数：<strong id="scheme-total-models-${scheme.id}">${computedScheme?.totalModels ?? 0}</strong></span>
            <span>总工时：<strong id="scheme-total-hours-${scheme.id}">${formatHours(computedScheme?.totalHours ?? 0)}</strong></span>
            <span>计件工资：<strong id="scheme-total-cost-${scheme.id}">${formatMoney(computedScheme?.totalPieceworkCost ?? 0)}</strong></span>
            <span>方案总价：<strong id="scheme-total-price-${scheme.id}">${formatMoney(computedScheme?.totalPrice ?? 0)}</strong></span>
          </div>
        </article>
      `
    })
    .join('')
}

function renderModel(scheme, model, computed) {
  return `
    <article class="scheme-model-card" data-model-card="${model.id}">
      <div class="model-quote-header">
        <label class="field">
          <span>模型名称</span>
          <input class="text-input" data-model-scheme-id="${scheme.id}" data-model-id="${model.id}" data-model-field="name" value="${escapeHtml(model.name)}">
        </label>
        <label class="field">
          <span>数量</span>
          <input type="number" min="0" step="1" data-model-scheme-id="${scheme.id}" data-model-id="${model.id}" data-model-field="quantity" value="${model.quantity}">
        </label>
        <label class="field">
          <span>目标等级</span>
          <select data-model-scheme-id="${scheme.id}" data-model-id="${model.id}" data-model-field="targetLevelId">${getLevelOptions(model.targetLevelId)}</select>
        </label>
        <label class="field">
          <span>报价调整</span>
          <div class="input-with-suffix">
            <input type="number" min="-100" step="1" data-model-scheme-id="${scheme.id}" data-model-id="${model.id}" data-model-field="quoteAdjustmentPct" value="${model.quoteAdjustmentPct}">
            <span>%</span>
          </div>
        </label>
        <button type="button" class="button button-danger" data-remove-model-scheme-id="${scheme.id}" data-remove-model-id="${model.id}">删除模型</button>
      </div>

      <div class="table-scroll">
        <table class="input-table quote-level-table">
          <thead>
            <tr>
              <th>工序名称</th>
              <th>等级</th>
              <th>最低画师技能</th>
              <th>承接画师</th>
              <th>核定计件时薪</th>
              <th>标准工时</th>
              <th>固定计件工资</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            ${(computed?.breakdown ?? []).map((process) => `
              <tr>
                <td><input class="text-input" data-process-scheme-id="${scheme.id}" data-process-model-id="${model.id}" data-process-id="${process.processId}" data-process-field="name" value="${escapeHtml(process.processName)}"></td>
                <td>
                  <select data-process-scheme-id="${scheme.id}" data-process-model-id="${model.id}" data-process-id="${process.processId}" data-process-field="introducedAtLevelId">
                    ${getLevelOptions(process.levelId)}
                  </select>
                </td>
                <td>${escapeHtml(skillName(process.requiredSkillRank))}</td>
                <td>
                  <select data-process-scheme-id="${scheme.id}" data-process-model-id="${model.id}" data-process-id="${process.processId}" data-process-field="assignedEmployeeId">
                    ${getEmployeeOptions(process.assignedEmployeeId, process.requiredSkillRank)}
                  </select>
                </td>
                <td class="computed" id="process-rate-${scheme.id}-${model.id}-${process.processId}">${formatMoney(process.pieceRate)}/h</td>
                <td class="input-with-suffix">
                  <input type="number" min="0" step="0.1" data-process-scheme-id="${scheme.id}" data-process-model-id="${model.id}" data-process-id="${process.processId}" data-process-field="hours" value="${process.hours}">
                  <span>h</span>
                </td>
                <td class="computed" id="process-pay-${scheme.id}-${model.id}-${process.processId}">${formatMoney(process.pieceworkPay)}</td>
                <td><button type="button" class="icon-button" data-remove-process-scheme-id="${scheme.id}" data-remove-process-model-id="${model.id}" data-remove-process-id="${process.processId}" aria-label="删除工序">×</button></td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>

      <div class="model-quote-total">
        <button type="button" class="button" data-add-process-scheme-id="${scheme.id}" data-add-process-model-id="${model.id}">添加工序</button>
        <span>标准工时：<strong id="model-unit-hours-${scheme.id}-${model.id}">${formatHours(computed?.unitHours ?? 0)}</strong></span>
        <span>计件工资：<strong id="model-unit-cost-${scheme.id}-${model.id}">${formatMoney(computed?.unitPieceworkCost ?? 0)}</strong></span>
        <span>推荐报价：<strong id="model-unit-price-${scheme.id}-${model.id}">${formatMoney(computed?.unitPrice ?? 0)}</strong></span>
        <span>单件贡献：<strong id="model-unit-contribution-${scheme.id}-${model.id}">${formatMoney(computed?.unitContributionProfit ?? 0)}</strong></span>
        <span>贡献率：<strong id="model-margin-${scheme.id}-${model.id}">${formatPercent(computed?.actualContributionMarginPct ?? 0)}</strong></span>
        <span>报价小计：<strong id="model-total-price-${scheme.id}-${model.id}">${formatMoney(computed?.totalPrice ?? 0)}</strong></span>
      </div>
    </article>
  `
}

function renderSavedQuotesDropdown() {
  if (
    activeSavedQuoteId
    && !state.savedQuotes.some((quote) => quote.id === activeSavedQuoteId)
  ) {
    activeSavedQuoteId = null
  }
  const select = document.querySelector('#saved-quotes-select')
  select.innerHTML = `
    <option value="">已保存报价（${state.savedQuotes.length}）</option>
    ${[...state.savedQuotes].reverse().map((quote) => (
      `<option value="${escapeHtml(quote.id)}">${escapeHtml(quote.name)}</option>`
    )).join('')}
  `
  select.value = activeSavedQuoteId ?? ''
  document.querySelector('#delete-saved-quote').disabled = !activeSavedQuoteId
}

function updateDerivedCells() {
  state.quoteSchemes.forEach((scheme) => {
    const computedScheme = getSchemeResult(scheme.id)
    const modelResultMap = new Map(
      (computedScheme?.modelResults ?? []).map((model) => [model.modelId, model]),
    )
    scheme.models.forEach((model) => {
      const computed = modelResultMap.get(model.id)
      computed?.breakdown.forEach((process) => {
        replaceText(
          `#process-rate-${CSS.escape(scheme.id)}-${CSS.escape(model.id)}-${CSS.escape(process.processId)}`,
          `${formatMoney(process.pieceRate)}/h`,
        )
        replaceText(
          `#process-pay-${CSS.escape(scheme.id)}-${CSS.escape(model.id)}-${CSS.escape(process.processId)}`,
          formatMoney(process.pieceworkPay),
        )
      })
      replaceText(
        `#model-unit-hours-${CSS.escape(scheme.id)}-${CSS.escape(model.id)}`,
        formatHours(computed?.unitHours ?? 0),
      )
      replaceText(
        `#model-unit-cost-${CSS.escape(scheme.id)}-${CSS.escape(model.id)}`,
        formatMoney(computed?.unitPieceworkCost ?? 0),
      )
      replaceText(
        `#model-unit-price-${CSS.escape(scheme.id)}-${CSS.escape(model.id)}`,
        formatMoney(computed?.unitPrice ?? 0),
      )
      replaceText(
        `#model-unit-contribution-${CSS.escape(scheme.id)}-${CSS.escape(model.id)}`,
        formatMoney(computed?.unitContributionProfit ?? 0),
      )
      replaceText(
        `#model-margin-${CSS.escape(scheme.id)}-${CSS.escape(model.id)}`,
        formatPercent(computed?.actualContributionMarginPct ?? 0),
      )
      replaceText(
        `#model-total-price-${CSS.escape(scheme.id)}-${CSS.escape(model.id)}`,
        formatMoney(computed?.totalPrice ?? 0),
      )
    })
    replaceText(
      `#scheme-total-models-${CSS.escape(scheme.id)}`,
      String(computedScheme?.totalModels ?? 0),
    )
    replaceText(
      `#scheme-total-hours-${CSS.escape(scheme.id)}`,
      formatHours(computedScheme?.totalHours ?? 0),
    )
    replaceText(
      `#scheme-total-cost-${CSS.escape(scheme.id)}`,
      formatMoney(computedScheme?.totalPieceworkCost ?? 0),
    )
    replaceText(
      `#scheme-total-price-${CSS.escape(scheme.id)}`,
      formatMoney(computedScheme?.totalPrice ?? 0),
    )
  })
}

function replaceText(selector, value) {
  document.querySelector(selector)?.replaceChildren(document.createTextNode(value))
}

function recalculate({ renderAll = false } = {}) {
  schemeResult = calculateQuoteSchemes(state)
  if (renderAll) renderSchemes()
  else updateDerivedCells()
  renderPricingPolicy()
  renderSavedQuotesDropdown()
  persist()
}

function createEmptyModel(name = '新模型') {
  const firstLevelId = [...state.paintingLevels]
    .sort((left, right) => toNumber(left.rank) - toNumber(right.rank))[0]?.id ?? ''
  return {
    id: createId('model'),
    name,
    quantity: 1,
    targetLevelId: firstLevelId,
    quoteAdjustmentPct: 0,
    processes: [{
      id: createId('process'),
      name: '基础工序',
      introducedAtLevelId: firstLevelId,
      assignedEmployeeId: getDefaultPainterId(firstLevelId),
      hours: 0,
    }],
  }
}

function addModel(schemeId) {
  const scheme = getScheme(schemeId)
  if (!scheme) {
    globalThis.alert('未找到报价方案。')
    return
  }
  scheme.models.push(createEmptyModel())
  recalculate({ renderAll: true })
}

function removeModel(schemeId, modelId) {
  const scheme = getScheme(schemeId)
  const index = scheme?.models.findIndex((model) => model.id === modelId)
  if (!scheme || index === undefined || index < 0) {
    globalThis.alert('未找到要删除的模型。')
    return
  }
  scheme.models.splice(index, 1)
  recalculate({ renderAll: true })
}

function addProcess(schemeId, modelId) {
  const model = getModel(getScheme(schemeId), modelId)
  if (!model) {
    globalThis.alert('未找到要添加工序的模型。')
    return
  }
  const firstLevelId = [...state.paintingLevels]
    .sort((left, right) => toNumber(left.rank) - toNumber(right.rank))[0]?.id ?? ''
  model.processes.push({
    id: createId('process'),
    name: '新工序',
    introducedAtLevelId: firstLevelId,
    assignedEmployeeId: getDefaultPainterId(firstLevelId),
    hours: 0,
  })
  recalculate({ renderAll: true })
}

function removeProcess(schemeId, modelId, processId) {
  const model = getModel(getScheme(schemeId), modelId)
  const index = model?.processes.findIndex((process) => process.id === processId)
  if (!model || index === undefined || index < 0) {
    globalThis.alert('未找到要删除的工序。')
    return
  }
  model.processes.splice(index, 1)
  recalculate({ renderAll: true })
}

function saveScheme(schemeId, button) {
  const computed = getSchemeResult(schemeId)
  if (!computed || computed.modelResults.length === 0) {
    globalThis.alert('当前报价方案没有可保存的模型。')
    return
  }
  if (schemeResult.errors.length > 0) {
    globalThis.alert(`请先修复报价方案：${schemeResult.errors.join('；')}`)
    return
  }
  state.savedQuotes.push({
    id: createId('saved-quote'),
    ...createSavedQuoteSchemeSnapshot(computed, new Date().toISOString()),
  })
  activeSavedQuoteId = state.savedQuotes.at(-1).id
  persist()
  renderSavedQuotesDropdown()
  const originalText = button.textContent
  button.textContent = '已保存'
  button.disabled = true
  globalThis.setTimeout(() => {
    button.textContent = originalText
    button.disabled = false
  }, 1000)
}

function loadSavedScheme(savedId) {
  const saved = state.savedQuotes.find((quote) => quote.id === savedId)
  if (!saved) return
  activeSavedQuoteId = savedId
  const availableLevels = new Set(state.paintingLevels.map((level) => level.id))
  const firstLevelId = state.paintingLevels[0]?.id ?? ''
  const currentSchemeId = state.quoteSchemes[0]?.id ?? 'scheme-main'
  state.quoteSchemes = [{
    id: currentSchemeId,
    name: saved.name,
    models: saved.models.map((model) => ({
      id: createId('model'),
      name: model.name,
      quantity: model.quantity,
      targetLevelId: availableLevels.has(model.targetLevelId)
        ? model.targetLevelId
        : firstLevelId,
      quoteAdjustmentPct: model.quoteAdjustmentPct,
      processes: model.processes.map((process) => ({
        id: createId('process'),
        name: process.name,
        introducedAtLevelId: availableLevels.has(process.levelId)
          ? process.levelId
          : firstLevelId,
        assignedEmployeeId: state.employees.some(
          (employee) => employee.id === process.assignedEmployeeId,
        )
          ? process.assignedEmployeeId
          : getDefaultPainterId(
            availableLevels.has(process.levelId)
              ? process.levelId
              : firstLevelId,
          ),
        hours: process.hours,
      })),
    })),
  }]
  recalculate({ renderAll: true })
}

function deleteSavedQuote() {
  if (!activeSavedQuoteId) return
  const saved = state.savedQuotes.find(
    (quote) => quote.id === activeSavedQuoteId,
  )
  if (!saved) {
    activeSavedQuoteId = null
    renderSavedQuotesDropdown()
    return
  }
  if (!globalThis.confirm(`删除已保存报价“${saved.name}”？`)) return

  state.savedQuotes = state.savedQuotes.filter(
    (quote) => quote.id !== activeSavedQuoteId,
  )
  activeSavedQuoteId = null
  persist()
  renderSavedQuotesDropdown()
}

function exportSavedQuotes() {
  if (state.savedQuotes.length === 0) {
    globalThis.alert('还没有已保存的报价方案。')
    return
  }
  const payload = {
    exportedAt: new Date().toISOString(),
    quoteCount: state.savedQuotes.length,
    quotes: state.savedQuotes,
  }
  const blob = new Blob([JSON.stringify(payload, null, 2)], {
    type: 'application/json',
  })
  const link = document.createElement('a')
  link.href = URL.createObjectURL(blob)
  link.download = `saved-model-quotes-${new Date().toISOString().slice(0, 10)}.json`
  link.click()
  URL.revokeObjectURL(link.href)
}

function updateInput(input) {
  if (input.dataset.setting) {
    state.settings[input.dataset.setting] = toNumber(input.value)
    recalculate()
    return
  }

  if (input.dataset.schemeId) {
    const scheme = getScheme(input.dataset.schemeId)
    if (!scheme) return
    scheme[input.dataset.schemeField] = input.value
    recalculate()
    return
  }

  if (input.dataset.modelSchemeId) {
    const model = getModel(
      getScheme(input.dataset.modelSchemeId),
      input.dataset.modelId,
    )
    if (!model) return
    const field = input.dataset.modelField
    model[field] = input.type === 'number' ? toNumber(input.value) : input.value
    recalculate({ renderAll: field === 'targetLevelId' })
    return
  }

  if (input.dataset.processSchemeId) {
    const model = getModel(
      getScheme(input.dataset.processSchemeId),
      input.dataset.processModelId,
    )
    const process = model?.processes.find(
      (item) => item.id === input.dataset.processId,
    )
    if (!process) return
    const field = input.dataset.processField
    process[field] = input.type === 'number' ? toNumber(input.value) : input.value
    if (field === 'introducedAtLevelId') {
      const level = state.paintingLevels.find(
        (candidate) => candidate.id === process.introducedAtLevelId,
      )
      const employee = state.employees.find(
        (candidate) => candidate.id === process.assignedEmployeeId,
      )
      if (toNumber(employee?.skillRank) < toNumber(level?.requiredSkillRank)) {
        process.assignedEmployeeId = getDefaultPainterId(level?.id)
      }
      recalculate({ renderAll: true })
      return
    }
    recalculate()
  }
}

app.addEventListener('input', (event) => updateInput(event.target))
app.addEventListener('change', (event) => {
  if (event.target.id === 'saved-quotes-select') {
    if (event.target.value) loadSavedScheme(event.target.value)
    else {
      activeSavedQuoteId = null
      renderSavedQuotesDropdown()
    }
    return
  }
  if (event.target.tagName === 'SELECT') updateInput(event.target)
})
app.addEventListener('click', (event) => {
  if (event.target.closest('#delete-saved-quote')) {
    deleteSavedQuote()
    return
  }
  if (event.target.closest('#export-saved-quotes')) {
    exportSavedQuotes()
    return
  }
  const addModelButton = event.target.closest('[data-add-model]')
  if (addModelButton) {
    addModel(addModelButton.dataset.addModel)
    return
  }
  const removeModelButton = event.target.closest('[data-remove-model-id]')
  if (removeModelButton) {
    removeModel(
      removeModelButton.dataset.removeModelSchemeId,
      removeModelButton.dataset.removeModelId,
    )
    return
  }
  const addProcessButton = event.target.closest('[data-add-process-model-id]')
  if (addProcessButton) {
    addProcess(
      addProcessButton.dataset.addProcessSchemeId,
      addProcessButton.dataset.addProcessModelId,
    )
    return
  }
  const removeProcessButton = event.target.closest('[data-remove-process-id]')
  if (removeProcessButton) {
    removeProcess(
      removeProcessButton.dataset.removeProcessSchemeId,
      removeProcessButton.dataset.removeProcessModelId,
      removeProcessButton.dataset.removeProcessId,
    )
    return
  }
  const saveButton = event.target.closest('[data-save-scheme]')
  if (saveButton) {
    saveScheme(saveButton.dataset.saveScheme, saveButton)
  }
})

globalThis.addEventListener('storage', (event) => {
  if (event.key !== STORAGE_KEY) return
  state = loadState()
  recalculate({ renderAll: true })
})

recalculate({ renderAll: true })
