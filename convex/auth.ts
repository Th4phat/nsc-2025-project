import { Password } from "@convex-dev/auth/providers/Password";
import { convexAuth, getAuthUserId } from "@convex-dev/auth/server";
import {
  internalQuery,
  mutation,
  MutationCtx,
  query,
  QueryCtx,
} from "./_generated/server";
import { v } from "convex/values";
import { api, internal } from "./_generated/api";
import { ConvexError } from "convex/values";
import { Doc } from "./_generated/dataModel";
import {
  customQuery,
  customMutation,
  customCtx,
} from "convex-helpers/server/customFunctions";
import { actionGeneric } from "convex/server";

export const { auth, signIn, signOut, store, isAuthenticated } = convexAuth({
  providers: [Password],
})

export const getUser = internalQuery({
  args: {},
  returns: v.union(v.object({
    _id: v.id("users"),
    _creationTime: v.number(),
    email: v.string(),
    name: v.optional(v.string()),
    roleId: v.optional(v.id("roles")),
    profileId: v.optional(v.id("profiles")),
    departmentId: v.optional(v.id("departments")),
    controlledDepartments: v.optional(v.array(v.id("departments"))),
    status: v.optional(v.union(v.literal("active"), v.literal("archived"))),
  }), v.null()),
  handler: async (ctx): Promise<Doc<"users"> | null> => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      return null;
    }
    const user = await ctx.db.get(userId);
    return user;
  },
});

export const hasPermission = internalQuery({
  args: { permission: v.string() },
  returns: v.boolean(),
  handler: async (ctx, { permission }): Promise<boolean> => {
    const user = await ctx.runQuery(internal.auth.getUser);
    console.log("User in hasPermission:", user);
    if (!user) {
      console.log("no user found in hasPermission");
      return false;
    }
    if (!user.roleId) {
      console.log("User has no roleId:", user);
      return false;
    }
    const role = (await ctx.db.get(user.roleId)) as Doc<"roles"> | null;
    if (!role) {
      console.log("no role")
      return false;
    }
    if (!role.permissions) {
      console.log("no perm")
      return false;
    }
    return role.permissions.includes(permission);
  },
});

const permissionCheck = (permissions: string[]) => {
  return customCtx(async (ctx) => {
    for (const permission of permissions) {
      const hasPerm = await ctx.runQuery(internal.auth.hasPermission, {
        permission,
      });
      if (!hasPerm) {
        
        throw new ConvexError("Unauthorized");
      }
    }
    return {};
  });
};

export const queryWithAuth = (permissions: string[]) => {
  return customQuery(query, permissionCheck(permissions));
};

export const mutationWithAuth = (permissions: string[]) => {
  return customMutation(mutation, permissionCheck(permissions));
};
