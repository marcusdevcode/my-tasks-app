import { create } from 'zustand';

interface Task {
    id?: number;
    project_id: number;
    title: string;
    description: string;
    image_path?: string;
    status: 'pending' | 'completed';
    created_at: string;
    completed_at?: string;
}

interface TaskStore {
    tasks: Task[];
    setTasks: (tasks: Task[]) => void;
}

export const useTaskStore = create<TaskStore>((set) => ({
    tasks: [],
    setTasks: (tasks) => set({ tasks }),
}));