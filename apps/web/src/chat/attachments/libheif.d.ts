// libheif-js ships no types for its prebundled wasm entry; these are the few calls heif.ts makes
// (libheif-js 1.23.5, README "Usage").
declare module "libheif-js/wasm-bundle" {
  interface HeifDisplayTarget {
    data: Uint8ClampedArray;
    width: number;
    height: number;
  }
  class HeifImage {
    get_width(): number;
    get_height(): number;
    display(target: HeifDisplayTarget, done: (shown: HeifDisplayTarget | null) => void): void;
    free(): void;
  }
  class HeifDecoder {
    decode(bytes: ArrayBufferView | ArrayBuffer): HeifImage[];
  }
  const libheif: { HeifDecoder: typeof HeifDecoder; HeifImage: typeof HeifImage };
  export default libheif;
}
