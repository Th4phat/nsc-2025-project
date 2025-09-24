"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function Page() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-100 p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-center text-2xl">ยินดีต้อนรับ</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col space-y-4">
          <Link href="/dashboard" passHref>
            <Button className="w-full">ไปที่แดชบอร์ด</Button>
          </Link>
          <Link href="/manage-folders" passHref>
            <Button className="w-full">จัดการโฟลเดอร์</Button>
          </Link>
          <Link href="/manage-user" passHref>
            <Button className="w-full">จัดการผู้ใช้</Button>
          </Link>
          <Link href="/signin" passHref>
            <Button className="w-full">ลงชื่อเข้าใช้</Button>
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}