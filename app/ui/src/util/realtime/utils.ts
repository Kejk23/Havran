import {simplifyForNormalizedData} from './simplyfiGiraffe'

// TODO: comments (JSDoc)

export const asArray = <T>(value: T[] | T, emptyIfUndefined = false): T[] =>
  Array.isArray(value)
    ? value
    : emptyIfUndefined && value === undefined
    ? []
    : [value]

/**
 * using spred operator (Array.push(...items))
 * function can exceed callback for big arrays.
 * Use this method instead
 */
export const pushBigArray = <T>(self: T[], arr2: T[]): void => {
  const arr2len = arr2.length
  const newLen = self.length + arr2len
  self.length = newLen
  let i = newLen
  for (let j = arr2len; j--; ) {
    i--
    self[i] = arr2[j]
  }
}

export const linearScale = (
  min: number,
  max: number,
  len: number
): number[] => {
  const step = (max - min) / (len - 1)
  const arr = [min]
  for (let i = 1; i < len - 1; i++) {
    arr.push(min + step * i)
  }
  arr.push(max)
  return arr
}

export type MinAndMax = {min: number; max: number}
export const getMinAndMax = (arr: number[]): MinAndMax => {
  let min = Infinity
  let max = -Infinity
  for (const i of arr) {
    if (min > i) min = i
    if (max < i) max = i
  }
  return {min, max}
}

const normalize = (arr: number[], minAndMax: MinAndMax, inverse = false) => {
  const {max, min} = minAndMax
  const dist = max - min
  const len = arr.length
  const newArr = new Array(len)

  if (!inverse) for (let i = len; i--; ) newArr[i] = (arr[i] - min) / dist
  else for (let i = len; i--; ) newArr[i] = arr[i] * dist + min

  return newArr
}

/** simplify that has data normalization implemented */
export const simplify = (
  xs: number[],
  ys: number[],
  epsilon: number
): [number[], number[]] => {
  if (xs.length < 2) return [xs, ys]

  const xMinAndMax = getMinAndMax(xs)
  const yMinAndMax = getMinAndMax(ys)

  const [xsSimplifiedNormalized, ysSimplifiedNormalized] =
    simplifyForNormalizedData(
      normalize(xs, xMinAndMax),
      normalize(ys, yMinAndMax),
      epsilon
    )

  const xsSimplified = normalize(xsSimplifiedNormalized, xMinAndMax, true)
  const ysSimplified = normalize(ysSimplifiedNormalized, yMinAndMax, true)

  return [xsSimplified, ysSimplified]
}

/**
 * helper for throwing error from expression
 */
export const throwReturn = <T>(msg: string): NonNullable<T> => {
  throw new Error(msg)
}
