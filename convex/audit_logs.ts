import { queryWithAuth } from "./auth";
import { v } from "convex/values";
import { Doc, Id } from "./_generated/dataModel";

/**
 * Get all audit log records.
 * Accessible only by users with the 'system:logs:read' permission (admin role).
 */
export const getAuditLogs = queryWithAuth(["system:logs:read"])({
  args: {},
  returns: v.array(
    v.object({
      _id: v.id("auditLogs"),
      _creationTime: v.number(),
      actorId: v.id("users"),
      actorName: v.optional(v.string()), // Name of the user who performed the action
      action: v.string(),
      targetTable: v.string(),
      targetId: v.any(),
      details: v.optional(v.any()),
    }),
  ),
  handler: async (ctx) => {
    const auditLogs = await ctx.db.query("auditLogs").order("desc").collect();

    const logsWithActorDetails = await Promise.all(
      auditLogs.map(async (log) => {
        const actor = await ctx.db.get(log.actorId);
        return {
          ...log,
          actorName: actor?.name,
        };
      }),
    );

    return logsWithActorDetails;
  },
});