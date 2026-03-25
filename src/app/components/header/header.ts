import { Component } from '@angular/core';
import { AuthService } from '../../services/auth.service';
import { Router } from '@angular/router';

@Component({
  selector: 'app-header',
  standalone: false,
  templateUrl: './header.html',
  styleUrls: ['./header.css']
})
export class Header {
  constructor(
    private authService: AuthService,
    private router: Router
  ) {}

  logout() {
    console.log("sjhdhb");
  this.authService.logout();
  this.router.navigate(['/']);
}
}