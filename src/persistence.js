import { calculateMargin } from './calculator.js'
import { cloneState, validateImportedState } from './state.js'

export const STORAGE_KEY = 'painting-studio-margin-calculator-v1'

export function loadPersistedState() {
  const saved = globalThis.localStorage?.getItem(STORAGE_KEY)
  if (!saved) return cloneState()

  const state = validateImportedState(JSON.parse(saved))
  normalizeTargetProfit(state)
  return state
}

export function savePersistedState(state) {
  globalThis.localStorage?.setItem(STORAGE_KEY, JSON.stringify(state))
  return new Date()
}

export function parseImportedState(text) {
  const state = validateImportedState(JSON.parse(text))
  normalizeTargetProfit(state)
  return state
}

function normalizeTargetProfit(state) {
  if (state.settings.targetMonthlyProfit === null) {
    const legacyRevenue = Number(state.settings.expectedMonthlyRevenue)
    state.settings.targetMonthlyProfit = 0
    const breakEven = calculateMargin(state)
    state.settings.targetMonthlyProfit = Number.isFinite(legacyRevenue)
      ? legacyRevenue * breakEven.contributionMarginRate
        - breakEven.monthlyCommitment
      : 0
  }
  state.settings.expectedMonthlyRevenue = calculateMargin(state).expectedMonthlyRevenue
}
