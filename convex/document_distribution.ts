import { mutation, query, internalMutation, internalQuery, internalAction } from "./_generated/server";
import { v } from "convex/values";
import { Id } from "./_generated/dataModel";
import { internal } from "./_generated/api";

/**
 * Internal function to get a user's role and permissions.
 */
export const getUserRoleAndPermissions = internalQuery({
  args: { userId: v.id("users") },
  returns: v.object({
    roleName: v.string(),
    permissions: v.array(v.string()),
    controlledDepartments: v.optional(v.array(v.id("departments"))),
  }),
  handler: async (ctx, args) => {
    const user = await ctx.db.get(args.userId);
    if (!user) {
      throw new Error("User not found");
    }
    if (!user.roleId) {
      throw new Error("User has no role assigned");
    }
    const role = await ctx.db.get(user.roleId);
    if (!role) {
      throw new Error("Role not found");
    }
    return {
      roleName: role.name,
      permissions: role.permissions,
      controlledDepartments: user.controlledDepartments,
    };
  },
});

/**
 * Sends a document to specified departments.
 * Accessible by users with 'headofdepartment' or 'director' role.
 */
export const sendToDepartments = mutation({
  args: {
    documentId: v.id("documents"),
    departmentIds: v.array(v.id("departments")),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }
    const user = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", identity.email as string))
      .unique();

    if (!user) {
      throw new Error("User not found");
    }

    const { roleName, permissions, controlledDepartments } = await ctx.runQuery(
      internal.document_distribution.getUserRoleAndPermissions,
      { userId: user._id },
    );

    const canSendToDepartment = permissions.includes("document:send:department");
    const isDirector = roleName === "Director";
    const isHeadOfDepartment = roleName === "Head of Department";

    if (!canSendToDepartment && !isDirector) {
      throw new Error("Unauthorized: Insufficient permissions to send documents to departments.");
    }

    if (isHeadOfDepartment && controlledDepartments) {
      const unauthorizedDepartments = args.departmentIds.filter(
        (depId) => !controlledDepartments.includes(depId),
      );
      if (unauthorizedDepartments.length > 0) {
        throw new Error(
          `Unauthorized: Cannot send to departments outside controlled scope: ${unauthorizedDepartments.join(", ")}`,
        );
      }
    } else if (isHeadOfDepartment && !controlledDepartments) {
        throw new Error("Unauthorized: Head of Department has no controlled departments defined.");
    }

    await ctx.db.insert("distributedDocuments", {
      documentId: args.documentId,
      senderId: user._id,
      recipientDepartmentIds: args.departmentIds,
    });

    await ctx.db.insert("auditLogs", {
      actorId: user._id,
      action: "document.distribute.departments",
      targetTable: "documents",
      targetId: args.documentId,
      details: { departmentIds: args.departmentIds },
    });

    return null;
  },
});

/**
 * Sends a document to the entire organization.
 * Accessible only by users with 'director' role.
 */
export const sendToOrganization = mutation({
  args: {
    documentId: v.id("documents"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }
    const user = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", identity.email as string))
      .unique();

    if (!user) {
      throw new Error("User not found");
    }

    const { roleName } = await ctx.runQuery(
      internal.document_distribution.getUserRoleAndPermissions,
      { userId: user._id },
    );

    if (roleName !== "Director") {
      throw new Error("Unauthorized: Only directors can send documents to the entire organization.");
    }

    await ctx.db.insert("distributedDocuments", {
      documentId: args.documentId,
      senderId: user._id,
      sentToAll: true,
    });

    await ctx.db.insert("auditLogs", {
      actorId: user._id,
      action: "document.distribute.organization",
      targetTable: "documents",
      targetId: args.documentId,
      details: { sentToAll: true },
    });

    return null;
  },
});