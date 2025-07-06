import { v } from "convex/values";
import { queryWithAuth, mutationWithAuth } from "./auth";
import { internal } from "./_generated/api";
import { internalMutation } from "./_generated/server";
import { Doc, Id } from "./_generated/dataModel";

/**
 * Get all users with their associated department and role names.
 * Accessible only by users with 'user:read:any' permission (admin role).
 */
export const getUsers = queryWithAuth(["user:read:any"])({
  args: {},
  returns: v.array(
    v.object({
      _id: v.id("users"),
      name: v.optional(v.string()),
      email: v.string(),
      bio: v.optional(v.string()),
      departmentId: v.optional(v.id("departments")),
      departmentName: v.optional(v.string()),
      roleId: v.optional(v.id("roles")),
      roleName: v.optional(v.string()),
      controlledDepartments: v.optional(v.array(v.id("departments"))),
    }),
  ),
  handler: async (ctx) => {
    const users = await ctx.db.query("users").collect();
    const usersWithDetails = await Promise.all(
      users.map(async (user) => {
        let departmentName: string | undefined;
        if (user.departmentId) {
          const department = await ctx.db.get(user.departmentId);
          departmentName = department?.name;
        }

        let roleName: string | undefined;
        if (user.roleId) {
          const role = await ctx.db.get(user.roleId);
          roleName = role?.name;
        }

        let bio: string | undefined;
        if (user.profileId) {
          const profile = await ctx.db.get(user.profileId);
          bio = profile?.bio;
        }

        return {
          _id: user._id,
          name: user.name,
          email: user.email,
          bio: bio,
          departmentId: user.departmentId,
          departmentName: departmentName,
          roleId: user.roleId,
          roleName: roleName,
          controlledDepartments: user.controlledDepartments,
        };
      }),
    );
    return usersWithDetails;
  },
});

/**
 * Update a user's information.
 * Accessible only by users with 'user:update:any' permission (admin role).
 */
export const updateUser = mutationWithAuth(["user:update:any"])({
  args: {
    userId: v.id("users"),
    name: v.optional(v.string()),
    bio: v.optional(v.string()),
    departmentId: v.optional(v.id("departments")),
    roleId: v.optional(v.id("roles")),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const { userId, name, bio, departmentId, roleId } = args;

    const user = await ctx.db.get(userId);
    if (!user) {
      throw new Error("User not found");
    }

    const updateFields: Partial<Doc<"users">> = {};
    if (name !== undefined) {
      updateFields.name = name;
    }
    if (departmentId !== undefined) {
      const department = await ctx.db.get(departmentId);
      if (!department) {
        throw new Error("Department not found");
      }
      updateFields.departmentId = departmentId;
    }
    if (roleId !== undefined) {
      const role = await ctx.db.get(roleId);
      if (!role) {
        throw new Error("Role not found");
      }
      updateFields.roleId = roleId;
    }

    if (Object.keys(updateFields).length > 0) {
      await ctx.db.patch(userId, updateFields);
    }

    // Handle bio update separately as it's in the profiles table
    if (bio !== undefined) {
      if (user.profileId) {
        await ctx.db.patch(user.profileId, { bio });
      } else {
        // If no profile exists, create one
        const newProfileId = await ctx.db.insert("profiles", {
          userId: userId,
          bio: bio,
        });
        await ctx.db.patch(userId, { profileId: newProfileId });
      }
    }

    // Log the action to auditLogs
    const actor = await ctx.auth.getUserIdentity();
    if (actor) {
      const actorUser = await ctx.db
        .query("users")
        .withIndex("by_email", (q) => q.eq("email", actor.email!))
        .unique();
      if (actorUser) {
        await ctx.db.insert("auditLogs", {
          actorId: actorUser._id,
          action: "user.update",
          targetTable: "users",
          targetId: userId,
          details: {
            updatedFields: { name, bio, departmentId, roleId },
          },
        });
      }
    }
    return null;
  },
});

/**
 * Update a user's controlled departments.
 * Accessible only by users with 'user:update:any' permission (admin role).
 * Requires the user being updated to have the 'Head of Department' role.
 */
export const updateControlledDepartments = mutationWithAuth(["user:update:any"])({
  args: {
    userId: v.id("users"),
    controlledDepartments: v.array(v.id("departments")),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const { userId, controlledDepartments } = args;

    const user = await ctx.db.get(userId);
    if (!user) {
      throw new Error("User not found");
    }

    // Validate that the user has the 'Head of Department' role
    if (!user.roleId) {
      throw new Error("User does not have a role assigned.");
    }
    const userRole = await ctx.db.get(user.roleId);
    if (!userRole || userRole.name !== "Head of Department") {
      throw new Error("User must have 'Head of Department' role to control departments.");
    }

    // Validate all department IDs exist
    for (const deptId of controlledDepartments) {
      const department = await ctx.db.get(deptId);
      if (!department) {
        throw new Error(`Department with ID ${deptId} not found.`);
      }
    }

    await ctx.db.patch(userId, { controlledDepartments });

    // Log the action to auditLogs
    const actor = await ctx.auth.getUserIdentity();
    if (actor) {
      const actorUser = await ctx.db
        .query("users")
        .withIndex("by_email", (q) => q.eq("email", actor.email!))
        .unique();
      if (actorUser) {
        await ctx.db.insert("auditLogs", {
          actorId: actorUser._id,
          action: "user.updateControlledDepartments",
          targetTable: "users",
          targetId: userId,
          details: {
            controlledDepartments,
          },
        });
      }
    }
    return null;
  },
});

// Internal mutation to get the current authenticated user's ID for audit logging
export const getAuthenticatedUserId = internalMutation({
  args: {},
  returns: v.union(v.id("users"), v.null()),
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return null;
    }
    const user = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", identity.email!))
      .unique();
    return user?._id;
  },
});