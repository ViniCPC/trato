import { ChangeDetectionStrategy, Component, input } from '@angular/core';

export type LandingIconName =
  | 'arrow'
  | 'briefcase'
  | 'check'
  | 'chevron'
  | 'close'
  | 'code'
  | 'coins'
  | 'external'
  | 'flask'
  | 'key'
  | 'laptop'
  | 'list'
  | 'lock'
  | 'menu'
  | 'package'
  | 'receipt'
  | 'shield'
  | 'undo'
  | 'x';

@Component({
  selector: 'app-landing-icon',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'inline-flex shrink-0',
    'aria-hidden': 'true',
  },
  template: `
    <svg
      class="size-full"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="2"
      stroke-linecap="round"
      stroke-linejoin="round"
    >
      @switch (name()) {
        @case ('menu') {
          <path d="M4 7h16M4 12h16M4 17h16" />
        }
        @case ('close') {
          <path d="m6 6 12 12M18 6 6 18" />
        }
        @case ('key') {
          <circle cx="8" cy="15" r="4" />
          <path d="m11 12 8-8m-3 3 2 2m-5 1 2 2" />
        }
        @case ('coins') {
          <ellipse cx="12" cy="6" rx="7" ry="3" />
          <path d="M5 6v5c0 1.7 3.1 3 7 3s7-1.3 7-3V6M5 11v5c0 1.7 3.1 3 7 3s7-1.3 7-3v-5" />
        }
        @case ('receipt') {
          <path d="M6 3h12v18l-3-2-3 2-3-2-3 2V3Z" />
          <path d="M9 8h6M9 12h6" />
        }
        @case ('list') {
          <path d="m4 7 2 2 3-3M11 8h9M4 14l2 2 3-3M11 15h9" />
        }
        @case ('lock') {
          <rect x="5" y="10" width="14" height="11" rx="2" />
          <path d="M8 10V7a4 4 0 0 1 8 0v3" />
        }
        @case ('package') {
          <path d="m12 3 8 4.5v9L12 21l-8-4.5v-9L12 3Z" />
          <path d="m4.5 7.5 7.5 4 7.5-4M12 21v-9.5m-3.5 3 2 2 4-4" />
        }
        @case ('check') {
          <path d="m5 12 4 4L19 6" />
        }
        @case ('x') {
          <path d="m7 7 10 10M17 7 7 17" />
        }
        @case ('undo') {
          <path d="m9 7-5 5 5 5M4 12h10a6 6 0 0 1 6 6" />
        }
        @case ('briefcase') {
          <rect x="3" y="7" width="18" height="13" rx="2" />
          <path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M3 12h18M10 12v2h4v-2" />
        }
        @case ('laptop') {
          <rect x="4" y="4" width="16" height="12" rx="2" />
          <path d="M2 20h20M9 20h6" />
        }
        @case ('shield') {
          <path d="M12 3 4.5 6v5.5c0 4.6 3.1 7.7 7.5 9.5 4.4-1.8 7.5-4.9 7.5-9.5V6L12 3Z" />
          <path d="m8.5 12 2.2 2.2 4.8-5" />
        }
        @case ('code') {
          <path d="m8 9-4 3 4 3M16 9l4 3-4 3M14 5l-4 14" />
        }
        @case ('external') {
          <path d="M14 5h5v5M10 14l9-9M19 13v6H5V5h6" />
        }
        @case ('arrow') {
          <path d="M5 12h14m-5-5 5 5-5 5" />
        }
        @case ('chevron') {
          <path d="m6 9 6 6 6-6" />
        }
        @case ('flask') {
          <path d="M9 3h6M10 3v6l-5 8.5A2.3 2.3 0 0 0 7 21h10a2.3 2.3 0 0 0 2-3.5L14 9V3" />
          <path d="M7 15h10" />
        }
      }
    </svg>
  `,
})
export class LandingIconComponent {
  readonly name = input.required<LandingIconName>();
}
