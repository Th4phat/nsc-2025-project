import { mutation, query, QueryCtx } from "./_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";
import { internal } from "./_generated/api";
import { Doc, Id } from "./_generated/dataModel";
import { mutationWithAuth, queryWithAuth, auth } from "./auth";

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
      email: v.optional(v.string()),
      name: v.optional(v.string()),
    }),
    v.null()
  ),
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      return null;
    }
    const user = await ctx.db.get(userId);
    if (!user) {
      return null;
    }
    return {
      id: user._id,
      email: user.email,
      name: user.name,
    };
  },
});

export const getUserRoleAndControlledDepartments = query({
  args: {},
  returns: v.union(
    v.object({
      roleName: v.string(),
      permissions: v.array(v.string()),
      controlledDepartments: v.optional(v.array(v.id("departments"))),
    }),
    v.null()
  ),
  handler: async (ctx): Promise<{
    roleName: string;
    permissions: string[];
    controlledDepartments?: Id<"departments">[];
  } | null> => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      return null;
    }
    const result = await ctx.runQuery(
      internal.document_distribution.getUserRoleAndPermissions,
      { userId }
    );
    return result;
  },
});

export const getMyProfile = queryWithAuth(["profile:read:own"])({
	 args: {},
	 handler: async (ctx) => {
	   const userId = await getAuthUserId(ctx);
	   if (!userId) {
	     return null;
	   }
	   const user = await ctx.db.get(userId);
	   if (!user) {
	     return null;
	   }
	   if (!user.profileId) {
	     return { user };
	   }
	   const profile = await ctx.db.get(user.profileId);
	   return { user, profile };
	 },
});

export const updateUserProfile = mutation( {
	 args: {
	  //  name: v.string(),
      phone:v.string(),
	   bio: v.string(),
	   title: v.string(),
	   location: v.string(),
	   website: v.string(),
	 },
	 handler: async (ctx, args) => {
	   const userId = await getAuthUserId(ctx);
	   if (!userId) {
	     throw new Error("Authenticated user not found.");
	   }

	   const user = await ctx.db.get(userId);

	   if (!user) {
	     throw new Error("User not found");
	   }

	  //  await ctx.db.patch(user._id, { name: args.name });

	   if (user.profileId) {
	     await ctx.db.patch(user.profileId, {
          phone: args.phone,
	       bio: args.bio,
	      //  title: args.title,
	       address: args.location,
	       website: args.website,
	     });
	   }
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
      roleName: v.optional(v.string()),
      bio: v.optional(v.string()),
    })
  ),
  handler: async (ctx) => {
    // Fetch all users from the 'users' table
    const users = await ctx.db.query("users").collect();

    // Fetch department details for users who have a departmentId
    const usersWithDetails = await Promise.all(
      users.map(async (user) => {
        let department = undefined;
        if (user.departmentId) {
          department = await ctx.db.get(user.departmentId);
        }

        let roleName = undefined;
        if (user.roleId) {
          const role = await ctx.db.get(user.roleId);
          if (role) {
            roleName = role.name;
          }
        }

        let bio = undefined;
        if (user.profileId) {
          const profile = await ctx.db.get(user.profileId);
          if (profile) {
            bio = profile.bio;
          }
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
          roleName: roleName,
          bio: bio,
        };
      })
    );

    return usersWithDetails;
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

export const getMyPermissions = query({
  args: {},
  returns: v.array(v.string()),
  handler: async (ctx): Promise<string[]> => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      console.log("no user id")
      return [];
    }
    const user: Doc<"users"> | null = await ctx.db.get(userId);
    if (!user || !user.roleId) {
      console.log("no user")
      return [];
    }

    const role: Doc<"roles"> | null = await ctx.db.get(user.roleId);

    if (!role) {
      console.log("no role")
      return [];
    }

    return role.permissions || [];
  },
})

export const getPermissionsByUserId = query({
  args: {},
  returns: v.array(v.string()),
  handler: async (ctx, args): Promise<string[]> => {
    const userId = await getAuthUserId(ctx);
	   if (!userId) {
	     throw new Error("Authenticated user not found.");
	   }
    const user: Doc<"users"> | null = await ctx.db.get(userId);
    if (!user || !user.roleId) {
      return [];
    }

    const role: Doc<"roles"> | null = await ctx.db.get(user.roleId);

    if (!role) {
      return [];
    }

    return role.permissions || [];
  },
});
export const getDepartmentMembers = queryWithAuth(["user:list:department"])({
  args: {},
  returns: v.array(
    v.object({
      _id: v.id("users"),
      _creationTime: v.number(),
      email: v.string(),
      name: v.optional(v.string()),
      roleId: v.optional(v.id("roles")),
      profileId: v.optional(v.id("profiles")),
      departmentId: v.optional(v.id("departments")),
      status: v.optional(v.union(v.literal("active"), v.literal("archived"))),
    })
  ),
  handler: async (ctx): Promise<Doc<"users">[]> => {
    const user: Doc<"users"> | null = await ctx.runQuery(internal.auth.getUser);

    if (!user || !user.departmentId) {
      // Or throw new ConvexError("User is not in a department.");
      return [];
    }

    const members: Doc<"users">[] = await ctx.db
      .query("users")
      .withIndex("by_departmentId", (q) =>
        q.eq("departmentId", user.departmentId!)
      )
      .collect();

    return members;
  },
});
export const getCompanyDirectory = queryWithAuth(["user:list:company"])({
  args: {},
  returns: v.array(
    v.object({
      _id: v.id("users"),
      _creationTime: v.number(),
      email: v.string(),
      name: v.optional(v.string()),
      roleId: v.optional(v.id("roles")),
      profileId: v.optional(v.id("profiles")),
      departmentId: v.optional(v.id("departments")),
      status: v.optional(v.union(v.literal("active"), v.literal("archived"))),
    })
  ),
  handler: async (ctx): Promise<Doc<"users">[]> => {
    const users = await ctx.db.query("users").collect();
    return users;
  },
});

