import test from 'node:test'
import assert from 'node:assert/strict'

import {
  calculateMargin,
  calculateModelQuote,
  calculateOrderStructure,
  calculateQuoteSchemes,
  calculateStudioProfit,
  createSavedQuoteSchemeSnapshot,
} from '../src/calculator.js'
import {
  loadPersistedState,
  parseImportedState,
  savePersistedState,
  STORAGE_KEY,
} from '../src/persistence.js'
import { SCHEMA_VERSION } from '../src/state.js'

function createCurrentFixture() {
  return {
    version: 12,
    settings: {
      expectedMonthlyRevenue: 0,
      targetMonthlyProfit: 50,
      targetContributionMarginPct: 40,
      excludeDepreciation: false,
    },
    employees: [
      {
        id: 'basic',
        name: '基础画师',
        fullTime: true,
        skillRank: 1,
        effectiveDays: 1,
        effectiveHoursPerDay: 10,
        wageCoefficient: 10,
      },
      {
        id: 'senior',
        name: '高级画师',
        fullTime: false,
        skillRank: 3,
        effectiveDays: 1,
        effectiveHoursPerDay: 10,
        wageCoefficient: 20,
      },
    ],
    oneTimeCosts: [
      { id: 'fitout', name: '装修', amount: 100, depreciationMonths: 10 },
    ],
    fixedCosts: [
      { id: 'rent', name: '房租', amount: 50 },
    ],
    orderFeeRates: [
      { id: 'fee', name: '费用', ratePct: 10 },
    ],
    paintingLevels: [
      {
        id: 'level-basic',
        name: '基础',
        rank: 1,
        hourlyRate: 100,
        requiredSkillRank: 1,
      },
      {
        id: 'level-advanced',
        name: '进阶',
        rank: 2,
        hourlyRate: 200,
        requiredSkillRank: 2,
      },
      {
        id: 'level-high',
        name: '高阶',
        rank: 3,
        hourlyRate: 300,
        requiredSkillRank: 3,
      },
    ],
    orders: [
      {
        id: 'one',
        name: '步兵',
        quantity: 10,
        quoteModelId: 'model',
        paintingLevelId: 'level-basic',
        unitPrice: 100,
      },
      {
        id: 'two',
        name: '角色',
        quantity: 2,
        quoteModelId: 'second-model',
        paintingLevelId: 'level-high',
        unitPrice: 500,
      },
    ],
    savedQuotes: [],
    quoteSchemes: [{
      id: 'scheme',
      name: '测试报价方案',
      models: [
      {
        id: 'model',
        name: '测试模型',
        quantity: 3,
        targetLevelId: 'level-advanced',
        quoteAdjustmentPct: 0,
        processes: [
          {
            id: 'base-process',
            name: '基础工序',
            introducedAtLevelId: 'level-basic',
            assignedEmployeeId: 'basic',
            hours: 1,
          },
          {
            id: 'high-process',
            name: '进阶工序',
            introducedAtLevelId: 'level-advanced',
            assignedEmployeeId: 'senior',
            hours: 2,
          },
        ],
      },
      {
        id: 'second-model',
        name: '第二个模型',
        quantity: 2,
        targetLevelId: 'level-basic',
        quoteAdjustmentPct: 0,
        processes: [{
          id: 'second-base',
          name: '基础工序',
          introducedAtLevelId: 'level-basic',
            assignedEmployeeId: 'basic',
          hours: 0.5,
        }],
      },
      ],
    }],
  }
}

function createLegacyFixture() {
  return {
    version: 4,
    settings: {
      expectedMonthlyRevenue: 1000,
      targetMonthlyProfit: 50,
      excludeOneTimeCosts: false,
      quoteMultiplier: 2,
      minimumOrderPrice: 0,
    },
    employees: [
      {
        id: 'basic',
        name: '基础画师',
        fullTime: true,
        skillRank: 1,
        effectiveDays: 1,
        effectiveHoursPerDay: 10,
        wageCoefficient: 10,
      },
      {
        id: 'legacy-master',
        name: '主理人 / 大师画师',
        fullTime: false,
        skillRank: 4,
        effectiveDays: 1,
        effectiveHoursPerDay: 10,
        wageCoefficient: 20,
      },
    ],
    oneTimeCosts: [
      { id: 'fitout', name: '装修', amount: 100, recoveryMonths: 10 },
    ],
    fixedCosts: [
      { id: 'rent', name: '房租', amount: 50 },
    ],
    orderFeeRates: [
      { id: 'fee', name: '费用', ratePct: 10 },
    ],
    paintingLevels: [
      { id: 'low', name: '基础级', rank: 1 },
      { id: 'high', name: '高级', rank: 2 },
    ],
    stages: [
      {
        id: 'common',
        name: '共同工序',
        introducedAtLevelId: 'low',
        requiredSkillRank: 1,
        hoursPerStandardModel: 1,
      },
      {
        id: 'detail',
        name: '高级细节',
        introducedAtLevelId: 'high',
        requiredSkillRank: 4,
        hoursPerStandardModel: 2,
      },
    ],
    orders: [
      {
        id: 'order',
        name: '旧订单',
        monthlyOrderCount: 3,
        modelsPerOrder: 2,
        complexityMultiplier: 1,
        paintingLevelId: 'high',
        quoteAdjustmentPct: 0,
      },
    ],
  }
}

test('月利润扣除启用的一次性投入折旧', () => {
  const result = calculateStudioProfit({
    settings: {
      monthlyRevenue: 10000,
    },
    fixedCosts: [
      { id: 'rent', name: '房租', amount: 3500 },
      { id: 'utilities', name: '水电', amount: 500 },
    ],
    oneTimeCosts: [
      {
        id: 'fitout',
        name: '装修',
        amount: 12000,
        depreciates: true,
        depreciationMonths: 24,
      },
      {
        id: 'equipment',
        name: '设备',
        amount: 6000,
        depreciates: false,
        depreciationMonths: 12,
      },
    ],
  })

  assert.equal(result.monthlyRevenue, 10000)
  assert.equal(result.monthlyFixedCost, 4000)
  assert.equal(result.oneTimeInvestment, 18000)
  assert.equal(result.monthlyDepreciation, 500)
  assert.equal(result.operatingCashProfit, 6000)
  assert.equal(result.monthlyProfit, 5500)
  assert.equal(result.status, 'profit')
})

test('月营收不足时展示亏损', () => {
  const result = calculateStudioProfit({
    settings: {
      monthlyRevenue: 3000,
    },
    fixedCosts: [{ id: 'rent', name: '房租', amount: 4500 }],
    oneTimeCosts: [],
  })

  assert.equal(result.monthlyProfit, -1500)
  assert.equal(result.status, 'loss')
})

test('回本周期使用折旧前现金结余避免重复扣除投入', () => {
  const result = calculateStudioProfit({
    settings: {
      monthlyRevenue: 10000,
    },
    fixedCosts: [{ id: 'rent', name: '房租', amount: 4000 }],
    oneTimeCosts: [
      {
        id: 'fitout',
        name: '装修',
        amount: 12000,
        depreciates: true,
        depreciationMonths: 24,
      },
      {
        id: 'equipment',
        name: '设备',
        amount: 6000,
        depreciates: true,
        depreciationMonths: 12,
      },
    ],
  })

  assert.equal(result.monthlyDepreciation, 1000)
  assert.equal(result.monthlyProfit, 5000)
  assert.equal(result.operatingCashProfit, 6000)
  assert.equal(result.paybackMonths, 3)
})

test('没有利润时一次性投入无法回本', () => {
  const result = calculateStudioProfit({
    settings: { monthlyRevenue: 4000 },
    fixedCosts: [{ id: 'rent', name: '房租', amount: 4000 }],
    oneTimeCosts: [{ id: 'fitout', name: '装修', amount: 12000 }],
  })

  assert.equal(result.status, 'break-even')
  assert.equal(result.paybackMonths, Infinity)
})

test('模型报价汇总步骤计件成本和预估工时', () => {
  const result = calculateModelQuote({
    externalPrice: 850,
    steps: [
      {
        id: 'base',
        name: '底色',
        pieceworkCost: 200,
        estimatedHours: 1.5,
      },
      {
        id: 'detail',
        name: '细节',
        pieceworkCost: 350,
        estimatedHours: 2.25,
      },
    ],
  })

  assert.equal(result.totalCost, 550)
  assert.equal(result.totalHours, 3.75)
  assert.equal(result.externalPrice, 850)
  assert.equal(result.quoteDifference, 300)
})

test('旧数据补充利润计算输入并保留成本', () => {
  const migrated = parseImportedState(JSON.stringify(createCurrentFixture()))

  assert.equal(migrated.version, SCHEMA_VERSION)
  assert.equal(migrated.settings.monthlyRevenue, 10000)
  assert.equal(Object.hasOwn(migrated.settings, 'showPaybackPeriod'), false)
  assert.equal(migrated.fixedCosts[0].amount, 50)
  assert.equal(migrated.oneTimeCosts[0].amount, 100)
  assert.equal(migrated.oneTimeCosts[0].depreciates, true)
  assert.equal(migrated.oneTimeCosts[0].depreciationMonths, 10)
  assert.equal(migrated.modelQuoteDraft.steps.length, 1)
  assert.deepEqual(migrated.savedModelQuotes, [])
})

test('没有旧折旧信息的一次性投入默认不折旧', () => {
  const state = createCurrentFixture()
  state.version = 14
  delete state.oneTimeCosts[0].depreciationMonths

  const migrated = parseImportedState(JSON.stringify(state))

  assert.equal(migrated.oneTimeCosts[0].depreciates, false)
  assert.equal(migrated.oneTimeCosts[0].depreciationMonths, 36)
})

test('月度人员成本只计入已排产工序的计件工资', () => {
  const result = calculateMargin(createCurrentFixture())

  assert.equal(result.totalEffectiveHours, 31)
  assert.equal(result.pieceworkCost, 510)
  assert.equal(result.employeeResults[0].assignedHours, 11)
  assert.equal(result.employeeResults[0].monthlyPieceworkPay, 110)
  assert.equal(result.employeeResults[1].assignedHours, 20)
  assert.equal(result.employeeResults[1].monthlyPieceworkPay, 400)
})

test('月利润按成交收入减订单费、计件工资和固定支出计算', () => {
  const result = calculateMargin(createCurrentFixture())

  assert.equal(result.expectedMonthlyRevenue, 2000)
  assert.equal(result.variableCost, 200)
  assert.equal(result.netProfit, 1230)
  assert.equal(result.targetProfitGap, 1180)
  assert.ok(Math.abs(result.revenueForTargetProfit - 110 / 0.645) < 1e-9)
})

test('剔除月折旧后不计折旧额', () => {
  const state = createCurrentFixture()
  state.settings.excludeDepreciation = true
  const result = calculateMargin(state)

  assert.equal(result.scheduledDepreciation, 10)
  assert.equal(result.monthlyDepreciation, 0)
  assert.equal(result.netProfit, 1240)
  assert.ok(Math.abs(result.revenueForTargetProfit - 100 / 0.645) < 1e-9)
})

test('费用率达到100%时保本营收不可计算', () => {
  const state = createCurrentFixture()
  state.orderFeeRates[0].ratePct = 100
  const result = calculateMargin(state)

  assert.equal(result.expectedMonthlyRevenue, 2000)
  assert.equal(result.breakEvenRevenue, Infinity)
  assert.equal(result.revenueForTargetProfit, Infinity)
  assert.ok(result.errors.some((message) => message.includes('低于100%')))
})

test('月度订单只按数量乘以单价汇总营收', () => {
  const result = calculateOrderStructure(createCurrentFixture())

  assert.equal(result.totalQuantity, 12)
  assert.equal(result.monthlyRevenue, 2000)
  assert.equal(result.totalPieceworkCost, 510)
  assert.equal(result.totalHours, 31)
  assert.equal(result.averageUnitPrice, 2000 / 12)
})

test('模型报价按工序估时核定不同画师的计件工资', () => {
  const result = calculateQuoteSchemes(createCurrentFixture())
  const scheme = result.schemeResults[0]
  const quote = scheme.modelResults[0]

  assert.equal(quote.unitHours, 3)
  assert.equal(quote.breakdown[0].assignedEmployeeName, '基础画师')
  assert.equal(quote.breakdown[0].pieceworkPay, 10)
  assert.equal(quote.breakdown[1].assignedEmployeeName, '高级画师')
  assert.equal(quote.breakdown[1].pieceworkPay, 40)
  assert.equal(quote.unitPieceworkCost, 50)
  assert.equal(quote.unitPrice, 100)
  assert.equal(quote.unitContributionProfit, 40)
  assert.equal(quote.totalPrice, 300)
  assert.equal(scheme.totalModels, 5)
  assert.equal(scheme.totalPieceworkCost, 160)
  assert.equal(scheme.totalPrice, 320)
})

test('模型报价调整作用于累积价格', () => {
  const state = createCurrentFixture()
  state.quoteSchemes[0].models[0].quoteAdjustmentPct = 20
  const result = calculateQuoteSchemes(state)
  const quote = result.schemeResults[0].modelResults[0]

  assert.equal(quote.unitBasePrice, 100)
  assert.equal(quote.unitPrice, 120)
  assert.equal(quote.unitPieceworkCost, 50)
  assert.equal(result.schemeResults[0].totalPrice, 380)
})

test('工序不能派给技能低于等级门槛的画师', () => {
  const state = createCurrentFixture()
  state.quoteSchemes[0].models[0].processes[1].assignedEmployeeId = 'basic'

  const result = calculateQuoteSchemes(state)

  assert.ok(result.errors.some((message) => (
    message.includes('基础画师') && message.includes('技能不足')
  )))
  assert.ok(calculateMargin(state).errors.some((message) => (
    message.includes('订单') && message.includes('技能不足')
  )))
})

test('目标等级不限制其他等级工序增加报价', () => {
  const state = createCurrentFixture()
  state.quoteSchemes[0].models[0].targetLevelId = 'level-basic'

  const model = calculateQuoteSchemes(state).schemeResults[0].modelResults[0]

  assert.equal(model.targetLevelName, '基础')
  assert.equal(model.unitHours, 3)
  assert.equal(model.unitPrice, 100)
  assert.equal(model.breakdown[1].pieceworkPay, 40)
})

test('旧版倍率与全局工序自动迁移为等级时薪和模型报价', () => {
  const migrated = parseImportedState(JSON.stringify(createLegacyFixture()))

  assert.equal(migrated.version, SCHEMA_VERSION)
  assert.deepEqual(
    migrated.paintingLevels.map((level) => level.name),
    ['基础', '进阶', '高阶'],
  )
  assert.equal(Object.hasOwn(migrated.paintingLevels[0], 'hourlyRate'), false)
  assert.equal(migrated.paintingLevels[2].requiredSkillRank, 3)
  assert.equal(migrated.orders[0].quantity, 6)
  assert.equal(migrated.orders[0].unitPrice, 100)
  assert.equal(migrated.orders[0].paintingLevelId, 'level-high')
  assert.equal(migrated.quoteSchemes[0].models[0].processes[0].name, '共同工序')
  assert.equal(migrated.quoteSchemes[0].models[0].processes[0].hours, 1)
  assert.equal(
    migrated.quoteSchemes[0].models[0].processes[0].assignedEmployeeId,
    'basic',
  )
  assert.equal(
    migrated.quoteSchemes[0].models[0].processes[0].introducedAtLevelId,
    'level-basic',
  )
  assert.equal(migrated.quoteSchemes[0].models[0].processes[1].name, '高级细节')
  assert.equal(migrated.quoteSchemes[0].models[0].processes[1].hours, 2)
  assert.equal(
    migrated.quoteSchemes[0].models[0].processes[1].introducedAtLevelId,
    'level-high',
  )
  assert.equal(migrated.employees[1].name, '主理人 / 高级画师')
  assert.equal(migrated.employees[1].skillRank, 3)
  assert.equal(migrated.employees[1].pieceRate, 20)
  assert.equal(migrated.employees[1].monthlyCapacityHours, 10)
  assert.equal(Object.hasOwn(migrated.employees[1], 'wageCoefficient'), false)
  assert.equal(migrated.oneTimeCosts[0].depreciationMonths, 10)
  assert.equal(migrated.oneTimeCosts[0].depreciates, true)
  assert.equal(Object.hasOwn(migrated.oneTimeCosts[0], 'recoveryMonths'), false)
  assert.equal(migrated.settings.excludeDepreciation, false)
  assert.equal(Object.hasOwn(migrated.settings, 'quoteMultiplier'), false)
  assert.deepEqual(migrated.savedQuotes, [])
})

test('自动保存后再次打开保留新结构参数', () => {
  const previousLocalStorage = globalThis.localStorage
  const values = new Map()
  globalThis.localStorage = {
    getItem(key) {
      return values.has(key) ? values.get(key) : null
    },
    setItem(key, value) {
      values.set(key, String(value))
    },
    removeItem(key) {
      values.delete(key)
    },
  }

  try {
    const state = createCurrentFixture()
    state.employees[0].pieceRate = 188
    state.savedQuotes.push({
      id: 'saved',
      name: '已保存报价',
      finalPrice: 500,
    })
    state.modelQuoteDraft = {
      sourceSavedQuoteId: 'saved-model',
      name: '战车',
      externalPrice: 880,
      steps: [{
        id: 'step',
        name: '涂装',
        pieceworkCost: 500,
        estimatedHours: 4,
      }],
    }
    state.savedModelQuotes = [{
      id: 'saved-model',
      name: '战车',
      externalPrice: 880,
      updatedAt: '2026-09-25T00:00:00.000Z',
      steps: [{
        id: 'step',
        name: '涂装',
        pieceworkCost: 500,
        estimatedHours: 4,
      }],
    }]
    savePersistedState(state)
    const loaded = loadPersistedState()

    assert.equal(loaded.employees[0].pieceRate, 188)
    assert.equal(loaded.savedQuotes[0].name, '已保存报价')
    assert.equal(loaded.modelQuoteDraft.sourceSavedQuoteId, 'saved-model')
    assert.equal(loaded.savedModelQuotes[0].steps[0].pieceworkCost, 500)
    assert.ok(values.has(STORAGE_KEY))
  } finally {
    if (previousLocalStorage === undefined) delete globalThis.localStorage
    else globalThis.localStorage = previousLocalStorage
  }
})

test('保存报价快照包含工序承接人、计件工资和最终价格', () => {
  const schemeResult = calculateQuoteSchemes(createCurrentFixture()).schemeResults[0]
  const snapshot = createSavedQuoteSchemeSnapshot(
    schemeResult,
    '2026-08-24T00:00:00.000Z',
  )

  assert.equal(snapshot.name, '测试报价方案')
  assert.equal(snapshot.sourceSchemeId, 'scheme')
  assert.equal(snapshot.totalModels, 5)
  assert.equal(snapshot.totalHours, 10)
  assert.equal(snapshot.totalPieceworkCost, 160)
  assert.equal(snapshot.totalPrice, 320)
  assert.equal(snapshot.models.length, 2)
  assert.equal(snapshot.models[0].quantity, 3)
  assert.equal(snapshot.models[0].processes[1].assignedEmployeeName, '高级画师')
  assert.equal(snapshot.models[0].processes[1].pieceRate, 20)
  assert.equal(snapshot.models[0].processes[1].pieceworkPay, 40)
  assert.equal(snapshot.savedAt, '2026-08-24T00:00:00.000Z')
})

test('旧保存报价按同名方案补充来源方案ID', () => {
  const state = createCurrentFixture()
  state.version = 9
  state.savedQuotes.push({
    id: 'legacy-saved',
    savedAt: '2026-08-24T00:00:00.000Z',
    name: '测试报价方案',
    totalModels: 1,
    totalHours: 1,
    totalPrice: 100,
    models: [],
  })

  const migrated = parseImportedState(JSON.stringify(state))

  assert.equal(migrated.savedQuotes[0].sourceSchemeId, 'scheme')
})

test('旧数据中的多个报价方案自动合并为一个', () => {
  const state = createCurrentFixture()
  state.version = 10
  state.quoteSchemes.push({
    id: 'second-scheme',
    name: '第二方案',
    models: [{
      id: 'third-model',
      name: '第三个模型',
      quantity: 1,
      targetLevelId: 'level-basic',
      quoteAdjustmentPct: 0,
      processes: [],
    }],
  })
  state.savedQuotes.push({
    id: 'saved-second',
    sourceSchemeId: 'second-scheme',
    savedAt: '2026-08-24T00:00:00.000Z',
    name: '第二方案',
    totalModels: 1,
    totalHours: 0,
    totalPrice: 0,
    models: [],
  })

  const migrated = parseImportedState(JSON.stringify(state))

  assert.equal(migrated.quoteSchemes.length, 1)
  assert.equal(migrated.quoteSchemes[0].models.length, 3)
  assert.equal(
    migrated.savedQuotes[0].sourceSchemeId,
    migrated.quoteSchemes[0].id,
  )
})
