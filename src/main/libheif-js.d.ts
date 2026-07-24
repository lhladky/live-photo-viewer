declare module 'libheif-js' {
  export interface HeifImage {
    get_width(): number
    get_height(): number
    display(
      image: { data: Uint8ClampedArray; width: number; height: number },
      cb: (result: unknown) => void
    ): void
  }
  export interface HeifDecoderInstance {
    decode(buffer: Uint8Array): HeifImage[]
  }
  export const HeifDecoder: new () => HeifDecoderInstance
  const _default: { HeifDecoder: new () => HeifDecoderInstance }
  export default _default
}
