/// <reference types="vite/client" />
interface Window {
    api: {
        getTasks: () => Promise<any[]>;
        addTask: (task: any) => Promise<any>;
        updateTask: (task: any) => Promise<any>;
        deleteTask: (task: number) => Promise<any>;
        getProjects: () => Promise<any[]>;
        addProject: (Project: any) => Promise<any>;
        updateProject: (Project: any) => Promise<any>;
        deleteProject: (ProjectId: number) => Promise<any>;
        selectFile: () => Promise<any>;
    }
}