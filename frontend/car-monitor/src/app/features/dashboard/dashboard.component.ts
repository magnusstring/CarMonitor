import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { ApiService, DashboardResponse, Reminder } from '../../core/services/api.service';
import { ReminderIconComponent } from '../../shared/components/reminder-icon.component';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink, ReminderIconComponent],
  template: `
    <div class="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
      <h1 class="text-2xl font-bold text-white mb-6">Dashboard</h1>

      @if (loading()) {
        <div class="text-center py-12">
          <div class="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-400"></div>
          <p class="mt-2 text-gray-400">Loading...</p>
        </div>
      } @else if (error()) {
        <div class="bg-red-900/50 border border-red-700 text-red-400 px-4 py-3 rounded">
          {{ error() }}
        </div>
      } @else {
        <!-- Stats -->
        <div class="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4 mb-8">
          <div class="bg-gray-800 overflow-hidden shadow rounded-lg border border-gray-700">
            <div class="px-4 py-5 sm:p-6">
              <dt class="text-sm font-medium text-gray-400 truncate">Total Vehicles</dt>
              <dd class="mt-1 text-3xl font-semibold text-white">{{ dashboard()?.stats?.totalVehicles || 0 }}</dd>
            </div>
          </div>
          <div class="bg-gray-800 overflow-hidden shadow rounded-lg border border-gray-700">
            <div class="px-4 py-5 sm:p-6">
              <dt class="text-sm font-medium text-gray-400 truncate">Overdue</dt>
              <dd class="mt-1 text-3xl font-semibold text-red-400">{{ dashboard()?.stats?.overdueReminders || 0 }}</dd>
            </div>
          </div>
          <div class="bg-gray-800 overflow-hidden shadow rounded-lg border border-gray-700">
            <div class="px-4 py-5 sm:p-6">
              <dt class="text-sm font-medium text-gray-400 truncate">Due This Month</dt>
              <dd class="mt-1 text-3xl font-semibold text-yellow-400">{{ dashboard()?.stats?.upcomingThisMonth || 0 }}</dd>
            </div>
          </div>
          <div class="bg-gray-800 overflow-hidden shadow rounded-lg border border-gray-700">
            <div class="px-4 py-5 sm:p-6">
              <dt class="text-sm font-medium text-gray-400 truncate">Completed (Year)</dt>
              <dd class="mt-1 text-3xl font-semibold text-green-400">{{ dashboard()?.stats?.completedThisYear || 0 }}</dd>
            </div>
          </div>
        </div>

        <!-- Overdue Reminders -->
        @if (dashboard()?.overdueReminders?.length) {
          <div class="bg-gray-800 shadow rounded-lg mb-6 border border-gray-700">
            <div class="px-4 py-5 border-b border-gray-700 sm:px-6">
              <h2 class="text-lg font-medium text-red-400">Overdue Reminders</h2>
            </div>
            <ul class="divide-y divide-gray-700">
              @for (reminder of dashboard()?.overdueReminders; track reminder.id) {
                <li class="px-4 py-4 sm:px-6">
                  <div class="flex items-center justify-between">
                    <div class="flex items-center space-x-3">
                      <app-reminder-icon [type]="reminder.type" [status]="reminder.status"></app-reminder-icon>
                      <div>
                        <p class="text-sm font-medium text-white">{{ reminder.vehicleName }}</p>
                        <p class="text-sm text-gray-400">{{ reminder.type }} - Due {{ formatDate(reminder.dueDate) }}</p>
                      </div>
                    </div>
                    <span [class]="getStatusClass(reminder.status)">
                      {{ Math.abs(reminder.daysUntilDue) }} days overdue
                    </span>
                  </div>
                </li>
              }
            </ul>
          </div>
        }

        <!-- Upcoming Reminders -->
        <div class="bg-gray-800 shadow rounded-lg border border-gray-700">
          <div class="px-4 py-5 border-b border-gray-700 sm:px-6 flex justify-between items-center">
            <h2 class="text-lg font-medium text-white">Upcoming Reminders</h2>
            <a routerLink="/reminders" class="text-sm text-indigo-400 hover:text-indigo-300">View all</a>
          </div>
          @if (!dashboard()?.upcomingReminders?.length) {
            <div class="px-4 py-8 text-center text-gray-400">
              No upcoming reminders this month.
              <a routerLink="/vehicles" class="text-indigo-400 hover:text-indigo-300">Add a vehicle</a> to get started.
            </div>
          } @else {
            <ul class="divide-y divide-gray-700">
              @for (reminder of dashboard()?.upcomingReminders; track reminder.id) {
                <li class="px-4 py-4 sm:px-6">
                  <div class="flex items-center justify-between">
                    <div class="flex items-center space-x-3">
                      <app-reminder-icon [type]="reminder.type" [status]="reminder.status"></app-reminder-icon>
                      <div>
                        <p class="text-sm font-medium text-white">{{ reminder.vehicleName }}</p>
                        <p class="text-sm text-gray-400">{{ reminder.type }} - Due {{ formatDate(reminder.dueDate) }}</p>
                      </div>
                    </div>
                    <span [class]="getStatusClass(reminder.status)">
                      @if (reminder.daysUntilDue === 0) {
                        Due today
                      } @else if (reminder.daysUntilDue === 1) {
                        Due tomorrow
                      } @else {
                        {{ reminder.daysUntilDue }} days
                      }
                    </span>
                  </div>
                </li>
              }
            </ul>
          }
        </div>
      }
    </div>
  `
})
export class DashboardComponent implements OnInit {
  private api = inject(ApiService);

  dashboard = signal<DashboardResponse | null>(null);
  loading = signal(true);
  error = signal('');

  Math = Math;

  ngOnInit() {
    this.loadDashboard();
  }

  loadDashboard() {
    this.loading.set(true);
    this.api.getDashboard().subscribe({
      next: (data) => {
        this.dashboard.set(data);
        this.loading.set(false);
      },
      error: (err) => {
        this.error.set('Failed to load dashboard');
        this.loading.set(false);
      }
    });
  }

  formatDate(dateStr: string): string {
    return new Date(dateStr).toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  }

  getStatusClass(status: string): string {
    const base = 'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium';
    switch (status) {
      case 'overdue':
        return `${base} bg-red-900/50 text-red-400`;
      case 'urgent':
        return `${base} bg-orange-900/50 text-orange-400`;
      case 'warning':
        return `${base} bg-yellow-900/50 text-yellow-400`;
      case 'completed':
        return `${base} bg-gray-700 text-gray-300`;
      default:
        return `${base} bg-green-900/50 text-green-400`;
    }
  }
}
