import { Component } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [RouterLink, RouterLinkActive],
  template: `
    <header class="bg-gray-800 text-white p-4 flex justify-between">
      <div class="flex items-center justify-between w-full max-w-7xl mx-auto py-1">
        <div class="flex items-center space-x-3">
          <img
            src="/logo.png"
            alt="Task Tracker Logo"
            class="h-9 w-auto rounded-full object-cover"
          />
          <span class="font-bold text-lg">Task Tracker</span>
        </div>
        <nav class="space-x-4">
          <a
            routerLink="/tasks"
            routerLinkActive="text-blue-400 font-semibold"
            [routerLinkActiveOptions]="{ exact: true }"
            class="hover:underline transition-colors"
          >
            Tasks
          </a>
          <a
            routerLink="/users"
            routerLinkActive="text-blue-400 font-semibold"
            [routerLinkActiveOptions]="{ exact: true }"
            class="hover:underline transition-colors"
          >
            Users
          </a>
        </nav>
      </div>
    </header>
  `,
})
export class HeaderComponent {}
