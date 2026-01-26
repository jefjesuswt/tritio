import { db } from '../../db/client';
import { testItems } from './schema';

/**
 * Pure handler functions/business logic.
 * Decoupled from Tritio's router definition where possible,
 * but can use Context for ease of access if preferred.
 *
 * In this pattern, we can also keep them as pure functions
 * returning data, and let the Controller (routes.ts) handle the response format.
 */

export const getPing = () => {
  return {
    message: 'pong' as const,
    timestamp: Date.now(),
  };
};

export const getPublicMessage = () => {
  return {
    message: 'This is a public endpoint accessible by everyone.',
  };
};

export const createItem = async (name: string) => {
  const result = await db
    .insert(testItems)
    .values({
      name,
      createdAt: new Date(),
    })
    .returning();

  return {
    success: true,
    item: result[0],
  };
};
