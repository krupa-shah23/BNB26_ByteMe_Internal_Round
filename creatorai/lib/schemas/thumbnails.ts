import { z } from "zod";

export const scoreBody = z.strictObject({
  text: z.string().max(200),
  template: z.enum(["brand", "blur", "bold"]),
  cutout: z.boolean(),
  /** either the frame's face score, or projectId + frame so the server looks it up */
  frameFace: z.number().min(0).max(100).optional(),
  projectId: z.string().optional(),
  frame: z.number().int().min(0).max(5).optional(),
}).refine((b) => b.frameFace !== undefined || (b.projectId !== undefined && b.frame !== undefined), { message: "Send frameFace, or projectId with frame", path: ["frameFace"] });

export const clipsBody = z.strictObject({ count: z.number().int().min(1).max(10).optional() });
export const renderBody = z.strictObject({ aspect: z.enum(["9:16", "1:1", "16:9", "4:5"]).optional(), projectId: z.string().optional() });
