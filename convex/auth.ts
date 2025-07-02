import { Password } from "@convex-dev/auth/providers/Password";
import { convexAuth } from "@convex-dev/auth/server";
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
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return null;
    }
    const user = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", identity.email!))
      .unique();
    return user;
  },
});

export const hasPermission = internalQuery({
  args: { permission: v.string() },
  returns: v.boolean(),
  handler: async (ctx, { permission }): Promise<boolean> => {
    const user = await ctx.runQuery(internal.auth.getUser);
    if (!user || !user.roleId) {
      return false;
    }
    const role = (await ctx.db.get(user.roleId)) as Doc<"roles"> | null;
    if (!role) {
      return false;
    }
    // A role must have permissions defined.
    if (!role.permissions) {
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
