import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface SharedUser {
  userId: number;
  username: string;
}

export interface Vehicle {
  id: number;
  make: string;
  model: string;
  year: number;
  licensePlate: string;
  vin?: string;
  color?: string;
  notes?: string;
  isOwner: boolean;
  ownerName: string;
  sharedWith: SharedUser[];
}

export interface CreateVehicleRequest {
  make: string;
  model: string;
  year: number;
  licensePlate: string;
  vin?: string;
  color?: string;
  notes?: string;
}

export interface Reminder {
  id: number;
  vehicleId: number;
  vehicleName: string;
  type: string;
  dueDate: string;
  notes?: string;
  isCompleted: boolean;
  daysUntilDue: number;
  status: 'overdue' | 'urgent' | 'warning' | 'ok' | 'completed';
}

export interface CreateReminderRequest {
  vehicleId: number;
  type: string;
  dueDate: string;
  notes?: string;
}

export interface UpdateReminderRequest {
  dueDate: string;
  notes?: string;
  isCompleted: boolean;
}

export interface DashboardStats {
  totalVehicles: number;
  overdueReminders: number;
  upcomingThisMonth: number;
  completedThisYear: number;
}

export interface DashboardResponse {
  stats: DashboardStats;
  upcomingReminders: Reminder[];
  overdueReminders: Reminder[];
}

export interface ReminderType {
  id: number;
  name: string;
  icon: string;
  color: string;
  isDefault: boolean;
}

export interface CreateReminderTypeRequest {
  name: string;
  icon: string;
  color: string;
}

@Injectable({
  providedIn: 'root'
})
export class ApiService {
  constructor(private http: HttpClient) {}

  // Dashboard
  getDashboard(): Observable<DashboardResponse> {
    return this.http.get<DashboardResponse>(`${environment.apiUrl}/dashboard`);
  }

  // Vehicles
  getVehicles(): Observable<Vehicle[]> {
    return this.http.get<Vehicle[]>(`${environment.apiUrl}/vehicles`);
  }

  getVehicle(id: number): Observable<Vehicle> {
    return this.http.get<Vehicle>(`${environment.apiUrl}/vehicles/${id}`);
  }

  getVehicleReminders(id: number): Observable<Reminder[]> {
    return this.http.get<Reminder[]>(`${environment.apiUrl}/vehicles/${id}/reminders`);
  }

  createVehicle(vehicle: CreateVehicleRequest): Observable<Vehicle> {
    return this.http.post<Vehicle>(`${environment.apiUrl}/vehicles`, vehicle);
  }

  updateVehicle(id: number, vehicle: CreateVehicleRequest): Observable<Vehicle> {
    return this.http.put<Vehicle>(`${environment.apiUrl}/vehicles/${id}`, vehicle);
  }

  deleteVehicle(id: number): Observable<void> {
    return this.http.delete<void>(`${environment.apiUrl}/vehicles/${id}`);
  }

  shareVehicle(id: number, username: string): Observable<SharedUser> {
    return this.http.post<SharedUser>(`${environment.apiUrl}/vehicles/${id}/share`, { username });
  }

  unshareVehicle(id: number, userId: number): Observable<void> {
    return this.http.delete<void>(`${environment.apiUrl}/vehicles/${id}/share/${userId}`);
  }

  getUsers(): Observable<SharedUser[]> {
    return this.http.get<SharedUser[]>(`${environment.apiUrl}/vehicles/users`);
  }

  // Reminders
  getReminders(): Observable<Reminder[]> {
    return this.http.get<Reminder[]>(`${environment.apiUrl}/reminders`);
  }

  createReminder(reminder: CreateReminderRequest): Observable<Reminder> {
    return this.http.post<Reminder>(`${environment.apiUrl}/reminders`, reminder);
  }

  updateReminder(id: number, reminder: UpdateReminderRequest): Observable<Reminder> {
    return this.http.put<Reminder>(`${environment.apiUrl}/reminders/${id}`, reminder);
  }

  completeReminder(id: number): Observable<Reminder> {
    return this.http.patch<Reminder>(`${environment.apiUrl}/reminders/${id}/complete`, {});
  }

  deleteReminder(id: number): Observable<void> {
    return this.http.delete<void>(`${environment.apiUrl}/reminders/${id}`);
  }

  // Reminder Types
  getReminderTypes(): Observable<ReminderType[]> {
    return this.http.get<ReminderType[]>(`${environment.apiUrl}/remindertypes`);
  }

  createReminderType(type: CreateReminderTypeRequest): Observable<ReminderType> {
    return this.http.post<ReminderType>(`${environment.apiUrl}/remindertypes`, type);
  }

  updateReminderType(id: number, type: CreateReminderTypeRequest): Observable<ReminderType> {
    return this.http.put<ReminderType>(`${environment.apiUrl}/remindertypes/${id}`, type);
  }

  deleteReminderType(id: number): Observable<void> {
    return this.http.delete<void>(`${environment.apiUrl}/remindertypes/${id}`);
  }
}
