import { Injectable } from '@angular/core';
import {
  HttpEvent,
  HttpHandler,
  HttpInterceptor,
  HttpRequest,
  HttpErrorResponse
} from '@angular/common/http';

import { Observable, throwError, BehaviorSubject } from 'rxjs';
import { catchError, switchMap, filter, take } from 'rxjs/operators';
import { AuthService } from '../services/auth.service';

@Injectable()
export class AuthInterceptor implements HttpInterceptor {

  private isRefreshing = false;
  private refreshTokenSubject = new BehaviorSubject<string | null>(null);

  constructor(private authService: AuthService) { }

  intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {

    const token = localStorage.getItem('token');

    // ✅ Define public APIs (NO TOKEN)
    const publicUrls = [
      '/api/token/',          // login
      '/api/token/refresh/',  // refresh
    ];

    const isPublic = publicUrls.some(url => req.url.includes(url));

    let authReq = req;

    // ✅ Attach token only for protected APIs
    if (token && !isPublic) {
      authReq = req.clone({
        setHeaders: {
          Authorization: `Bearer ${token}`
        }
      });
    }

    return next.handle(authReq).pipe(
      catchError((error: HttpErrorResponse) => {

        // ❌ Do NOT refresh for login/refresh APIs
        if (error.status === 401 && !isPublic) {
          return this.handle401Error(authReq, next);
        }

        return throwError(() => error);
      })
    );
  }

  private handle401Error(request: HttpRequest<any>, next: HttpHandler) {

    if (!this.isRefreshing) {
      this.isRefreshing = true;
      this.refreshTokenSubject.next(null);

      const refreshToken = localStorage.getItem('refresh');

      if (!refreshToken) {
        this.authService.logout();
        return throwError(() => 'No refresh token');
      }

      return this.authService.refreshToken(refreshToken).pipe(
        switchMap((res: any) => {
          this.isRefreshing = false;

          const newAccessToken = res.access;

          // ✅ Save new token
          localStorage.setItem('access', newAccessToken);

          this.refreshTokenSubject.next(newAccessToken);

          // ✅ Retry original request
          return next.handle(
            request.clone({
              setHeaders: {
                Authorization: `Bearer ${newAccessToken}`
              }
            })
          );
        }),
        catchError(err => {
          this.isRefreshing = false;

          // ❌ Refresh failed → logout
          this.authService.logout();

          return throwError(() => err);
        })
      );
    }

    // ⏳ Wait until refresh completes
    return this.refreshTokenSubject.pipe(
      filter(token => token != null),
      take(1),
      switchMap(token => {
        return next.handle(
          request.clone({
            setHeaders: {
              Authorization: `Bearer ${token}`
            }
          })
        );
      })
    );
  }
}