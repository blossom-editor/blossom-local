/// <reference types="vite/client" />

interface ImportMetaEnv {
  /**
   * 基础URL
   */
  readonly VITE_BLOSSOM_BASE_URI: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}

declare module '*.vue' {
  import type { DefineComponent } from 'vue'
  // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/ban-types
  const component: DefineComponent<{}, {}, any>

  export default component
}
