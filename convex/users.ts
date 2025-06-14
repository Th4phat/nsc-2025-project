import { query } from "./_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";
import { Doc } from "./_generated/dataModel";

export const getCurrentUser = query({
  args: {},
  returns: v.union(v.id("users"), v.null()),
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    return userId;
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