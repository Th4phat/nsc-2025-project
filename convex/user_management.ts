import { v } from "convex/values";
import { queryWithAuth, mutationWithAuth } from "./auth";
import { internal } from "./_generated/api";
import {
  query,
  mutation,
  internalMutation,
  action,
  internalQuery,
  internalAction,
} from "./_generated/server";
import { Doc, Id } from "./_generated/dataModel";
import { createAccount, getAuthUserId } from "@convex-dev/auth/server";
import { ConvexError } from "convex/values";
import Papa from "papaparse";

/**
 * Get all users with their associated department and role names.
 * Accessible only by users with 'user:read:any' permission (admin role).
 */
export const getUsers = queryWithAuth(["user:read:any"])({
  args: {
    query: v.optional(v.string()),
  },
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
  handler: async (ctx, args) => {
    let users = await ctx.db.query("users").collect();

    if (args.query) {
      const lowerCaseQuery = args.query.toLowerCase();
      users = users.filter(
        (user) =>
          user.name?.toLowerCase().includes(lowerCaseQuery) ||
          user.email.toLowerCase().includes(lowerCaseQuery),
      );
    }

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

    
    if (bio !== undefined) {
      if (user.profileId) {
        await ctx.db.patch(user.profileId, { bio });
      } else {
        
        const newProfileId = await ctx.db.insert("profiles", {
          userId: userId,
          bio: bio,
        });
        await ctx.db.patch(userId, { profileId: newProfileId });
      }
    }

    
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

    
    if (!user.roleId) {
      throw new Error("User does not have a role assigned.");
    }
    const userRole = await ctx.db.get(user.roleId);
    if (!userRole || !userRole.permissions.includes("document:send:department")) {
      throw new Error("User must have perm to control departments.");
    }

    
    for (const deptId of controlledDepartments) {
      const department = await ctx.db.get(deptId);
      if (!department) {
        throw new Error(`Department with ID ${deptId} not found.`);
      }
    }

    await ctx.db.patch(userId, { controlledDepartments });

    
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

/**
 * Internal mutation to create a new user.
 * Handles user creation via Convex Auth and updates the user's document with additional details.
 */
export const internalCreateUser = internalMutation({
  args: {
    userId: v.id("users"),
    name: v.string(),
    departmentId: v.id("departments"),
    roleId: v.id("roles"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.db.patch(args.userId, {
      name: args.name,
      departmentId: args.departmentId,
      roleId: args.roleId,
    });
    return null;
  },
});

export const createAccountAndUser = internalAction({
  args: {
    name: v.string(),
    email: v.string(),
    password: v.string(),
    departmentId: v.id("departments"),
    roleId: v.id("roles"),
  },
  returns: v.id("users"),
  handler: async (ctx, args) => {
    const { user: newUserDoc } = await createAccount(ctx, {
      provider: "password",
      account: {
        id: args.email,
        secret: args.password,
      },
      profile: {
        email: args.email,
      },
      shouldLinkViaEmail: false,
      shouldLinkViaPhone: false,
    });

    await ctx.runMutation(internal.user_management.internalCreateUser, {
      userId: newUserDoc._id,
      name: args.name,
      departmentId: args.departmentId,
      roleId: args.roleId,
    });

    return newUserDoc._id;
  },
});

/**
 * Internal query to check if a user has a specific permission.
 */
export const checkPermission = internalQuery({
  args: {
    userId: v.id("users"),
    permission: v.string(),
  },
  returns: v.boolean(),
  handler: async (ctx, args) => {
    const user = await ctx.db.get(args.userId);
    if (!user || !user.roleId) {
      return false;
    }
    const role = await ctx.db.get(user.roleId);
    if (!role || !role.permissions) {
      return false;
    }
    return role.permissions.includes(args.permission);
  },
});

/**
 * Public mutation to create a new user.
 * Requires "user:create" permission.
 */
export const createUser = mutation({
  args: {
    name: v.string(),
    email: v.string(),
    password: v.string(),
    departmentId: v.id("departments"),
    roleId: v.id("roles"),
  },
  returns: v.null(), 
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new ConvexError("Not authenticated");

    const hasPermission = await ctx.runQuery(internal.user_management.checkPermission, {
      userId,
      permission: "user:create",
    });
    if (!hasPermission) {
      throw new ConvexError("Unauthorized: User does not have 'user:create' permission.");
    }

    
    await ctx.scheduler.runAfter(0, internal.user_management.createAccountAndUser, args);
    return null;
  },
});

/**
 * Public action to batch create users from CSV data.
 * Requires "user:create" permission.
 */
export const batchCreateUsers = action({
  args: {
    csvData: v.string(),
  },
  returns: v.array(v.id("users")),
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new ConvexError("Not authenticated");

    const hasPermission = await ctx.runQuery(internal.user_management.checkPermission, {
      userId,
      permission: "user:create",
    });
    if (!hasPermission) {
      throw new ConvexError("Unauthorized: User does not have 'user:create' permission.");
    }

    const parsedData = Papa.parse(args.csvData, {
      header: true,
      skipEmptyLines: true,
    }).data as Array<{
      name: string;
      email: string;
      password: string;
      departmentName: string;
      roleName: string;
    }>;

    const createdUserIds: Id<"users">[] = [];

    
    const departments = await ctx.runQuery(internal.user_management.getAllDepartments, {});
    const roles = await ctx.runQuery(internal.user_management.getAllRoles, {});

    for (const row of parsedData) {
      const department = departments.find((d: Doc<"departments">) => d.name === row.departmentName);
      const role = roles.find((r: Doc<"roles">) => r.name === row.roleName);

      if (!department) {
        console.warn(`Department not found for name: ${row.departmentName}. Skipping user ${row.name}.`);
        continue;
      }
      if (!role) {
        console.warn(`Role not found for name: ${row.roleName}. Skipping user ${row.name}.`);
        continue;
      }

      const newUserId = await ctx.runAction(internal.user_management.createAccountAndUser, {
        name: row.name,
        email: row.email,
        password: row.password,
        departmentId: department._id,
        roleId: role._id,
      });
      createdUserIds.push(newUserId);
    }

    return createdUserIds;
  },
});


export const getAllDepartments = internalQuery({
  args: {},
  returns: v.array(
    v.object({
      _id: v.id("departments"),
      name: v.string(),
    }),
  ),
  handler: async (ctx) => {
    return await ctx.db.query("departments").collect();
  },
});

export const getAllRoles = internalQuery({
  args: {},
  returns: v.array(
    v.object({
      _id: v.id("roles"),
      name: v.string(),
    }),
  ),
  handler: async (ctx) => {
    return await ctx.db.query("roles").collect();
  },
});

/**
 * Delete a user.
 * Accessible only by users with 'user:delete' permission (admin role).
 */
export const deleteUser = mutationWithAuth(["user:delete:any"])({
  args: {
    userId: v.id("users"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const { userId } = args;

    const user = await ctx.db.get(userId);
    if (!user) {
      throw new Error("User not found");
    }

    
    if (user.profileId) {
      await ctx.db.delete(user.profileId);
    }

    
    await ctx.db.delete(userId);

    
    const actor = await ctx.auth.getUserIdentity();
    if (actor) {
      const actorUser = await ctx.db
        .query("users")
        .withIndex("by_email", (q) => q.eq("email", actor.email!))
        .unique();
      if (actorUser) {
        await ctx.db.insert("auditLogs", {
          actorId: actorUser._id,
          action: "user.delete",
          targetTable: "users",
          targetId: userId,
          details: {
            userName: user.name,
            userEmail: user.email,
          },
        });
      }
    }
    return null;
  },
});