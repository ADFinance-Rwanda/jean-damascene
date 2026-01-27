import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, NgForm } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { NotificationService } from '../../../../core/toastify';

@Component({
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './forgot-password.html',
})
export class ForgotPasswordComponent {
  email = '';

  constructor(private notify: NotificationService) {}

  submit(form: NgForm) {
    if (form.invalid) return;

    // Later connect backend
    this.notify.success('Reset link sent to your email');
  }
}
