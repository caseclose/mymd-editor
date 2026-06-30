import type { MyMDApi } from '../types/api'

export function hasApi(): boolean {
  return typeof window !== 'undefined' && typeof window.api !== 'undefined'
}

export function getApi(): MyMDApi {
  if (!hasApi()) {
    throw new Error('Electron preload API (window.api) is not available')
  }
  return window.api
}
