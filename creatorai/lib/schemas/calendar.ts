import { z } from "zod";

export const calType = z.enum(["collab", "post", "reminder", "deadline", "event"]);
const fields = {
  type: calType, title: z.string().min(1).max(200), startsAt: z.string().datetime(),
  stage: z.string().max(40).optional(), withHandle: z.string().max(60).optional(), projectId: z.string().optional(),
  platform: z.string().max(40).optional(), notes: z.string().max(1000).optional(),
  remindMin: z.number().int().min(0).max(60 * 24 * 14).optional(), sound: z.boolean().optional(),
};
/** `id` lets the client mirror an item it created locally under the same id. */
export const calendarCreate = z.strictObject({ ...fields, id: z.string().regex(/^[A-Za-z0-9_]{1,64}$/).optional() });
export const calendarPatch = z.strictObject({ ...Object.fromEntries(Object.entries(fields).map(([k, v]) => [k, v.optional()])), fired: z.boolean().optional(), missed: z.boolean().optional(), done: z.boolean().optional() } as Record<string, z.ZodType>);
export const snoozeBody = z.strictObject({ minutes: z.number().int().min(1).max(60 * 24 * 7).default(10) });
export const calendarQuery = z.object({ from: z.string().optional(), to: z.string().optional(), type: calType.optional() });

export const permissionsBody = z.strictObject({ earnings: z.boolean().optional(), reach: z.boolean().optional(), audience: z.boolean().optional(), comments: z.boolean().optional() });
export const swipeBody = z.strictObject({ creatorId: z.string().min(1), dir: z.enum(["right", "left", "up"]) });
