"use client";

import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DepartmentManager } from "@/components/DepartmentManager";
import { RoleManager } from "@/components/RoleManager";

export default function SysControlPage() {
  const permissions = useQuery(api.users.getMyPermissions);

  if (permissions === undefined) {
    return (
      <div className="flex items-center justify-center h-full">
        <h1 className="text-2xl font-bold text-gray-500">กำลังโหลด...</h1>
      </div>
    );
  }
  console.log(permissions);
  if (!permissions.includes("system:settings:read")) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100">
        <h1 className="text-4xl font-bold text-red-600 mb-4">ปฏิเสธการเข้าถึง</h1>
        <p className="text-lg text-gray-700">
          คุณไม่มีสิทธิ์ที่จำเป็นในการดูหน้านี้
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-start min-h-screen bg-gray-100 p-8">
      <h1 className="text-4xl font-bold text-gray-800 mb-8">การควบคุมระบบ</h1>
      <Tabs defaultValue="departments" className="w-full max-w-4xl">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="departments">แผนก</TabsTrigger>
          <TabsTrigger value="roles">บทบาท</TabsTrigger>
        </TabsList>
        <TabsContent value="departments">
          <DepartmentManager />
        </TabsContent>
        <TabsContent value="roles">
          <RoleManager />
        </TabsContent>
      </Tabs>
    </div>
  );
}