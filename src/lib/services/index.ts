export * from './services/index.js'
export * from './types/index.js'

export type From<T extends (...args: any[]) => any> = Exclude<Awaited<ReturnType<T>>, undefined>
