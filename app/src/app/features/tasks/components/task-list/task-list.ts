import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TaskService } from '../../services/task.service';
import { UserService } from '../../../users/services/user.service';
import { Activity, Task, TaskStatus } from '../../models/task.model';
import { User } from '../../../users/models/user.model';
import { NotificationService } from '../../../../core/toastify';

type FilterStatus = 'ALL' | TaskStatus;

@Component({
  selector: 'app-task-list',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './task-list.html',
})
export class TaskListComponent implements OnInit {
  private taskService = inject(TaskService);
  private userService = inject(UserService);
  private notify = inject(NotificationService);

  /* ================= DATA ================= */
  tasks = this.taskService.tasks;
  users = signal<User[]>([]);

  /* ================= UI STATE ================= */
  isLoading = signal(true);
  error = signal<string | null>(null);

  /* ================= FILTER ================= */
  filterStatus = signal<FilterStatus>('ALL');

  filteredTasks = computed(() => {
    const status = this.filterStatus();
    return status === 'ALL' ? this.tasks() : this.tasks().filter((t) => t.status === status);
  });

  setFilter(status: FilterStatus) {
    this.filterStatus.set(status);
  }

  /* ================= METRICS ================= */
  getTaskCountByStatus(status: TaskStatus): number {
    return this.tasks().filter((t) => t.status === status).length;
  }

  /* ================= CREATE MODAL ================= */
  showCreateModal = signal(false);
  newTaskTitle = '';
  newTaskDescription = '';
  newTaskAssignedTo: number | null = null;

  openCreateModal() {
    this.showCreateModal.set(true);
  }

  closeCreateModal() {
    this.showCreateModal.set(false);
  }

  /* ================= CREATE A TASK #Done ================= */
  async createTask() {
    if (!this.newTaskTitle.trim()) {
      this.notify.warningAlert('Please enter a task title');
      return;
    }

    try {
      await this.taskService.createTask({
        title: this.newTaskTitle,
        description: this.newTaskDescription,
        assigned_user_id: this.newTaskAssignedTo,
      });

      this.taskService.loadTasks();
      this.newTaskTitle = '';
      this.newTaskDescription = '';
      this.newTaskAssignedTo = null;

      this.closeCreateModal();

      this.notify.success('Task created successfully!');
    } catch (error: any) {
      this.notify.errorAlert(error?.message || 'Failed to create task');
    }
  }

  /* ================= ASSIGN MODAL ================= */
  showAssignModal = signal(false);
  selectedTask = signal<Task | null>(null);
  selectedUserId = signal<number | null>(null);
  assignError = signal<string | null>(null);

  openAssignModal(task: Task) {
    this.selectedTask.set(task);
    this.selectedUserId.set(task?.assignedUser?.id ?? null);
    this.assignError.set(null);
    this.showAssignModal.set(true);
  }

  closeAssignModal() {
    this.showAssignModal.set(false);
  }

  async assignTask() {
    const task = this.selectedTask();
    if (!task) return;

    try {
      const updated = await this.taskService.assignTask(task.id, this.selectedUserId());
      this.tasks.update((list) => [...list]);

      this.closeAssignModal();
      this.notify.success('Task assigned successfully!');
    } catch (error: any) {
      console.log('🚀 ~ TaskListComponent ~ assignTask ~ error:', error);
      this.assignError.set('Failed to assign task');
      this.notify.errorAlert(error?.message || 'Failed to assign task');
    }
  }

  /* ================= EDIT MODAL ================= */
  showEditModal = signal(false);
  editTask = signal<Task | null>(null);

  openEditModal(task: Task) {
    this.editTask.set({ ...task });
    this.showEditModal.set(true);
  }

  closeEditModal() {
    this.showEditModal.set(false);
    this.editTask.set(null);
  }

  /* ================= UPDATE A TASK #Done ================= */
  async updateTask() {
    const task = this.editTask();
    if (!task) return;

    if (!task.title.trim()) {
      this.notify.warningAlert('Please enter a task title');
      return;
    }

    try {
      const updated = await this.taskService.updateTask(task.id, {
        title: task.title,
        description: task.description,
      });

      this.taskService.loadTasks();
      this.closeEditModal();

      this.notify.success('Task updated successfully!');
    } catch (error: any) {
      this.notify.errorAlert(error?.message || 'Failed to update task');
    }
  }

  /* ================= DELETE #Done with proper popup ================= */
  async deleteTask(task: Task) {
    const result = await this.notify.confirmDelete(task.title, 'task');

    if (result.isConfirmed) {
      try {
        await this.taskService.deleteTask(task.id);
        this.tasks.update((list) => list.filter((t) => t.id !== task.id));

        this.notify.success(`Task "${task.title}" deleted successfully!`);
      } catch (error: any) {
        this.notify.errorAlert(error?.message || 'Failed to delete task');
      }
    }
  }

  /* ================= STATUS FLOW ================= */
  getPrevStatus(status: TaskStatus): TaskStatus | null {
    switch (status) {
      case 'IN_PROGRESS':
        return 'OPEN';
      case 'DONE':
        return 'IN_PROGRESS';
      default:
        return null;
    }
  }

  getNextStatus(status: TaskStatus): TaskStatus | null {
    switch (status) {
      case 'OPEN':
        return 'IN_PROGRESS';
      case 'IN_PROGRESS':
        return 'DONE';
      default:
        return null;
    }
  }

  /* ================= UPDATE STATUS #Done with proper error handling ================= */
  async updateTaskStatus(task: Task, status: TaskStatus, version: number) {
    try {
      await this.taskService.updateTaskStatus(task.id, {
        status,
        version,
      });

      this.taskService.loadTasks();

      // Show success message
      this.notify.success(`Task status changed to ${status.replace('_', ' ')}`);
    } catch (error: any) {
      console.log('🚀 ~ TaskListComponent ~ updateTaskStatus ~ error:', error.message);

      if (error.message?.includes('optimistic lock')) {
        this.notify.errorAlert(
          'This task was modified by someone else. Please refresh and try again.',
          'Concurrent Modification',
        );
      } else {
        this.notify.errorAlert(error?.message || 'Failed to update status');
      }
    }
  }

  /* ================= STATUS STYLES ================= */
  getStatusClass(status: TaskStatus): string {
    return {
      OPEN: 'bg-blue-100 text-blue-800',
      IN_PROGRESS: 'bg-yellow-100 text-yellow-800',
      DONE: 'bg-green-100 text-green-800',
    }[status];
  }

  getStatusDotClass(status: TaskStatus): string {
    return {
      OPEN: 'bg-blue-500',
      IN_PROGRESS: 'bg-yellow-500',
      DONE: 'bg-green-500',
    }[status];
  }

  /* ================= ASSIGN USER ================= */
  async onAssignUser(task: Task, userId: string) {
    try {
      const updated = await this.taskService.assignTask(
        task.id,
        userId ? Number(userId) : null,
        task.version,
      );

      this.taskService.loadTasks();

      if (userId) {
        const user = this.users().find((u) => u.id === Number(userId));
        this.notify.success(`Task assigned to ${user?.name || 'user'}!`);
      } else {
        this.notify.info('Task assignment removed');
      }
    } catch (error: any) {
      this.notify.errorAlert(error?.message || 'Failed to assign user');
    }
  }

  /* ================= HISTORY MODAL ================= */
  showHistoryModal = signal(false);
  historyTask = signal<Task | null>(null);
  activityLog = signal<Activity[]>([]);
  historyLoading = signal(false);

  async openHistory(task: Task) {
    this.showHistoryModal.set(true);
    this.historyTask.set(task);
    this.historyLoading.set(true);

    try {
      const activities = await this.taskService.getTaskHistory(task.id);
      this.activityLog.set(activities);
    } catch (error: any) {
      this.notify.errorAlert(error?.message || 'Failed to load history');
    } finally {
      this.historyLoading.set(false);
    }
  }

  closeHistory() {
    this.showHistoryModal.set(false);
    this.activityLog.set([]);
    this.historyTask.set(null);
  }

  getActionLabel(action: string): string {
    switch (action) {
      case 'STATUS_CHANGE':
        return 'Status Changed';
      case 'UPDATE_TASK':
        return 'Task Updated';
      case 'ASSIGN_USER':
        return 'User Assigned';
      default:
        return action.replace('_', ' ');
    }
  }

  getValueLabel(action: string, value: string | null): string {
    if (!value) return '—';

    if (action === 'UPDATE_TASK') {
      try {
        const parsed = JSON.parse(value);
        return parsed.title ?? value;
      } catch {
        return value;
      }
    }

    return value;
  }

  /* ================= INIT ================= */
  async ngOnInit() {
    try {
      await Promise.all([
        this.taskService.loadTasks(),
        this.userService.getUsers().then((u) => this.users.set(u)),
      ]);
    } catch (error: any) {
      this.error.set('Failed to load tasks');
      this.notify.errorAlert(error?.message || 'Failed to load tasks and users');
    } finally {
      this.isLoading.set(false);
    }
  }
}
