import { Injectable, signal } from '@angular/core';
import { ApiService } from '../../../core/api/api.service';
import { Activity, BackendActivity, Task, TaskHistoryResponse } from '../models/task.model';
import { firstValueFrom, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { HttpErrorResponse } from '@angular/common/http';

interface TaskListResponse {
  success: boolean;
  message: string;
  data: {
    tasks: Task[];
    metrics: {
      total: number;
      open: number;
      in_progress: number;
      done: number;
      assigned: number;
      unassigned: number;
    };
  };
}

@Injectable({ providedIn: 'root' })
export class TaskService {
  tasks = signal<Task[]>([]);
  metrics = signal<any>(null);

  constructor(private api: ApiService) {}

  async loadTasks() {
    try {
      const res = await firstValueFrom(
        this.api.get<TaskListResponse>('tasks').pipe(
          catchError((error: HttpErrorResponse) => {
            return this.handleHttpError(error);
          }),
        ),
      );
      this.tasks.set(res.data.tasks);
      this.metrics.set(res.data.metrics);
    } catch (error: any) {
      throw error;
    }
  }

  createTask(data: {
    title: string;
    description?: string;
    assigned_user_id?: number | null;
    deadline?: string | null;
    comment?: string | null;
  }) {
    return firstValueFrom(
      this.api.post('tasks', data).pipe(
        catchError((error: HttpErrorResponse) => {
          return this.handleHttpError(error);
        }),
      ),
    );
  }

  updateTask(
    id: number,
    data: { title: string; description?: string; deadline: string | null },
    version: number,
  ) {
    return firstValueFrom(
      this.api.patch(`tasks/${id}`, { ...data, version }).pipe(
        catchError((error: HttpErrorResponse) => {
          return this.handleHttpError(error);
        }),
      ),
    );
  }

  async getTaskById(id: number): Promise<Task> {
    try {
      const response = await firstValueFrom(
        this.api
          .get<{ success: boolean; message: string; data: Task }>(`tasks/${id}`)
          .pipe(catchError((error: HttpErrorResponse) => this.handleHttpError(error))),
      );
      return response.data;
    } catch (error: any) {
      throw error;
    }
  }

  async addComment(taskId: number, data: { message: string; version?: number }) {
    try {
      if (!data.message.trim()) return;
      await firstValueFrom(
        this.api
          .patch(`tasks/${taskId}`, { newComment: data.message, version: data.version })
          .pipe(catchError((error: HttpErrorResponse) => this.handleHttpError(error))),
      );
    } catch (error) {
      throw error;
    }
  }

  updateTaskStatus(id: number, data: { status: string; version: number }) {
    return firstValueFrom(
      this.api.put(`tasks/${id}/status`, { ...data }).pipe(
        catchError((error: HttpErrorResponse) => {
          return this.handleHttpError(error);
        }),
      ),
    );
  }

  assignTask(id: number, userId: number | null, version?: number) {
    return firstValueFrom(
      this.api
        .put(`tasks/${id}/assign`, {
          user_id: userId,
          version,
        })
        .pipe(
          catchError((error: HttpErrorResponse) => {
            return this.handleHttpError(error);
          }),
        ),
    );
  }

  async getTaskHistory(taskId: number): Promise<Activity[]> {
    try {
      const response = await firstValueFrom(
        this.api.get<TaskHistoryResponse>(`tasks/${taskId}`).pipe(
          catchError((error: HttpErrorResponse) => {
            return this.handleHttpError(error);
          }),
        ),
      );
      return response.data.activity_logs.map(this.mapActivity);
    } catch (error: any) {
      throw error;
    }
  }

  deleteTask(id: number) {
    return firstValueFrom(
      this.api.delete(`tasks/${id}`).pipe(
        catchError((error: HttpErrorResponse) => {
          return this.handleHttpError(error);
        }),
      ),
    );
  }

  private mapActivity(log: BackendActivity): Activity {
    return {
      id: log.id,
      actionType: log.action_type,
      oldValue: log.old_value,
      newValue: log.new_value,
      createdAt: new Date(log.created_at),
    };
  }

  private handleHttpError(error: HttpErrorResponse) {
    // Extract the error message from the server response
    const serverMessage =
      error.error?.message ||
      error.error?.error?.message ||
      error.message ||
      `HTTP Error ${error.status}`;

    // Throw a new error with the server message
    return throwError(() => new Error(serverMessage));
  }
}
