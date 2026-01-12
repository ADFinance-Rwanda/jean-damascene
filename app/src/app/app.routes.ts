import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () => import('./layout/main-layout').then((m) => m.MainLayoutComponent),
    children: [
      { path: '', redirectTo: 'tasks', pathMatch: 'full' },
      {
        path: 'tasks',
        loadComponent: () =>
          import('./features/tasks/components/task-list/task-list').then(
            (m) => m.TaskListComponent
          ),
      },
      {
        path: 'users',
        loadComponent: () =>
          import('./features/users/components/user-list/user-list').then(
            (m) => m.UserListComponent
          ),
      },
    ],
  },
];
