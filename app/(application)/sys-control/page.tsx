"use client";

import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";

export default function SysControlPage() {
  const permissions = useQuery(api.users.getMyPermissions);

  if (permissions === undefined) {
    return <div>Loading permissions...</div>;
  }
  console.log(permissions)
  if (!permissions.includes("system:settings:read")) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100">
        <h1 className="text-4xl font-bold text-red-600 mb-4">Access Denied</h1>
        <p className="text-lg text-gray-700">
          You do not have the required permissions to view this page.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100">
      <h1 className="text-4xl font-bold text-gray-800 mb-4">System Control</h1>
      <p className="text-lg text-gray-700">
        This is a placeholder page for system control functionalities.
      </p>
    </div>
  );
}