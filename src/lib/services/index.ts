export * from './services/index.js'
export * from './types/index.js'

export type From<T extends (...args: any[]) => any> = Awaited<ReturnType<T>>
