import { describe, it, expect, vi, beforeEach } from 'vitest';

const findManyMock = vi.fn();
const deleteMock = vi.fn();
const sendMock = vi.fn();

vi.mock('@/lib/prisma', () => ({
  prisma: {
    userPreference: {
      findMany: (...args: any[]) => findManyMock(...args),
    },
    fcmToken: {
      delete: (...args: any[]) => deleteMock(...args),
    },
  },
}));

vi.mock('@/lib/firebase/admin', () => ({
  adminMessaging: {
    send: (...args: any[]) => sendMock(...args),
  },
}));

import { sendCustomNotificationToActiveUsers } from './job';

describe('sendCustomNotificationToActiveUsers', () => {
  beforeEach(() => {
    findManyMock.mockReset();
    deleteMock.mockReset();
    sendMock.mockReset();
    deleteMock.mockResolvedValue(undefined);
  });

  it('sends notifications to active users and returns summary', async () => {
    findManyMock.mockResolvedValueOnce([
      {
        id: 'user-1',
        email: 'user@example.com',
        fullName: 'Test User',
        fcmTokens: [
          { id: 'token-1', token: 'abc', updatedAt: new Date() },
          { id: 'token-2', token: 'def', updatedAt: new Date() },
        ],
      },
    ]);

    sendMock.mockResolvedValue(undefined);

    const result = await sendCustomNotificationToActiveUsers({
      title: 'Test',
      body: 'Hello {name}',
      type: 'test',
    });

    expect(result.success).toBe(true);
    expect(result.users).toBe(1);
    expect(result.tokens).toBe(2);
    expect(result.sent).toBe(2);
    expect(sendMock).toHaveBeenCalledTimes(2);
  });

  it('removes invalid tokens when Firebase rejects them', async () => {
    findManyMock.mockResolvedValueOnce([
      {
        id: 'user-1',
        email: 'user@example.com',
        fullName: 'Test User',
        fcmTokens: [{ id: 'token-1', token: 'abc', updatedAt: new Date() }],
      },
    ]);

    sendMock.mockRejectedValueOnce({
      code: 'messaging/invalid-registration-token',
      message: 'invalid',
    });

    const result = await sendCustomNotificationToActiveUsers({
      title: 'Test',
      body: 'Hello {name}',
      type: 'test',
    });

    expect(result.success).toBe(true);
    expect(deleteMock).toHaveBeenCalledTimes(1);
    expect(result.sent).toBe(0);
  });
});
