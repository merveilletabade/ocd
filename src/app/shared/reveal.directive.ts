import { Directive, ElementRef, OnDestroy, OnInit, inject, input } from '@angular/core';

/**
 * Fait apparaître l'élément en douceur quand il entre dans l'écran.
 * Usage : <div reveal> ou <div reveal [revealDelay]="2"> (décalage en paliers de 90 ms).
 */
@Directive({ selector: '[reveal]', standalone: true })
export class RevealDirective implements OnInit, OnDestroy {
  private readonly el = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
  readonly revealDelay = input(0);
  private observer?: IntersectionObserver;

  ngOnInit(): void {
    const el = this.el;
    el.classList.add('rv');
    el.style.setProperty('--rv-delay', `${this.revealDelay() * 90}ms`);
    if (typeof IntersectionObserver === 'undefined') {
      el.classList.add('rv-in');
      return;
    }
    this.observer = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            el.classList.add('rv-in');
            this.observer?.disconnect();
          }
        }
      },
      { threshold: 0.12, rootMargin: '0px 0px -40px 0px' },
    );
    this.observer.observe(el);
  }

  ngOnDestroy(): void {
    this.observer?.disconnect();
  }
}
