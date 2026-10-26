import { useSyncExternalStore } from 'react'
import { prefersReducedMotion, subscribeReducedMotion } from '../utils/motion'

export function useReducedMotion(): boolean {
  return useSyncExternalStore(subscribeReducedMotion, prefersReducedMotion, () => false)
}
