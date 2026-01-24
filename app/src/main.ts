import { bootstrapApplication } from '@angular/platform-browser';
import { provideRouter } from '@angular/router';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { APP_INITIALIZER } from '@angular/core';

import { AppComponent } from './app/app';
import { routes } from './app/app.routes';
import { AuthService } from './app/features/auth/services/auth.service';
import { authInterceptor } from './app/core/auth/auth.interceptor';

function initAuth(auth: AuthService) {
  return () => auth.restoreSession();
}

bootstrapApplication(AppComponent, {
  providers: [
    provideRouter(routes),
    provideHttpClient(withInterceptors([authInterceptor])),

    {
      provide: APP_INITIALIZER,
      useFactory: initAuth,
      deps: [AuthService],
      multi: true,
    },
  ],
});
