import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-reminder-icon',
  standalone: true,
  imports: [CommonModule],
  template: `
    <span class="inline-flex items-center justify-center w-8 h-8 rounded-full" [ngClass]="bgClass">
      @switch (type?.toLowerCase()) {
        @case ('insurance') {
          <svg class="w-4 h-4" [ngClass]="iconClass" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"/>
          </svg>
        }
        @case ('inspection') {
          <svg class="w-4 h-4" [ngClass]="iconClass" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"/>
          </svg>
        }
        @case ('roadtax') {
          <svg class="w-4 h-4" [ngClass]="iconClass" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
          </svg>
        }
        @default {
          <svg class="w-4 h-4" [ngClass]="iconClass" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/>
          </svg>
        }
      }
    </span>
  `
})
export class ReminderIconComponent {
  @Input() type: string = '';
  @Input() status: string = '';

  get bgClass(): string {
    switch (this.status) {
      case 'overdue': return 'bg-red-100';
      case 'urgent': return 'bg-orange-100';
      case 'warning': return 'bg-yellow-100';
      case 'completed': return 'bg-gray-100';
      default: return 'bg-green-100';
    }
  }

  get iconClass(): string {
    switch (this.status) {
      case 'overdue': return 'text-red-600';
      case 'urgent': return 'text-orange-600';
      case 'warning': return 'text-yellow-600';
      case 'completed': return 'text-gray-500';
      default: return 'text-green-600';
    }
  }
}
