import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../services/auth.service';
import { Router } from '@angular/router';

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
  loginData = {
    email: '',
    password: ''
  };

  onSubmit() {
   this.authService.login(this.loginData).subscribe({

      next: (response) => {
        console.log('Login success:', response);

        // save token
        localStorage.setItem('token', response.access);
        localStorage.setItem('refresh', response.refresh);
        this.router.navigate(['/dashboard']);

        // redirect later to dashboard
      },

      error: (error) => {
        console.error('Login failed:', error);
      }

    });
  }

}