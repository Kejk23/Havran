import {format, isFormatString} from '../../format'
import {ManagedComponent} from '../ManagedComponent'

// TODO: add full spec python formating

const removeChildren = (element: HTMLElement) => {
  while (element.lastChild) {
    element.removeChild(element.lastChild)
  }
}

const SVG_MISSING =
  '<svg version="1.1" viewBox="0 0 90 15" xmlns="http://www.w3.org/2000/svg"><text alignment-baseline="hanging">SVG missing</text></svg>'

type LastValues = {
  key: string
  value: number | undefined
}[]

/**
 * transforms svg string into base64 string usable in image.src attribute
 * svg must contain xmlns="http://www.w3.org/2000/svg" attribute
 */
const svgStringToImageSrc = (text: string) =>
  `data:image/svg+xml;base64,${Buffer.from(text).toString('base64')}`

const fixSvgXmlns = (text: string) =>
  /<svg .*xmlns=.*?>/s.test(text)
    ? text
    : text.replace(/(<svg.*?)>/s, `$1 xmlns="http://www.w3.org/2000/svg">`)

abstract class SvgRenderer {
  protected element: HTMLElement
  public abstract update(values: LastValues): void

  protected _svgString = ''
  public get svgString(): string {
    return this._svgString
  }
  public set svgString(s: string) {
    this._svgString = s
    this.onSvgStringChanged(s)
  }
  abstract onSvgStringChanged(s: string): void

  constructor(element: HTMLElement) {
    this.element = element
  }
}

class SvgImageRenderer extends SvgRenderer {
  private imageElement: HTMLImageElement

  public update(values: LastValues) {
    const svgFormated = values.reduce<string>(
      (str, {key, value}) =>
        value === undefined
          ? str
          : str.replaceAll(`{${key}}`, value.toString()),
      this._svgString
    )

    const src = svgStringToImageSrc(svgFormated)

    this.imageElement.src = src
  }

  onSvgStringChanged(): void {
    return
  }

  constructor(element: HTMLElement) {
    super(element)
    this.imageElement = document.createElement('img')
    this.imageElement.style.width = '100%'
    this.imageElement.style.height = '100%'
    this.imageElement.style.objectFit = 'contain'
    this.element.appendChild(this.imageElement)
  }
}

class SvgSvgRenderer extends SvgRenderer {
  private _domMappings: {node: Node; text: string}[] = []

  public update(values: LastValues): void {
    const valuesMap = Object.fromEntries(
      values.map(({key, value}) => [key, value])
    )
    // TODO: faster formating
    const mappings = this._domMappings
    for (let i = mappings.length; i--; ) {
      const {node, text} = mappings[i]
      const formatedText = format(text, valuesMap).replace('undefined', '')
      node.textContent = formatedText
    }
  }

  onSvgStringChanged(): void {
    const mappings = this._domMappings
    mappings.splice(0)
    this.element.innerHTML = this.svgString
    const svgElement = this.element.children[0] as SVGSVGElement
    if (svgElement.style) {
      svgElement.style.width = '100%'
      svgElement.style.height = '100%'
    } else {
      console.error(`Something went wrong! svgElement has no style attribute`)
    }
    const texts = Array.from(this.element.querySelectorAll('text'))
    const rec = (node: Node) => {
      if (node.nodeType === Node.TEXT_NODE) {
        const text = node.textContent ?? ''
        if (isFormatString(text)) mappings.push({node, text})
      } else if (node.nodeType === Node.ELEMENT_NODE) {
        if (node.nodeName === 'style' || node.nodeName === 'script') return
        Array.from(node.childNodes).forEach(rec)
      }
    }

    for (let i = texts.length; i--; ) {
      const text = texts[i]
      rec(text)
    }
  }
}

type RendererType = 'img' | 'svg'
const getSvgRenderer = (
  type: RendererType
): new (element: HTMLElement) => SvgRenderer =>
  type === 'img' ? SvgImageRenderer : SvgSvgRenderer

type ManagedSvgProps = {
  svgString: string
  renderer?: RendererType
}

export class ManagedSvg extends ManagedComponent<ManagedSvgProps> {
  private _svgRenderer?: SvgRenderer
  private _rendererType: RendererType = 'svg'

  private _svgString: string = SVG_MISSING
  public get svgString(): string {
    return this._svgString
  }
  public set svgString(str: string | undefined) {
    this._svgString = fixSvgXmlns(
      str && /<svg .*?>/s.test(str) ? str : SVG_MISSING
    )
    if (this._svgRenderer) {
      this._svgRenderer.svgString = this._svgString
      this.update()
    }
  }

  public setProperties({svgString, renderer}: ManagedSvgProps): void {
    this.svgString = svgString
    if (renderer && renderer !== this._rendererType) {
      this._rendererType = renderer
      this.render()
    }
  }

  public update(): void {
    if (!this._svgRenderer) throw new Error('call render first!')
    const manager = this.manager

    const lastValues = this.keys.map((key) => ({
      key,
      value: manager.getLatestDataPoint(key)?.value,
    }))

    this._svgRenderer.update(lastValues)
  }

  protected onDataChanged(): void {
    this.update()
  }

  protected _render(): void {
    const rendererConstructor = getSvgRenderer(this._rendererType)
    this._svgRenderer = new rendererConstructor(this.element)
    this.update()
  }

  protected _destroy(): void {
    this._svgRenderer = undefined
    removeChildren(this.element)
  }
}
