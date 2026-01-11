import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService, Vehicle, Reminder, CreateVehicleRequest, ReminderType, CreateReminderRequest } from '../../core/services/api.service';
import { ReminderIconComponent } from '../../shared/components/reminder-icon.component';
import { forkJoin } from 'rxjs';

interface VehicleWithReminders extends Vehicle {
  reminders: Reminder[];
  expanded: boolean;
  imageUrl: string;
}

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule, ReminderIconComponent],
  template: `
    <div class="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
      <!-- Header -->
      <div class="flex justify-between items-center mb-6">
        <h1 class="text-2xl font-bold text-white">My Vehicles</h1>
        <button (click)="openAddVehicle()"
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
          <svg class="mx-auto h-16 w-16 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M8 7h8m-8 4h8m-4 4v3m-6 0h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"/>
          </svg>
          <h3 class="mt-4 text-lg font-medium text-white">No vehicles yet</h3>
          <p class="mt-2 text-sm text-gray-400">Add your first vehicle to start tracking reminders.</p>
          <button (click)="openAddVehicle()"
                  class="mt-6 inline-flex items-center px-6 py-3 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700">
            Add Your First Vehicle
          </button>
        </div>
      } @else {
        <!-- Vehicle Cards -->
        <div class="space-y-6">
          @for (vehicle of vehicles(); track vehicle.id) {
            <div class="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden">
              <!-- Vehicle Header with Image -->
              <div class="flex">
                <!-- Car Image -->
                <div class="w-48 h-32 flex-shrink-0 bg-gray-900 flex items-center justify-center overflow-hidden">
                  <img [src]="vehicle.imageUrl"
                       [alt]="vehicle.make + ' ' + vehicle.model"
                       class="w-full h-full object-contain"
                       (error)="onImageError($event)">
                </div>

                <!-- Vehicle Info -->
                <div class="flex-1 p-4">
                  <div class="flex items-start justify-between">
                    <div>
                      <h3 class="text-xl font-semibold text-white">
                        {{ vehicle.year }} {{ vehicle.make }} {{ vehicle.model }}
                      </h3>
                      <div class="mt-1 space-y-0.5">
                        <p class="text-sm text-gray-400">{{ vehicle.licensePlate }}</p>
                        @if (vehicle.vin) {
                          <p class="text-xs text-gray-500 font-mono">VIN: {{ vehicle.vin }}</p>
                        }
                      </div>
                    </div>
                    <div class="flex items-center space-x-2">
                      @if (getOverdueCount(vehicle) > 0) {
                        <span class="px-2.5 py-1 rounded-full text-xs font-medium bg-red-900/50 text-red-400">
                          {{ getOverdueCount(vehicle) }} overdue
                        </span>
                      }
                      <button (click)="openAddReminder(vehicle)"
                              class="p-2 text-gray-400 hover:text-indigo-400 hover:bg-gray-700 rounded-lg"
                              title="Add reminder">
                        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"/>
                        </svg>
                      </button>
                      <button (click)="toggleVehicle(vehicle)"
                              class="p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded-lg">
                        <svg class="w-5 h-5 transition-transform" [class.rotate-180]="vehicle.expanded" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/>
                        </svg>
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              <!-- Reminders Section (Expandable) -->
              @if (vehicle.expanded) {
                <div class="border-t border-gray-700">
                  @if (!vehicle.reminders.length) {
                    <div class="px-6 py-8 text-center">
                      <p class="text-gray-400">No upcoming reminders</p>
                      <button (click)="openAddReminder(vehicle)"
                              class="mt-3 text-sm text-indigo-400 hover:text-indigo-300">
                        + Add a reminder
                      </button>
                    </div>
                  } @else {
                    <div class="divide-y divide-gray-700">
                      @for (reminder of vehicle.reminders; track reminder.id) {
                        <div class="px-6 py-3 flex items-center justify-between hover:bg-gray-750">
                          <div class="flex items-center space-x-4">
                            <app-reminder-icon [type]="reminder.type" [status]="reminder.status"></app-reminder-icon>
                            <div>
                              <p class="text-sm font-medium text-white">{{ reminder.type }}</p>
                              <p class="text-xs text-gray-400">{{ formatDate(reminder.dueDate) }}</p>
                            </div>
                          </div>
                          <div class="flex items-center space-x-3">
                            <span [class]="getStatusClass(reminder.status)">
                              @if (reminder.daysUntilDue < 0) {
                                {{ Math.abs(reminder.daysUntilDue) }}d overdue
                              } @else if (reminder.daysUntilDue === 0) {
                                Today
                              } @else {
                                {{ reminder.daysUntilDue }}d
                              }
                            </span>
                            <button (click)="openRenewModal(reminder)"
                                    class="px-3 py-1 text-xs font-medium text-indigo-400 hover:text-indigo-300 border border-indigo-500/50 hover:border-indigo-400 rounded">
                              Renew
                            </button>
                          </div>
                        </div>
                      }
                    </div>
                  }
                </div>
              }
            </div>
          }
        </div>

        <!-- Quick Check Links -->
        <div class="mt-8">
          <h2 class="text-sm font-medium text-gray-400 mb-3">Quick Check</h2>
          <div class="grid grid-cols-3 gap-3">
            <a href="https://www.aida.info.ro/polite-rca" target="_blank" rel="noopener"
               class="bg-gray-800/50 rounded-lg border border-gray-700/50 p-4 text-center hover:bg-gray-700/50 hover:border-gray-600 transition-colors">
              <svg class="w-6 h-6 mx-auto text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"/>
              </svg>
              <p class="mt-2 text-sm font-medium text-white">Insurance (RCA)</p>
              <p class="text-xs text-gray-500">aida.info.ro</p>
            </a>
            <a href="http://www.cnadnr.ro/ro/verificare-rovinieta" target="_blank" rel="noopener"
               class="bg-gray-800/50 rounded-lg border border-gray-700/50 p-4 text-center hover:bg-gray-700/50 hover:border-gray-600 transition-colors">
              <svg class="w-6 h-6 mx-auto text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7"/>
              </svg>
              <p class="mt-2 text-sm font-medium text-white">Road Tax (Rovinieta)</p>
              <p class="text-xs text-gray-500">cnadnr.ro</p>
            </a>
            <a href="https://prog.rarom.ro/rarpol/" target="_blank" rel="noopener"
               class="bg-gray-800/50 rounded-lg border border-gray-700/50 p-4 text-center hover:bg-gray-700/50 hover:border-gray-600 transition-colors">
              <svg class="w-6 h-6 mx-auto text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"/>
              </svg>
              <p class="mt-2 text-sm font-medium text-white">Inspection (ITP)</p>
              <p class="text-xs text-gray-500">rarom.ro</p>
            </a>
          </div>
        </div>
      }

      <!-- Add Vehicle Modal -->
      @if (showAddVehicle()) {
        <div class="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50" (click)="showAddVehicle.set(false)">
          <div class="bg-gray-800 rounded-xl shadow-2xl max-w-lg w-full p-6 border border-gray-700" (click)="$event.stopPropagation()">
            <h2 class="text-xl font-semibold text-white mb-6">Add Vehicle</h2>
            <form (ngSubmit)="submitVehicle()" class="space-y-4">
              <div class="grid grid-cols-2 gap-4">
                <div>
                  <label class="block text-sm font-medium text-gray-300 mb-1">Make</label>
                  <input type="text" [(ngModel)]="vehicleForm.make" name="make" required
                         placeholder="Toyota" class="input-field">
                </div>
                <div>
                  <label class="block text-sm font-medium text-gray-300 mb-1">Model</label>
                  <input type="text" [(ngModel)]="vehicleForm.model" name="model" required
                         placeholder="Camry" class="input-field">
                </div>
              </div>
              <div class="grid grid-cols-2 gap-4">
                <div>
                  <label class="block text-sm font-medium text-gray-300 mb-1">Year</label>
                  <input type="number" [(ngModel)]="vehicleForm.year" name="year" required
                         placeholder="2023" class="input-field">
                </div>
                <div>
                  <label class="block text-sm font-medium text-gray-300 mb-1">License Plate</label>
                  <input type="text" [(ngModel)]="vehicleForm.licensePlate" name="licensePlate" required
                         placeholder="ABC 123" class="input-field">
                </div>
              </div>
              <div class="grid grid-cols-2 gap-4">
                <div>
                  <label class="block text-sm font-medium text-gray-300 mb-1">Color</label>
                  <input type="text" [(ngModel)]="vehicleForm.color" name="color"
                         placeholder="Black" class="input-field">
                </div>
                <div>
                  <label class="block text-sm font-medium text-gray-300 mb-1">VIN</label>
                  <input type="text" [(ngModel)]="vehicleForm.vin" name="vin"
                         placeholder="Optional" class="input-field">
                </div>
              </div>
              <div class="flex justify-end space-x-3 pt-4">
                <button type="button" (click)="showAddVehicle.set(false)" class="btn-secondary">Cancel</button>
                <button type="submit" [disabled]="saving()" class="btn-primary">
                  {{ saving() ? 'Adding...' : 'Add Vehicle' }}
                </button>
              </div>
            </form>
          </div>
        </div>
      }

      <!-- Add Reminder Modal -->
      @if (showAddReminder()) {
        <div class="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50" (click)="showAddReminder.set(false)">
          <div class="bg-gray-800 rounded-xl shadow-2xl max-w-md w-full p-6 border border-gray-700" (click)="$event.stopPropagation()">
            <h2 class="text-xl font-semibold text-white mb-2">Add Reminder</h2>
            <p class="text-sm text-gray-400 mb-6">{{ selectedVehicle()?.make }} {{ selectedVehicle()?.model }}</p>
            <form (ngSubmit)="submitReminder()" class="space-y-4">
              <div>
                <label class="block text-sm font-medium text-gray-300 mb-1">Type</label>
                <select [(ngModel)]="reminderForm.type" name="type" required class="input-field">
                  @for (type of reminderTypes(); track type.id) {
                    <option [value]="type.name">{{ type.name }}</option>
                  }
                </select>
              </div>
              <div>
                <label class="block text-sm font-medium text-gray-300 mb-1">Due Date</label>
                <input type="date" [(ngModel)]="reminderForm.dueDate" name="dueDate" required class="input-field">
              </div>
              <div>
                <label class="block text-sm font-medium text-gray-300 mb-1">Notes</label>
                <input type="text" [(ngModel)]="reminderForm.notes" name="notes"
                       placeholder="Optional notes" class="input-field">
              </div>
              <div class="flex justify-end space-x-3 pt-4">
                <button type="button" (click)="showAddReminder.set(false)" class="btn-secondary">Cancel</button>
                <button type="submit" [disabled]="saving()" class="btn-primary">
                  {{ saving() ? 'Adding...' : 'Add Reminder' }}
                </button>
              </div>
            </form>
          </div>
        </div>
      }

      <!-- Renew Modal -->
      @if (renewingReminder()) {
        <div class="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50" (click)="closeRenewModal()">
          <div class="bg-gray-800 rounded-xl shadow-2xl max-w-md w-full p-6 border border-gray-700" (click)="$event.stopPropagation()">
            <h2 class="text-xl font-semibold text-white mb-2">Renew {{ renewingReminder()!.type }}</h2>
            <p class="text-sm text-gray-400 mb-6">{{ renewingReminder()!.vehicleName }}</p>
            <form (ngSubmit)="submitRenew()" class="space-y-4">
              <div>
                <label class="block text-sm font-medium text-gray-300 mb-1">New Due Date</label>
                <input type="date" [(ngModel)]="renewForm.dueDate" name="dueDate" required class="input-field">
              </div>
              <div>
                <label class="block text-sm font-medium text-gray-300 mb-1">Note</label>
                <input type="text" [(ngModel)]="renewForm.notes" name="notes"
                       placeholder="Optional" class="input-field">
              </div>
              <div class="flex justify-end space-x-3 pt-4">
                <button type="button" (click)="closeRenewModal()" class="btn-secondary">Cancel</button>
                <button type="submit" [disabled]="saving()" class="btn-primary">
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
    .input-field {
      @apply w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm;
    }
    .btn-primary {
      @apply px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg disabled:opacity-50 transition-colors;
    }
    .btn-secondary {
      @apply px-4 py-2 border border-gray-600 hover:bg-gray-700 text-gray-300 text-sm font-medium rounded-lg transition-colors;
    }
  `]
})
export class DashboardComponent implements OnInit {
  private api = inject(ApiService);

  vehicles = signal<VehicleWithReminders[]>([]);
  reminderTypes = signal<ReminderType[]>([]);
  allReminders = signal<Reminder[]>([]);
  loading = signal(true);
  error = signal('');
  showAddVehicle = signal(false);
  showAddReminder = signal(false);
  selectedVehicle = signal<Vehicle | null>(null);
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

  reminderForm = {
    type: '',
    dueDate: '',
    notes: ''
  };

  renewForm = {
    dueDate: '',
    notes: ''
  };

  Math = Math;

  // IMAGIN.studio API for car images (free key from JS Mastery)
  private readonly CAR_IMAGE_API = 'https://cdn.imagin.studio/getimage';
  private readonly CAR_IMAGE_KEY = 'hrjavascript-mastery';

  ngOnInit() {
    this.loadData();
  }

  loadData() {
    this.loading.set(true);
    this.error.set('');

    forkJoin({
      vehicles: this.api.getVehicles(),
      reminders: this.api.getReminders(),
      types: this.api.getReminderTypes()
    }).subscribe({
      next: ({ vehicles, reminders, types }) => {
        const twoYearsFromNow = new Date();
        twoYearsFromNow.setFullYear(twoYearsFromNow.getFullYear() + 2);

        // Filter reminders
        const filteredReminders = reminders.filter(r => {
          if (r.isCompleted) return false;
          const dueDate = new Date(r.dueDate);
          return dueDate <= twoYearsFromNow;
        });

        this.allReminders.set(filteredReminders);

        // Group by vehicle
        const remindersByVehicle = new Map<number, Reminder[]>();
        filteredReminders.forEach(r => {
          const list = remindersByVehicle.get(r.vehicleId) || [];
          list.push(r);
          remindersByVehicle.set(r.vehicleId, list);
        });

        // Create vehicles with reminders and images
        const vehiclesWithReminders: VehicleWithReminders[] = vehicles.map(v => ({
          ...v,
          reminders: (remindersByVehicle.get(v.id) || []).sort((a, b) => a.daysUntilDue - b.daysUntilDue),
          expanded: true,
          imageUrl: this.getCarImageUrl(v.make, v.model, v.year, v.color)
        }));

        this.vehicles.set(vehiclesWithReminders);
        this.reminderTypes.set(types);

        if (types.length && !this.reminderForm.type) {
          this.reminderForm.type = types[0].name;
        }

        this.loading.set(false);
      },
      error: () => {
        this.error.set('Failed to load data');
        this.loading.set(false);
      }
    });
  }

  getCarImageUrl(make: string, model: string, year: number, color?: string): string {
    const params = new URLSearchParams({
      customer: this.CAR_IMAGE_KEY,
      make: make.toLowerCase(),
      modelFamily: model.toLowerCase().split(' ')[0],
      zoomType: 'fullscreen',
      modelYear: year.toString(),
      angle: '23'
    });
    if (color) {
      params.set('paintId', color.toLowerCase());
    }
    return `${this.CAR_IMAGE_API}?${params.toString()}`;
  }

  onImageError(event: Event) {
    const img = event.target as HTMLImageElement;
    img.src = 'data:image/svg+xml,' + encodeURIComponent(`
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 120" fill="none">
        <rect width="200" height="120" fill="#1f2937"/>
        <path d="M60 80h80M70 70h60M50 60c0-20 20-30 50-30s50 10 50 30" stroke="#4b5563" stroke-width="2" fill="none"/>
        <circle cx="70" cy="80" r="10" stroke="#4b5563" stroke-width="2"/>
        <circle cx="130" cy="80" r="10" stroke="#4b5563" stroke-width="2"/>
      </svg>
    `);
  }

  toggleVehicle(vehicle: VehicleWithReminders) {
    vehicle.expanded = !vehicle.expanded;
  }

  getOverdueCount(vehicle: VehicleWithReminders): number {
    return vehicle.reminders.filter(r => r.status === 'overdue').length;
  }

  openAddVehicle() {
    this.vehicleForm = {
      make: '',
      model: '',
      year: new Date().getFullYear(),
      licensePlate: '',
      color: '',
      vin: '',
      notes: ''
    };
    this.showAddVehicle.set(true);
  }

  openAddReminder(vehicle: Vehicle) {
    this.selectedVehicle.set(vehicle);
    this.reminderForm = {
      type: this.reminderTypes()[0]?.name || '',
      dueDate: '',
      notes: ''
    };
    this.showAddReminder.set(true);
  }

  submitVehicle() {
    this.saving.set(true);
    this.api.createVehicle(this.vehicleForm).subscribe({
      next: () => {
        this.showAddVehicle.set(false);
        this.saving.set(false);
        this.loadData();
      },
      error: () => this.saving.set(false)
    });
  }

  submitReminder() {
    const vehicle = this.selectedVehicle();
    if (!vehicle) return;

    this.saving.set(true);
    const request: CreateReminderRequest = {
      vehicleId: vehicle.id,
      type: this.reminderForm.type,
      dueDate: this.reminderForm.dueDate,
      notes: this.reminderForm.notes
    };

    this.api.createReminder(request).subscribe({
      next: () => {
        this.showAddReminder.set(false);
        this.saving.set(false);
        this.loadData();
      },
      error: () => this.saving.set(false)
    });
  }

  openRenewModal(reminder: Reminder) {
    this.renewingReminder.set(reminder);
    this.renewForm = { dueDate: '', notes: '' };
  }

  closeRenewModal() {
    this.renewingReminder.set(null);
    this.saving.set(false);
  }

  submitRenew() {
    const reminder = this.renewingReminder();
    if (!reminder) return;

    this.saving.set(true);
    this.api.updateReminder(reminder.id, {
      dueDate: this.renewForm.dueDate,
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

  formatDate(dateStr: string): string {
    return new Date(dateStr).toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  }

  getStatusClass(status: string): string {
    const base = 'px-2 py-0.5 rounded text-xs font-medium';
    switch (status) {
      case 'overdue': return `${base} bg-red-900/50 text-red-400`;
      case 'urgent': return `${base} bg-orange-900/50 text-orange-400`;
      case 'warning': return `${base} bg-yellow-900/50 text-yellow-400`;
      default: return `${base} bg-green-900/50 text-green-400`;
    }
  }
}
