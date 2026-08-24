export const SCHEMA_VERSION = 11

export const SKILL_LEVELS = [
  { rank: 1, name: '基础' },
  { rank: 2, name: '中级' },
  { rank: 3, name: '高级' },
]

export const defaultState = {
  version: SCHEMA_VERSION,
  settings: {
    expectedMonthlyRevenue: 29820.07575757576,
    targetMonthlyProfit: 0,
    excludeDepreciation: false,
  },
  employees: [
    {
      id: 'employee-basic',
      name: '基础画师',
      fullTime: true,
      skillRank: 1,
      effectiveDays: 20,
      effectiveHoursPerDay: 8,
      wageCoefficient: 30,
    },
    {
      id: 'employee-senior',
      name: '高级画师',
      fullTime: true,
      skillRank: 3,
      effectiveDays: 20,
      effectiveHoursPerDay: 8,
      wageCoefficient: 55,
    },
    {
      id: 'employee-master',
      name: '主理人 / 高级画师',
      fullTime: false,
      skillRank: 3,
      effectiveDays: 10,
      effectiveHoursPerDay: 4,
      wageCoefficient: 90,
    },
  ],
  oneTimeCosts: [
    { id: 'investment-fitout', name: '装修与排风', amount: 30000, depreciationMonths: 24 },
    { id: 'investment-equipment', name: '喷笔、空压机、灯光与设备', amount: 15000, depreciationMonths: 24 },
    { id: 'investment-supplies', name: '开业耗材与包装库存', amount: 8000, depreciationMonths: 12 },
  ],
  fixedCosts: [
    { id: 'fixed-rent', name: '房租', amount: 4500 },
    { id: 'fixed-utilities', name: '水电、空调与除湿', amount: 800 },
    { id: 'fixed-network', name: '网络与通讯', amount: 200 },
    { id: 'fixed-software', name: '软件与工具订阅', amount: 200 },
    { id: 'fixed-maintenance', name: '设备维护', amount: 300 },
    { id: 'fixed-marketing', name: '基础推广', amount: 500 },
  ],
  orderFeeRates: [
    { id: 'fee-materials', name: '持续耗材消耗', ratePct: 5 },
    { id: 'fee-shipping', name: '包装与运费', ratePct: 3 },
    { id: 'fee-returns', name: '退货与返工准备', ratePct: 2 },
    { id: 'fee-platform', name: '平台与支付手续费', ratePct: 2 },
  ],
  paintingLevels: [
    { id: 'level-basic', name: '基础', rank: 1, hourlyRate: 100, requiredSkillRank: 1 },
    { id: 'level-advanced', name: '进阶', rank: 2, hourlyRate: 220, requiredSkillRank: 2 },
    { id: 'level-high', name: '高阶', rank: 3, hourlyRate: 350, requiredSkillRank: 3 },
  ],
  orders: [
    {
      id: 'order-infantry',
      name: '普通步兵',
      quantity: 60,
      paintingLevelId: 'level-advanced',
      unitPrice: 210,
    },
    {
      id: 'order-character',
      name: '角色模型',
      quantity: 8,
      paintingLevelId: 'level-advanced',
      unitPrice: 1050,
    },
    {
      id: 'order-vehicle',
      name: '载具模型',
      quantity: 4,
      paintingLevelId: 'level-advanced',
      unitPrice: 850,
    },
    {
      id: 'order-display',
      name: '高阶中心模型',
      quantity: 2,
      paintingLevelId: 'level-high',
      unitPrice: 2860,
    },
  ],
  savedQuotes: [],
  quoteSchemes: [
    {
      id: 'scheme-default',
      name: '示例报价方案',
      models: [{
      id: 'quote-infantry',
      name: '普通步兵',
      quantity: 10,
      targetLevelId: 'level-advanced',
      quoteAdjustmentPct: 0,
      processes: [
        { id: 'quote-infantry-prep', name: '前处理与组装', introducedAtLevelId: 'level-basic', hours: 0.4 },
        { id: 'quote-infantry-base', name: '底漆、主色与基础明暗', introducedAtLevelId: 'level-basic', hours: 0.8 },
        { id: 'quote-infantry-tabletop', name: '细节与高光', introducedAtLevelId: 'level-advanced', hours: 1 },
        { id: 'quote-infantry-premium', name: '精细刻画与渐变', introducedAtLevelId: 'level-advanced', hours: 1.8 },
        { id: 'quote-infantry-display', name: '高阶最终修饰', introducedAtLevelId: 'level-high', hours: 3.5 },
      ],
      },
      {
      id: 'quote-character',
      name: '角色模型',
      quantity: 1,
      targetLevelId: 'level-advanced',
      quoteAdjustmentPct: 0,
      processes: [
        { id: 'quote-character-prep', name: '前处理与组装', introducedAtLevelId: 'level-basic', hours: 0.8 },
        { id: 'quote-character-base', name: '底漆、主色与基础明暗', introducedAtLevelId: 'level-basic', hours: 1.6 },
        { id: 'quote-character-tabletop', name: '细节与高光', introducedAtLevelId: 'level-advanced', hours: 2 },
        { id: 'quote-character-premium', name: '面部、渐变与重点效果', introducedAtLevelId: 'level-advanced', hours: 3.6 },
        { id: 'quote-character-display', name: '高阶最终修饰', introducedAtLevelId: 'level-high', hours: 7 },
      ],
      },
      {
      id: 'quote-vehicle',
      name: '载具模型',
      quantity: 1,
      targetLevelId: 'level-advanced',
      quoteAdjustmentPct: 0,
      processes: [
        { id: 'quote-vehicle-prep', name: '前处理与组装', introducedAtLevelId: 'level-basic', hours: 1.6 },
        { id: 'quote-vehicle-base', name: '底漆、主色与基础明暗', introducedAtLevelId: 'level-basic', hours: 3.2 },
        { id: 'quote-vehicle-tabletop', name: '面板细节与高光', introducedAtLevelId: 'level-advanced', hours: 4 },
        { id: 'quote-vehicle-premium', name: '旧化与复杂效果', introducedAtLevelId: 'level-advanced', hours: 7.2 },
        { id: 'quote-vehicle-display', name: '高阶最终修饰', introducedAtLevelId: 'level-high', hours: 14 },
      ],
      }],
    },
  ],
}

export function cloneState(value = defaultState) {
  return JSON.parse(JSON.stringify(value))
}

export function createId(prefix) {
  const suffix = globalThis.crypto?.randomUUID?.()
    ?? `${Date.now()}-${Math.random().toString(16).slice(2)}`
  return `${prefix}-${suffix}`
}

function assertArray(value, name) {
  if (!Array.isArray(value)) {
    throw new Error(`${name} 必须是数组`)
  }
}

function nonNegative(value) {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? Math.max(0, parsed) : 0
}

function legacyQualifiedCoefficient(employees, requiredSkillRank) {
  const coefficients = employees
    .filter((employee) => (
      Number(employee.skillRank) >= requiredSkillRank
      && nonNegative(employee.effectiveDays)
        * nonNegative(employee.effectiveHoursPerDay) > 0
    ))
    .map((employee) => nonNegative(employee.wageCoefficient))

  return coefficients.length > 0 ? Math.min(...coefficients) : null
}

function migrateLegacyPricing(state) {
  const legacyStages = state.stages
  const legacyOrders = state.orders
  const levelMap = new Map(state.paintingLevels.map((level) => [level.id, level]))
  const quoteMultiplier = nonNegative(state.settings.quoteMultiplier)
  const minimumOrderPrice = nonNegative(state.settings.minimumOrderPrice)
  const fallbackRates = [100, 150, 220, 350]

  state.paintingLevels = state.paintingLevels.map((level, index) => {
    const introducedStages = legacyStages.filter(
      (stage) => stage.introducedAtLevelId === level.id,
    )
    const requiredSkillRank = introducedStages.length > 0
      ? Math.max(...introducedStages.map((stage) => Number(stage.requiredSkillRank) || 1))
      : Math.min(SKILL_LEVELS.length, Math.max(1, Number(level.rank) || 1))
    const wageCoefficient = legacyQualifiedCoefficient(
      state.employees,
      requiredSkillRank,
    )

    return {
      ...level,
      hourlyRate: wageCoefficient === null || quoteMultiplier <= 0
        ? fallbackRates[index] ?? fallbackRates.at(-1)
        : wageCoefficient * quoteMultiplier,
      requiredSkillRank,
    }
  })

  state.modelQuotes = legacyOrders.map((order) => {
    const complexity = nonNegative(order.complexityMultiplier)
    return {
      id: `quote-${order.id}`,
      name: order.name,
      targetLevelId: order.paintingLevelId,
      quoteAdjustmentPct: Number(order.quoteAdjustmentPct) || 0,
      processes: legacyStages.map((stage) => ({
        id: `quote-${order.id}-${stage.id}`,
        name: stage.name,
        introducedAtLevelId: stage.introducedAtLevelId,
        hours: nonNegative(stage.hoursPerStandardModel) * complexity,
      })),
    }
  })

  state.orders = legacyOrders.map((order) => {
    const targetLevel = levelMap.get(order.paintingLevelId)
    const targetRank = Number(targetLevel?.rank) || 0
    const modelsPerOrder = nonNegative(order.modelsPerOrder)
    const complexity = nonNegative(order.complexityMultiplier)
    const laborValue = legacyStages.reduce((sum, stage) => {
      const introducedRank = Number(
        levelMap.get(stage.introducedAtLevelId)?.rank,
      ) || Infinity
      if (introducedRank > targetRank) return sum

      const coefficient = legacyQualifiedCoefficient(
        state.employees,
        Number(stage.requiredSkillRank) || 1,
      )
      return sum + (
        nonNegative(stage.hoursPerStandardModel)
        * modelsPerOrder
        * complexity
        * (coefficient ?? 0)
      )
    }, 0)
    const adjustment = Math.max(
      0,
      1 + (Number(order.quoteAdjustmentPct) || 0) / 100,
    )
    const orderPrice = Math.max(
      minimumOrderPrice,
      laborValue * quoteMultiplier * adjustment,
    )

    return {
      id: order.id,
      name: order.name,
      quantity: nonNegative(order.monthlyOrderCount) * modelsPerOrder,
      paintingLevelId: order.paintingLevelId,
      unitPrice: modelsPerOrder > 0 ? orderPrice / modelsPerOrder : 0,
    }
  })

  delete state.stages
  delete state.settings.quoteMultiplier
  delete state.settings.minimumOrderPrice
}

function migrateQuoteSchemes(state) {
  if (!Array.isArray(state.quoteSchemes)) {
    const legacyModels = Array.isArray(state.modelQuotes)
      ? state.modelQuotes
      : []
    state.quoteSchemes = legacyModels.length > 0
      ? [{
        id: 'scheme-migrated',
        name: '迁移报价方案',
        models: legacyModels.map((model) => ({
          ...model,
          quantity: nonNegative(model.quantity) || 1,
        })),
      }]
      : []
  }
  delete state.modelQuotes
}

function migrateSavedQuotes(state) {
  state.savedQuotes = state.savedQuotes.map((quote) => {
    const migratedQuote = Array.isArray(quote.models) ? quote : {
      id: quote.id,
      savedAt: quote.savedAt,
      name: quote.name,
      totalModels: 1,
      totalHours: nonNegative(quote.totalHours),
      totalPrice: nonNegative(quote.finalPrice),
      models: [{
        name: quote.name,
        quantity: 1,
        targetLevelId: quote.targetLevelId,
        targetLevelName: quote.targetLevelName,
        unitHours: nonNegative(quote.totalHours),
        unitPrice: nonNegative(quote.finalPrice),
        totalHours: nonNegative(quote.totalHours),
        totalPrice: nonNegative(quote.finalPrice),
        quoteAdjustmentPct: Number(quote.quoteAdjustmentPct) || 0,
        processes: Array.isArray(quote.processes) ? quote.processes : [],
      }],
    }
    if (!Object.hasOwn(migratedQuote, 'sourceSchemeId')) {
      migratedQuote.sourceSchemeId = state.quoteSchemes.find(
        (scheme) => scheme.name === migratedQuote.name,
      )?.id ?? null
    }
    return migratedQuote
  })
}

function normalizeSingleQuoteScheme(state) {
  if (state.quoteSchemes.length === 0) {
    state.quoteSchemes.push({
      id: 'scheme-main',
      name: '报价方案',
      models: [],
    })
    return
  }

  const primary = state.quoteSchemes[0]
  const mergedSchemeIds = new Set(
    state.quoteSchemes.map((scheme) => scheme.id),
  )
  state.quoteSchemes.slice(1).forEach((scheme) => {
    primary.models.push(...scheme.models)
  })
  state.savedQuotes.forEach((quote) => {
    if (mergedSchemeIds.has(quote.sourceSchemeId)) {
      quote.sourceSchemeId = primary.id
    }
  })
  state.quoteSchemes = [primary]
}

function normalizeFixedPaintingLevels(state) {
  const previousLevels = [...state.paintingLevels]
    .sort((left, right) => Number(left.rank) - Number(right.rank))
  const groups = {
    basic: previousLevels.length > 0 ? [previousLevels[0]] : [],
    advanced: previousLevels.length > 2
      ? previousLevels.slice(1, -1)
      : [],
    high: previousLevels.length > 1
      ? [previousLevels.at(-1)]
      : [],
  }
  if (previousLevels.length === 2) {
    groups.advanced = []
  }

  const definitions = [
    {
      key: 'basic',
      id: 'level-basic',
      name: '基础',
      rank: 1,
      defaultRate: 100,
      defaultSkill: 1,
    },
    {
      key: 'advanced',
      id: 'level-advanced',
      name: '进阶',
      rank: 2,
      defaultRate: 220,
      defaultSkill: 2,
    },
    {
      key: 'high',
      id: 'level-high',
      name: '高阶',
      rank: 3,
      defaultRate: 350,
      defaultSkill: 3,
    },
  ]
  const idMap = new Map()
  definitions.forEach((definition) => {
    groups[definition.key].forEach((level) => {
      idMap.set(level.id, definition.id)
    })
  })

  state.paintingLevels = definitions.map((definition) => {
    const sourceLevels = groups[definition.key]
    return {
      id: definition.id,
      name: definition.name,
      rank: definition.rank,
      hourlyRate: sourceLevels.length > 0
        ? Math.max(...sourceLevels.map((level) => nonNegative(level.hourlyRate)))
        : definition.defaultRate,
      requiredSkillRank: sourceLevels.length > 0
        ? Math.max(...sourceLevels.map((level) => (
          Math.max(
            1,
            Math.min(
              SKILL_LEVELS.length,
              Number(level.requiredSkillRank) || 1,
            ),
          )
        )))
        : definition.defaultSkill,
    }
  })

  state.orders.forEach((order) => {
    order.paintingLevelId = idMap.get(order.paintingLevelId)
      ?? 'level-basic'
  })
  state.quoteSchemes.forEach((scheme) => {
    scheme.models.forEach((model) => {
      model.targetLevelId = idMap.get(model.targetLevelId)
        ?? 'level-basic'
      model.processes.forEach((process) => {
        process.introducedAtLevelId = idMap.get(process.introducedAtLevelId)
          ?? 'level-basic'
      })
    })
  })
}

export function validateImportedState(candidate) {
  if (!candidate || typeof candidate !== 'object') {
    throw new Error('文件内容不是有效对象')
  }
  const migrated = cloneState(candidate)
  const sourceVersion = Number(migrated.version)
  if (![1, 2, 3, 4, 5, 6, 7, 8, 9, 10, SCHEMA_VERSION].includes(sourceVersion)) {
    throw new Error(`不支持的数据版本：${migrated.version ?? '未知'}`)
  }
  if (sourceVersion === 1) {
    migrated.settings = {
      ...migrated.settings,
      expectedMonthlyRevenue: null,
    }
  }
  if (!migrated.settings || typeof migrated.settings !== 'object') {
    throw new Error('缺少 settings')
  }
  if (!Object.hasOwn(migrated.settings, 'expectedMonthlyRevenue')) {
    migrated.settings.expectedMonthlyRevenue = null
  }
  if (!Object.hasOwn(migrated.settings, 'targetMonthlyProfit')) {
    migrated.settings.targetMonthlyProfit = null
  }
  delete migrated.settings.revenueSyncMode
  if (!Object.hasOwn(migrated.settings, 'excludeDepreciation')) {
    migrated.settings.excludeDepreciation = Boolean(
      migrated.settings.excludeOneTimeCosts,
    )
  }
  delete migrated.settings.excludeOneTimeCosts
  assertArray(migrated.employees, 'employees')
  assertArray(migrated.oneTimeCosts, 'oneTimeCosts')
  assertArray(migrated.fixedCosts, 'fixedCosts')
  assertArray(migrated.orderFeeRates, 'orderFeeRates')
  assertArray(migrated.paintingLevels, 'paintingLevels')
  assertArray(migrated.orders, 'orders')
  if (sourceVersion < 5) {
    assertArray(migrated.stages, 'stages')
    migrateLegacyPricing(migrated)
  }
  migrateQuoteSchemes(migrated)
  assertArray(migrated.quoteSchemes, 'quoteSchemes')
  if (!Object.hasOwn(migrated, 'savedQuotes')) {
    migrated.savedQuotes = []
  }
  assertArray(migrated.savedQuotes, 'savedQuotes')
  migrateSavedQuotes(migrated)

  migrated.employees.forEach((employee) => {
    employee.skillRank = Math.max(
      1,
      Math.min(SKILL_LEVELS.length, Number(employee.skillRank) || 1),
    )
    if (employee.name === '主理人 / 大师画师') {
      employee.name = '主理人 / 高级画师'
    }
  })
  migrated.paintingLevels.forEach((level) => {
    level.hourlyRate = nonNegative(level.hourlyRate)
    level.requiredSkillRank = Math.max(
      1,
      Math.min(SKILL_LEVELS.length, Number(level.requiredSkillRank) || 1),
    )
  })
  migrated.orders.forEach((order) => {
    order.quantity = nonNegative(order.quantity)
    order.unitPrice = nonNegative(order.unitPrice)
  })
  migrated.oneTimeCosts.forEach((item) => {
    if (!Object.hasOwn(item, 'depreciationMonths')) {
      item.depreciationMonths = nonNegative(item.recoveryMonths)
    }
    delete item.recoveryMonths
  })
  migrated.quoteSchemes.forEach((scheme) => {
    if (!Array.isArray(scheme.models)) {
      scheme.models = []
    }
    scheme.models.forEach((model) => {
      model.quantity = nonNegative(model.quantity) || 1
      if (!Array.isArray(model.processes)) {
        const legacyHours = model.hoursByLevel
          && typeof model.hoursByLevel === 'object'
          ? model.hoursByLevel
          : {}
        model.processes = migrated.paintingLevels.map((level) => ({
          id: `${model.id}-${level.id}`,
          name: `${level.name}新增工序`,
          introducedAtLevelId: level.id,
          hours: nonNegative(legacyHours[level.id]),
        }))
      }
      model.processes.forEach((process) => {
        process.hours = nonNegative(process.hours)
      })
      delete model.hoursByLevel
      model.quoteAdjustmentPct = Number(model.quoteAdjustmentPct) || 0
    })
  })
  normalizeSingleQuoteScheme(migrated)
  normalizeFixedPaintingLevels(migrated)
  migrated.version = SCHEMA_VERSION

  return migrated
}
