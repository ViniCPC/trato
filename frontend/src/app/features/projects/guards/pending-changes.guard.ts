import { CanDeactivateFn } from '@angular/router';

export interface PendingChangesComponent {
  hasUnsavedChanges(): boolean;
}

export const pendingChangesGuard: CanDeactivateFn<PendingChangesComponent> = (component) =>
  !component.hasUnsavedChanges() ||
  window.confirm('Você tem alterações não salvas. Deseja realmente sair desta página?');
