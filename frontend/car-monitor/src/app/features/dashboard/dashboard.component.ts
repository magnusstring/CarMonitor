import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { ApiService, Vehicle, Reminder, CreateVehicleRequest } from '../../core/services/api.service';
import { ReminderIconComponent } from '../../shared/components/reminder-icon.component';
import { forkJoin } from 'rxjs';

interface VehicleWithReminders extends Vehicle {
  reminders: Reminder[];
  expanded: boolean;
}

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, ReminderIconComponent],
  template: `
    <div class="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
      <div class="flex justify-between items-center mb-6">
        <h1 class="text-2xl font-bold text-white">My Vehicles</h1>
        <button (click)="showAddVehicle.set(true)"
                class="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700">
          <svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/>
          </svg>
          Add Vehicle
        </button>
      </div>

      @if (loading()) {
        <div class="text-center py-12">
          <div class="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-400"></div>
          <p class="mt-2 text-gray-400">Loading...</p>
        </div>
      } @else if (error()) {
        <div class="bg-red-900/50 border border-red-700 text-red-400 px-4 py-3 rounded">
          {{ error() }}
        </div>
      } @else if (!vehicles().length) {
        <div class="text-center py-12 bg-gray-800 rounded-lg border border-gray-700">
          <svg class="mx-auto h-12 w-12 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"/>
          </svg>
          <h3 class="mt-2 text-sm font-medium text-white">No vehicles</h3>
          <p class="mt-1 text-sm text-gray-400">Get started by adding your first vehicle.</p>
          <button (click)="showAddVehicle.set(true)"
                  class="mt-4 inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700">
            Add Vehicle
          </button>
        </div>
      } @else {
        <div class="space-y-4">
          @for (vehicle of vehicles(); track vehicle.id) {
            <div class="bg-gray-800 rounded-lg border border-gray-700 overflow-hidden">
              <!-- Vehicle Header -->
              <div class="px-4 py-4 sm:px-6 cursor-pointer hover:bg-gray-750"
                   (click)="toggleVehicle(vehicle)">
                <div class="flex items-center justify-between">
                  <div class="flex items-center space-x-3">
                    <svg class="w-5 h-5 text-gray-400 transition-transform"
                         [class.rotate-90]="vehicle.expanded"
                         fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/>
                    </svg>
                    <div>
                      <h3 class="text-lg font-medium text-white">
                        {{ vehicle.year }} {{ vehicle.make }} {{ vehicle.model }}
                      </h3>
                      <p class="text-sm text-gray-400">{{ vehicle.licensePlate }}</p>
                    </div>
                  </div>
                  <div class="flex items-center space-x-4">
                    @if (getOverdueCount(vehicle) > 0) {
                      <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-900/50 text-red-400">
                        {{ getOverdueCount(vehicle) }} overdue
                      </span>
                    }
                    @if (getUpcomingCount(vehicle) > 0) {
                      <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-900/50 text-yellow-400">
                        {{ getUpcomingCount(vehicle) }} upcoming
                      </span>
                    }
                    <span class="text-sm text-gray-500">{{ vehicle.reminders.length }} reminders</span>
                  </div>
                </div>
              </div>

              <!-- Reminders List -->
              @if (vehicle.expanded) {
                <div class="border-t border-gray-700">
                  @if (!vehicle.reminders.length) {
                    <div class="px-6 py-4 text-center text-gray-400">
                      No reminders for this vehicle.
                      <a [routerLink]="['/vehicles', vehicle.id]" class="text-indigo-400 hover:text-indigo-300 ml-1">Add one</a>
                    </div>
                  } @else {
                    <ul class="divide-y divide-gray-700">
                      @for (reminder of vehicle.reminders; track reminder.id) {
                        <li class="px-6 py-3 hover:bg-gray-750">
                          <div class="flex items-center justify-between">
                            <div class="flex items-center space-x-3">
                              <app-reminder-icon [type]="reminder.type" [status]="reminder.status"></app-reminder-icon>
                              <div>
                                <p class="text-sm font-medium text-white">{{ reminder.type }}</p>
                                <p class="text-sm text-gray-400">Due {{ formatDate(reminder.dueDate) }}</p>
                                @if (reminder.notes) {
                                  <p class="text-xs text-gray-500 mt-1">{{ reminder.notes }}</p>
                                }
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
                              <button (click)="openRenewModal(reminder); $event.stopPropagation()"
                                      class="px-3 py-1 text-sm font-medium text-indigo-400 hover:text-indigo-300 border border-indigo-400 hover:border-indigo-300 rounded-md">
                                Renew
                              </button>
                            </div>
                          </div>
                        </li>
                      }
                    </ul>
                  }
                  <div class="px-6 py-3 bg-gray-850 border-t border-gray-700">
                    <a [routerLink]="['/vehicles', vehicle.id]"
                       class="text-sm text-indigo-400 hover:text-indigo-300">
                      View vehicle details
                    </a>
                  </div>
                </div>
              }
            </div>
          }
        </div>
      }

      <!-- Add Vehicle Modal -->
      @if (showAddVehicle()) {
        <div class="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center p-4 z-50">
          <div class="bg-gray-800 rounded-lg shadow-xl max-w-lg w-full p-6 border border-gray-700">
            <h2 class="text-lg font-medium text-white mb-4">Add New Vehicle</h2>

            <form (ngSubmit)="submitVehicle()" class="space-y-4">
              <div class="grid grid-cols-2 gap-4">
                <div>
                  <label class="block text-sm font-medium text-gray-300">Make</label>
                  <input type="text" [(ngModel)]="vehicleForm.make" name="make" required
                         placeholder="e.g. Toyota"
                         class="mt-1 block w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md shadow-sm text-white placeholder-gray-400 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm">
                </div>
                <div>
                  <label class="block text-sm font-medium text-gray-300">Model</label>
                  <input type="text" [(ngModel)]="vehicleForm.model" name="model" required
                         placeholder="e.g. Camry"
                         class="mt-1 block w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md shadow-sm text-white placeholder-gray-400 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm">
                </div>
              </div>

              <div class="grid grid-cols-2 gap-4">
                <div>
                  <label class="block text-sm font-medium text-gray-300">Year</label>
                  <input type="number" [(ngModel)]="vehicleForm.year" name="year" required
                         placeholder="e.g. 2023"
                         class="mt-1 block w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md shadow-sm text-white placeholder-gray-400 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm">
                </div>
                <div>
                  <label class="block text-sm font-medium text-gray-300">License Plate</label>
                  <input type="text" [(ngModel)]="vehicleForm.licensePlate" name="licensePlate" required
                         placeholder="e.g. ABC 123"
                         class="mt-1 block w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md shadow-sm text-white placeholder-gray-400 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm">
                </div>
              </div>

              <div class="grid grid-cols-2 gap-4">
                <div>
                  <label class="block text-sm font-medium text-gray-300">Color (optional)</label>
                  <input type="text" [(ngModel)]="vehicleForm.color" name="color"
                         placeholder="e.g. Black"
                         class="mt-1 block w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md shadow-sm text-white placeholder-gray-400 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm">
                </div>
                <div>
                  <label class="block text-sm font-medium text-gray-300">VIN (optional)</label>
                  <input type="text" [(ngModel)]="vehicleForm.vin" name="vin"
                         placeholder="17 characters"
                         class="mt-1 block w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md shadow-sm text-white placeholder-gray-400 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm">
                </div>
              </div>

              <div>
                <label class="block text-sm font-medium text-gray-300">Notes (optional)</label>
                <textarea [(ngModel)]="vehicleForm.notes" name="notes" rows="2"
                          placeholder="Any additional notes..."
                          class="mt-1 block w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md shadow-sm text-white placeholder-gray-400 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"></textarea>
              </div>

              <div class="flex justify-end space-x-3 pt-4">
                <button type="button" (click)="showAddVehicle.set(false)"
                        class="px-4 py-2 border border-gray-600 rounded-md text-sm font-medium text-gray-300 hover:bg-gray-700">
                  Cancel
                </button>
                <button type="submit" [disabled]="saving()"
                        class="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50">
                  {{ saving() ? 'Saving...' : 'Add Vehicle' }}
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
  `,
  styles: [`
    .bg-gray-750 { background-color: rgb(38, 42, 51); }
    .bg-gray-850 { background-color: rgb(24, 28, 35); }
  `]
})
export class DashboardComponent implements OnInit {
  private api = inject(ApiService);

  vehicles = signal<VehicleWithReminders[]>([]);
  loading = signal(true);
  error = signal('');
  showAddVehicle = signal(false);
  renewingReminder = signal<Reminder | null>(null);
  saving = signal(false);

  vehicleForm: CreateVehicleRequest = {
    make: '',
    model: '',
    year: new Date().getFullYear(),
    licensePlate: '',
    color: '',
    vin: '',
    notes: ''
  };

  renewForm = {
    dueDate: '',
    notes: ''
  };

  Math = Math;

  ngOnInit() {
    this.loadData();
  }

  loadData() {
    this.loading.set(true);
    this.error.set('');

    // Load vehicles and all reminders
    forkJoin({
      vehicles: this.api.getVehicles(),
      reminders: this.api.getReminders()
    }).subscribe({
      next: ({ vehicles, reminders }) => {
        const twoYearsFromNow = new Date();
        twoYearsFromNow.setFullYear(twoYearsFromNow.getFullYear() + 2);

        // Filter reminders to next 2 years and not completed
        const filteredReminders = reminders.filter(r => {
          if (r.isCompleted) return false;
          const dueDate = new Date(r.dueDate);
          return dueDate <= twoYearsFromNow;
        });

        // Group reminders by vehicle
        const remindersByVehicle = new Map<number, Reminder[]>();
        filteredReminders.forEach(r => {
          const list = remindersByVehicle.get(r.vehicleId) || [];
          list.push(r);
          remindersByVehicle.set(r.vehicleId, list);
        });

        // Create vehicles with reminders
        const vehiclesWithReminders: VehicleWithReminders[] = vehicles.map(v => ({
          ...v,
          reminders: (remindersByVehicle.get(v.id) || []).sort((a, b) => a.daysUntilDue - b.daysUntilDue),
          expanded: true // Start expanded
        }));

        this.vehicles.set(vehiclesWithReminders);
        this.loading.set(false);
      },
      error: () => {
        this.error.set('Failed to load data');
        this.loading.set(false);
      }
    });
  }

  toggleVehicle(vehicle: VehicleWithReminders) {
    vehicle.expanded = !vehicle.expanded;
  }

  getOverdueCount(vehicle: VehicleWithReminders): number {
    return vehicle.reminders.filter(r => r.status === 'overdue').length;
  }

  getUpcomingCount(vehicle: VehicleWithReminders): number {
    return vehicle.reminders.filter(r => r.status === 'urgent' || r.status === 'warning').length;
  }

  submitVehicle() {
    this.saving.set(true);
    this.api.createVehicle(this.vehicleForm).subscribe({
      next: () => {
        this.showAddVehicle.set(false);
        this.saving.set(false);
        this.vehicleForm = {
          make: '',
          model: '',
          year: new Date().getFullYear(),
          licensePlate: '',
          color: '',
          vin: '',
          notes: ''
        };
        this.loadData();
      },
      error: () => this.saving.set(false)
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
