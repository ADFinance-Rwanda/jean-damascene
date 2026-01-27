import {
  Component,
  inject,
  signal,
  computed,
  OnInit,
  OnDestroy,
  effect,
  HostListener,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TaskService } from '../../services/task.service';
import { UserService } from '../../../users/services/user.service';
import { Activity, Task, TaskStatus } from '../../models/task.model';
import { User } from '../../../users/models/user.model';
import { NotificationService } from '../../../../core/toastify';
import { SocketService } from '../../../../core/sockets/SocketService';
import { Subscription } from 'rxjs';
import { RouterModule } from '@angular/router';
import { AuthService } from '../../../auth/services/auth.service';

type FilterStatus = 'ALL' | TaskStatus;

@Component({
  selector: 'app-task-list',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './task-list.html',
})
export class TaskListComponent implements OnInit, OnDestroy {
  private taskService = inject(TaskService);
  private userService = inject(UserService);
  private notify = inject(NotificationService);
  private socket = inject(SocketService);
  public auth = inject(AuthService);

  private subscriptions: Subscription[] = [];
  private listenersInitialized = false; // prevent duplicate listeners

  /* ================= DATA ================= */
  tasks = this.taskService.tasks;
  users = signal<User[]>([]);

  // Signal to track which task dropdown is open
  openDropdownId = signal<number | null>(null);

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

  /* ================= DROPDOWN MANAGEMENT ================= */
  toggleDropdown(taskId: number, event: Event) {
    event.stopPropagation();
    this.openDropdownId.set(this.openDropdownId() === taskId ? null : taskId);
  }

  closeAllDropdowns() {
    this.openDropdownId.set(null);
  }

  isDropdownOpen(taskId: number): boolean {
    return this.openDropdownId() === taskId;
  }

  @HostListener('document:click')
  onDocumentClick() {
    this.closeAllDropdowns();
  }

  /* ================= SOCKET EFFECT ================= */
  private socketEffect = effect(() => {
    const connected = this.socket.connected();
    if (!connected) return;

    if (this.listenersInitialized) return;
    this.listenersInitialized = true;

    this.initSocketListeners();
  });

  /* ================= SOCKET EVENTS ================= */
  private initSocketListeners() {
    this.subscriptions.push(
      this.socket
        .onEvent<{ type: string; payload: Task | { id: number } }>('task:event')
        .subscribe((event) => {
          const { type, payload } = event;

          switch (type) {
            case 'task_created':
              this.tasks.update((list) => [payload as Task, ...list]);
              this.notify.success(`New task created: ${(payload as Task).title}`);
              break;

            case 'task_updated':
              this.tasks.update((list) =>
                list.map((t) =>
                  t.id === (payload as Task).id ? { ...t, ...(payload as Task) } : t,
                ),
              );
              this.notify.info(`Task updated: ${(payload as Task).title}`);
              break;

            case 'task_deleted':
              this.tasks.update((list) =>
                list.filter((t) => t.id !== (payload as { id: number }).id),
              );
              this.notify.warning(`Task deleted: ${(payload as { id: number }).id}`);
              break;
          }
        }),
    );
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
  newTaskDeadline: string | null = null;
  newTaskComment = '';

  today = new Date().toISOString().split('T')[0];

  openCreateModal() {
    this.showCreateModal.set(true);
  }

  closeCreateModal() {
    this.showCreateModal.set(false);
    this.newTaskTitle = '';
    this.newTaskDescription = '';
    this.newTaskAssignedTo = null;
    this.newTaskDeadline = null;
    this.newTaskComment = '';
  }

  async createTask() {
    try {
      await this.taskService.createTask({
        title: this.newTaskTitle,
        description: this.newTaskDescription,
        assigned_user_id: this.newTaskAssignedTo,
        deadline: this.newTaskDeadline ? new Date(this.newTaskDeadline).toISOString() : null,
        comment: this.newTaskComment || null,
      });

      await this.taskService.loadTasks();
      this.closeCreateModal();
      this.closeAllDropdowns();
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
    this.closeAllDropdowns(); // Close dropdown when opening assign modal
  }

  closeAssignModal() {
    this.showAssignModal.set(false);
  }

  async assignTask() {
    const task = this.selectedTask();
    if (!task) return;

    try {
      await this.taskService.assignTask(task.id, this.selectedUserId());
      this.tasks.update((list) => [...list]);
      this.closeAssignModal();
      this.notify.success('Task assigned successfully!');
    } catch (error: any) {
      this.assignError.set('Failed to assign task');
      this.notify.errorAlert(error?.message || 'Failed to assign task');
    }
  }

  /* ================= EDIT MODAL ================= */
  showEditModal = signal(false);
  editTask = signal<Task | null>(null);

  // openEditModal(task: Task) {
  //   this.editTask.set({ ...task });
  //   this.showEditModal.set(true);
  //   this.closeAllDropdowns();
  // }

  openEditModal(task: Task) {
    const taskCopy = { ...task };

    if (taskCopy.deadline) {
      const d = new Date(taskCopy.deadline);
      // format in local YYYY-MM-DD
      const yyyy = d.getFullYear();
      const mm = String(d.getMonth() + 1).padStart(2, '0'); // months are 0-indexed
      const dd = String(d.getDate()).padStart(2, '0');

      taskCopy.deadline = `${yyyy}-${mm}-${dd}`;
    }

    this.editTask.set(taskCopy);
    this.showEditModal.set(true);
    this.closeAllDropdowns();
  }

  closeEditModal() {
    this.showEditModal.set(false);
    this.editTask.set(null);
  }

  async updateTask() {
    const task = this.editTask();
    if (!task) return;

    if (!task.title.trim()) {
      this.notify.warningAlert('Please enter a task title');
      return;
    }

    try {
      await this.taskService.updateTask(
        task.id,
        {
          title: task.title,
          description: task.description,
          deadline: task.deadline || null,
        },
        task.version,
      );

      await this.taskService.loadTasks();
      this.closeEditModal();
      this.notify.success('Task updated successfully!');
    } catch (error: any) {
      this.notify.errorAlert(error?.message || 'Failed to update task');
    }
  }

  /* ================= DELETE TASK ================= */
  async deleteTask(task: Task) {
    this.closeAllDropdowns();

    const result = await this.notify.confirmDelete(task.title, 'task');
    if (!result.isConfirmed) return;

    try {
      await this.taskService.deleteTask(task.id);
      this.tasks.update((list) => list.filter((t) => t.id !== task.id));
      this.notify.success(`Task "${task.title}" deleted successfully!`);
    } catch (error: any) {
      this.notify.errorAlert(error?.message || 'Failed to delete task');
    }
  }

  /* ================= STATUS ================= */
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

  async updateTaskStatus(task: Task, status: TaskStatus, version: number) {
    const result = await this.notify.confirm(
      `Change status to ${status.replace('_', ' ')}?`,
      'Confirm Status Change',
    );

    if (!result.isConfirmed) return;

    try {
      await this.taskService.updateTaskStatus(task.id, { status, version });
      await this.taskService.loadTasks();
      this.notify.success(`Task status changed to ${status.replace('_', ' ')}`);
    } catch (error: any) {
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

  getStatusClass(status: TaskStatus): string {
    return {
      OPEN: 'bg-blue-100 text-blue-800',
      IN_PROGRESS: 'bg-yellow-100 text-yellow-800',
      DONE: 'bg-green-100 text-green-800',
    }[status];
  }

  getStatusDotClass(status: TaskStatus): string {
    return { OPEN: 'bg-blue-500', IN_PROGRESS: 'bg-yellow-500', DONE: 'bg-green-500' }[status];
  }

  /* ================= ASSIGN USER ================= */
  async onAssignUser(task: Task, userId: string) {
    try {
      await this.taskService.assignTask(task.id, userId ? Number(userId) : null, task.version);
      await this.taskService.loadTasks();

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

  /* ================= HISTORY ================= */
  showHistoryModal = signal(false);
  historyTask = signal<Task | null>(null);
  activityLog = signal<Activity[]>([]);
  historyLoading = signal(false);

  async openHistory(task: Task) {
    this.showHistoryModal.set(true);
    this.historyTask.set(task);
    this.historyLoading.set(true);
    this.closeAllDropdowns(); // Close dropdown when opening history

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

  getRemainingInfo(deadline?: string | Date | null) {
    if (!deadline) {
      return { label: ' ', class: 'text-gray-400' };
    }

    const today = new Date();
    const end = new Date(deadline);

    today.setHours(0, 0, 0, 0);
    end.setHours(0, 0, 0, 0);

    const diffDays = Math.ceil((end.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

    // Overdue
    if (diffDays < 0) {
      return {
        label: `Overdue by ${Math.abs(diffDays)} day${Math.abs(diffDays) > 1 ? 's' : ''}`,
        class: 'bg-red-100 text-red-800',
      };
    }

    // Due today
    if (diffDays === 0) {
      return {
        label: 'Due today',
        class: 'bg-orange-100 text-orange-800',
      };
    }

    // Due tomorrow
    if (diffDays === 1) {
      return {
        label: 'Due tomorrow',
        class: 'bg-yellow-100 text-orange-800',
      };
    }

    // Future
    return {
      label: `${diffDays} day${diffDays > 1 ? 's' : ''} left`,
      class: 'bg-green-100 text-green-800',
    };
  }

  getCommentCount(task: Task): number {
    if (!task.comments || !task.comments.length) return 0;

    return task.comments.filter((c) => c.message?.trim()).length;
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

  ngOnDestroy() {
    this.subscriptions.forEach((s) => s.unsubscribe());
  }
}
