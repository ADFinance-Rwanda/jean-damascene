import { Component, inject, signal, OnInit, OnDestroy } from '@angular/core';
import { RouterLink, RouterLinkActive, Router } from '@angular/router';
import { AuthService } from '../../../features/auth/services/auth.service';
import { NgIf } from '@angular/common';
import { SocketService } from '../../../core/sockets/SocketService';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [RouterLink, RouterLinkActive, NgIf],
  templateUrl: './header.html',
})
export class HeaderComponent implements OnInit, OnDestroy {
  auth = inject(AuthService);
  socket = inject(SocketService);
  router = inject(Router);

  showDropdown = signal(false);
  showNotifications = signal(false);

  private boundClick = this.onDocumentClick.bind(this);

  ngOnInit() {
    // ❗ No manual socket.connect()
    // SocketService auto-connects from AuthService token

    document.addEventListener('click', this.boundClick);
  }

  ngOnDestroy() {
    document.removeEventListener('click', this.boundClick);
  }

  toggleDropdown() {
    this.showDropdown.update((v) => !v);
  }

  toggleNotifications() {
    this.showNotifications.update((v) => !v);

    // If opening panel, mark all unread as read
    if (this.showNotifications()) {
      this.socket.markAllAsRead();
    }
  }

  logout() {
    this.auth.logout();
    this.socket.disconnect();
    this.router.navigate(['/login']);
  }

  onDocumentClick(event: MouseEvent) {
    const dropdown = document.querySelector('.dropdown-container');
    const notif = document.querySelector('.notif-container');

    if (dropdown && !dropdown.contains(event.target as Node)) {
      this.showDropdown.set(false);
    }

    if (notif && !notif.contains(event.target as Node)) {
      this.showNotifications.set(false);
    }
  }
}
