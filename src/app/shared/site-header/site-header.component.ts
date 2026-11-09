import { Component, inject, input } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { BookingService } from '../../core/booking.service';
import { Mode } from '../../core/data';

@Component({
  selector: 'app-site-header',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './site-header.component.html',
})
export class SiteHeaderComponent {
  readonly variant = input<'home' | 'booking'>('home');
  readonly svc = inject(BookingService);
  private readonly router = inject(Router);

  readonly steps = [
    { n: 1, label: 'Date & heure' },
    { n: 2, label: 'Ton offre' },
    { n: 3, label: 'Paiement' },
  ];

  start(mode: Mode): void {
    this.svc.start(mode);
    this.router.navigate(['/reserver']);
  }
}
