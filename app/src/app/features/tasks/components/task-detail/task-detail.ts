import { Component, OnInit, inject, signal, OnDestroy } from '@angular/core';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { TaskService } from '../../services/task.service';
import { Task } from '../../models/task.model';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-task-detail',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './task-detail.html',
})
export class TaskDetailComponent implements OnInit {
  private taskService = inject(TaskService);
  private route = inject(ActivatedRoute);
  redirectTimer?: any;

  task = signal<Task | null>(null);
  isLoading = signal(true);
  error = signal<string | null>(null);

  newComment = signal<string>('');

  async ngOnInit() {
    const id = Number(this.route.snapshot.paramMap.get('id'));
    if (!id) return;

    try {
      const task = await this.taskService.getTaskById(id);
      this.task.set(task);
    } catch (error: any) {
      if (error?.message === 'Task not found' || error?.status === 404) {
        this.task.set(null);
        this.redirectTimer = setTimeout(() => {
          this.back();
        }, 5000);
      } else {
        this.error.set(error.message || 'Failed to load task');
      }
    } finally {
      this.isLoading.set(false);
    }
  }

  async addComment() {
    const task = this.task();
    const message = this.newComment();
    if (!task || !message.trim()) return;

    try {
      await this.taskService.addComment(task.id, { message, version: task.version });
      const updatedTask = await this.taskService.getTaskById(task.id);
      this.task.set(updatedTask);
      this.newComment.set('');
    } catch (error: any) {
      console.error(error);
    }
  }

  formatDeadline(dateStr: string) {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  }

  getStatusClass(status: string) {
    switch (status) {
      case 'OPEN':
        return 'bg-blue-100 text-blue-800';
      case 'IN_PROGRESS':
        return 'bg-yellow-100 text-yellow-800';
      case 'DONE':
        return 'bg-green-100 text-green-800';
      default:
        return '';
    }
  }

  getAssignedUser() {
    return this.task()?.assignedUser?.name || 'Unassigned';
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
        label: 'Due Today',
        class: 'bg-orange-100 text-orange-800',
      };
    }

    // Due tomorrow
    if (diffDays === 1) {
      return {
        label: 'Due Tomorrow',
        class: 'bg-yellow-100 text-orange-800',
      };
    }

    return {
      label: `${diffDays} day${diffDays > 1 ? 's' : ''} left`,
      class: 'bg-green-100 text-green-800',
    };
  }

  initials(name: string) {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase();
  }

  back() {
    window.history.back();
  }

  ngOnDestroy() {
    if (this.redirectTimer) {
      clearTimeout(this.redirectTimer);
    }
  }
}
