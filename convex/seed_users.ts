import { internalMutation } from "./_generated/server";
import { v } from "convex/values";
import { Id } from "./_generated/dataModel";

export const seedTestUsers = internalMutation({
  args: {},
  returns: v.null(),
  handler: async (ctx) => {
    // Fetch all roles
    const roles = await ctx.db.query("roles").collect();
    const roleMap = new Map(roles.map((role) => [role.name, role._id]));

    // Fetch all departments or create if they don't exist
    let departments = await ctx.db.query("departments").collect();
    const departmentMap = new Map(departments.map((dept) => [dept.name, dept._id]));

    const getOrCreateDepartmentId = async (name: string): Promise<Id<"departments">> => {
      let deptId = departmentMap.get(name);
      if (!deptId) {
        deptId = await ctx.db.insert("departments", { name, status: "active" });
        departmentMap.set(name, deptId);
      }
      return deptId;
    };

    const testUsers = [
      {
        email: "employee1@example.com",
        name: "Alice Employee",
        roleName: "Employee",
        departmentName: "HR",
        profile: {
          bio: "Dedicated HR professional.",
          phone: "111-222-3333",
          title: "HR Assistant",
          employeeID: "EMP001",
        },
      },
      {
        email: "hod1@example.com",
        name: "Bob Head",
        roleName: "Head of Department",
        departmentName: "Engineering",
        profile: {
          bio: "Head of the Engineering Department.",
          phone: "444-555-6666",
          title: "Head of Engineering",
          employeeID: "HOD001",
        },
      },
      {
        email: "director1@example.com",
        name: "Charlie Director",
        roleName: "Director",
        departmentName: "Sales",
        profile: {
          bio: "Sales Director overseeing global operations.",
          phone: "777-888-9999",
          title: "Global Sales Director",
          employeeID: "DIR001",
        },
      },
      {
        email: "admin1@example.com",
        name: "Diana Admin",
        roleName: "System Administrator",
        departmentName: "IT",
        profile: {
          bio: "System Administrator with full access.",
          phone: "000-111-2222",
          title: "IT Administrator",
          employeeID: "ADM001",
        },
      },
      {
        email: "employee2@example.com",
        name: "Eve Employee",
        roleName: "Employee",
        departmentName: "Marketing",
        profile: {
          bio: "Marketing team member.",
          phone: "333-444-5555",
          title: "Marketing Specialist",
          employeeID: "EMP002",
        },
      },
    ];

    for (const userData of testUsers) {
      const roleId = roleMap.get(userData.roleName);
      if (!roleId) {
        console.warn(`Role ${userData.roleName} not found. Skipping user ${userData.name}.`);
        continue;
      }

      let departmentId: Id<"departments"> | undefined;
      if (userData.departmentName) {
        departmentId = await getOrCreateDepartmentId(userData.departmentName);
      }

      // Check if user already exists to prevent duplicates
      const existingUser = await ctx.db
        .query("users")
        .withIndex("by_email", (q) => q.eq("email", userData.email))
        .unique();

      if (existingUser) {
        console.log(`User ${userData.email} already exists. Skipping.`);
        continue;
      }

      const userId = await ctx.db.insert("users", {
        email: userData.email,
        name: userData.name,
        roleId: roleId,
        departmentId: departmentId,
        status: "active",
      });

      await ctx.db.insert("profiles", {
        userId: userId,
        ...userData.profile,
      });
      console.log(`Created user: ${userData.name} with role: ${userData.roleName}`);
    }

    console.log("Test users seeding complete.");
    return null;
  },
});