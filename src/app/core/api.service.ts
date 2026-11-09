import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { API_URL } from './environment';
import { Mode, Pkg } from './data';

export interface SlotDto { index: number; time: string; available: boolean }
export interface DayDto { day: number; free: number; open: boolean }
export interface ConfigDto { live_start_date: string; contact_whatsapp: string; contact_email: string; cancel_hours: number }

export interface ReservationPayload {
  mode: Mode;
  country: string;
  live_date: string;
  slot_index: number;
  package_id: string;
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
  receipt_token: string;
}

@Injectable({ providedIn: 'root' })
export class ApiService {
  private readonly http = inject(HttpClient);

  // ----- Public -----
  config() {
    return this.http.get<ConfigDto>(`${API_URL}/config`);
  }
  packages() {
    return this.http.get<Pkg[]>(`${API_URL}/packages`);
  }
  month(year: number, month: number, slots: number) {
    return this.http.get<DayDto[]>(`${API_URL}/availability/month`, { params: { year, month, slots } });
  }
  slots(date: string, slots: number) {
    return this.http.get<SlotDto[]>(`${API_URL}/availability`, { params: { date, slots } });
  }
  createReservation(body: ReservationPayload) {
    return this.http.post<ReservationResult>(`${API_URL}/reservations`, body);
  }
  payReservation(ref: string) {
    return this.http.post<ReservationResult>(`${API_URL}/reservations/${ref}/pay`, {});
  }

  receipt(ref: string, token: string) {
    return this.http.get(`${API_URL}/reservations/${ref}/receipt`, { params: { t: token }, responseType: 'blob' });
  }
}
