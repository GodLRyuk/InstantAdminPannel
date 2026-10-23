import { Component, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { AuthService } from '../../services/auth.service';
import { Router } from '@angular/router';
import { Login } from '../../models/login.model';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [FormsModule],   // 👈 ADD THIS
  templateUrl: './login.html',
  styleUrls: ['./login.css']
})
export class LoginComponent {
constructor(
  private authService: AuthService,
  private router: Router
) 
{}
  loginData: Login = {
    email: '',
    password: ''
  };
  readonly error = signal('');
  readonly submitting = signal(false);

  onSubmit() {
    if (this.submitting()) return;
    this.submitting.set(true);
    this.error.set('');
    this.authService.login(this.loginData).subscribe({

      next: (response) => {
        this.authService.saveSession(response);
        this.submitting.set(false);
        this.router.navigate([this.authService.isRestaurant() ? '/restaurants/menu-items' : '/dashboard']);
      },

      error: (error: unknown) => {
        console.error('Login failed:', error);
        this.error.set(this.getLoginErrorMessage(error));
        this.submitting.set(false);
      }

    });
  }

  private getLoginErrorMessage(error: unknown): string {
    if (!(error instanceof HttpErrorResponse)) {
      return 'Login failed. Please try again.';
    }

    if (error.status === 0) {
      return 'Unable to connect to the server.';
    }

    const serverMessage = this.getServerMessage(error.error);
    if (error.status === 429) {
      const retryAfter = this.getRetryAfterMessage(error.headers.get('Retry-After'));
      const retryGuidance = retryAfter && !/\b(wait|retry|try again)\b/i.test(serverMessage)
        ? ` Try again ${retryAfter}.`
        : '';

      return `${serverMessage || 'Too many login attempts. Please try again later.'}${retryGuidance}`;
    }

    if (serverMessage) {
      return serverMessage;
    }

    if (error.status === 423) {
      return 'This login is temporarily locked. Please try again later.';
    }

    return 'Invalid email or password, or this account cannot access the admin panel.';
  }

  private getServerMessage(response: unknown): string {
    if (typeof response === 'string') {
      return response.trim();
    }

    if (Array.isArray(response)) {
      return response.map(value => this.getServerMessage(value)).filter(Boolean).join(' ');
    }

    if (!response || typeof response !== 'object') {
      return '';
    }

    const body = response as Record<string, unknown>;
    for (const key of ['detail', 'message', 'non_field_errors', 'error']) {
      const message = this.getServerMessage(body[key]);
      if (message) {
        return message;
      }
    }

    return Object.entries(body)
      .map(([key, value]) => {
        const message = this.getServerMessage(value);
        return message ? `${key}: ${message}` : '';
      })
      .filter(Boolean)
      .join(' ');
  }

  private getRetryAfterMessage(retryAfter: string | null): string {
    if (!retryAfter) {
      return '';
    }

    const seconds = Number(retryAfter);
    const delayMs = Number.isFinite(seconds)
      ? seconds * 1000
      : Date.parse(retryAfter) - Date.now();
    if (!Number.isFinite(delayMs) || delayMs <= 0) {
      return '';
    }

    const minutes = Math.ceil(delayMs / 60_000);
    return minutes > 1 ? `in ${minutes} minutes` : 'in less than a minute';
  }

}