import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { API_URL } from './environment';
import { Mode, Pkg } from './data';

export interface SlotDto { index: number; time: string; available: boolean }
export interface DayDto { day: number; free: number; open: boolean }

export interface ReservationPayload {
  mode: Mode;
  country: string;
  live_date: string;
  slot_index: number;
  package_id: string;
  promo: boolean;
  name: string;
  business: string;
  product: string;
  phone: string;
  email: string;
  payment_method: string;
}

export interface ReservationResult {
  ref: string;
  status: string;
  total: number;
}

export type Status = 'Payé' | 'En attente' | 'Annulé';

export interface AdminRow {
  id: number;
  ref: string;
  biz: string;
  person: string;
  remote: boolean;
  place: string;
  when: string;
  pkg: string;
  amount: number;
  method: string;
  status: Status;
  phone: string;
  email: string;
  product: string;
}

export interface AdminStats {
  count: number;
  paid: number;
  pending: number;
  remote_share: number;
  promo_enabled: boolean;
  promo_percent: number;
}

export interface WeekDay { label: string; count: number; pct: number }
export interface AdminPkg { id: string; name: string; price: number; tagline: string; active: boolean }

@Injectable({ providedIn: 'root' })
export class ApiService {
  private readonly http = inject(HttpClient);

  // ----- Public -----
  packages() {
    return this.http.get<Pkg[]>(`${API_URL}/packages`);
  }
  month(year: number, month: number) {
    return this.http.get<DayDto[]>(`${API_URL}/availability/month`, { params: { year, month } });
  }
  slots(date: string) {
    return this.http.get<SlotDto[]>(`${API_URL}/availability`, { params: { date } });
  }
  createReservation(body: ReservationPayload) {
    return this.http.post<ReservationResult>(`${API_URL}/reservations`, body);
  }
  payReservation(ref: string) {
    return this.http.post<ReservationResult>(`${API_URL}/reservations/${ref}/pay`, {});
  }

  // ----- Admin -----
  adminReservations() {
    return this.http.get<AdminRow[]>(`${API_URL}/admin/reservations`);
  }
  adminStats() {
    return this.http.get<AdminStats>(`${API_URL}/admin/stats`);
  }
  adminWeek() {
    return this.http.get<WeekDay[]>(`${API_URL}/admin/week`);
  }
  adminPackages() {
    return this.http.get<AdminPkg[]>(`${API_URL}/admin/packages`);
  }
  setStatus(id: number, status: Status) {
    return this.http.patch<AdminRow>(`${API_URL}/admin/reservations/${id}/status`, { status });
  }
  exportCsv(filters: { mode?: string; status?: string; q?: string }) {
    let params = new HttpParams();
    for (const [k, v] of Object.entries(filters)) if (v) params = params.set(k, v);
    return this.http.get(`${API_URL}/admin/export.csv`, { params, responseType: 'blob' });
  }
}
