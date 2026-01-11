import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { ApiService, Vehicle, CreateVehicleRequest } from '../../core/services/api.service';

@Component({
  selector: 'app-vehicles',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  template: `
    <div class="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
      <div class="flex justify-between items-center mb-6">
        <h1 class="text-2xl font-bold text-gray-900">Vehicles</h1>
        <button (click)="showAddModal.set(true)"
                class="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700">
          Add Vehicle
        </button>
      </div>

      @if (loading()) {
        <div class="text-center py-12">
          <div class="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
        </div>
      } @else if (!vehicles().length) {
        <div class="text-center py-12 bg-white rounded-lg shadow">
          <p class="text-gray-500">No vehicles yet. Add your first vehicle to get started.</p>
        </div>
      } @else {
        <div class="bg-white shadow overflow-hidden sm:rounded-md">
          <ul class="divide-y divide-gray-200">
            @for (vehicle of vehicles(); track vehicle.id) {
              <li>
                <a [routerLink]="['/vehicles', vehicle.id]" class="block hover:bg-gray-50">
                  <div class="px-4 py-4 sm:px-6">
                    <div class="flex items-center justify-between">
                      <div class="flex items-center">
                        <div class="flex-shrink-0 h-10 w-10 rounded-full bg-indigo-100 flex items-center justify-center">
                          <span class="text-indigo-600 font-medium">{{ vehicle.make.charAt(0) }}</span>
                        </div>
                        <div class="ml-4">
                          <p class="text-sm font-medium text-indigo-600">{{ vehicle.make }} {{ vehicle.model }}</p>
                          <p class="text-sm text-gray-500">{{ vehicle.licensePlate }} - {{ vehicle.year }}</p>
                        </div>
                      </div>
                      <div class="flex items-center space-x-2">
                        <button (click)="editVehicle(vehicle, $event)"
                                class="text-gray-400 hover:text-gray-500">
                          Edit
                        </button>
                        <button (click)="deleteVehicle(vehicle, $event)"
                                class="text-red-400 hover:text-red-500">
                          Delete
                        </button>
                      </div>
                    </div>
                  </div>
                </a>
              </li>
            }
          </ul>
        </div>
      }

      <!-- Add/Edit Modal -->
      @if (showAddModal() || editingVehicle()) {
        <div class="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center p-4 z-50">
          <div class="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <h2 class="text-lg font-medium text-gray-900 mb-4">
              {{ editingVehicle() ? 'Edit Vehicle' : 'Add Vehicle' }}
            </h2>

            <form (ngSubmit)="saveVehicle()" class="space-y-4">
              <div class="grid grid-cols-2 gap-4">
                <div>
                  <label class="block text-sm font-medium text-gray-700">Make</label>
                  <input type="text" [(ngModel)]="form.make" name="make" required
                         class="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm">
                </div>
                <div>
                  <label class="block text-sm font-medium text-gray-700">Model</label>
                  <input type="text" [(ngModel)]="form.model" name="model" required
                         class="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm">
                </div>
              </div>

              <div class="grid grid-cols-2 gap-4">
                <div>
                  <label class="block text-sm font-medium text-gray-700">Year</label>
                  <input type="number" [(ngModel)]="form.year" name="year" required
                         class="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm">
                </div>
                <div>
                  <label class="block text-sm font-medium text-gray-700">License Plate</label>
                  <input type="text" [(ngModel)]="form.licensePlate" name="licensePlate" required
                         class="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm">
                </div>
              </div>

              <div>
                <label class="block text-sm font-medium text-gray-700">VIN (optional)</label>
                <input type="text" [(ngModel)]="form.vin" name="vin" maxlength="17"
                       class="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                       placeholder="17-character Vehicle Identification Number">
              </div>

              <div>
                <label class="block text-sm font-medium text-gray-700">Color (optional)</label>
                <input type="text" [(ngModel)]="form.color" name="color"
                       class="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm">
              </div>

              <div>
                <label class="block text-sm font-medium text-gray-700">Notes (optional)</label>
                <textarea [(ngModel)]="form.notes" name="notes" rows="2"
                          class="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"></textarea>
              </div>

              <div class="flex justify-end space-x-3 pt-4">
                <button type="button" (click)="closeModal()"
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
    </div>
  `
})
export class VehiclesComponent implements OnInit {
  private api = inject(ApiService);

  vehicles = signal<Vehicle[]>([]);
  loading = signal(true);
  showAddModal = signal(false);
  editingVehicle = signal<Vehicle | null>(null);
  saving = signal(false);

  form: CreateVehicleRequest = {
    make: '',
    model: '',
    year: new Date().getFullYear(),
    licensePlate: '',
    vin: '',
    color: '',
    notes: ''
  };

  ngOnInit() {
    this.loadVehicles();
  }

  loadVehicles() {
    this.loading.set(true);
    this.api.getVehicles().subscribe({
      next: (vehicles) => {
        this.vehicles.set(vehicles);
        this.loading.set(false);
      },
      error: () => this.loading.set(false)
    });
  }

  editVehicle(vehicle: Vehicle, event: Event) {
    event.preventDefault();
    event.stopPropagation();
    this.editingVehicle.set(vehicle);
    this.form = { ...vehicle };
  }

  deleteVehicle(vehicle: Vehicle, event: Event) {
    event.preventDefault();
    event.stopPropagation();
    if (confirm(`Delete ${vehicle.make} ${vehicle.model}? This will also delete all associated reminders.`)) {
      this.api.deleteVehicle(vehicle.id).subscribe({
        next: () => this.loadVehicles()
      });
    }
  }

  saveVehicle() {
    this.saving.set(true);
    const editing = this.editingVehicle();

    const request = editing
      ? this.api.updateVehicle(editing.id, this.form)
      : this.api.createVehicle(this.form);

    request.subscribe({
      next: () => {
        this.closeModal();
        this.loadVehicles();
      },
      error: () => this.saving.set(false)
    });
  }

  closeModal() {
    this.showAddModal.set(false);
    this.editingVehicle.set(null);
    this.saving.set(false);
    this.form = {
      make: '',
      model: '',
      year: new Date().getFullYear(),
      licensePlate: '',
      vin: '',
      color: '',
      notes: ''
    };
  }
}
