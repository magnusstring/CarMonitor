import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { ApiService, Reminder, Vehicle, CreateReminderRequest, ReminderType } from '../../core/services/api.service';
import { ReminderIconComponent } from '../../shared/components/reminder-icon.component';

@Component({
  selector: 'app-reminders',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, ReminderIconComponent],
  template: `
    <div class="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
      <div class="flex justify-between items-center mb-6">
        <h1 class="text-2xl font-bold text-white">All Reminders</h1>
        <button (click)="showAddModal.set(true)"
                class="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700">
          Add Reminder
        </button>
      </div>

      <!-- Filters -->
      <div class="bg-gray-800 shadow rounded-lg p-4 mb-6 border border-gray-700">
        <div class="flex flex-wrap gap-4">
          <div>
            <label class="block text-sm font-medium text-gray-300 mb-1">Status</label>
            <select [(ngModel)]="filterStatus" class="px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-sm text-white">
              <option value="all">All</option>
              <option value="active">Active</option>
              <option value="overdue">Overdue</option>
              <option value="completed">Completed</option>
            </select>
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-300 mb-1">Type</label>
            <select [(ngModel)]="filterType" class="px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-sm text-white">
              <option value="all">All Types</option>
              @for (type of reminderTypes(); track type.id) {
                <option [value]="type.name">{{ type.name }}</option>
              }
            </select>
          </div>
        </div>
      </div>

      @if (loading()) {
        <div class="text-center py-12">
          <div class="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-400"></div>
        </div>
      } @else if (!filteredReminders().length) {
        <div class="text-center py-12 bg-gray-800 rounded-lg shadow border border-gray-700">
          <p class="text-gray-400">No reminders found.</p>
        </div>
      } @else {
        <div class="bg-gray-800 shadow overflow-hidden sm:rounded-md border border-gray-700">
          <ul class="divide-y divide-gray-700">
            @for (reminder of filteredReminders(); track reminder.id) {
              <li class="px-4 py-4 sm:px-6">
                <div class="flex items-center justify-between">
                  <div class="flex items-center space-x-4">
                    <input type="checkbox" [checked]="reminder.isCompleted"
                           (change)="toggleComplete(reminder)"
                           class="h-4 w-4 text-indigo-600 rounded border-gray-600 bg-gray-700">
                    <app-reminder-icon [type]="reminder.type" [status]="reminder.status"></app-reminder-icon>
                    <div [class.line-through]="reminder.isCompleted" [class.text-gray-500]="reminder.isCompleted">
                      <p class="text-sm font-medium text-white">
                        <a [routerLink]="['/vehicles', reminder.vehicleId]" class="hover:text-indigo-400">
                          {{ reminder.vehicleName }}
                        </a>
                      </p>
                      <p class="text-sm text-gray-400">{{ reminder.type }} - Due {{ formatDate(reminder.dueDate) }}</p>
                    </div>
                  </div>
                  <div class="flex items-center space-x-3">
                    <span [class]="getStatusClass(reminder.status)">
                      @if (reminder.isCompleted) {
                        Completed
                      } @else if (reminder.daysUntilDue < 0) {
                        {{ Math.abs(reminder.daysUntilDue) }}d overdue
                      } @else if (reminder.daysUntilDue === 0) {
                        Today
                      } @else {
                        {{ reminder.daysUntilDue }}d
                      }
                    </span>
                    @if (!reminder.isCompleted) {
                      <button (click)="openRenewModal(reminder)"
                              class="px-3 py-1 text-sm font-medium text-indigo-400 hover:text-indigo-300 border border-indigo-400 hover:border-indigo-300 rounded-md">
                        Renew
                      </button>
                    }
                    <button (click)="deleteReminder(reminder)"
                            class="text-red-400 hover:text-red-300 text-sm">
                      Delete
                    </button>
                  </div>
                </div>
              </li>
            }
          </ul>
        </div>
      }

      <!-- Add Reminder Modal -->
      @if (showAddModal()) {
        <div class="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center p-4 z-50">
          <div class="bg-gray-800 rounded-lg shadow-xl max-w-md w-full p-6 border border-gray-700">
            <h2 class="text-lg font-medium text-white mb-4">Add Reminder</h2>

            <form (ngSubmit)="saveReminder()" class="space-y-4">
              <div>
                <label class="block text-sm font-medium text-gray-300">Vehicle</label>
                <select [(ngModel)]="reminderForm.vehicleId" name="vehicleId" required
                        class="mt-1 block w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md shadow-sm text-white focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm">
                  <option [ngValue]="0" disabled>Select a vehicle</option>
                  @for (v of vehicles(); track v.id) {
                    <option [ngValue]="v.id">{{ v.make }} {{ v.model }} ({{ v.licensePlate }})</option>
                  }
                </select>
              </div>

              <div>
                <label class="block text-sm font-medium text-gray-300">Type</label>
                <select [(ngModel)]="reminderForm.type" name="type" required
                        class="mt-1 block w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md shadow-sm text-white focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm">
                  @for (type of reminderTypes(); track type.id) {
                    <option [value]="type.name">{{ type.name }}</option>
                  }
                </select>
              </div>

              <div>
                <label class="block text-sm font-medium text-gray-300">Due Date (DD/MM/YYYY)</label>
                <input type="text" [(ngModel)]="reminderForm.dueDate" name="dueDate" required
                       placeholder="DD/MM/YYYY" pattern="\\d{2}/\\d{2}/\\d{4}"
                       class="mt-1 block w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md shadow-sm text-white placeholder-gray-400 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm">
              </div>

              <div>
                <label class="block text-sm font-medium text-gray-300">Notes (optional)</label>
                <textarea [(ngModel)]="reminderForm.notes" name="notes" rows="2"
                          class="mt-1 block w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md shadow-sm text-white placeholder-gray-400 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"></textarea>
              </div>

              <div class="flex justify-end space-x-3 pt-4">
                <button type="button" (click)="closeModal()"
                        class="px-4 py-2 border border-gray-600 rounded-md text-sm font-medium text-gray-300 hover:bg-gray-700">
                  Cancel
                </button>
                <button type="submit" [disabled]="saving() || !reminderForm.vehicleId"
                        class="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50">
                  {{ saving() ? 'Saving...' : 'Save' }}
                </button>
              </div>
            </form>
          </div>
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
                <input type="text" [(ngModel)]="renewForm.dueDate" name="renewDueDate" required
                       placeholder="DD/MM/YYYY" pattern="\\d{2}/\\d{2}/\\d{4}"
                       class="mt-1 block w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md shadow-sm text-white placeholder-gray-400 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm">
              </div>

              <div>
                <label class="block text-sm font-medium text-gray-300">Note (optional)</label>
                <textarea [(ngModel)]="renewForm.notes" name="renewNotes" rows="2"
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
export class RemindersComponent implements OnInit {
  private api = inject(ApiService);

  reminders = signal<Reminder[]>([]);
  vehicles = signal<Vehicle[]>([]);
  reminderTypes = signal<ReminderType[]>([]);
  loading = signal(true);
  showAddModal = signal(false);
  saving = signal(false);
  renewingReminder = signal<Reminder | null>(null);

  filterStatus = 'all';
  filterType = 'all';

  Math = Math;

  reminderForm: CreateReminderRequest = {
    vehicleId: 0,
    type: 'Insurance',
    dueDate: '',
    notes: ''
  };

  renewForm = {
    dueDate: '',
    notes: ''
  };

  filteredReminders = computed(() => {
    let result = this.reminders();

    if (this.filterStatus !== 'all') {
      result = result.filter(r => {
        if (this.filterStatus === 'active') return !r.isCompleted;
        if (this.filterStatus === 'overdue') return !r.isCompleted && r.daysUntilDue < 0;
        if (this.filterStatus === 'completed') return r.isCompleted;
        return true;
      });
    }

    if (this.filterType !== 'all') {
      result = result.filter(r => r.type === this.filterType);
    }

    return result.sort((a, b) => {
      if (a.isCompleted !== b.isCompleted) return a.isCompleted ? 1 : -1;
      return a.daysUntilDue - b.daysUntilDue;
    });
  });

  ngOnInit() {
    this.loadData();
  }

  loadData() {
    this.loading.set(true);
    this.api.getReminders().subscribe({
      next: (reminders) => {
        this.reminders.set(reminders);
        this.loading.set(false);
      },
      error: () => this.loading.set(false)
    });
    this.api.getVehicles().subscribe({
      next: (vehicles) => this.vehicles.set(vehicles)
    });
    this.api.getReminderTypes().subscribe({
      next: (types) => this.reminderTypes.set(types)
    });
  }

  toggleComplete(reminder: Reminder) {
    if (reminder.isCompleted) {
      this.api.updateReminder(reminder.id, {
        dueDate: reminder.dueDate,
        notes: reminder.notes,
        isCompleted: false
      }).subscribe({
        next: () => this.loadData()
      });
    } else {
      this.api.completeReminder(reminder.id).subscribe({
        next: () => this.loadData()
      });
    }
  }

  deleteReminder(reminder: Reminder) {
    if (confirm(`Delete this ${reminder.type} reminder for ${reminder.vehicleName}?`)) {
      this.api.deleteReminder(reminder.id).subscribe({
        next: () => this.loadData()
      });
    }
  }

  saveReminder() {
    this.saving.set(true);
    const request = {
      ...this.reminderForm,
      dueDate: this.parseEuropeanDate(this.reminderForm.dueDate)
    };
    this.api.createReminder(request).subscribe({
      next: () => {
        this.closeModal();
        this.loadData();
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

  closeModal() {
    this.showAddModal.set(false);
    this.saving.set(false);
    this.reminderForm = {
      vehicleId: 0,
      type: 'Insurance',
      dueDate: '',
      notes: ''
    };
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
        this.loadData();
      },
      error: () => this.saving.set(false)
    });
  }
}
