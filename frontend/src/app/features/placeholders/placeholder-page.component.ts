import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { CardComponent } from '../../shared/ui/card/card.component';

@Component({
  selector: 'app-placeholder-page',
  imports: [CardComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:py-12">
      <app-card>
        <p class="text-sm font-semibold text-brand-700">FUNDAÇÃO PRONTA</p>
        <h1 class="mt-2 text-2xl font-semibold tracking-tight text-ink-900">{{ title }}</h1>
        <p class="mt-3 max-w-xl leading-7 text-ink-500">{{ description }}</p>
      </app-card>
    </div>
  `,
})
export class PlaceholderPageComponent {
  private readonly route = inject(ActivatedRoute);
  protected readonly title = String(this.route.snapshot.data['pageTitle']);
  protected readonly description = String(this.route.snapshot.data['description']);
}
