import { query } from "./_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";
import { Doc } from "./_generated/dataModel";

export const getCurrentUserID = query({
  args: {},
  returns: v.union(v.id("users"), v.null()),
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    return userId;
  },
});
export const getCurrentUser = query({
  args: {},
  returns: v.union(
    v.object({
      id: v.id("users"),
      name: v.optional(v.string()), // name can be optional
      email: v.optional(v.string()), // email can be optional
    }),
    v.null(),
  ),
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    console.log(userId);

    const identity = await ctx.auth.getUserIdentity();
    console.log("ident", identity?.email);

    if (!userId) {
      return null;
    }

    const user = await ctx.db.get(userId);

    if (!user) {
      return null;
    }

    return {
      id: user._id,
      name: user.name, // Will be undefined/null if auth provider doesn't supply it or it's not stored
      email: user.email, // Will be undefined/null if auth provider doesn't supply it or it's not stored
    };
  },
});
export const getAllUsers = query({
  args: {},
  // Returns an array of user objects, each containing _id, name, email, and department details
  returns: v.array(
    v.object({
      _id: v.id("users"),
      name: v.optional(v.string()),
      email: v.string(),
      department: v.optional(
        v.object({
          _id: v.id("departments"),
          name: v.string(),
          description: v.optional(v.string()),
        })
      ),
    })
  ),
  handler: async (ctx) => {
    // Fetch all users from the 'users' table
    const users = await ctx.db.query("users").collect();

    // Fetch department details for users who have a departmentId
    const usersWithDepartments = await Promise.all(
      users.map(async (user) => {
        let department = undefined;
        if (user.departmentId) {
          department = await ctx.db.get(user.departmentId);
        }
        return {
          _id: user._id,
          name: user.name,
          email: user.email,
          department: department
            ? {
                _id: department._id,
                name: department.name,
                description: department.description,
              }
            : undefined,
        };
      })
    );

    return usersWithDepartments;
  },
});

export const listUsersForShare = query({
  args: {
    searchQuery: v.optional(v.string()),
  },
  returns: v.array(
    v.object({
      _id: v.id("users"),
      name: v.optional(v.string()),
      email: v.string(),
    })
  ),
  handler: async (ctx, args) => {
    let users = [];

    // If there's a search query, perform a filtered search
    if (args.searchQuery) {
      // For simplicity, searching by email. In a real app, you might use a HNSW index for better search.
      users = await ctx.db
        .query("users")
        .filter((q) => q.eq(q.field("email"), args.searchQuery)) // Only email for now
        .collect();
    } else {
      // Otherwise, return a default list (e.g., all active users up to a limit)
      // This is a placeholder; consider a more robust way to recommend users without a search query.
      users = await ctx.db
        .query("users")
        .take(10); // Limit to 10 users for brevity
    }

    // Filter out the current user (if authenticated) from the list
    const currentUserId = (await ctx.auth.getUserIdentity())?.subject;
    
    // Convert to the desired return format
    return users.map(user => ({
      _id: user._id,
      name: user.name,
      email: user.email,
    })).filter(user => user._id !== currentUserId);
  },
});