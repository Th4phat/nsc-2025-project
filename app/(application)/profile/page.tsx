"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { toast } from "sonner";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import {
  User,
  Mail,
  Camera,
  CheckCircle,
  ArrowLeft,
} from "lucide-react";

export default function ProfilePage() {
  // Fetch user data and get the update mutation function from Convex
  const profileData = useQuery(api.users.getMyProfile);
  const updateUserProfile = useMutation(api.users.updateUserProfile);
  // Get the loading state directly from the mutation hook

  const [profile, setProfile] = useState({
    phone: "",
    bio: "",
    title: "",
    location: "", // This maps to 'address' in the schema
    website: "",
  });

  useEffect(() => {
    if (profileData?.profile) {
      setProfile({
        phone: profileData.profile.phone || "",
        bio: profileData.profile.bio || "",
        title: profileData.profile.title || "",
        location: profileData.profile.address || "", // Map 'address' from schema to 'location' in state
        website: profileData.profile.website || "",
      });
    }
  }, [profileData]);

  const handleProfileChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => {
    const { name, value } = e.target;
    setProfile((prev) => ({ ...prev, [name]: value }));
  };

  const handleProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await updateUserProfile({
        // email: profile.email,
        // name: profile.name,
        phone: profile.phone,
        bio: profile.bio,
        title: profile.title,
        location: profile.location,
        website: profile.website,
      });
      toast.success("อัปเดตโปรไฟล์เสร็จสิ้น");
    } catch (error) {
      // console.error("Failed to update profile:", error);
      toast.error("เกิดปัญหาขึ้น");
    }
  };

  // Show a loading state while fetching initial data
  if (profileData === undefined) {
    return (
      <div className="flex items-center justify-center h-full">
        <h1 className="text-2xl font-bold text-gray-500">กำลังโหลด...</h1>
      </div>
    );
  }

  // Handle case where user is not logged in
  if (profileData === null || profileData.user === null) {
    return (
      <div className="flex h-screen items-center justify-center">
        โปรดเข้าสู่ระบบ
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      <div className="container mx-auto max-w-4xl px-4 py-8">
        {/* Navigation Header */}
        <div className="mb-6">
          <Link
            href="/dashboard" // Adjust this link to your dashboard route
            className={buttonVariants({
              variant: "ghost",
              className: "flex items-center gap-2",
            })}
          >
            <ArrowLeft className="h-4 w-4" />
            กลับสู่หน้าหลัก
          </Link>
        </div>

        {/* Profile Header */}
        <div className="mb-8 flex items-center gap-4">
          <div className="relative">
            <Avatar className="h-20 w-20 border-4 border-white shadow-lg dark:border-slate-800">
              <AvatarImage src="/api/placeholder/80/80" alt="Profile" />
              <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-600 text-xl font-semibold text-white">
                {
                  profileData.user?.name?.slice(0,2)
                }
              </AvatarFallback>
            </Avatar>
            <Button
              size="icon"
              className="absolute -bottom-2 -right-2 h-8 w-8 rounded-full shadow-lg"
            >
              <Camera className="h-4 w-4" />
            </Button>
          </div>
          <div className="flex-1">
            <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100">
              {profileData.user?.name}
            </h1>
            <p className="text-lg text-slate-600 dark:text-slate-400">
              {profile.title}
            </p>
            <div className="mt-2 flex items-center gap-2">
              <Badge variant="secondary" className="text-xs">
                <CheckCircle className="mr-1 h-3 w-3" />
                ยืนยัน
              </Badge>
            </div>
          </div>
        </div>

        {/* Profile Edit Form */}
        <Card className="border-0 bg-white/80 shadow-lg backdrop-blur-sm dark:bg-slate-900/80">
          <CardHeader className="rounded-t-lg bg-slate-50 dark:bg-slate-800/50">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-500">
                <User className="h-5 w-5 text-white" />
              </div>
              <div>
                <CardTitle className="text-xl">ข้อมูลโปรไฟล์</CardTitle>
                <CardDescription>
                  การจัดการการแสดงตนต่อสาธารณะ
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <form onSubmit={handleProfileSubmit}>
            <CardContent className="space-y-6 p-8">
              <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="phone">เบอร์โทรศัพท์</Label>
                  <Input
                    id="phone"
                    name="phone"
                    value={profile.phone}
                    onChange={handleProfileChange}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="email" className="flex items-center gap-2">
                  <Mail className="h-4 w-4" />
                  อีเมล
                </Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  value={profileData.user?.email}
                  readOnly
                  disabled
                  className="cursor-not-allowed bg-slate-100 dark:bg-slate-800"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="title">ตำแหน่ง</Label>
                <Input
                  id="title"
                  name="title"
                  value={profile.title}
                  onChange={handleProfileChange}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="location">ที่อยู่</Label>
                <Input
                  id="location"
                  name="location"
                  value={profile.location}
                  onChange={handleProfileChange}
                />
              </div>


              <div className="space-y-2">
                <Label htmlFor="website">เว็บไซต์</Label>
                <Input
                  id="website"
                  name="website"
                  value={profile.website}
                  onChange={handleProfileChange}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="bio">ชีวประวัติ</Label>
                <Textarea
                  id="bio"
                  name="bio"
                  value={profile.bio}
                  onChange={handleProfileChange}
                  placeholder="Tell us about yourself..."
                  className="min-h-[120px]"
                />
              </div>
            </CardContent>
            <Separator />
            <CardFooter className="bg-slate-50 p-6 dark:bg-slate-800/50">
              <div className="flex w-full items-center justify-between">
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  
                </p>
                <Button
                  type="submit"
                  // disabled={isSavingProfile}
                  className="bg-gradient-to-r from-blue-600 to-blue-700 px-6 font-medium text-white hover:from-blue-700 hover:to-blue-800"
                >
                  บันทึก
                </Button>
              </div>
            </CardFooter>
          </form>
        </Card>
      </div>
    </div>
  );
}