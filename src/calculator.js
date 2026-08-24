const EPSILON = 1e-9

function number(value) {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : 0
}

function nonNegative(value) {
  return Math.max(0, number(value))
}

function employeeCapacity(employee) {
  return nonNegative(employee.effectiveDays)
    * nonNegative(employee.effectiveHoursPerDay)
}

function employeeMonthlyWage(employee) {
  return employeeCapacity(employee) * nonNegative(employee.wageCoefficient)
}

function uniqueRanks(levels) {
  return new Set(levels.map((level) => number(level.rank)))
}

export function calculateMargin(state) {
  const errors = []
  const employees = state.employees ?? []
  const targetMonthlyProfit = number(state.settings?.targetMonthlyProfit)

  const employeeResults = employees.map((employee) => {
    const capacityHours = employeeCapacity(employee)
    return {
      employeeId: employee.id,
      employeeName: employee.name,
      employmentType: employee.fullTime ? '全职' : '兼职',
      skillRank: number(employee.skillRank),
      capacityHours,
      wageCoefficient: nonNegative(employee.wageCoefficient),
      monthlyWage: employeeMonthlyWage(employee),
    }
  })

  const salaryCost = employeeResults
    .reduce((sum, employee) => sum + employee.monthlyWage, 0)
  const fixedCost = (state.fixedCosts ?? [])
    .reduce((sum, item) => sum + nonNegative(item.amount), 0)
  const oneTimeInvestment = (state.oneTimeCosts ?? [])
    .reduce((sum, item) => sum + nonNegative(item.amount), 0)
  const scheduledDepreciation = (state.oneTimeCosts ?? [])
    .reduce((sum, item) => {
      const months = nonNegative(item.depreciationMonths)
      return sum + (months > EPSILON ? nonNegative(item.amount) / months : 0)
    }, 0)
  const excludeDepreciation = Boolean(state.settings?.excludeDepreciation)
  const monthlyDepreciation = excludeDepreciation
    ? 0
    : scheduledDepreciation

  const totalFeeRatePct = (state.orderFeeRates ?? [])
    .reduce((sum, fee) => sum + nonNegative(fee.ratePct), 0)
  const totalFeeRate = totalFeeRatePct / 100
  const contributionMarginRate = 1 - totalFeeRate

  if (totalFeeRate >= 1) {
    errors.push('订单额外费用率合计必须低于100%')
  }

  const monthlyCommitment = salaryCost + fixedCost + monthlyDepreciation
  const operatingMonthlyCommitment = salaryCost + fixedCost
  const expectedMonthlyRevenue = contributionMarginRate > EPSILON
    ? (monthlyCommitment + targetMonthlyProfit) / contributionMarginRate
    : Infinity
  const variableCost = expectedMonthlyRevenue * totalFeeRate
  const operatingProfit = (
    expectedMonthlyRevenue - variableCost - salaryCost - fixedCost
  )
  const netProfit = operatingProfit - monthlyDepreciation
  const breakEvenRevenue = contributionMarginRate > EPSILON
    ? monthlyCommitment / contributionMarginRate
    : Infinity
  const operatingBreakEvenRevenue = contributionMarginRate > EPSILON
    ? operatingMonthlyCommitment / contributionMarginRate
    : Infinity
  const revenueForTargetProfit = contributionMarginRate > EPSILON
    ? (monthlyCommitment + targetMonthlyProfit) / contributionMarginRate
    : Infinity
  const totalEffectiveHours = employeeResults
    .reduce((sum, employee) => sum + employee.capacityHours, 0)
  const expectedRevenuePerEffectiveHour = totalEffectiveHours > EPSILON
    ? expectedMonthlyRevenue / totalEffectiveHours
    : 0
  const breakEvenRevenuePerEffectiveHour = totalEffectiveHours > EPSILON
    ? breakEvenRevenue / totalEffectiveHours
    : Infinity

  const feeResults = (state.orderFeeRates ?? []).map((fee) => ({
    feeId: fee.id,
    feeName: fee.name,
    ratePct: nonNegative(fee.ratePct),
    cost: expectedMonthlyRevenue * nonNegative(fee.ratePct) / 100,
  }))

  return {
    errors,
    employeeResults,
    feeResults,
    expectedMonthlyRevenue,
    targetMonthlyProfit,
    salaryCost,
    fixedCost,
    oneTimeInvestment,
    scheduledDepreciation,
    excludeDepreciation,
    monthlyDepreciation,
    totalFeeRatePct,
    totalFeeRate,
    contributionMarginRate,
    variableCost,
    operatingProfit,
    netProfit,
    monthlyCommitment,
    breakEvenRevenue,
    operatingBreakEvenRevenue,
    revenueForTargetProfit,
    totalEffectiveHours,
    expectedRevenuePerEffectiveHour,
    breakEvenRevenuePerEffectiveHour,
    profitMargin: expectedMonthlyRevenue > EPSILON
      ? netProfit / expectedMonthlyRevenue
      : 0,
  }
}

export function calculateOrderStructure(state) {
  const errors = []
  const levels = state.paintingLevels ?? []
  const levelMap = new Map(levels.map((level) => [level.id, level]))
  const orderResults = []
  let monthlyRevenue = 0
  let totalQuantity = 0

  for (const order of state.orders ?? []) {
    const level = levelMap.get(order.paintingLevelId)
    if (!level) {
      errors.push(`订单“${order.name}”未选择有效涂装等级`)
      continue
    }

    const quantity = nonNegative(order.quantity)
    const unitPrice = nonNegative(order.unitPrice)
    const revenue = quantity * unitPrice
    monthlyRevenue += revenue
    totalQuantity += quantity
    orderResults.push({
      orderId: order.id,
      orderName: order.name,
      quantity,
      paintingLevelId: level.id,
      paintingLevelName: level.name,
      unitPrice,
      revenue,
    })
  }

  const revenueByLevel = [...levels]
    .sort((left, right) => number(left.rank) - number(right.rank))
    .map((level) => ({
      levelId: level.id,
      levelName: level.name,
      quantity: orderResults
        .filter((order) => order.paintingLevelId === level.id)
        .reduce((sum, order) => sum + order.quantity, 0),
      revenue: orderResults
        .filter((order) => order.paintingLevelId === level.id)
        .reduce((sum, order) => sum + order.revenue, 0),
    }))

  return {
    errors: [...new Set(errors)],
    orderResults,
    revenueByLevel,
    monthlyRevenue,
    totalQuantity,
    averageUnitPrice: totalQuantity > EPSILON
      ? monthlyRevenue / totalQuantity
      : 0,
  }
}

export function calculateQuoteSchemes(state) {
  const errors = []
  const levels = [...(state.paintingLevels ?? [])]
    .sort((left, right) => number(left.rank) - number(right.rank))
  const levelMap = new Map(levels.map((level) => [level.id, level]))

  if (uniqueRanks(levels).size !== levels.length) {
    errors.push('涂装等级的顺序值不能重复')
  }

  const schemeResults = (state.quoteSchemes ?? []).map((scheme) => {
    const modelResults = (scheme.models ?? []).map((model) => {
      const targetLevel = levelMap.get(model.targetLevelId)
      if (!targetLevel) {
        errors.push(`模型“${model.name}”未选择有效的目标涂装等级`)
        return null
      }

      let cumulativeHours = 0
      let basePrice = 0
      const breakdown = [...(model.processes ?? [])]
      .map((process, index) => {
        const level = levelMap.get(process.introducedAtLevelId)
        if (!level) {
          errors.push(
            `模型“${model.name}”的工序“${process.name}”未选择有效涂装等级`,
          )
          return null
        }
        return { process, level, index }
      })
      .filter(Boolean)
      .sort((left, right) => (
        number(left.level.rank) - number(right.level.rank)
        || left.index - right.index
      ))
      .map(({ process, level }) => {
      const hours = nonNegative(process.hours)
      const subtotal = hours * nonNegative(level.hourlyRate)
      cumulativeHours += hours
      basePrice += subtotal
      return {
        processId: process.id,
        processName: process.name,
        levelId: level.id,
        levelName: level.name,
        rank: number(level.rank),
        requiredSkillRank: number(level.requiredSkillRank),
        hourlyRate: nonNegative(level.hourlyRate),
        hours,
        included: true,
        cumulativeHours,
        subtotal,
      }
    })

      const adjustmentFactor = Math.max(
        0,
        1 + number(model.quoteAdjustmentPct) / 100,
      )
      const quantity = nonNegative(model.quantity)
      const unitPrice = basePrice * adjustmentFactor
      return {
        modelId: model.id,
        modelName: model.name,
        quantity,
        targetLevelId: targetLevel.id,
        targetLevelName: targetLevel.name,
        unitHours: cumulativeHours,
        unitBasePrice: basePrice,
        quoteAdjustmentPct: number(model.quoteAdjustmentPct),
        unitPrice,
        totalHours: cumulativeHours * quantity,
        totalPrice: unitPrice * quantity,
        breakdown,
      }
    }).filter(Boolean)

    return {
      schemeId: scheme.id,
      schemeName: scheme.name,
      modelResults,
      totalModels: modelResults
        .reduce((sum, model) => sum + model.quantity, 0),
      totalHours: modelResults
        .reduce((sum, model) => sum + model.totalHours, 0),
      totalPrice: modelResults
        .reduce((sum, model) => sum + model.totalPrice, 0),
    }
  })

  return {
    errors: [...new Set(errors)],
    schemeResults,
  }
}

export function createSavedQuoteSchemeSnapshot(schemeResult, savedAt) {
  if (!schemeResult) {
    throw new Error('缺少要保存的报价方案')
  }
  return {
    savedAt,
    sourceSchemeId: schemeResult.schemeId,
    name: schemeResult.schemeName,
    totalModels: schemeResult.totalModels,
    totalHours: schemeResult.totalHours,
    totalPrice: schemeResult.totalPrice,
    models: schemeResult.modelResults.map((model) => ({
      name: model.modelName,
      quantity: model.quantity,
      targetLevelId: model.targetLevelId,
      targetLevelName: model.targetLevelName,
      unitHours: model.unitHours,
      unitPrice: model.unitPrice,
      totalHours: model.totalHours,
      totalPrice: model.totalPrice,
      quoteAdjustmentPct: model.quoteAdjustmentPct,
      processes: model.breakdown.map((process) => ({
        name: process.processName,
        levelId: process.levelId,
        levelName: process.levelName,
        requiredSkillRank: process.requiredSkillRank,
        hourlyRate: process.hourlyRate,
        hours: process.hours,
        included: process.included,
        subtotal: process.subtotal,
      })),
    })),
  }
}
