import { mutation } from "./_generated/server";
import { internal } from "./_generated/api";
import { v } from "convex/values";

export const runSeed = mutation({
  args: {},
  returns: v.null(),
  handler: async (ctx) => {
    await ctx.runMutation(internal.seed_users.seedTestUsers);
    console.log("Test user seeding initiated.");
    return null;
  },
});

export const runRoleSeed = mutation({
  args: {},
  returns: v.null(),
  handler: async (ctx) => {
    await ctx.runMutation(internal.roles.setupRoles);
    console.log("Role seeding initiated.");
    return null;
  },
});