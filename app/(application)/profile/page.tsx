"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
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
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import {
  User,
  Mail,
  Lock,
  Camera,
  Settings,
  Shield,
  CheckCircle,
  AlertCircle,
} from "lucide-react";

export default function ProfilePage() {
  const [profile, setProfile] = useState({
    name: "Alexandra Chen",
    username: "alexandra.chen",
    email: "alexandra.chen@company.com",
    bio: "Senior Product Manager at TechCorp. Passionate about building user-centric products that make a difference.",
    title: "Senior Product Manager",
    location: "San Francisco, CA",
    website: "https://alexandrachen.dev",
  });

  const [passwords, setPasswords] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });

  const [isLoading, setIsLoading] = useState(false);

  const handleProfileChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => {
    const { name, value } = e.target;
    setProfile((prev) => ({ ...prev, [name]: value }));
  };

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setPasswords((prev) => ({ ...prev, [name]: value }));
  };

  const handleProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 1000));
    console.log("Saving profile data:", profile);
    setIsLoading(false);
  };

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (passwords.newPassword !== passwords.confirmPassword) {
      console.error("New passwords do not match!");
      return;
    }
    setIsLoading(true);
    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 1000));
    console.log("Updating password...");
    setIsLoading(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
      <div className="container mx-auto px-4 py-8">
        {/* Header Section */}
        <div className="mb-8">
          <div className="flex items-center gap-4 mb-6">
            <div className="relative">
              <Avatar className="h-20 w-20 border-4 border-white shadow-lg">
                <AvatarImage src="/api/placeholder/80/80" alt="Profile" />
                <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-600 text-white text-xl font-semibold">
                  AC
                </AvatarFallback>
              </Avatar>
              <Button
                size="sm"
                className="absolute -bottom-2 -right-2 h-8 w-8 rounded-full p-0 shadow-lg"
                variant="default"
              >
                <Camera className="h-4 w-4" />
              </Button>
            </div>
            <div className="flex-1">
              <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100">
                {profile.name}
              </h1>
              <p className="text-slate-600 dark:text-slate-400 text-lg">
                {profile.title}
              </p>
              <div className="flex items-center gap-2 mt-2">
                <Badge variant="secondary" className="text-xs">
                  <CheckCircle className="h-3 w-3 mr-1" />
                  Verified Account
                </Badge>
                <Badge variant="outline" className="text-xs">
                  Pro Member
                </Badge>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <Tabs defaultValue="profile" className="w-full max-w-4xl mx-auto">
          <TabsList className="grid w-full grid-cols-2 mb-8 bg-white dark:bg-slate-800 shadow-sm border">
            <TabsTrigger
              value="profile"
              className="flex items-center gap-2 data-[state=active]:bg-blue-50 data-[state=active]:text-blue-700 dark:data-[state=active]:bg-blue-950 dark:data-[state=active]:text-blue-300"
            >
              <User className="h-4 w-4" />
              Profile Settings
            </TabsTrigger>
            <TabsTrigger
              value="password"
              className="flex items-center gap-2 data-[state=active]:bg-blue-50 data-[state=active]:text-blue-700 dark:data-[state=active]:bg-blue-950 dark:data-[state=active]:text-blue-300"
            >
              <Shield className="h-4 w-4" />
              Security
            </TabsTrigger>
          </TabsList>

          {/* Profile Tab */}
          <TabsContent value="profile" className="space-y-6">
            <Card className="shadow-lg border-0 bg-white/80 backdrop-blur-sm dark:bg-slate-800/80">
              <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-slate-800 dark:to-slate-700 rounded-t-lg">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-lg bg-blue-500 flex items-center justify-center">
                    <Settings className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <CardTitle className="text-xl">Personal Information</CardTitle>
                    <CardDescription>
                      Update your profile information and manage your public
                      presence.
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <form onSubmit={handleProfileSubmit}>
                <CardContent className="p-8 space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label
                        htmlFor="name"
                        className="text-sm font-medium text-slate-700 dark:text-slate-300"
                      >
                        Full Name
                      </Label>
                      <Input
                        id="name"
                        name="name"
                        value={profile.name}
                        onChange={handleProfileChange}
                        className="h-11 border-slate-200 focus:border-blue-500 focus:ring-blue-500 dark:border-slate-600"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label
                        htmlFor="username"
                        className="text-sm font-medium text-slate-700 dark:text-slate-300"
                      >
                        Username
                      </Label>
                      <Input
                        id="username"
                        name="username"
                        value={profile.username}
                        onChange={handleProfileChange}
                        className="h-11 border-slate-200 focus:border-blue-500 focus:ring-blue-500 dark:border-slate-600"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label
                        htmlFor="email"
                        className="text-sm font-medium text-slate-700 dark:text-slate-300 flex items-center gap-2"
                      >
                        <Mail className="h-4 w-4" />
                        Email Address
                      </Label>
                      <Input
                        id="email"
                        name="email"
                        type="email"
                        value={profile.email}
                        onChange={handleProfileChange}
                        className="h-11 border-slate-200 focus:border-blue-500 focus:ring-blue-500 dark:border-slate-600"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label
                        htmlFor="title"
                        className="text-sm font-medium text-slate-700 dark:text-slate-300"
                      >
                        Job Title
                      </Label>
                      <Input
                        id="title"
                        name="title"
                        value={profile.title}
                        onChange={handleProfileChange}
                        className="h-11 border-slate-200 focus:border-blue-500 focus:ring-blue-500 dark:border-slate-600"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label
                        htmlFor="location"
                        className="text-sm font-medium text-slate-700 dark:text-slate-300"
                      >
                        Location
                      </Label>
                      <Input
                        id="location"
                        name="location"
                        value={profile.location}
                        onChange={handleProfileChange}
                        className="h-11 border-slate-200 focus:border-blue-500 focus:ring-blue-500 dark:border-slate-600"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label
                        htmlFor="website"
                        className="text-sm font-medium text-slate-700 dark:text-slate-300"
                      >
                        Website
                      </Label>
                      <Input
                        id="website"
                        name="website"
                        value={profile.website}
                        onChange={handleProfileChange}
                        className="h-11 border-slate-200 focus:border-blue-500 focus:ring-blue-500 dark:border-slate-600"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label
                      htmlFor="bio"
                      className="text-sm font-medium text-slate-700 dark:text-slate-300"
                    >
                      Bio
                    </Label>
                    <Textarea
                      id="bio"
                      name="bio"
                      value={profile.bio}
                      onChange={handleProfileChange}
                      placeholder="Tell us about yourself..."
                      className="min-h-[120px] border-slate-200 focus:border-blue-500 focus:ring-blue-500 dark:border-slate-600"
                    />
                  </div>
                </CardContent>
                <Separator />
                <CardFooter className="p-6 bg-slate-50 dark:bg-slate-800/50">
                  <div className="flex items-center justify-between w-full">
                    <p className="text-sm text-slate-600 dark:text-slate-400">
                      Changes will be reflected across all platforms
                    </p>
                    <Button
                      type="submit"
                      disabled={isLoading}
                      className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-medium px-6 h-11"
                    >
                      {isLoading ? "Saving..." : "Save Changes"}
                    </Button>
                  </div>
                </CardFooter>
              </form>
            </Card>
          </TabsContent>

          {/* Password Tab */}
          <TabsContent value="password" className="space-y-6">
            <Card className="shadow-lg border-0 bg-white/80 backdrop-blur-sm dark:bg-slate-800/80">
              <CardHeader className="bg-gradient-to-r from-red-50 to-orange-50 dark:from-slate-800 dark:to-slate-700 rounded-t-lg">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-lg bg-red-500 flex items-center justify-center">
                    <Lock className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <CardTitle className="text-xl">Security Settings</CardTitle>
                    <CardDescription>
                      Manage your password and account security preferences.
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <form onSubmit={handlePasswordSubmit}>
                <CardContent className="p-8 space-y-6">
                  <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4 flex items-start gap-3">
                    <AlertCircle className="h-5 w-5 text-amber-600 mt-0.5 flex-shrink-0" />
                    <div className="text-sm">
                      <p className="font-medium text-amber-800 dark:text-amber-200">
                        Password Security Tips
                      </p>
                      <p className="text-amber-700 dark:text-amber-300 mt-1">
                        Use a strong password with at least 8 characters,
                        including uppercase, lowercase, numbers, and symbols.
                      </p>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label
                      htmlFor="currentPassword"
                      className="text-sm font-medium text-slate-700 dark:text-slate-300"
                    >
                      Current Password
                    </Label>
                    <Input
                      id="currentPassword"
                      name="currentPassword"
                      type="password"
                      value={passwords.currentPassword}
                      onChange={handlePasswordChange}
                      className="h-11 border-slate-200 focus:border-red-500 focus:ring-red-500 dark:border-slate-600"
                    />
                  </div>

                  <Separator />

                  <div className="space-y-2">
                    <Label
                      htmlFor="newPassword"
                      className="text-sm font-medium text-slate-700 dark:text-slate-300"
                    >
                      New Password
                    </Label>
                    <Input
                      id="newPassword"
                      name="newPassword"
                      type="password"
                      value={passwords.newPassword}
                      onChange={handlePasswordChange}
                      className="h-11 border-slate-200 focus:border-red-500 focus:ring-red-500 dark:border-slate-600"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label
                      htmlFor="confirmPassword"
                      className="text-sm font-medium text-slate-700 dark:text-slate-300"
                    >
                      Confirm New Password
                    </Label>
                    <Input
                      id="confirmPassword"
                      name="confirmPassword"
                      type="password"
                      value={passwords.confirmPassword}
                      onChange={handlePasswordChange}
                      className="h-11 border-slate-200 focus:border-red-500 focus:ring-red-500 dark:border-slate-600"
                    />
                  </div>
                </CardContent>
                <Separator />
                <CardFooter className="p-6 bg-slate-50 dark:bg-slate-800/50">
                  <div className="flex items-center justify-between w-full">
                    <p className="text-sm text-slate-600 dark:text-slate-400">
                      You'll be logged out after changing your password
                    </p>
                    <Button
                      type="submit"
                      disabled={isLoading}
                      className="bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white font-medium px-6 h-11"
                    >
                      {isLoading ? "Updating..." : "Update Password"}
                    </Button>
                  </div>
                </CardFooter>
              </form>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}