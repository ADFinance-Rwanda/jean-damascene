import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { UserService } from '../../services/user.service';
import { User } from '../../models/user.model';
import { NotificationService } from '../../../../core/toastify';
import { AuthService } from '../../../auth/services/auth.service';

@Component({
  selector: 'app-user-list',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './user-list.html',
})
export class UserListComponent implements OnInit {
  private userService = inject(UserService);
  private notify = inject(NotificationService);
  public auth = inject(AuthService);

  users = signal<User[]>([]);
  isLoading = signal(true);
  error = signal<string | null>(null);

  /* ---------- CREATE / EDIT MODAL ---------- */
  showModal = signal(false);
  isEditMode = signal(false);
  selectedUserId = signal<number | null>(null);

  name = '';
  email = '';
  role = 'USER';
  password = '';

  async ngOnInit() {
    await this.loadUsers();
  }

  async loadUsers() {
    try {
      this.isLoading.set(true);
      const users = await this.userService.getUsers();
      this.users.set(users);
    } catch (error: any) {
      this.error.set('Failed to load users');
      this.notify.errorAlert('Failed to load users');
    } finally {
      this.isLoading.set(false);
    }
  }

  /* ---------- CREATE ---------- */
  openCreateModal() {
    this.isEditMode.set(false);
    this.selectedUserId.set(null);
    this.name = '';
    this.email = '';
    this.password = '';
    this.role = 'USER';
    this.showModal.set(true);
  }

  /* ---------- EDIT ---------- */
  openEditModal(user: User) {
    this.isEditMode.set(true);
    this.selectedUserId.set(user.id);
    this.name = user.name;
    this.email = user.email;
    this.role = user.role;
    this.showModal.set(true);
  }

  closeModal() {
    this.showModal.set(false);
  }

  async saveUser() {
    try {
      if (this.isEditMode()) {
        await this.userService.updateUser(this.selectedUserId()!, {
          name: this.name,
          email: this.email,
          role: this.role,
        });
        this.notify.success('User updated successfully!');
      } else {
        await this.userService.createUser({
          name: this.name,
          email: this.email,
          role: this.role,
          password: this.password,
        });
        this.notify.success('User created successfully!');
      }

      await this.loadUsers();
      this.closeModal();
    } catch (error: any) {
      console.log('🚀 ~ UserListComponent ~ saveUser ~ error:', error);
      this.notify.errorAlert(error?.message || 'Failed to save user kakak');
    }
  }

  /* ---------- DELETE ---------- */
  async deleteUser(user: User) {
    const confirmed = await this.notify.confirmDelete(user.name, 'user');

    if (confirmed.isConfirmed) {
      try {
        await this.userService.deleteUser(user.id);
        this.notify.success(`User "${user.name}" deleted successfully!`);
        await this.loadUsers();
      } catch (error: any) {
        this.notify.errorAlert('Failed to delete user');
      }
    }
  }
}
