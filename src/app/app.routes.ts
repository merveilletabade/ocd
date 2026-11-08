import { Routes } from '@angular/router';
import { HomeComponent } from './pages/home/home.component';
import { BookingComponent } from './pages/booking/booking.component';
import { AdminComponent } from './pages/admin/admin.component';

export const routes: Routes = [
  { path: '', component: HomeComponent, title: 'OCD Live - Réservation' },
  { path: 'reserver', component: BookingComponent, title: 'OCD Live - Réserver mon live' },
  { path: 'admin', component: AdminComponent, title: 'OCD Live - Administration' },
  { path: '**', redirectTo: '' },
];
