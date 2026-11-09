import { Routes } from '@angular/router';
import { HomeComponent } from './pages/home/home.component';
import { BookingComponent } from './pages/booking/booking.component';
import { AdminShellComponent } from './pages/admin/admin-shell.component';

export const routes: Routes = [
  { path: '', component: HomeComponent, title: 'OCD Live - Réservation' },
  { path: 'reserver', component: BookingComponent, title: 'OCD Live - Réserver mon live' },
  {
    path: 'admin',
    component: AdminShellComponent,
    title: 'OCD Live - Administration',
    children: [
      { path: '', loadComponent: () => import('./pages/admin/reservations.component').then((m) => m.AdminReservationsComponent) },
      { path: 'calendrier', loadComponent: () => import('./pages/admin/calendar.component').then((m) => m.AdminCalendarComponent) },
      { path: 'offres', loadComponent: () => import('./pages/admin/offers.component').then((m) => m.AdminOffersComponent) },
      { path: 'paiements', loadComponent: () => import('./pages/admin/payments.component').then((m) => m.AdminPaymentsComponent) },
      { path: 'clients', loadComponent: () => import('./pages/admin/clients.component').then((m) => m.AdminClientsComponent) },
      { path: 'parametres', loadComponent: () => import('./pages/admin/settings.component').then((m) => m.AdminSettingsComponent) },
      { path: '**', redirectTo: '' },
    ],
  },
  { path: '**', redirectTo: '' },
];
