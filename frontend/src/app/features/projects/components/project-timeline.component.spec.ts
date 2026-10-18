import { TestBed } from '@angular/core/testing';

import { MilestoneStatus, ProjectMilestone, ProjectRole } from '../models/project.model';
import { ProjectTimelineComponent } from './project-timeline.component';

const STATUSES: readonly MilestoneStatus[] = [
  'pending',
  'funded',
  'submitted',
  'released',
  'refunded',
];

function milestone(status: MilestoneStatus, sequence: number): ProjectMilestone {
  return {
    id: `milestone-${status}`,
    projectId: 'project-1',
    sequence,
    title: `Etapa ${sequence}`,
    description: null,
    amountBaseUnits: '1000000',
    status,
    escrowAddress: null,
    fundTxSignature: null,
    submitTxSignature: null,
    releaseTxSignature: null,
    refundTxSignature: null,
    fundedAt: null,
    submittedAt: null,
    releasedAt: null,
    createdAt: '2026-10-08T00:00:00.000Z',
    updatedAt: '2026-10-08T00:00:00.000Z',
  };
}

describe('ProjectTimelineComponent', () => {
  function renderedActions(role: ProjectRole): string[] {
    const fixture = TestBed.createComponent(ProjectTimelineComponent);
    fixture.componentRef.setInput(
      'milestones',
      STATUSES.map((status, index) => milestone(status, index + 1)),
    );
    fixture.componentRef.setInput('role', role);
    fixture.detectChanges();

    return Array.from(
      (fixture.nativeElement as HTMLElement).querySelectorAll<HTMLElement>('[data-action]'),
    ).map((element) => element.dataset['action'] ?? '');
  }

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ProjectTimelineComponent],
    }).compileComponents();
  });

  it('renders early release, refund and submitted release for the client', () => {
    expect(renderedActions('client')).toEqual(['fund', 'release', 'refund', 'release']);
  });

  it('renders submit and claim for the freelancer', () => {
    expect(renderedActions('freelancer')).toEqual(['submit', 'claim']);
  });
});
