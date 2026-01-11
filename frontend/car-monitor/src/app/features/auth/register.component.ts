import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  template: `
    <div class="min-h-screen flex items-center justify-center bg-gray-950 py-12 px-4 sm:px-6 lg:px-8">
      <div class="max-w-md w-full space-y-8">
        <div>
          <h1 class="text-center text-3xl font-bold text-indigo-400">CarMonitor</h1>
          <h2 class="mt-6 text-center text-2xl font-semibold text-white">Create your account</h2>
        </div>

        @if (error) {
          <div class="bg-red-900/50 border border-red-700 text-red-400 px-4 py-3 rounded">
            {{ error }}
          </div>
        }

        <form class="mt-8 space-y-6" (ngSubmit)="onSubmit()">
          <div class="space-y-4">
            <div>
              <label for="username" class="block text-sm font-medium text-gray-300">Username</label>
              <input id="username" name="username" type="text" required
                     [(ngModel)]="username"
                     class="mt-1 block w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-md shadow-sm text-white placeholder-gray-500 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500">
            </div>
            <div>
              <label for="email" class="block text-sm font-medium text-gray-300">Email (optional, for reminders)</label>
              <input id="email" name="email" type="email"
                     [(ngModel)]="email"
                     class="mt-1 block w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-md shadow-sm text-white placeholder-gray-500 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500">
            </div>
            <div>
              <label for="password" class="block text-sm font-medium text-gray-300">Password</label>
              <input id="password" name="password" type="password" required minlength="6"
                     [(ngModel)]="password"
                     class="mt-1 block w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-md shadow-sm text-white placeholder-gray-500 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500">
              <p class="mt-1 text-xs text-gray-500">At least 6 characters</p>
            </div>
          </div>

          <button type="submit" [disabled]="loading"
                  class="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-900 focus:ring-indigo-500 disabled:opacity-50">
            @if (loading) {
              Creating account...
            } @else {
              Create account
            }
          </button>

          <p class="text-center text-sm text-gray-400">
            Already have an account?
            <a routerLink="/login" class="font-medium text-indigo-400 hover:text-indigo-300">Sign in</a>
          </p>
        </form>
      </div>
    </div>
  `
})
export class RegisterComponent {
  private authService = inject(AuthService);
  private router = inject(Router);

  username = '';
  email = '';
  password = '';
  loading = false;
  error = '';

  onSubmit() {
    this.loading = true;
    this.error = '';

    this.authService.register({
      username: this.username,
      password: this.password,
      email: this.email || undefined
    }).subscribe({
      next: () => {
        this.router.navigate(['/dashboard']);
      },
      error: (err) => {
        this.error = err.error?.message || 'Registration failed';
        this.loading = false;
      }
    });
  }
}
