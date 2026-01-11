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
      <h1 class="text-2xl font-bold text-gray-900 mb-6">Dashboard</h1>

      @if (loading()) {
        <div class="text-center py-12">
          <div class="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
          <p class="mt-2 text-gray-500">Loading...</p>
        </div>
      } @else if (error()) {
        <div class="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          {{ error() }}
        </div>
      } @else {
        <!-- Stats -->
        <div class="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4 mb-8">
          <div class="bg-white overflow-hidden shadow rounded-lg">
            <div class="px-4 py-5 sm:p-6">
              <dt class="text-sm font-medium text-gray-500 truncate">Total Vehicles</dt>
              <dd class="mt-1 text-3xl font-semibold text-gray-900">{{ dashboard()?.stats?.totalVehicles || 0 }}</dd>
            </div>
          </div>
          <div class="bg-white overflow-hidden shadow rounded-lg">
            <div class="px-4 py-5 sm:p-6">
              <dt class="text-sm font-medium text-gray-500 truncate">Overdue</dt>
              <dd class="mt-1 text-3xl font-semibold text-red-600">{{ dashboard()?.stats?.overdueReminders || 0 }}</dd>
            </div>
          </div>
          <div class="bg-white overflow-hidden shadow rounded-lg">
            <div class="px-4 py-5 sm:p-6">
              <dt class="text-sm font-medium text-gray-500 truncate">Due This Month</dt>
              <dd class="mt-1 text-3xl font-semibold text-yellow-600">{{ dashboard()?.stats?.upcomingThisMonth || 0 }}</dd>
            </div>
          </div>
          <div class="bg-white overflow-hidden shadow rounded-lg">
            <div class="px-4 py-5 sm:p-6">
              <dt class="text-sm font-medium text-gray-500 truncate">Completed (Year)</dt>
              <dd class="mt-1 text-3xl font-semibold text-green-600">{{ dashboard()?.stats?.completedThisYear || 0 }}</dd>
            </div>
          </div>
        </div>

        <!-- Overdue Reminders -->
        @if (dashboard()?.overdueReminders?.length) {
          <div class="bg-white shadow rounded-lg mb-6">
            <div class="px-4 py-5 border-b border-gray-200 sm:px-6">
              <h2 class="text-lg font-medium text-red-600">Overdue Reminders</h2>
            </div>
            <ul class="divide-y divide-gray-200">
              @for (reminder of dashboard()?.overdueReminders; track reminder.id) {
                <li class="px-4 py-4 sm:px-6">
                  <div class="flex items-center justify-between">
                    <div class="flex items-center space-x-3">
                      <app-reminder-icon [type]="reminder.type" [status]="reminder.status"></app-reminder-icon>
                      <div>
                        <p class="text-sm font-medium text-gray-900">{{ reminder.vehicleName }}</p>
                        <p class="text-sm text-gray-500">{{ reminder.type }} - Due {{ formatDate(reminder.dueDate) }}</p>
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
        <div class="bg-white shadow rounded-lg">
          <div class="px-4 py-5 border-b border-gray-200 sm:px-6 flex justify-between items-center">
            <h2 class="text-lg font-medium text-gray-900">Upcoming Reminders</h2>
            <a routerLink="/reminders" class="text-sm text-indigo-600 hover:text-indigo-500">View all</a>
          </div>
          @if (!dashboard()?.upcomingReminders?.length) {
            <div class="px-4 py-8 text-center text-gray-500">
              No upcoming reminders this month.
              <a routerLink="/vehicles" class="text-indigo-600 hover:text-indigo-500">Add a vehicle</a> to get started.
            </div>
          } @else {
            <ul class="divide-y divide-gray-200">
              @for (reminder of dashboard()?.upcomingReminders; track reminder.id) {
                <li class="px-4 py-4 sm:px-6">
                  <div class="flex items-center justify-between">
                    <div class="flex items-center space-x-3">
                      <app-reminder-icon [type]="reminder.type" [status]="reminder.status"></app-reminder-icon>
                      <div>
                        <p class="text-sm font-medium text-gray-900">{{ reminder.vehicleName }}</p>
                        <p class="text-sm text-gray-500">{{ reminder.type }} - Due {{ formatDate(reminder.dueDate) }}</p>
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
        return `${base} bg-red-100 text-red-800`;
      case 'urgent':
        return `${base} bg-orange-100 text-orange-800`;
      case 'warning':
        return `${base} bg-yellow-100 text-yellow-800`;
      case 'completed':
        return `${base} bg-gray-100 text-gray-800`;
      default:
        return `${base} bg-green-100 text-green-800`;
    }
  }
}
