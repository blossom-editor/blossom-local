

/**
 * 任务统计
 */
export const taskStatApi = (req?: object): Promise<R<any>> => {
  return new Promise(() => {})
}

/**
 * 事项统计
 */
export const todoStatApi = (req?: object): Promise<R<any>> => {
  return new Promise(() => {})
}

//#region ---------------------------------------- todo ----------------------------------------

/**
 * 事项列表
 */
export const todosApi = (req?: object): Promise<R<any>> => {
  return new Promise(() => {})
}

/**
 * 事项列表
 */
export const countTaskApi = (req?: object): Promise<R<any>> => {
  return new Promise(() => {})
}

/**
 * 新增阶段性事项
 */
export const addPhasedApi = (data?: object): Promise<R<any>> => {
  return new Promise(() => {})
}

/**
 * 修改阶段性事项的名称
 */
export const updTodoNameApi = (data?: object): Promise<R<any>> => {
  return new Promise(() => {})
}

/**
 * 完成阶段性事项
 */
export const openTodoApi = (data?: object): Promise<R<any>> => {
  return new Promise(() => {})
}

/**
 * 完成阶段性事项
 */
export const completedTodoApi = (data?: object): Promise<R<any>> => {
  return new Promise(() => {})
}

/**
 * 完成阶段性事项
 */
export const exportTodoApi = (req?: object): Promise<R<any>> => {
  return new Promise(() => {})
}

//#endregion

//#region ---------------------------------------- task ----------------------------------------
/**
 * 某天或某个事项的任务列表
 */
export const tasksApi = (req?: object): Promise<R<any>> => {
  return new Promise(() => {})
}

/**
 * 某天或某个事项的任务列表
 */
export const taskInfoApi = (req?: object): Promise<R<any>> => {
  return new Promise(() => {})
}

/**
 * 新增任务
 */
export const addTaskApi = (data?: object): Promise<R<any>> => {
  return new Promise(() => {})
}

/**
 * 修改任务的主要信息
 */
export const updTaskApi = (data?: object): Promise<R<any>> => {
  return new Promise(() => {})
}

/**
 * 移动到 waiting
 */
export const toWaitingApi = (data?: object): Promise<R<any>> => {
  return new Promise(() => {})
}

/**
 * 移动到 processing
 */
export const toProcessingApi = (data?: object): Promise<R<any>> => {
  return new Promise(() => {})
}

/**
 * 移动到 completed
 */
export const toCompletedApi = (data?: object): Promise<R<any>> => {
  return new Promise(() => {})
}

/**
 * 删除节点
 */
export const delTaskApi = (data?: object): Promise<R<any>> => {
  return new Promise(() => {})
}

/**
 * 标签集合
 */
export const taskTagsApi = (req?: object): Promise<R<any>> => {
  return new Promise(() => {})
}

export const taskTransferApi = (data?: object): Promise<R<any>> => {
  return new Promise(() => {})
}
//#endregion
