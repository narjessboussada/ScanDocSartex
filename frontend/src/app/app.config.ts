import { ApplicationConfig } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideHttpClient, withFetch, withInterceptors } from '@angular/common/http';
import { provideAnimations } from '@angular/platform-browser/animations';
import { routes } from './app.routes';
import { authInterceptor } from './core/interceptors/auth.interceptor';

export const appConfig: ApplicationConfig = {
  providers: [
    provideRouter(routes),                            // active le système de navigation
    provideHttpClient(withFetch(), withInterceptors([authInterceptor])), // active les appels HTTP + fetch API + interceptor JWT
    provideAnimations(),                              // active les animations Angular Material
  ],
};