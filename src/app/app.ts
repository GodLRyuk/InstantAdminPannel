import { Component, signal } from '@angular/core';
import { ApiErrorService } from './services/api-error.service';

@Component({
  selector: 'app-root',
  templateUrl: './app.html',
  standalone: false,
  styleUrl: './app.css'
})
export class App {
  protected readonly title = signal('instant-admin');

  constructor(readonly apiErrorService: ApiErrorService) {}
}
