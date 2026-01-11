import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService, ReminderType, CreateReminderTypeRequest } from '../../core/services/api.service';
import { ReminderIconComponent } from '../../shared/components/reminder-icon.component';

@Component({
  selector: 'app-admin',
  standalone: true,
  imports: [CommonModule, FormsModule, ReminderIconComponent],
  template: `
    <div class="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
      <div class="flex justify-between items-center mb-6">
        <div>
          <h1 class="text-2xl font-bold text-white">Admin Settings</h1>
          <p class="mt-1 text-sm text-gray-400">Manage reminder types and application settings</p>
        </div>
      </div>

      <!-- Reminder Types Section -->
      <div class="bg-gray-800 shadow rounded-lg border border-gray-700">
        <div class="px-4 py-5 border-b border-gray-700 sm:px-6 flex justify-between items-center">
          <h2 class="text-lg font-medium text-white">Reminder Types</h2>
          <button (click)="showAddModal.set(true)"
                  class="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700">
            Add Type
          </button>
        </div>

        @if (loading()) {
          <div class="text-center py-12">
            <div class="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-400"></div>
          </div>
        } @else {
          <ul class="divide-y divide-gray-700">
            @for (type of reminderTypes(); track type.id) {
              <li class="px-4 py-4 sm:px-6">
                <div class="flex items-center justify-between">
                  <div class="flex items-center space-x-4">
                    <app-reminder-icon [type]="type.icon" status="ok"></app-reminder-icon>
                    <div>
                      <p class="text-sm font-medium text-white">{{ type.name }}</p>
                      <p class="text-sm text-gray-400">
                        Icon: {{ type.icon }}
                        <span class="inline-block w-4 h-4 rounded ml-2" [style.background-color]="type.color"></span>
                      </p>
                    </div>
                  </div>
                  <div class="flex items-center space-x-3">
                    @if (type.isDefault) {
                      <span class="text-xs text-gray-500">Default</span>
                    }
                    <button (click)="editType(type)"
                            class="text-indigo-400 hover:text-indigo-300 text-sm">
                      Edit
                    </button>
                    @if (!type.isDefault) {
                      <button (click)="deleteType(type)"
                              class="text-red-400 hover:text-red-300 text-sm">
                        Delete
                      </button>
                    }
                  </div>
                </div>
              </li>
            }
          </ul>
        }
      </div>

      <!-- Add/Edit Modal -->
      @if (showAddModal() || editingType()) {
        <div class="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center p-4 z-50">
          <div class="bg-gray-800 rounded-lg shadow-xl max-w-md w-full p-6 border border-gray-700">
            <h2 class="text-lg font-medium text-white mb-4">
              {{ editingType() ? 'Edit Reminder Type' : 'Add Reminder Type' }}
            </h2>

            <form (ngSubmit)="saveType()" class="space-y-4">
              <div>
                <label class="block text-sm font-medium text-gray-300">Name</label>
                <input type="text" [(ngModel)]="form.name" name="name" required
                       class="mt-1 block w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md shadow-sm text-white placeholder-gray-400 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                       placeholder="e.g., Oil Change">
              </div>

              <div>
                <label class="block text-sm font-medium text-gray-300">Icon</label>
                <select [(ngModel)]="form.icon" name="icon"
                        class="mt-1 block w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md shadow-sm text-white focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm">
                  <option value="insurance">Shield (Insurance)</option>
                  <option value="inspection">Clipboard (Inspection)</option>
                  <option value="roadtax">Document (Road Tax)</option>
                  <option value="default">Clock (Default)</option>
                </select>
              </div>

              <div>
                <label class="block text-sm font-medium text-gray-300">Color</label>
                <div class="mt-1 flex items-center space-x-2">
                  <input type="color" [(ngModel)]="form.color" name="color"
                         class="h-10 w-20 rounded border border-gray-600 cursor-pointer bg-gray-700">
                  <input type="text" [(ngModel)]="form.color" name="colorHex"
                         class="flex-1 px-3 py-2 bg-gray-700 border border-gray-600 rounded-md shadow-sm text-white placeholder-gray-400 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                         placeholder="#6366f1">
                </div>
              </div>

              <div class="mt-4 p-4 bg-gray-900 rounded-lg">
                <p class="text-sm font-medium text-gray-300 mb-2">Preview</p>
                <div class="flex items-center space-x-3">
                  <app-reminder-icon [type]="form.icon" status="ok"></app-reminder-icon>
                  <span class="text-sm text-white">{{ form.name || 'Type Name' }}</span>
                </div>
              </div>

              <div class="flex justify-end space-x-3 pt-4">
                <button type="button" (click)="closeModal()"
                        class="px-4 py-2 border border-gray-600 rounded-md text-sm font-medium text-gray-300 hover:bg-gray-700">
                  Cancel
                </button>
                <button type="submit" [disabled]="saving() || !form.name"
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
export class AdminComponent implements OnInit {
  private api = inject(ApiService);

  reminderTypes = signal<ReminderType[]>([]);
  loading = signal(true);
  showAddModal = signal(false);
  editingType = signal<ReminderType | null>(null);
  saving = signal(false);

  form: CreateReminderTypeRequest = {
    name: '',
    icon: 'default',
    color: '#6366f1'
  };

  ngOnInit() {
    this.loadTypes();
  }

  loadTypes() {
    this.loading.set(true);
    this.api.getReminderTypes().subscribe({
      next: (types) => {
        this.reminderTypes.set(types);
        this.loading.set(false);
      },
      error: () => this.loading.set(false)
    });
  }

  editType(type: ReminderType) {
    this.editingType.set(type);
    this.form = {
      name: type.name,
      icon: type.icon,
      color: type.color
    };
  }

  deleteType(type: ReminderType) {
    if (confirm(`Delete "${type.name}" reminder type?`)) {
      this.api.deleteReminderType(type.id).subscribe({
        next: () => this.loadTypes()
      });
    }
  }

  saveType() {
    this.saving.set(true);
    const editing = this.editingType();

    const request = editing
      ? this.api.updateReminderType(editing.id, this.form)
      : this.api.createReminderType(this.form);

    request.subscribe({
      next: () => {
        this.closeModal();
        this.loadTypes();
      },
      error: () => this.saving.set(false)
    });
  }

  closeModal() {
    this.showAddModal.set(false);
    this.editingType.set(null);
    this.saving.set(false);
    this.form = {
      name: '',
      icon: 'default',
      color: '#6366f1'
    };
  }
}
