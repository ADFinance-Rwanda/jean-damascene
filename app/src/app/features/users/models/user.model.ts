export interface User {
  id: number;
  name: string;
  email: string;
  created_at: string;
  role: string;
  total_tasks: number;
  in_progress_tasks: number;
  completed_tasks: number;
}
