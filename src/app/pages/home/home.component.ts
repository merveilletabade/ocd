import { Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { BookingService } from '../../core/booking.service';
import { Mode } from '../../core/data';
import { SiteHeaderComponent } from '../../shared/site-header/site-header.component';
import { SiteFooterComponent } from '../../shared/site-footer/site-footer.component';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [SiteHeaderComponent, SiteFooterComponent],
  templateUrl: './home.component.html',
})
export class HomeComponent {
  readonly svc = inject(BookingService);
  private readonly router = inject(Router);

  start(mode: Mode): void {
    this.svc.start(mode);
    this.router.navigate(['/reserver']);
  }
}
