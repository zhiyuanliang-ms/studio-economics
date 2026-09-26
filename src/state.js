export const SCHEMA_VERSION = 16

export const SKILL_LEVELS = [
  { rank: 1, name: '基础' },
  { rank: 2, name: '中级' },
  { rank: 3, name: '高级' },
]

export const defaultState = {
  version: SCHEMA_VERSION,
  settings: {
    monthlyRevenue: 10000,
    expectedMonthlyRevenue: 0,
    targetMonthlyProfit: 5000,
    targetContributionMarginPct: 45,
    excludeDepreciation: false,
  },
  employees: [
    {
      id: 'employee-basic',
      name: '首席',
      fullTime: true,
      skillRank: 3,
      monthlyCapacityHours: 160,
      pieceRate: 40,
    },
    {
      id: 'employee-senior',
      name: '全职画师1',
      fullTime: true,
      skillRank: 1,
      monthlyCapacityHours: 160,
      pieceRate: 15,
    },
  ],
  oneTimeCosts: [
    {
      id: 'investment-fitout',
      name: '装修',
      amount: 30000,
      depreciates: true,
      depreciationMonths: 60,
    },
    {
      id: 'investment-equipment',
      name: '设备',
      amount: 10000,
      depreciates: true,
      depreciationMonths: 60,
    },
  ],
  fixedCosts: [
    { id: 'fixed-rent', name: '房租', amount: 3500 },
    { id: 'fixed-utilities', name: '杂项', amount: 1000 },
  ],
  modelQuoteDraft: {
    sourceSavedQuoteId: null,
    name: '',
    externalPrice: 0,
    steps: [
      {
        id: 'model-quote-step-initial',
        name: '步骤 1',
        pieceworkCost: 0,
        estimatedHours: 0,
      },
    ],
  },
  savedModelQuotes: [],
  orderFeeRates: [
    { id: 'fee-materials', name: '持续耗材消耗', ratePct: 0.25 },
    { id: 'fee-shipping', name: '包装与运费', ratePct: 0.3 },
    { id: 'fee-platform', name: '平台与支付手续费', ratePct: 0 },
  ],
  paintingLevels: [
    { id: 'level-basic', name: '基础', rank: 1, requiredSkillRank: 1 },
    { id: 'level-advanced', name: '进阶', rank: 2, requiredSkillRank: 2 },
    { id: 'level-high', name: '高阶', rank: 3, requiredSkillRank: 3 },
  ],
  orders: [],
  savedQuotes: [],
  quoteSchemes: [
    {
      id: 'scheme-e48f787a-4106-4773-8ec2-24a7c8d83261',
      name: '方案1',
      models: [{
        id: 'model-a32d5147-fa8a-46b2-b79c-984a18b6fb79',
        name: '仲裁者',
        quantity: 1,
        targetLevelId: 'level-advanced',
        quoteAdjustmentPct: 1,
        processes: [
          {
            id: 'process-f82a47d7-ea07-49ee-b23a-a649b26d3bc2',
            name: '工序1',
            introducedAtLevelId: 'level-basic',
            assignedEmployeeId: 'employee-senior',
            hours: 0.5,
          },
          {
            id: 'process-c025da2e-7d70-40da-b2c3-6254d3165cd2',
            name: '工序2',
            introducedAtLevelId: 'level-basic',
            assignedEmployeeId: 'employee-senior',
            hours: 1,
          },
          {
            id: 'process-6972a9c7-bf3a-4b14-ab7b-7e462630c6c3',
            name: '工序3',
            introducedAtLevelId: 'level-advanced',
            assignedEmployeeId: 'employee-basic',
            hours: 1,
          },
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

function normalizePieceworkState(state, sourceVersion) {
  if (!Object.hasOwn(state.settings, 'targetContributionMarginPct')) {
    state.settings.targetContributionMarginPct = 45
  }
  state.settings.targetContributionMarginPct = nonNegative(
    state.settings.targetContributionMarginPct,
  )

  state.employees.forEach((employee) => {
    if (!Object.hasOwn(employee, 'pieceRate')) {
      employee.pieceRate = nonNegative(employee.wageCoefficient)
    }
    if (!Object.hasOwn(employee, 'monthlyCapacityHours')) {
      employee.monthlyCapacityHours = nonNegative(employee.effectiveDays)
        * nonNegative(employee.effectiveHoursPerDay)
    }
    employee.pieceRate = nonNegative(employee.pieceRate)
    employee.monthlyCapacityHours = nonNegative(employee.monthlyCapacityHours)
    delete employee.wageCoefficient
    delete employee.effectiveDays
    delete employee.effectiveHoursPerDay
  })

  const levelMap = new Map(
    state.paintingLevels.map((level) => [level.id, level]),
  )
  const employeeMap = new Map(
    state.employees.map((employee) => [employee.id, employee]),
  )
  const pickPainter = (levelId) => {
    const requiredSkillRank = Number(
      levelMap.get(levelId)?.requiredSkillRank,
    ) || 1
    return [...state.employees]
      .filter((employee) => Number(employee.skillRank) >= requiredSkillRank)
      .sort((left, right) => left.pieceRate - right.pieceRate)[0]?.id ?? null
  }

  const models = state.quoteSchemes.flatMap((scheme) => scheme.models)
  const modelMap = new Map(models.map((model) => [model.id, model]))
  state.quoteSchemes.forEach((scheme) => {
    scheme.models.forEach((model) => {
      model.processes.forEach((process) => {
        if (
          sourceVersion < 12
          || !employeeMap.has(process.assignedEmployeeId)
        ) {
          process.assignedEmployeeId = pickPainter(
            process.introducedAtLevelId,
          )
        }
      })
    })
  })

  state.orders.forEach((order) => {
    if (!modelMap.has(order.quoteModelId)) {
      order.quoteModelId = models.find(
        (model) => model.name === order.name,
      )?.id ?? null
    }
  })

  state.savedQuotes.forEach((quote) => {
    quote.models.forEach((model) => {
      model.processes.forEach((process) => {
        if (!process.assignedEmployeeId) {
          process.assignedEmployeeId = pickPainter(process.levelId)
        }
        const employee = employeeMap.get(process.assignedEmployeeId)
        if (!process.assignedEmployeeName && employee) {
          process.assignedEmployeeName = employee.name
        }
        if (!Object.hasOwn(process, 'pieceRate')) {
          process.pieceRate = nonNegative(employee?.pieceRate)
        }
        if (!Object.hasOwn(process, 'pieceworkPay')) {
          process.pieceworkPay = nonNegative(process.hours)
            * nonNegative(process.pieceRate)
        }
        delete process.hourlyRate
      })
      if (!Object.hasOwn(model, 'unitPieceworkCost')) {
        model.unitPieceworkCost = model.processes.reduce(
          (sum, process) => sum + nonNegative(process.pieceworkPay),
          0,
        )
      }
      model.totalPieceworkCost = nonNegative(model.unitPieceworkCost)
        * nonNegative(model.quantity)
    })
    quote.totalPieceworkCost = quote.models.reduce(
      (sum, model) => sum + nonNegative(model.totalPieceworkCost),
      0,
    )
  })

  state.paintingLevels.forEach((level) => {
    delete level.hourlyRate
  })
}

function normalizeProfitSettings(state) {
  if (!Object.hasOwn(state.settings, 'monthlyRevenue')) {
    const legacyRevenue = Number(state.settings.expectedMonthlyRevenue)
    state.settings.monthlyRevenue = Number.isFinite(legacyRevenue)
      && legacyRevenue > 0
      ? legacyRevenue
      : defaultState.settings.monthlyRevenue
  }
  state.settings.monthlyRevenue = nonNegative(state.settings.monthlyRevenue)
  delete state.settings.showPaybackPeriod
}

function normalizeModelQuoteStep(step, index, prefix) {
  const candidate = step && typeof step === 'object' ? step : {}
  return {
    id: String(candidate.id || `${prefix}-step-${index + 1}`),
    name: String(candidate.name ?? ''),
    pieceworkCost: nonNegative(candidate.pieceworkCost),
    estimatedHours: nonNegative(candidate.estimatedHours),
  }
}

function normalizeModelQuoteState(state) {
  const defaultDraft = defaultState.modelQuoteDraft
  const draft = state.modelQuoteDraft
    && typeof state.modelQuoteDraft === 'object'
    ? state.modelQuoteDraft
    : cloneState(defaultDraft)
  const draftSteps = Array.isArray(draft.steps)
    ? draft.steps
    : cloneState(defaultDraft.steps)

  state.modelQuoteDraft = {
    sourceSavedQuoteId: typeof draft.sourceSavedQuoteId === 'string'
      ? draft.sourceSavedQuoteId
      : null,
    name: String(draft.name ?? ''),
    externalPrice: nonNegative(draft.externalPrice),
    steps: draftSteps.map((step, index) => (
      normalizeModelQuoteStep(step, index, 'draft')
    )),
  }

  const savedQuotes = Array.isArray(state.savedModelQuotes)
    ? state.savedModelQuotes
    : []
  state.savedModelQuotes = savedQuotes.map((quote, index) => {
    const candidate = quote && typeof quote === 'object' ? quote : {}
    const id = String(candidate.id || `saved-model-quote-${index + 1}`)
    return {
      id,
      name: String(candidate.name ?? ''),
      externalPrice: nonNegative(candidate.externalPrice),
      updatedAt: String(candidate.updatedAt ?? ''),
      steps: (Array.isArray(candidate.steps) ? candidate.steps : [])
        .map((step, stepIndex) => (
          normalizeModelQuoteStep(step, stepIndex, id)
        )),
    }
  })

  const savedIds = new Set(state.savedModelQuotes.map((quote) => quote.id))
  if (!savedIds.has(state.modelQuoteDraft.sourceSavedQuoteId)) {
    state.modelQuoteDraft.sourceSavedQuoteId = null
  }
}

export function validateImportedState(candidate) {
  if (!candidate || typeof candidate !== 'object') {
    throw new Error('文件内容不是有效对象')
  }
  const migrated = cloneState(candidate)
  const sourceVersion = Number(migrated.version)
  if (![1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, SCHEMA_VERSION].includes(sourceVersion)) {
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
    const depreciationMonths = Object.hasOwn(item, 'depreciationMonths')
      ? nonNegative(item.depreciationMonths)
      : nonNegative(item.recoveryMonths)
    item.depreciates = Object.hasOwn(item, 'depreciates')
      ? Boolean(item.depreciates)
      : depreciationMonths > 0
    item.depreciationMonths = depreciationMonths > 0
      ? depreciationMonths
      : 36
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
  normalizePieceworkState(migrated, sourceVersion)
  normalizeProfitSettings(migrated)
  normalizeModelQuoteState(migrated)
  migrated.version = SCHEMA_VERSION

  return migrated
}
