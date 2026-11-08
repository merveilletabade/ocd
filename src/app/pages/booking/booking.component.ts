import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { BookingService } from '../../core/booking.service';
import { COUNTRIES } from '../../core/data';
import { SiteHeaderComponent } from '../../shared/site-header/site-header.component';
import { SiteFooterComponent } from '../../shared/site-footer/site-footer.component';

@Component({
  selector: 'app-booking',
  standalone: true,
  imports: [FormsModule, RouterLink, SiteHeaderComponent, SiteFooterComponent],
  templateUrl: './booking.component.html',
})
export class BookingComponent {
  readonly svc = inject(BookingService);
  readonly countries = COUNTRIES;
  readonly weekdays = ['L', 'M', 'M', 'J', 'V', 'S', 'D'];
}
