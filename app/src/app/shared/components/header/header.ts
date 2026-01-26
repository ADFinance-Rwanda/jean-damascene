import { Component, inject, signal } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { AuthService } from '../../../features/auth/services/auth.service';
import { NgIf } from '@angular/common';
import { Router } from '@angular/router';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [RouterLink, RouterLinkActive, NgIf],
  templateUrl: './header.html',
})
export class HeaderComponent {
  auth = inject(AuthService);
  showDropdown = signal(false);
  private router = inject(Router);

  toggleDropdown() {
    this.showDropdown.set(!this.showDropdown());
  }

  logout() {
    this.auth.logout();
    this.router.navigate(['/login']);
  }

  // Close dropdown when clicking outside
  onDocumentClick(event: MouseEvent) {
    const dropdownElement = document.querySelector('.dropdown-container');
    const buttonElement = document.querySelector('.dropdown-button');

    if (
      dropdownElement &&
      buttonElement &&
      !dropdownElement.contains(event.target as Node) &&
      !buttonElement.contains(event.target as Node)
    ) {
      this.showDropdown.set(false);
    }
  }

  // Initialize click outside listener
  ngOnInit() {
    document.addEventListener('click', this.onDocumentClick.bind(this));
  }

  ngOnDestroy() {
    document.removeEventListener('click', this.onDocumentClick.bind(this));
  }
}
