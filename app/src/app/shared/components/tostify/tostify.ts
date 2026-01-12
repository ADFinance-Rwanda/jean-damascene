import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NotificationService } from '../../../core/toastify';

@Component({
  selector: 'app-notification',
  standalone: true,
  imports: [CommonModule],
  template: `<!-- This component is optional for global notifications -->`,
})
export class NotificationComponent {
  constructor(private notificationService: NotificationService) {}
}
