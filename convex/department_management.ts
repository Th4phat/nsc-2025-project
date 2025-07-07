import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { Id, Doc } from "./_generated/dataModel";

export const createDepartment = mutation({
  args: {
    name: v.string(),
    description: v.optional(v.string()),
  },
  returns: v.id("departments"),
  handler: async (ctx, args) => {
    const departmentId = await ctx.db.insert("departments", {
      name: args.name,
      description: args.description,
      status: "active",
    });
    return departmentId;
  },
});

export const updateDepartment = mutation({
  args: {
    id: v.id("departments"),
    name: v.string(),
    description: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.db.patch(args.id, {
      name: args.name,
      description: args.description,
    });
    return null;
  },
});

export const deleteDepartment = mutation({
  args: {
    id: v.id("departments"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.db.delete(args.id);
    return null;
  },
});

export const archiveDepartment = mutation({
  args: {
    id: v.id("departments"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.db.patch(args.id, {
      status: "archived",
    });
    return null;
  },
});

export const listDepartments = query({
  args: {},
  returns: v.array(
    v.object({
      _id: v.id("departments"),
      _creationTime: v.number(),
      name: v.string(),
      description: v.optional(v.string()),
      status: v.optional(v.union(v.literal("active"), v.literal("archived"))),
    }),
  ),
  handler: async (ctx) => {
    return await ctx.db
      .query("departments")
      // .withIndex("by_status", (q) => q.eq("status", "active"))
      .collect();
  },
});