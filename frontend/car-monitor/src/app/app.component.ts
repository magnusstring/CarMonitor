import { Component, inject, signal } from '@angular/core';
import { RouterOutlet, RouterLink, RouterLinkActive, Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { AuthService } from './core/services/auth.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive, CommonModule],
  template: `
    <div class="min-h-screen bg-gray-950">
      @if (authService.isAuthenticated()) {
        <nav class="bg-gray-900 shadow-sm border-b border-gray-800">
          <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div class="flex justify-between h-16">
              <div class="flex">
                <div class="flex-shrink-0 flex items-center">
                  <span class="text-xl font-bold text-indigo-400">CarMonitor</span>
                </div>
                <!-- Desktop menu -->
                <div class="hidden sm:ml-8 sm:flex sm:space-x-4">
                  <a routerLink="/dashboard" routerLinkActive="border-indigo-400 text-white"
                     class="border-transparent text-gray-400 hover:border-gray-600 hover:text-gray-200 inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium">
                    Dashboard
                  </a>
                  <a routerLink="/vehicles" routerLinkActive="border-indigo-400 text-white"
                     class="border-transparent text-gray-400 hover:border-gray-600 hover:text-gray-200 inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium">
                    Vehicles
                  </a>
                  <a routerLink="/reminders" routerLinkActive="border-indigo-400 text-white"
                     class="border-transparent text-gray-400 hover:border-gray-600 hover:text-gray-200 inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium">
                    Reminders
                  </a>
                  <a routerLink="/admin" routerLinkActive="border-indigo-400 text-white"
                     class="border-transparent text-gray-400 hover:border-gray-600 hover:text-gray-200 inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium">
                    Admin
                  </a>
                </div>
              </div>
              <div class="flex items-center">
                <span class="hidden sm:block text-sm text-gray-400 mr-4">{{ authService.getUsername() }}</span>
                <button (click)="logout()"
                        class="hidden sm:block text-sm text-gray-400 hover:text-gray-200 font-medium">
                  Logout
                </button>
                <!-- Mobile menu button -->
                <button (click)="mobileMenuOpen.set(!mobileMenuOpen())"
                        class="sm:hidden inline-flex items-center justify-center p-2 rounded-md text-gray-400 hover:text-gray-200 hover:bg-gray-800 focus:outline-none"
                        type="button"
                        aria-expanded="false">
                  <span class="sr-only">Open main menu</span>
                  @if (!mobileMenuOpen()) {
                    <svg class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor">
                      <path stroke-linecap="round" stroke-linejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
                    </svg>
                  } @else {
                    <svg class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor">
                      <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  }
                </button>
              </div>
            </div>
          </div>

          <!-- Mobile menu -->
          @if (mobileMenuOpen()) {
            <div class="sm:hidden border-t border-gray-800 bg-gray-900">
              <div class="pt-2 pb-3 space-y-1">
                <a routerLink="/dashboard" (click)="mobileMenuOpen.set(false)"
                   routerLinkActive="bg-gray-800 border-indigo-400 text-indigo-400"
                   class="border-transparent text-gray-400 hover:bg-gray-800 hover:border-gray-600 hover:text-gray-200 block pl-3 pr-4 py-2 border-l-4 text-base font-medium">
                  Dashboard
                </a>
                <a routerLink="/vehicles" (click)="mobileMenuOpen.set(false)"
                   routerLinkActive="bg-gray-800 border-indigo-400 text-indigo-400"
                   class="border-transparent text-gray-400 hover:bg-gray-800 hover:border-gray-600 hover:text-gray-200 block pl-3 pr-4 py-2 border-l-4 text-base font-medium">
                  Vehicles
                </a>
                <a routerLink="/reminders" (click)="mobileMenuOpen.set(false)"
                   routerLinkActive="bg-gray-800 border-indigo-400 text-indigo-400"
                   class="border-transparent text-gray-400 hover:bg-gray-800 hover:border-gray-600 hover:text-gray-200 block pl-3 pr-4 py-2 border-l-4 text-base font-medium">
                  Reminders
                </a>
                <a routerLink="/admin" (click)="mobileMenuOpen.set(false)"
                   routerLinkActive="bg-gray-800 border-indigo-400 text-indigo-400"
                   class="border-transparent text-gray-400 hover:bg-gray-800 hover:border-gray-600 hover:text-gray-200 block pl-3 pr-4 py-2 border-l-4 text-base font-medium">
                  Admin
                </a>
              </div>
              <div class="pt-4 pb-3 border-t border-gray-800">
                <div class="flex items-center px-4">
                  <div class="text-base font-medium text-gray-200">{{ authService.getUsername() }}</div>
                </div>
                <div class="mt-3 space-y-1">
                  <button (click)="logout(); mobileMenuOpen.set(false)"
                          class="block w-full text-left px-4 py-2 text-base font-medium text-gray-400 hover:text-gray-200 hover:bg-gray-800">
                    Logout
                  </button>
                </div>
              </div>
            </div>
          }
        </nav>
      }
      <main>
        <router-outlet></router-outlet>
      </main>
    </div>
  `
})
export class AppComponent {
  authService = inject(AuthService);
  private router = inject(Router);
  mobileMenuOpen = signal(false);

  logout() {
    this.authService.logout();
    this.router.navigate(['/login']);
  }
}
