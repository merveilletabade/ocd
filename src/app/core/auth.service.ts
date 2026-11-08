import { HttpClient } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { tap } from 'rxjs';
import { API_URL } from './environment';

const TOKEN_KEY = 'ocd_admin_token';
const EMAIL_KEY = 'ocd_admin_email';

const read = (key: string): string | null => {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
};

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);

  readonly token = signal<string | null>(read(TOKEN_KEY));
  readonly email = signal<string | null>(read(EMAIL_KEY));
  readonly isLoggedIn = computed(() => !!this.token());

  login(email: string, password: string) {
    return this.http
      .post<{ access_token: string; email: string }>(`${API_URL}/auth/login`, { email, password })
      .pipe(tap((res) => this.save(res.access_token, res.email)));
  }

  logout(): void {
    this.token.set(null);
    this.email.set(null);
    try {
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(EMAIL_KEY);
    } catch {
      /* stockage indisponible */
    }
  }

  private save(token: string, email: string): void {
    this.token.set(token);
    this.email.set(email);
    try {
      localStorage.setItem(TOKEN_KEY, token);
      localStorage.setItem(EMAIL_KEY, email);
    } catch {
      /* stockage indisponible */
    }
  }
}
