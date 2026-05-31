import { ipcRenderer, contextBridge } from 'electron'

// --------- Expose some API to the Renderer process ---------
contextBridge.exposeInMainWorld('ipcRenderer', {
  on(...args: Parameters<typeof ipcRenderer.on>) {
    const [channel, listener] = args
    return ipcRenderer.on(channel, (event, ...args) => listener(event, ...args))
  },
  off(...args: Parameters<typeof ipcRenderer.off>) {
    const [channel, ...omit] = args
    return ipcRenderer.off(channel, ...omit)
  },
  send(...args: Parameters<typeof ipcRenderer.send>) {
    const [channel, ...omit] = args
    return ipcRenderer.send(channel, ...omit)
  },
  invoke(...args: Parameters<typeof ipcRenderer.invoke>) {
    const [channel, ...omit] = args
    return ipcRenderer.invoke(channel, ...omit)
  },

  // You can expose other APTs you need here.
  // ...
})
contextBridge.exposeInMainWorld('api', {
  getTasks: () => ipcRenderer.invoke('get-tasks'),
  getProjects: () => ipcRenderer.invoke('get-projects'),
  addProject: (project: any) => ipcRenderer.invoke('add-project',project),
  updateProject: (Project: any) => ipcRenderer.invoke('update-project', Project),
  deleteProject: (id: number) => ipcRenderer.invoke('delete-project', id),
  addTask: (task: any) => ipcRenderer.invoke('add-task',task),
  updateTask: (task: any) => ipcRenderer.invoke('update-task', task),
  deleteTask: (id: number) => ipcRenderer.invoke('delete-task', id),
  selectFile: () => ipcRenderer.invoke('select-file')
})