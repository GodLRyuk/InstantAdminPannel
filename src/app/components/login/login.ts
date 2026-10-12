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
        this.error.set(error instanceof HttpErrorResponse
          ? error.status === 0
            ? 'Unable to connect to the server.'
            : 'Invalid email or password, or this account cannot access the admin panel.'
          : 'Login failed. Please try again.');
        this.submitting.set(false);
      }

    });
  }

}