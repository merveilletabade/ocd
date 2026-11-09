import { Component, computed, inject } from '@angular/core';
import { Router } from '@angular/router';
import { BookingService } from '../../core/booking.service';
import { Mode, Pkg, durationLabel } from '../../core/data';
import { SiteHeaderComponent } from '../../shared/site-header/site-header.component';
import { RevealDirective } from '../../shared/reveal.directive';
import { SiteFooterComponent } from '../../shared/site-footer/site-footer.component';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [SiteHeaderComponent, SiteFooterComponent, RevealDirective],
  templateUrl: './home.component.html',
})
export class HomeComponent {
  readonly svc = inject(BookingService);
  readonly dur = durationLabel;
  readonly standard = computed(() => this.svc.packages().filter((p) => !p.vip));
  readonly vip = computed(() => this.svc.packages().filter((p) => p.vip));
  private readonly router = inject(Router);

  start(mode: Mode): void {
    this.svc.start(mode);
    this.router.navigate(['/reserver']);
  }

  /** Clic sur une offre : on la présélectionne, puis le client choisit sa date. */
  choose(pkg: Pkg): void {
    this.svc.start('presentiel');
    this.svc.selectOffer(pkg);
    this.router.navigate(['/reserver']);
  }
}
