import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { Id } from "./_generated/dataModel";

export const createRole = mutation({
  args: {
    name: v.string(),
    rank: v.number(),
    permissions: v.array(v.string()),
  },
  returns: v.id("roles"),
  handler: async (ctx, args) => {
    const roleId = await ctx.db.insert("roles", {
      name: args.name,
      rank: args.rank,
      permissions: args.permissions,
    });
    return roleId;
  },
});

export const updateRole = mutation({
  args: {
    id: v.id("roles"),
    name: v.string(),
    rank: v.number(),
    permissions: v.array(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.db.patch(args.id, {
      name: args.name,
      rank: args.rank,
      permissions: args.permissions,
    });
    return null;
  },
});

export const deleteRole = mutation({
  args: {
    id: v.id("roles"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const usersWithRole = await ctx.db
      .query("users")
      .withIndex("by_roleId", (q) => q.eq("roleId", args.id))
      .collect();

    if (usersWithRole.length > 0) {
      throw new Error("Cannot delete a role that is currently assigned to users.");
    }

    await ctx.db.delete(args.id);
    return null;
  },
});

export const listAllRoles = query({
  args: {},
  returns: v.array(
    v.object({
      _id: v.id("roles"),
      name: v.string(),
      rank: v.number(),
      permissions: v.array(v.string()),
      _creationTime: v.number(),
    }),
  ),
  handler: async (ctx) => {
    return await ctx.db.query("roles").collect();
  },
});