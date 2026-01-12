import { Task, TaskMetrics } from './task.model';

export interface TaskListResponse {
  success: boolean;
  message: string;
  data: {
    tasks: Task[];
    metrics: TaskMetrics;
  };
}
