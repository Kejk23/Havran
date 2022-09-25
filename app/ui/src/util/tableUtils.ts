import {Table as GirrafeTable} from '@influxdata/giraffe'

/**
 * Returns minimum and maximum time from table
 */
export const getXDomainFromTable = (
  table: GirrafeTable | undefined
): [number, number] | undefined => {
  const sorted = table?.getColumn('_time')?.slice()?.sort()
  if (sorted) {
    return [sorted[0], sorted[sorted.length - 1]] as unknown as [number, number]
  }
}
