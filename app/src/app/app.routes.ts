import { Routes } from '@angular/router';
import { LoginComponent } from './features/auth/components/login';
import { authGuard } from './core/auth/auth.guard';
import { TaskDetailComponent } from './features/tasks/components/task-detail/task-detail';
export const routes: Routes = [
  { path: 'login', component: LoginComponent },

  {
    path: '',
    loadComponent: () => import('./layout/main-layout').then((m) => m.MainLayoutComponent),
    canActivate: [authGuard],
    children: [
      {
        path: 'tasks',
        loadComponent: () =>
          import('./features/tasks/components/task-list/task-list').then(
            (m) => m.TaskListComponent,
          ),
      },
      { path: 'task/:id', component: TaskDetailComponent },
      {
        path: 'users',
        loadComponent: () =>
          import('./features/users/components/user-list/user-list').then(
            (m) => m.UserListComponent,
          ),
      },
    ],
  },

  { path: '**', redirectTo: 'login' },
];
