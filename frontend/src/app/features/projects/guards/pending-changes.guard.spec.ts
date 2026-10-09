import { ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';
import { pendingChangesGuard } from './pending-changes.guard';

describe('pendingChangesGuard', () => {
  const route = {} as ActivatedRouteSnapshot;
  const state = {} as RouterStateSnapshot;

  it('leaves clean forms without prompting', () => {
    const confirm = spyOn(window, 'confirm');
    const result = pendingChangesGuard({ hasUnsavedChanges: () => false }, route, state, state);

    expect(result).toBeTrue();
    expect(confirm).not.toHaveBeenCalled();
  });

  it('blocks navigation when the user keeps unsaved changes', () => {
    spyOn(window, 'confirm').and.returnValue(false);
    const result = pendingChangesGuard({ hasUnsavedChanges: () => true }, route, state, state);

    expect(result).toBeFalse();
  });

  it('allows navigation when the user discards unsaved changes', () => {
    spyOn(window, 'confirm').and.returnValue(true);
    const result = pendingChangesGuard({ hasUnsavedChanges: () => true }, route, state, state);

    expect(result).toBeTrue();
  });
});
