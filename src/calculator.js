const EPSILON = 1e-9

function number(value) {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : 0
}

function nonNegative(value) {
  return Math.max(0, number(value))
}

function employeeCapacity(employee) {
  if (employee.monthlyCapacityHours !== undefined) {
    return nonNegative(employee.monthlyCapacityHours)
  }
  return nonNegative(employee.effectiveDays)
    * nonNegative(employee.effectiveHoursPerDay)
}

function uniqueRanks(levels) {
  return new Set(levels.map((level) => number(level.rank)))
}

export function calculateStudioProfit(state) {
  const monthlyRevenue = nonNegative(state.settings?.monthlyRevenue)
  const monthlyFixedCost = (state.fixedCosts ?? [])
    .reduce((sum, item) => sum + nonNegative(item.amount), 0)
  const oneTimeCostResults = (state.oneTimeCosts ?? []).map((item) => {
    const amount = nonNegative(item.amount)
    const depreciationMonths = nonNegative(item.depreciationMonths)
    const depreciates = Boolean(item.depreciates)
    return {
      id: item.id,
      amount,
      depreciates,
      depreciationMonths,
      monthlyDepreciation: depreciates && depreciationMonths > EPSILON
        ? amount / depreciationMonths
        : 0,
    }
  })
  const oneTimeInvestment = oneTimeCostResults
    .reduce((sum, item) => sum + item.amount, 0)
  const monthlyDepreciation = oneTimeCostResults
    .reduce((sum, item) => sum + item.monthlyDepreciation, 0)
  const operatingCashProfit = monthlyRevenue - monthlyFixedCost
  const monthlyProfit = operatingCashProfit - monthlyDepreciation
  const paybackMonths = oneTimeInvestment <= EPSILON
    ? 0
    : operatingCashProfit > EPSILON
      ? oneTimeInvestment / operatingCashProfit
      : Infinity
  const status = monthlyProfit > EPSILON
    ? 'profit'
    : monthlyProfit < -EPSILON
      ? 'loss'
      : 'break-even'

  return {
    monthlyRevenue,
    monthlyFixedCost,
    oneTimeCostResults,
    oneTimeInvestment,
    monthlyDepreciation,
    operatingCashProfit,
    monthlyProfit,
    paybackMonths,
    status,
  }
}

export function calculateModelQuote(quote) {
  const stepResults = (quote?.steps ?? []).map((step) => ({
    id: step.id,
    name: step.name,
    pieceworkCost: nonNegative(step.pieceworkCost),
    estimatedHours: nonNegative(step.estimatedHours),
  }))
  const totalCost = stepResults.reduce(
    (sum, step) => sum + step.pieceworkCost,
    0,
  )
  const totalHours = stepResults.reduce(
    (sum, step) => sum + step.estimatedHours,
    0,
  )
  const externalPrice = nonNegative(quote?.externalPrice)

  return {
    stepResults,
    totalCost,
    totalHours,
    externalPrice,
    quoteDifference: externalPrice - totalCost,
  }
}

export function calculateMargin(state) {
  const errors = []
  const employees = state.employees ?? []
  const targetMonthlyProfit = number(state.settings?.targetMonthlyProfit)
  const orderStructure = calculateOrderStructure(state)
  const payoutMap = new Map(
    orderStructure.payoutByEmployee.map((payout) => [payout.employeeId, payout]),
  )

  const employeeResults = employees.map((employee) => {
    const capacityHours = employeeCapacity(employee)
    const payout = payoutMap.get(employee.id)
    const assignedHours = payout?.hours ?? 0
    return {
      employeeId: employee.id,
      employeeName: employee.name,
      employmentType: employee.fullTime ? '全职' : '兼职',
      skillRank: number(employee.skillRank),
      capacityHours,
      assignedHours,
      utilizationRate: capacityHours > EPSILON
        ? assignedHours / capacityHours
        : 0,
      pieceRate: nonNegative(employee.pieceRate ?? employee.wageCoefficient),
      monthlyPieceworkPay: payout?.pieceworkPay ?? 0,
      monthlyWage: payout?.pieceworkPay ?? 0,
    }
  })

  const salaryCost = orderStructure.totalPieceworkCost
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

  if (totalFeeRate >= 1) {
    errors.push('订单额外费用率合计必须低于100%')
  }
  errors.push(...orderStructure.errors)

  const expectedMonthlyRevenue = orderStructure.monthlyRevenue
  const variableCost = expectedMonthlyRevenue * totalFeeRate
  const operatingProfit = (
    expectedMonthlyRevenue - variableCost - salaryCost - fixedCost
  )
  const netProfit = operatingProfit - monthlyDepreciation
  const actualPieceworkCostRate = expectedMonthlyRevenue > EPSILON
    ? salaryCost / expectedMonthlyRevenue
    : Math.max(
      0,
      1 - totalFeeRate
        - nonNegative(state.settings?.targetContributionMarginPct) / 100,
    )
  const contributionMarginRate = 1 - totalFeeRate - actualPieceworkCostRate
  const monthlyCommitment = fixedCost + monthlyDepreciation
  const operatingMonthlyCommitment = fixedCost
  const breakEvenRevenue = contributionMarginRate > EPSILON
    ? monthlyCommitment / contributionMarginRate
    : Infinity
  const operatingBreakEvenRevenue = contributionMarginRate > EPSILON
    ? operatingMonthlyCommitment / contributionMarginRate
    : Infinity
  const revenueForTargetProfit = contributionMarginRate > EPSILON
    ? (monthlyCommitment + targetMonthlyProfit) / contributionMarginRate
    : Infinity
  const totalEffectiveHours = orderStructure.totalHours
  const expectedRevenuePerEffectiveHour = totalEffectiveHours > EPSILON
    ? expectedMonthlyRevenue / totalEffectiveHours
    : 0
  const breakEvenRevenuePerEffectiveHour = expectedRevenuePerEffectiveHour > EPSILON
    ? breakEvenRevenue / expectedRevenuePerEffectiveHour
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
    orderStructure,
    feeResults,
    expectedMonthlyRevenue,
    targetMonthlyProfit,
    salaryCost,
    pieceworkCost: salaryCost,
    fixedCost,
    oneTimeInvestment,
    scheduledDepreciation,
    excludeDepreciation,
    monthlyDepreciation,
    totalFeeRatePct,
    totalFeeRate,
    contributionMarginRate,
    actualPieceworkCostRate,
    variableCost,
    operatingProfit,
    netProfit,
    monthlyCommitment,
    breakEvenRevenue,
    operatingBreakEvenRevenue,
    revenueForTargetProfit,
    targetProfitGap: netProfit - targetMonthlyProfit,
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
  const quoteResult = calculateQuoteSchemes(state)
  const quoteModelMap = new Map(
    quoteResult.schemeResults.flatMap((scheme) => (
      scheme.modelResults.map((model) => [model.modelId, model])
    )),
  )
  const employeeMap = new Map(
    (state.employees ?? []).map((employee) => [employee.id, employee]),
  )
  const employeePayouts = new Map()
  const orderResults = []
  let monthlyRevenue = 0
  let totalQuantity = 0
  let totalPieceworkCost = 0
  let totalHours = 0

  for (const order of state.orders ?? []) {
    const quoteModel = quoteModelMap.get(order.quoteModelId)
    const orderName = quoteModel?.modelName ?? order.name ?? '未命名订单'
    const quantity = nonNegative(order.quantity)
    const unitPrice = order.unitPrice === undefined
      ? nonNegative(quoteModel?.unitPrice)
      : nonNegative(order.unitPrice)
    const level = levelMap.get(
      quoteModel?.targetLevelId ?? order.paintingLevelId,
    )
    if (!quoteModel) {
      errors.push(`订单“${orderName}”未关联有效的模型报价`)
    }
    if (!level) {
      errors.push(`订单“${orderName}”未选择有效涂装等级`)
    }

    const unitPieceworkCost = quoteModel?.unitPieceworkCost
      ?? nonNegative(order.unitPieceworkCost)
    const revenue = quantity * unitPrice
    const pieceworkCost = quantity * unitPieceworkCost
    const orderHours = quantity * nonNegative(quoteModel?.unitHours)
    monthlyRevenue += revenue
    totalQuantity += quantity
    totalPieceworkCost += pieceworkCost
    totalHours += orderHours

    for (const process of quoteModel?.breakdown ?? []) {
      if (!process.assignedEmployeeId) {
        errors.push(`订单“${orderName}”仍有未分配画师的工序`)
        continue
      }
      const employee = employeeMap.get(process.assignedEmployeeId)
      if (number(employee?.skillRank) < process.requiredSkillRank) {
        errors.push(
          `订单“${orderName}”的工序“${process.processName}”画师技能不足`,
        )
      }
      const payout = employeePayouts.get(process.assignedEmployeeId) ?? {
        employeeId: process.assignedEmployeeId,
        employeeName: process.assignedEmployeeName,
        hours: 0,
        pieceworkPay: 0,
      }
      payout.hours += process.hours * quantity
      payout.pieceworkPay += process.pieceworkPay * quantity
      employeePayouts.set(process.assignedEmployeeId, payout)
    }

    orderResults.push({
      orderId: order.id,
      orderName,
      quantity,
      quoteModelId: quoteModel?.modelId ?? null,
      paintingLevelId: level?.id ?? null,
      paintingLevelName: level?.name ?? '未设置',
      unitPrice,
      unitPieceworkCost,
      unitContributionProfit: unitPrice * (
        1 - (state.orderFeeRates ?? []).reduce(
          (sum, fee) => sum + nonNegative(fee.ratePct),
          0,
        ) / 100
      ) - unitPieceworkCost,
      revenue,
      pieceworkCost,
      totalHours: orderHours,
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
    payoutByEmployee: [...employeePayouts.values()],
    monthlyRevenue,
    totalQuantity,
    totalHours,
    totalPieceworkCost,
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
  const employeeMap = new Map(
    (state.employees ?? []).map((employee) => [employee.id, employee]),
  )
  const totalFeeRate = (state.orderFeeRates ?? [])
    .reduce((sum, fee) => sum + nonNegative(fee.ratePct), 0) / 100
  const targetContributionMarginRate = nonNegative(
    state.settings?.targetContributionMarginPct,
  ) / 100
  const pricingCostRate = 1 - totalFeeRate - targetContributionMarginRate

  if (uniqueRanks(levels).size !== levels.length) {
    errors.push('涂装等级的顺序值不能重复')
  }
  if (pricingCostRate <= EPSILON) {
    errors.push('订单费用率与目标贡献毛利率合计必须低于100%')
  }

  const schemeResults = (state.quoteSchemes ?? []).map((scheme) => {
    const modelResults = (scheme.models ?? []).map((model) => {
      const targetLevel = levelMap.get(model.targetLevelId)
      if (!targetLevel) {
        errors.push(`模型“${model.name}”未选择有效的目标涂装等级`)
        return null
      }

      let cumulativeHours = 0
      let unitPieceworkCost = 0
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
      const employee = employeeMap.get(process.assignedEmployeeId)
      if (!employee) {
        errors.push(
          `模型“${model.name}”的工序“${process.name}”未分配有效画师`,
        )
      } else if (number(employee.skillRank) < number(level.requiredSkillRank)) {
        errors.push(
          `画师“${employee.name}”的技能不足以承接工序“${process.name}”`,
        )
      }
      const pieceRate = nonNegative(employee?.pieceRate ?? employee?.wageCoefficient)
      const pieceworkPay = hours * pieceRate
      cumulativeHours += hours
      unitPieceworkCost += pieceworkPay
      return {
        processId: process.id,
        processName: process.name,
        levelId: level.id,
        levelName: level.name,
        rank: number(level.rank),
        requiredSkillRank: number(level.requiredSkillRank),
        assignedEmployeeId: employee?.id ?? null,
        assignedEmployeeName: employee?.name ?? '未分配',
        pieceRate,
        hours,
        included: true,
        cumulativeHours,
        pieceworkPay,
        subtotal: pieceworkPay,
      }
    })

      const adjustmentFactor = Math.max(
        0,
        1 + number(model.quoteAdjustmentPct) / 100,
      )
      const quantity = nonNegative(model.quantity)
      const unitBasePrice = pricingCostRate > EPSILON
        ? unitPieceworkCost / pricingCostRate
        : Infinity
      const unitPrice = unitBasePrice * adjustmentFactor
      const unitOrderFees = unitPrice * totalFeeRate
      const unitContributionProfit = unitPrice - unitOrderFees - unitPieceworkCost
      return {
        modelId: model.id,
        modelName: model.name,
        quantity,
        targetLevelId: targetLevel.id,
        targetLevelName: targetLevel.name,
        unitHours: cumulativeHours,
        unitPieceworkCost,
        targetContributionMarginPct: targetContributionMarginRate * 100,
        unitBasePrice,
        quoteAdjustmentPct: number(model.quoteAdjustmentPct),
        unitPrice,
        unitOrderFees,
        unitContributionProfit,
        actualContributionMarginPct: unitPrice > EPSILON
          ? unitContributionProfit / unitPrice * 100
          : 0,
        totalHours: cumulativeHours * quantity,
        totalPieceworkCost: unitPieceworkCost * quantity,
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
      totalPieceworkCost: modelResults
        .reduce((sum, model) => sum + model.totalPieceworkCost, 0),
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
    totalPieceworkCost: schemeResult.totalPieceworkCost,
    totalPrice: schemeResult.totalPrice,
    models: schemeResult.modelResults.map((model) => ({
      name: model.modelName,
      quantity: model.quantity,
      targetLevelId: model.targetLevelId,
      targetLevelName: model.targetLevelName,
      unitHours: model.unitHours,
      unitPieceworkCost: model.unitPieceworkCost,
      unitPrice: model.unitPrice,
      totalHours: model.totalHours,
      totalPieceworkCost: model.totalPieceworkCost,
      totalPrice: model.totalPrice,
      targetContributionMarginPct: model.targetContributionMarginPct,
      quoteAdjustmentPct: model.quoteAdjustmentPct,
      processes: model.breakdown.map((process) => ({
        name: process.processName,
        levelId: process.levelId,
        levelName: process.levelName,
        requiredSkillRank: process.requiredSkillRank,
        assignedEmployeeId: process.assignedEmployeeId,
        assignedEmployeeName: process.assignedEmployeeName,
        pieceRate: process.pieceRate,
        hours: process.hours,
        included: process.included,
        pieceworkPay: process.pieceworkPay,
        subtotal: process.subtotal,
      })),
    })),
  }
}
