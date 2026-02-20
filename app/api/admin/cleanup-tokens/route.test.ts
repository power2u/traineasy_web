import { describe, it, expect, vi, beforeEach } from 'vitest';

const findManyMock = vi.fn();
const deleteManyMock = vi.fn();

vi.mock('@/lib/prisma', () => ({
  prisma: {
    fcmToken: {
      findMany: (...args: any[]) => findManyMock(...args),
      deleteMany: (...args: any[]) => deleteManyMock(...args),
    },
  },
}));

vi.mock('@/lib/firebase/admin', () => ({
  adminMessaging: null,
}));

import { runFcmTokenCleanupJob } from './route';

describe('runFcmTokenCleanupJob', () => {
  beforeEach(() => {
    findManyMock.mockReset();
    deleteManyMock.mockReset();
  });

  it('cleans up old tokens and returns summary when Firebase is disabled', async () => {
    findManyMock.mockResolvedValueOnce([
      { id: 't1', token: 'token-1', updatedAt: new Date() },
      { id: 't2', token: 'token-2', updatedAt: new Date() },
    ]);

    deleteManyMock.mockResolvedValueOnce({ count: 1 });

    const result = await runFcmTokenCleanupJob();

    expect(result.success).toBe(true);
    expect(result.results.totalTokens).toBe(2);
    expect(result.removed).toBeGreaterThanOrEqual(1);
    expect(deleteManyMock).toHaveBeenCalledTimes(1);
  });

  it('propagates errors from prisma operations', async () => {
    findManyMock.mockRejectedValueOnce(new Error('DB failure'));

    await expect(runFcmTokenCleanupJob()).rejects.toThrow('DB failure');
  });
});

