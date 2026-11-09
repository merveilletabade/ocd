import { Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { BookingService } from '../../core/booking.service';
import { COUNTRIES, durationLabel } from '../../core/data';
import { SiteHeaderComponent } from '../../shared/site-header/site-header.component';
import { SiteFooterComponent } from '../../shared/site-footer/site-footer.component';

@Component({
  selector: 'app-booking',
  standalone: true,
  imports: [FormsModule, RouterLink, SiteHeaderComponent, SiteFooterComponent],
  templateUrl: './booking.component.html',
})
export class BookingComponent implements OnInit {
  readonly svc = inject(BookingService);
  readonly countries = COUNTRIES;
  readonly weekdays = ['L', 'M', 'M', 'J', 'V', 'S', 'D'];
  readonly dur = durationLabel;

  ngOnInit(): void {
    this.svc.refresh();
  }

  /** Logo introuvable : on le cache et la tuile affiche le nom du moyen de paiement à la place. */
  hideLogo(event: Event): void {
    const img = event.target as HTMLImageElement;
    img.style.display = 'none';
    img.closest('.pay')?.classList.add('no-logo');
  }
}
