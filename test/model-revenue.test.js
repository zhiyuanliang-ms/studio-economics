import test from 'node:test'
import assert from 'node:assert/strict'

import { calculateModelRevenue, calculateStudioProfit } from '../src/calculator.js'
import { cloneState, SCHEMA_VERSION } from '../src/state.js'
import {
  loadPersistedState,
  parseImportedState,
  savePersistedState,
} from '../src/persistence.js'

function createRevenueState() {
  const state = cloneState()
  state.settings.monthlyRevenue = 10000
  state.settings.useModelRevenue = true
  state.fixedCosts = [{ id: 'rent', name: '房租', amount: 2400 }]
  state.oneTimeCosts = [{
    id: 'equipment',
    name: '设备',
    amount: 12000,
    depreciates: true,
    depreciationMonths: 12,
  }]
  state.savedModelQuotes = [
    {
      id: 'quote-a',
      name: '模型甲',
      externalPrice: 500,
      steps: [
        { id: 'base', name: '底色', pieceworkCost: 50, estimatedHours: 0.5 },
        { id: 'details', name: '细节', pieceworkCost: 150, estimatedHours: 3 },
      ],
    },
    {
      id: 'quote-b',
      name: '模型乙',
      externalPrice: 1000,
      steps: [
        { id: 'painting', name: '涂装', pieceworkCost: 400, estimatedHours: 5 },
      ],
    },
  ]
  state.revenueItems = [
    { id: 'revenue-a', savedQuoteId: 'quote-a', quantity: 10 },
    { id: 'revenue-b', savedQuoteId: 'quote-b', quantity: 4 },
  ]
  return state
}

test('按保存报价和数量汇总营收与计件成本，不按工时重复计费', () => {
  const state = createRevenueState()
  const before = cloneState(state)
  const result = calculateStudioProfit(state)

  assert.deepEqual(result.errors, [])
  assert.equal(result.usesModelRevenue, true)
  assert.equal(result.monthlyRevenue, 9000)
  assert.equal(result.monthlyPieceworkCost, 3600)
  assert.equal(result.monthlyFixedCost, 2400)
  assert.equal(result.monthlyDepreciation, 1000)
  assert.equal(result.operatingCashProfit, 3000)
  assert.equal(result.monthlyProfit, 2000)
  assert.equal(result.paybackMonths, 4)
  assert.equal(result.status, 'profit')
  assert.deepEqual(result.revenueItemResults.map((item) => item.revenue), [5000, 4000])
  assert.deepEqual(state, before)
})

test('切回手填模式保留月营收及明细，且不扣除模型计件成本', () => {
  const state = createRevenueState()
  state.settings.useModelRevenue = false
  const manual = calculateStudioProfit(state)

  assert.equal(manual.monthlyRevenue, 10000)
  assert.equal(manual.monthlyPieceworkCost, 0)
  assert.equal(manual.monthlyProfit, 6600)
  assert.deepEqual(manual.errors, [])
  state.settings.useModelRevenue = true
  assert.equal(calculateStudioProfit(state).monthlyRevenue, 9000)
  assert.equal(state.settings.monthlyRevenue, 10000)
  assert.equal(state.revenueItems.length, 2)
})

test('报价草稿不影响营收，但保存后的价格和成本更新会同步计算', () => {
  const state = createRevenueState()
  state.modelQuoteDraft = {
    sourceSavedQuoteId: 'quote-a',
    name: '模型甲草稿',
    externalPrice: 99999,
    steps: [{ id: 'draft', name: '草稿', pieceworkCost: 9999, estimatedHours: 9 }],
  }
  assert.equal(calculateStudioProfit(state).monthlyRevenue, 9000)

  state.savedModelQuotes[0].externalPrice = 600
  state.savedModelQuotes[0].steps[0].pieceworkCost = 100
  state.savedModelQuotes[0].name = '模型甲新版'
  const result = calculateStudioProfit(state)
  assert.equal(result.monthlyRevenue, 10000)
  assert.equal(result.monthlyPieceworkCost, 4100)
  assert.equal(result.monthlyProfit, 2500)
  assert.equal(result.revenueItemResults[0].quoteName, '模型甲新版')
})

test('报价下调后显示真实亏损，现金结余不足时不能回本', () => {
  const state = createRevenueState()
  state.savedModelQuotes[0].externalPrice = 100
  state.savedModelQuotes[1].externalPrice = 200
  const result = calculateStudioProfit(state)

  assert.equal(result.monthlyRevenue, 1800)
  assert.equal(result.operatingCashProfit, -4200)
  assert.equal(result.monthlyProfit, -5200)
  assert.equal(result.status, 'loss')
  assert.equal(result.paybackMonths, Infinity)
})

test('仅折旧导致会计亏损时，回本仍按扣除计件成本后的现金结余计算', () => {
  const state = createRevenueState()
  state.oneTimeCosts[0].depreciationMonths = 2
  const result = calculateStudioProfit(state)

  assert.equal(result.monthlyProfit, -3000)
  assert.equal(result.status, 'loss')
  assert.equal(result.paybackMonths, 4)
})

test('未选方案或引用已删除方案时提示错误，不返回部分合计', () => {
  for (const savedQuoteId of [null, 'deleted-quote']) {
    const state = createRevenueState()
    state.revenueItems[0].savedQuoteId = savedQuoteId
    const result = calculateStudioProfit(state)

    assert.equal(result.errors.length, 1)
    assert.ok(result.revenueItemResults[0].quoteError)
    assert.equal(result.status, 'invalid')
    assert.ok(Number.isNaN(result.monthlyRevenue))
    assert.ok(Number.isNaN(result.monthlyPieceworkCost))
    assert.ok(Number.isNaN(result.monthlyProfit))
    assert.ok(Number.isNaN(result.paybackMonths))

    state.settings.useModelRevenue = false
    assert.equal(calculateStudioProfit(state).monthlyProfit, 6600)
    assert.deepEqual(calculateStudioProfit(state).errors, [])
  }
})

test('数量必须是正整数，不静默截断或把空值当零', () => {
  for (const quantity of [0, -1, 0.5, null, '', '2', NaN, Infinity, 2 ** 53]) {
    const state = createRevenueState()
    state.revenueItems[0].quantity = quantity
    const result = calculateStudioProfit(state)

    assert.equal(result.revenueItemResults[0].quantityError, '数量须为正整数')
    assert.equal(result.status, 'invalid')
    assert.ok(Number.isNaN(result.monthlyRevenue))
  }
})

test('空明细按零营收计算，同一方案可按多条明细累计', () => {
  const state = createRevenueState()
  state.revenueItems = []
  let result = calculateStudioProfit(state)
  assert.deepEqual(result.errors, [])
  assert.equal(result.monthlyRevenue, 0)
  assert.equal(result.monthlyProfit, -3400)
  assert.equal(result.paybackMonths, Infinity)

  state.revenueItems = [
    { id: 'one', savedQuoteId: 'quote-a', quantity: 2 },
    { id: 'two', savedQuoteId: 'quote-a', quantity: 3 },
  ]
  result = calculateStudioProfit(state)
  assert.equal(result.monthlyRevenue, 2500)
  assert.equal(result.monthlyPieceworkCost, 1000)
})

test('保留报价金额精度，超出计算范围时明确报错', () => {
  const state = createRevenueState()
  state.revenueItems = [{ id: 'one', savedQuoteId: 'quote-a', quantity: 3 }]
  state.savedModelQuotes[0].externalPrice = 500.25
  assert.equal(calculateModelRevenue(state).monthlyRevenue, 1500.75)

  state.savedModelQuotes[0].externalPrice = Number.MAX_VALUE
  const result = calculateStudioProfit(state)
  assert.match(result.errors[0], /金额超出计算范围/)
  assert.equal(result.status, 'invalid')
  assert.ok(Number.isNaN(result.monthlyRevenue))
})

test('版本16数据迁移后仍默认手填，原营收与报价不变', () => {
  const state = createRevenueState()
  state.version = 16
  delete state.settings.useModelRevenue
  delete state.revenueItems
  const loaded = parseImportedState(JSON.stringify(state))

  assert.equal(loaded.version, SCHEMA_VERSION)
  assert.equal(loaded.settings.useModelRevenue, false)
  assert.equal(loaded.settings.monthlyRevenue, 10000)
  assert.deepEqual(loaded.revenueItems, [])
  assert.equal(loaded.savedModelQuotes[0].externalPrice, 500)
  assert.equal(calculateStudioProfit(loaded).monthlyProfit, 6600)
})

test('迁移保留失效方案和未完成数量，交由界面提示而不是偷偷删除', () => {
  const state = createRevenueState()
  state.revenueItems[0].savedQuoteId = 'deleted'
  state.revenueItems[1].quantity = null
  const loaded = parseImportedState(JSON.stringify(state))

  assert.deepEqual(loaded.revenueItems, state.revenueItems)
  assert.equal(calculateStudioProfit(loaded).errors.length, 2)
})

test('拒绝损坏的营收明细结构和重复ID', () => {
  const state = createRevenueState()
  state.revenueItems[1].id = state.revenueItems[0].id
  assert.throws(() => parseImportedState(JSON.stringify(state)), /营收明细格式无效/)

  state.revenueItems = 'invalid'
  assert.throws(() => parseImportedState(JSON.stringify(state)), /revenueItems/)
})

test('营收模式、手填值、模型选择和数量可自动保存并恢复', () => {
  const previousStorage = globalThis.localStorage
  const values = new Map()
  globalThis.localStorage = {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, String(value)),
  }

  try {
    const state = createRevenueState()
    savePersistedState(state)
    const loaded = loadPersistedState()

    assert.equal(loaded.settings.useModelRevenue, true)
    assert.equal(loaded.settings.monthlyRevenue, 10000)
    assert.deepEqual(loaded.revenueItems, state.revenueItems)
    assert.equal(calculateStudioProfit(loaded).monthlyProfit, 2000)

    loaded.settings.useModelRevenue = false
    savePersistedState(loaded)
    const manual = loadPersistedState()
    assert.equal(manual.settings.useModelRevenue, false)
    assert.deepEqual(manual.revenueItems, state.revenueItems)
    assert.equal(calculateStudioProfit(manual).monthlyProfit, 6600)
  } finally {
    if (previousStorage === undefined) delete globalThis.localStorage
    else globalThis.localStorage = previousStorage
  }
})
