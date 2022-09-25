import {DashboardDefiniton} from '.'
import {asArray} from '../realtime'

/**
 * returns fields for given layout
 */
export const getLayoutDefinitonFields = (
  layout: DashboardDefiniton | undefined
): string[] => {
  if (!layout) return []
  const fields = new Set<string>()

  layout.cells.forEach((cell) => {
    if (cell.type === 'plot') {
      asArray(cell.field).forEach((f) => fields.add(f))
    } else if (cell.type === 'geo') {
      fields.add(cell.latField)
      fields.add(cell.lonField)
    } else if (cell.type === 'svg') {
      asArray(cell.field).forEach((f) => fields.add(f))
    }
  })

  return Array.from(fields).sort()
}

/**
 * Returns deep copy of anonymous object. Object must be acyclic
 * Could be slow, use wisely
 */
export const createCopyOf = <T>(obj: T) => JSON.parse(JSON.stringify(obj)) as T

/**
 * Returns set of unique strings or numbers
 */
export const unique: {
  (strings: number[]): number[]
  (strings: string[]): string[]
  (strings: (string | number)[]): (string | number)[]
} = (strings: (string | number)[]) => Array.from(new Set(strings)) as any[]
