import { MilestoneAction, MilestoneStatus, ProjectRole } from '../models/project.model';
import { getAvailableActions } from './milestone-actions';

describe('getAvailableActions', () => {
  const cases: ReadonlyArray<{
    role: ProjectRole;
    status: MilestoneStatus;
    expected: readonly MilestoneAction[];
  }> = [
    { role: 'client', status: 'pending', expected: ['fund'] },
    { role: 'client', status: 'funded', expected: ['release', 'refund'] },
    { role: 'client', status: 'submitted', expected: ['release'] },
    { role: 'client', status: 'released', expected: [] },
    { role: 'client', status: 'refunded', expected: [] },
    { role: 'freelancer', status: 'pending', expected: [] },
    { role: 'freelancer', status: 'funded', expected: ['submit'] },
    { role: 'freelancer', status: 'submitted', expected: ['claim'] },
    { role: 'freelancer', status: 'released', expected: [] },
    { role: 'freelancer', status: 'refunded', expected: [] },
  ];

  for (const testCase of cases) {
    it(`returns the right actions for ${testCase.role}/${testCase.status}`, () => {
      expect(getAvailableActions({ status: testCase.status }, testCase.role)).toEqual(
        testCase.expected,
      );
    });
  }
});
