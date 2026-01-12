export type TaskStatus = 'OPEN' | 'IN_PROGRESS' | 'DONE';

export interface Task {
  id: number;
  title: string;
  description?: string;
  status: TaskStatus;

  assigned_user_id?: number | null;
  assigned_user_name?: string | null;
  assigned_user_email?: string | null;

  created_at: string; // ISO string from backend
  updated_at: string; // ISO string from backend

  version: number; // optional if backend sends it
}

/* Optional – if you want metrics */
export interface TaskMetrics {
  total: number;
  open: number;
  in_progress: number;
  done: number;
  unassigned: number;
  assigned: number;
}

export interface Activity {
  id: number;
  actionType: string;
  oldValue: string | null;
  newValue: string | null;
  createdAt: Date;
}

// export interface Activity {
//   id: number;
//   taskId: number;
//   actionType: string;
//   oldValue: string | null;
//   newValue: string | null;
//   createdAt: Date;
// }
export interface TaskHistoryResponse {
  success: boolean;
  message: string;
  data: TaskWithHistory;
}

export interface TaskWithHistory {
  id: number;
  title: string;
  description: string;
  status: string;
  assigned_user_id: number | null;
  assigned_user_name: string | null;
  assigned_user_email: string | null;
  version: number;
  created_at: string;
  updated_at: string;
  activity_logs: BackendActivity[];
}

export interface BackendActivity {
  id: number;
  action_type: 'STATUS_CHANGE' | 'UPDATE_TASK' | 'ASSIGN_USER';
  old_value: string | null;
  new_value: string | null;
  created_at: string;
}
