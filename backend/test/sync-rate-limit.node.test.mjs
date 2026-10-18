import assert from 'node:assert/strict';
import test from 'node:test';

import { MilestoneActionService } from '../dist/src/milestones/milestone-action.service.js';

const service = () => new MilestoneActionService({}, {}, {});

test('sync bloqueia nova varredura da mesma etapa antes de 30 segundos', () => {
  const actions = service();
  actions.assertSyncRateLimit('user', 'milestone');
  assert.throws(
    () => actions.assertSyncRateLimit('user', 'milestone'),
    (error) => error.getStatus() === 429,
  );
});

test('sync limita varreduras em etapas distintas por usuário', () => {
  const actions = service();
  for (let index = 0; index < 20; index += 1) {
    actions.assertSyncRateLimit('user', `milestone-${index}`);
  }
  assert.throws(
    () => actions.assertSyncRateLimit('user', 'milestone-20'),
    (error) => error.getStatus() === 429,
  );
});
