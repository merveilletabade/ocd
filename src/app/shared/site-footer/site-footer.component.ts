import { Component } from '@angular/core';

@Component({
  selector: 'app-site-footer',
  standalone: true,
  template: `
    <footer class="site-footer">
      <div class="container footer-row">
        <div class="logo-chip"><img class="logo" src="assets/logo.png" alt="OCD"></div>
        <p>OCD Live · Lomé, Togo · Une initiative House of Challenge</p>
      </div>
    </footer>
  `,
})
export class SiteFooterComponent {}
