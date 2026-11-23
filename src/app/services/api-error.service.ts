import { Injectable, signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';

export interface ApiErrorAlert {
  message: string;
  id: number;
}

@Injectable({ providedIn: 'root' })
export class ApiErrorService {
  readonly alert = signal<ApiErrorAlert | null>(null);
  private lastMessage = '';
  private lastShownAt = 0;
  private dismissTimer: ReturnType<typeof setTimeout> | null = null;

  show(error: unknown): void {
    const message = this.getMessage(error);
    const now = Date.now();

    // Polling endpoints can fail repeatedly. Avoid showing the same alert every few seconds.
    if (message === this.lastMessage && now - this.lastShownAt < 4000) {
      return;
    }

    this.lastMessage = message;
    this.lastShownAt = now;
    this.alert.set({ message, id: now });

    if (this.dismissTimer) {
      clearTimeout(this.dismissTimer);
    }
    this.dismissTimer = setTimeout(() => {
      this.alert.set(null);
      this.dismissTimer = null;
    }, 7000);
  }

  dismiss(): void {
    this.alert.set(null);
    if (this.dismissTimer) {
      clearTimeout(this.dismissTimer);
      this.dismissTimer = null;
    }
  }

  getMessage(error: unknown): string {
    if (error instanceof HttpErrorResponse) {
      const apiMessage = this.readMessage(error.error);
      if (apiMessage) return apiMessage;

      if (error.status === 0) return 'Unable to reach the server. Check your internet connection and try again.';
      if (error.status === 401) return 'Your session has expired. Please sign in again.';
      if (error.status === 403) return 'You do not have permission to perform this action.';
      if (error.status === 404) return 'The requested resource was not found.';
      if (error.status === 409) return 'This request conflicts with the current data.';
      if (error.status === 422) return 'Some submitted values are invalid. Please check the form.';
      if (error.status >= 500) return 'The server could not complete the request. Please try again later.';
      return `Request failed${error.status ? ` (${error.status})` : ''}. Please try again.`;
    }

    return this.readMessage(error) || 'Something went wrong. Please try again.';
  }

  private readMessage(value: unknown): string | null {
    if (typeof value === 'string') {
      const message = value.trim();
      if (!message || message.startsWith('<!DOCTYPE') || message.startsWith('<html')) return null;
      return message;
    }

    if (Array.isArray(value)) {
      const messages = value.map(item => this.readMessage(item)).filter(Boolean) as string[];
      return messages.length ? messages.join(' ') : null;
    }

    if (!value || typeof value !== 'object') return null;

    const data = value as Record<string, unknown>;
    for (const key of ['detail', 'message', 'error', 'non_field_errors']) {
      const message = this.readMessage(data[key]);
      if (message) return message;
    }

    const fieldMessages = Object.entries(data)
      .filter(([key]) => !['status', 'code'].includes(key))
      .map(([key, fieldError]) => {
        const message = this.readMessage(fieldError);
        return message ? `${key}: ${message}` : null;
      })
      .filter(Boolean) as string[];

    return fieldMessages.length ? fieldMessages.join(' ') : null;
  }
}
