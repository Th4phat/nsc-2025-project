import { mutation, query, internalMutation, internalQuery, internalAction } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";
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
    rank: v.number(), // Add rank to the return type
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
      rank: role.rank, // Include rank from the role
      permissions: role.permissions,
      controlledDepartments: user.controlledDepartments,
    };
  },
});

/**
 * Internal query to get users by department IDs.
 */
export const getUsersByDepartments = internalQuery({
  args: { departmentIds: v.array(v.id("departments")) },
  returns: v.array(v.object({ _id: v.id("users") })),
  handler: async (ctx, args) => {
    const usersPromises = args.departmentIds.map(async (departmentId) => {
      return await ctx.db
        .query("users")
        .withIndex("by_departmentId", (q) => q.eq("departmentId", departmentId))
        .collect();
    });
    const usersByDepartment = await Promise.all(usersPromises);
    const allUsers = usersByDepartment.flat();
    return allUsers.map(user => ({ _id: user._id }));
  },
});

/**
 * Internal query to get all users.
 */
export const getAllUsers = internalQuery({
  args: {},
  returns: v.array(v.object({ _id: v.id("users") })),
  handler: async (ctx) => {
    return await ctx.db.query("users").collect();
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
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }
    const user = await ctx.db.get(userId);

    if (!user) {
      throw new Error("User not found");
    }

    const { roleName, rank, permissions, controlledDepartments } = await ctx.runQuery(
      internal.document_distribution.getUserRoleAndPermissions,
      { userId: user._id },
    );

    const isHigherRank = rank >= 2; // Director or System Administrator
    const canSendToDepartment = permissions.includes("document:send:department");
    const canSendToCompany = permissions.includes("document:send:company");

    if (!canSendToDepartment && !canSendToCompany && !isHigherRank) {
      throw new Error("Unauthorized: Insufficient permissions to send documents to departments.");
    }

    // If the user is not higher rank, apply controlled department checks
    if (!isHigherRank) {
      // If the user can send to departments but not to the whole company, they are a Head of Department
      if (canSendToDepartment && !canSendToCompany && controlledDepartments) {
        const unauthorizedDepartments = args.departmentIds.filter(
          (depId) => !controlledDepartments.includes(depId),
        );
        if (unauthorizedDepartments.length > 0) {
          throw new Error(
            `Unauthorized: Cannot send to departments outside controlled scope: ${unauthorizedDepartments.join(", ")}`,
          );
        }
      } else if (canSendToDepartment && !canSendToCompany && !controlledDepartments) {
          throw new Error("Unauthorized: Head of Department has no controlled departments defined.");
      }
    }

    const users = await ctx.runQuery(internal.document_distribution.getUsersByDepartments, {
      departmentIds: args.departmentIds,
    });

    for (const recipientUser of users) {
      await ctx.db.insert("documentShares", {
        documentId: args.documentId,
        recipientId: recipientUser._id,
        sharerId: user._id,
        permissionGranted: ["view", "download"],
      });
    }

    await ctx.db.insert("auditLogs", {
      actorId: user._id,
      action: "document.distribute.departments",
      targetTable: "documents",
      targetId: args.documentId,
      details: { sharedWith: users.length },
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
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }
    const user = await ctx.db.get(userId);

    if (!user) {
      throw new Error("User not found");
    }

    const { permissions } = await ctx.runQuery(
      internal.document_distribution.getUserRoleAndPermissions,
      { userId: user._id },
    );

    if (!permissions.includes("document:send:company")) {
      throw new Error("Unauthorized: Only users with 'document:send:company' permission can send documents to the entire organization.");
    }

    const users = await ctx.runQuery(internal.document_distribution.getAllUsers, {});

    for (const recipientUser of users) {
      await ctx.db.insert("documentShares", {
        documentId: args.documentId,
        recipientId: recipientUser._id,
        sharerId: user._id,
        permissionGranted: ["view", "download"],
      });
    }

    await ctx.db.insert("auditLogs", {
      actorId: user._id,
      action: "document.distribute.organization",
      targetTable: "documents",
      targetId: args.documentId,
      details: { sharedWith: users.length, sentToAll: true },
    });

    return null;
  },
});