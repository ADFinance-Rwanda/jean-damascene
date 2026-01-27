import { Component, inject, signal } from '@angular/core';
import { Router, RouterModule } from '@angular/router';
import { FormsModule, NgForm } from '@angular/forms';
import { AuthService } from '../../services/auth.service';
import { NotificationService } from '../../../../core/toastify';
import { CommonModule } from '@angular/common';

@Component({
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './login.html',
})
export class LoginComponent {
  private auth = inject(AuthService);
  private router = inject(Router);
  private notify = inject(NotificationService);

  email = '';
  password = '';
  loading = signal(false);
  showPassword = false;

  togglePassword() {
    this.showPassword = !this.showPassword;
  }

  async login(form: NgForm) {
    if (form.invalid) {
      return;
    }

    try {
      this.loading.set(true);
      await this.auth.login(this.email, this.password);
      this.notify.success('Welcome back!');
      this.router.navigate(['/tasks']);
    } catch (error: any) {
      this.notify.errorAlert(error?.error?.message || 'Login failed');
    } finally {
      this.loading.set(false);
    }
  }
}
