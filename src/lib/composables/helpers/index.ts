interface ModuleInterface<T extends { new(): InstanceType<T> }> {
  new (...args: any[]): InstanceType<T>
  _instance: InstanceType<T>
}

/*
export function setInstance<T extends ModuleInterface<T>>(Module: T) {
  return () => {
  if (Module._instance)
    return
    //throw 'Module duplicated set'
  Module._instance = new Module()
  }
}

export function getInstance<T extends ModuleInterface<T>>(Module: T) {
  return () => {
    if (!Module._instance)
      throw 'Module instance not set'
    return Module._instance
  }
}
*/
