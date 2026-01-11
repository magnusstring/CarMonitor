import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { ApiService, Vehicle, Reminder, CreateReminderRequest, ReminderType, SharedUser } from '../../core/services/api.service';
import { ReminderIconComponent } from '../../shared/components/reminder-icon.component';

@Component({
  selector: 'app-vehicle-detail',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, ReminderIconComponent],
  template: `
    <div class="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
      <div class="mb-4">
        <a routerLink="/vehicles" class="text-indigo-600 hover:text-indigo-500 text-sm">&larr; Back to Vehicles</a>
      </div>

      @if (loading()) {
        <div class="text-center py-12">
          <div class="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
        </div>
      } @else if (vehicle()) {
        <!-- Vehicle Info -->
        <div class="bg-white shadow rounded-lg mb-6">
          <div class="px-4 py-5 sm:px-6 border-b border-gray-200">
            <h1 class="text-xl font-bold text-gray-900">{{ vehicle()!.make }} {{ vehicle()!.model }}</h1>
            <p class="mt-1 text-sm text-gray-500">{{ vehicle()!.licensePlate }} - {{ vehicle()!.year }}</p>
          </div>
          <div class="px-4 py-5 sm:px-6">
            <dl class="grid grid-cols-2 gap-4">
              @if (vehicle()!.vin) {
                <div>
                  <dt class="text-sm font-medium text-gray-500">VIN</dt>
                  <dd class="mt-1 text-sm text-gray-900 font-mono">{{ vehicle()!.vin }}</dd>
                </div>
              }
              @if (vehicle()!.color) {
                <div>
                  <dt class="text-sm font-medium text-gray-500">Color</dt>
                  <dd class="mt-1 text-sm text-gray-900">{{ vehicle()!.color }}</dd>
                </div>
              }
              @if (vehicle()!.notes) {
                <div class="col-span-2">
                  <dt class="text-sm font-medium text-gray-500">Notes</dt>
                  <dd class="mt-1 text-sm text-gray-900">{{ vehicle()!.notes }}</dd>
                </div>
              }
              @if (!vehicle()!.isOwner) {
                <div class="col-span-2">
                  <dt class="text-sm font-medium text-gray-500">Owner</dt>
                  <dd class="mt-1 text-sm text-gray-900">{{ vehicle()!.ownerName }} (shared with you)</dd>
                </div>
              }
            </dl>
          </div>
        </div>

        <!-- Sharing (Owner only) -->
        @if (vehicle()!.isOwner) {
          <div class="bg-white shadow rounded-lg mb-6">
            <div class="px-4 py-5 sm:px-6 border-b border-gray-200 flex justify-between items-center">
              <h2 class="text-lg font-medium text-gray-900">Sharing</h2>
              <button (click)="showShareModal.set(true)"
                      class="inline-flex items-center px-3 py-1.5 border border-transparent text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700">
                Share
              </button>
            </div>
            @if (!vehicle()!.sharedWith.length) {
              <div class="px-4 py-4 text-center text-gray-500 text-sm">
                This vehicle is not shared with anyone.
              </div>
            } @else {
              <ul class="divide-y divide-gray-200">
                @for (user of vehicle()!.sharedWith; track user.userId) {
                  <li class="px-4 py-3 flex items-center justify-between">
                    <span class="text-sm text-gray-900">{{ user.username }}</span>
                    <button (click)="unshareVehicle(user)"
                            class="text-red-400 hover:text-red-500 text-sm">
                      Remove
                    </button>
                  </li>
                }
              </ul>
            }
          </div>
        }

        <!-- Reminders -->
        <div class="bg-white shadow rounded-lg">
          <div class="px-4 py-5 sm:px-6 border-b border-gray-200 flex justify-between items-center">
            <h2 class="text-lg font-medium text-gray-900">Reminders</h2>
            <button (click)="showAddReminder.set(true)"
                    class="inline-flex items-center px-3 py-1.5 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700">
              Add Reminder
            </button>
          </div>

          @if (!reminders().length) {
            <div class="px-4 py-8 text-center text-gray-500">
              No reminders for this vehicle yet.
            </div>
          } @else {
            <ul class="divide-y divide-gray-200">
              @for (reminder of reminders(); track reminder.id) {
                <li class="px-4 py-4 sm:px-6">
                  <div class="flex items-center justify-between">
                    <div class="flex items-center space-x-4">
                      <input type="checkbox" [checked]="reminder.isCompleted"
                             (change)="toggleComplete(reminder)"
                             class="h-4 w-4 text-indigo-600 rounded border-gray-300">
                      <app-reminder-icon [type]="reminder.type" [status]="reminder.status"></app-reminder-icon>
                      <div [class.line-through]="reminder.isCompleted" [class.text-gray-400]="reminder.isCompleted">
                        <p class="text-sm font-medium text-gray-900">{{ reminder.type }}</p>
                        <p class="text-sm text-gray-500">Due {{ formatDate(reminder.dueDate) }}</p>
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
                      <button (click)="deleteReminder(reminder)"
                              class="text-red-400 hover:text-red-500 text-sm">
                        Delete
                      </button>
                    </div>
                  </div>
                </li>
              }
            </ul>
          }
        </div>
      }

      <!-- Add Reminder Modal -->
      @if (showAddReminder()) {
        <div class="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center p-4 z-50">
          <div class="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <h2 class="text-lg font-medium text-gray-900 mb-4">Add Reminder</h2>

            <form (ngSubmit)="saveReminder()" class="space-y-4">
              <div>
                <label class="block text-sm font-medium text-gray-700">Type</label>
                <select [(ngModel)]="reminderForm.type" name="type" required
                        class="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm">
                  @for (type of reminderTypes(); track type.id) {
                    <option [value]="type.name">{{ type.name }}</option>
                  }
                </select>
              </div>

              <div>
                <label class="block text-sm font-medium text-gray-700">Due Date (DD/MM/YYYY)</label>
                <input type="text" [(ngModel)]="reminderForm.dueDate" name="dueDate" required
                       placeholder="DD/MM/YYYY" pattern="\\d{2}/\\d{2}/\\d{4}"
                       class="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm">
              </div>

              <div>
                <label class="block text-sm font-medium text-gray-700">Notes (optional)</label>
                <textarea [(ngModel)]="reminderForm.notes" name="notes" rows="2"
                          class="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"></textarea>
              </div>

              <div class="flex justify-end space-x-3 pt-4">
                <button type="button" (click)="showAddReminder.set(false)"
                        class="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50">
                  Cancel
                </button>
                <button type="submit" [disabled]="saving()"
                        class="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50">
                  {{ saving() ? 'Saving...' : 'Save' }}
                </button>
              </div>
            </form>
          </div>
        </div>
      }

      <!-- Share Modal -->
      @if (showShareModal()) {
        <div class="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center p-4 z-50">
          <div class="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <h2 class="text-lg font-medium text-gray-900 mb-4">Share Vehicle</h2>

            <form (ngSubmit)="shareVehicle()" class="space-y-4">
              <div>
                <label class="block text-sm font-medium text-gray-700">Username</label>
                <input type="text" [(ngModel)]="shareUsername" name="username" required
                       placeholder="Enter username to share with"
                       class="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm">
              </div>

              @if (shareError()) {
                <p class="text-sm text-red-600">{{ shareError() }}</p>
              }

              <div class="flex justify-end space-x-3 pt-4">
                <button type="button" (click)="showShareModal.set(false); shareError.set('')"
                        class="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50">
                  Cancel
                </button>
                <button type="submit" [disabled]="sharing() || !shareUsername"
                        class="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700 disabled:opacity-50">
                  {{ sharing() ? 'Sharing...' : 'Share' }}
                </button>
              </div>
            </form>
          </div>
        </div>
      }
    </div>
  `
})
export class VehicleDetailComponent implements OnInit {
  private api = inject(ApiService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);

  vehicle = signal<Vehicle | null>(null);
  reminders = signal<Reminder[]>([]);
  reminderTypes = signal<ReminderType[]>([]);
  loading = signal(true);
  showAddReminder = signal(false);
  showShareModal = signal(false);
  saving = signal(false);
  sharing = signal(false);
  shareError = signal('');
  shareUsername = '';

  Math = Math;

  reminderForm: CreateReminderRequest = {
    vehicleId: 0,
    type: 'Insurance',
    dueDate: '',
    notes: ''
  };

  ngOnInit() {
    const id = Number(this.route.snapshot.paramMap.get('id'));
    if (id) {
      this.reminderForm.vehicleId = id;
      this.loadVehicle(id);
    }
    this.api.getReminderTypes().subscribe({
      next: (types) => this.reminderTypes.set(types)
    });
  }

  loadVehicle(id: number) {
    this.loading.set(true);
    this.api.getVehicle(id).subscribe({
      next: (vehicle) => {
        this.vehicle.set(vehicle);
        this.loadReminders(id);
      },
      error: () => this.router.navigate(['/vehicles'])
    });
  }

  loadReminders(vehicleId: number) {
    this.api.getVehicleReminders(vehicleId).subscribe({
      next: (reminders) => {
        this.reminders.set(reminders);
        this.loading.set(false);
      },
      error: () => this.loading.set(false)
    });
  }

  toggleComplete(reminder: Reminder) {
    if (reminder.isCompleted) {
      this.api.updateReminder(reminder.id, {
        dueDate: reminder.dueDate,
        notes: reminder.notes,
        isCompleted: false
      }).subscribe({
        next: () => this.loadReminders(this.reminderForm.vehicleId)
      });
    } else {
      this.api.completeReminder(reminder.id).subscribe({
        next: () => this.loadReminders(this.reminderForm.vehicleId)
      });
    }
  }

  deleteReminder(reminder: Reminder) {
    if (confirm(`Delete this ${reminder.type} reminder?`)) {
      this.api.deleteReminder(reminder.id).subscribe({
        next: () => this.loadReminders(this.reminderForm.vehicleId)
      });
    }
  }

  saveReminder() {
    this.saving.set(true);
    const vehicleId = this.reminderForm.vehicleId;
    const request = {
      ...this.reminderForm,
      dueDate: this.parseEuropeanDate(this.reminderForm.dueDate)
    };
    this.api.createReminder(request).subscribe({
      next: () => {
        this.showAddReminder.set(false);
        this.saving.set(false);
        this.reminderForm = {
          vehicleId: vehicleId,
          type: 'Insurance',
          dueDate: '',
          notes: ''
        };
        this.loadReminders(vehicleId);
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

  shareVehicle() {
    if (!this.shareUsername || !this.vehicle()) return;

    this.sharing.set(true);
    this.shareError.set('');

    this.api.shareVehicle(this.vehicle()!.id, this.shareUsername).subscribe({
      next: () => {
        this.showShareModal.set(false);
        this.sharing.set(false);
        this.shareUsername = '';
        this.loadVehicle(this.vehicle()!.id);
      },
      error: (err) => {
        this.shareError.set(err.error?.message || 'Failed to share vehicle');
        this.sharing.set(false);
      }
    });
  }

  unshareVehicle(user: SharedUser) {
    if (!this.vehicle()) return;

    if (confirm(`Remove ${user.username}'s access to this vehicle?`)) {
      this.api.unshareVehicle(this.vehicle()!.id, user.userId).subscribe({
        next: () => this.loadVehicle(this.vehicle()!.id)
      });
    }
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
