import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { ApiService, DashboardResponse, Reminder } from '../../core/services/api.service';
import { ReminderIconComponent } from '../../shared/components/reminder-icon.component';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, ReminderIconComponent],
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

        <!-- All Active Reminders sorted by date -->
        <div class="bg-gray-800 shadow rounded-lg border border-gray-700">
          <div class="px-4 py-5 border-b border-gray-700 sm:px-6 flex justify-between items-center">
            <h2 class="text-lg font-medium text-white">Upcoming Reminders</h2>
            <a routerLink="/reminders" class="text-sm text-indigo-400 hover:text-indigo-300">View all</a>
          </div>
          @if (!allReminders().length) {
            <div class="px-4 py-8 text-center text-gray-400">
              No upcoming reminders.
              <a routerLink="/vehicles" class="text-indigo-400 hover:text-indigo-300">Add a vehicle</a> to get started.
            </div>
          } @else {
            <ul class="divide-y divide-gray-700">
              @for (reminder of allReminders(); track reminder.id) {
                <li class="px-4 py-4 sm:px-6">
                  <div class="flex items-center justify-between">
                    <div class="flex items-center space-x-3">
                      <app-reminder-icon [type]="reminder.type" [status]="reminder.status"></app-reminder-icon>
                      <div>
                        <p class="text-sm font-medium text-white">{{ reminder.vehicleName }}</p>
                        <p class="text-sm text-gray-400">{{ reminder.type }} - Due {{ formatDate(reminder.dueDate) }}</p>
                      </div>
                    </div>
                    <div class="flex items-center space-x-3">
                      <span [class]="getStatusClass(reminder.status)">
                        @if (reminder.daysUntilDue < 0) {
                          {{ Math.abs(reminder.daysUntilDue) }}d overdue
                        } @else if (reminder.daysUntilDue === 0) {
                          Due today
                        } @else if (reminder.daysUntilDue === 1) {
                          Due tomorrow
                        } @else {
                          {{ reminder.daysUntilDue }} days
                        }
                      </span>
                      <button (click)="openRenewModal(reminder)"
                              class="px-3 py-1 text-sm font-medium text-indigo-400 hover:text-indigo-300 border border-indigo-400 hover:border-indigo-300 rounded-md">
                        Renew
                      </button>
                    </div>
                  </div>
                </li>
              }
            </ul>
          }
        </div>
      }

      <!-- Renew Modal -->
      @if (renewingReminder()) {
        <div class="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center p-4 z-50">
          <div class="bg-gray-800 rounded-lg shadow-xl max-w-md w-full p-6 border border-gray-700">
            <h2 class="text-lg font-medium text-white mb-4">Renew {{ renewingReminder()!.type }}</h2>
            <p class="text-sm text-gray-400 mb-4">{{ renewingReminder()!.vehicleName }}</p>

            <form (ngSubmit)="submitRenew()" class="space-y-4">
              <div>
                <label class="block text-sm font-medium text-gray-300">New Due Date (DD/MM/YYYY)</label>
                <input type="text" [(ngModel)]="renewForm.dueDate" name="dueDate" required
                       placeholder="DD/MM/YYYY" pattern="\\d{2}/\\d{2}/\\d{4}"
                       class="mt-1 block w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md shadow-sm text-white placeholder-gray-400 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm">
              </div>

              <div>
                <label class="block text-sm font-medium text-gray-300">Note (optional)</label>
                <textarea [(ngModel)]="renewForm.notes" name="notes" rows="2"
                          placeholder="Add a note about this renewal..."
                          class="mt-1 block w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md shadow-sm text-white placeholder-gray-400 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"></textarea>
              </div>

              <div class="flex justify-end space-x-3 pt-4">
                <button type="button" (click)="closeRenewModal()"
                        class="px-4 py-2 border border-gray-600 rounded-md text-sm font-medium text-gray-300 hover:bg-gray-700">
                  Cancel
                </button>
                <button type="submit" [disabled]="saving()"
                        class="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50">
                  {{ saving() ? 'Saving...' : 'Renew' }}
                </button>
              </div>
            </form>
          </div>
        </div>
      }
    </div>
  `
})
export class DashboardComponent implements OnInit {
  private api = inject(ApiService);

  dashboard = signal<DashboardResponse | null>(null);
  allReminders = signal<Reminder[]>([]);
  loading = signal(true);
  error = signal('');
  renewingReminder = signal<Reminder | null>(null);
  saving = signal(false);

  renewForm = {
    dueDate: '',
    notes: ''
  };

  Math = Math;

  ngOnInit() {
    this.loadDashboard();
  }

  loadDashboard() {
    this.loading.set(true);
    this.api.getDashboard().subscribe({
      next: (data) => {
        this.dashboard.set(data);
        // Combine overdue and upcoming, sort by date
        const all = [
          ...(data.overdueReminders || []),
          ...(data.upcomingReminders || [])
        ].sort((a, b) => a.daysUntilDue - b.daysUntilDue);
        this.allReminders.set(all);
        this.loading.set(false);
      },
      error: (err) => {
        this.error.set('Failed to load dashboard');
        this.loading.set(false);
      }
    });
  }

  openRenewModal(reminder: Reminder) {
    this.renewingReminder.set(reminder);
    this.renewForm = {
      dueDate: '',
      notes: ''
    };
  }

  closeRenewModal() {
    this.renewingReminder.set(null);
    this.saving.set(false);
  }

  submitRenew() {
    const reminder = this.renewingReminder();
    if (!reminder) return;

    this.saving.set(true);

    const isoDate = this.parseEuropeanDate(this.renewForm.dueDate);

    this.api.updateReminder(reminder.id, {
      dueDate: isoDate,
      notes: this.renewForm.notes || reminder.notes || '',
      isCompleted: false
    }).subscribe({
      next: () => {
        this.closeRenewModal();
        this.loadDashboard();
      },
      error: () => this.saving.set(false)
    });
  }

  parseEuropeanDate(dateStr: string): string {
    const parts = dateStr.split('/');
    if (parts.length === 3) {
      return `${parts[2]}-${parts[1]}-${parts[0]}`;
    }
    return dateStr;
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
