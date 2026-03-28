"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { updateAvatarUrl } from "@/lib/actions/profile.actions";
import { LogOut, Bell, Smartphone, Camera, Sun, Moon } from "lucide-react";
import type { Profile } from "@/types/database";
import { useTheme } from "@/components/layout/ThemeProvider";

export default function SettingsView({ profile }: { profile: Profile | null }) {
  const router = useRouter();
  const supabase = createClient();
  const { theme, toggle: toggleTheme } = useTheme();
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [avatarSrc, setAvatarSrc] = useState(profile?.avatar_url ?? null);

  async function handleSignOut() {
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  async function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !profile) return;

    setUploading(true);
    try {
      const ext = file.name.split(".").pop();
      const path = `${profile.id}/avatar.${ext}`;
      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(path, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from("avatars")
        .getPublicUrl(path);

      // Bust cache by appending timestamp
      const urlWithBust = `${publicUrl}?t=${Date.now()}`;
      await updateAvatarUrl(urlWithBust);
      setAvatarSrc(urlWithBust);
    } catch (err: any) {
      alert(err.message ?? "Upload failed");
    } finally {
      setUploading(false);
    }
  }

  const initials = profile?.full_name?.charAt(0).toUpperCase() ?? "?";

  return (
    <div className="px-4 pt-4">
      <h1 className="text-xl font-bold text-slate-800 mb-6">Settings</h1>

      {/* Profile */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 mb-4">
        <div className="flex items-center gap-4">
          {/* Avatar with upload button */}
          <div className="relative shrink-0">
            <button
              onClick={() => fileRef.current?.click()}
              disabled={uploading}
              className="w-16 h-16 rounded-full overflow-hidden focus:outline-none focus:ring-2 focus:ring-brand-400 focus:ring-offset-2"
            >
              {avatarSrc ? (
                <img src={avatarSrc} alt={profile?.full_name} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full bg-brand-100 flex items-center justify-center">
                  <span className="text-2xl font-bold text-brand-700">{initials}</span>
                </div>
              )}
            </button>
            <button
              onClick={() => fileRef.current?.click()}
              disabled={uploading}
              className="absolute -bottom-0.5 -right-0.5 w-6 h-6 bg-brand-600 rounded-full flex items-center justify-center border-2 border-white shadow-sm"
            >
              <Camera className="w-3 h-3 text-white" />
            </button>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleAvatarChange}
            />
          </div>
          <div>
            <p className="text-base font-semibold text-slate-800">{profile?.full_name}</p>
            <p className="text-sm text-slate-400 capitalize">{profile?.role}</p>
            <p className="text-xs text-brand-500 mt-1">
              {uploading ? "Uploading…" : "Tap photo to change"}
            </p>
          </div>
        </div>
      </div>

      {/* Install */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 mb-4">
        <div className="flex items-center gap-3 mb-2">
          <Smartphone className="w-5 h-5 text-slate-500" />
          <p className="text-sm font-semibold text-slate-700">Install app</p>
        </div>
        <p className="text-sm text-slate-500 mb-3">
          Add School Runs to your home screen for the best experience and to enable push notifications.
        </p>
        <div className="bg-slate-50 rounded-xl px-3 py-2.5 text-xs text-slate-500 space-y-1">
          <p><strong>iOS:</strong> Tap the Share button → "Add to Home Screen"</p>
          <p><strong>Android:</strong> Tap the menu (⋮) → "Add to Home Screen"</p>
        </div>
      </div>

      {/* Appearance */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 mb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {theme === "dark" ? <Moon className="w-5 h-5 text-slate-500" /> : <Sun className="w-5 h-5 text-slate-500" />}
            <p className="text-sm font-semibold text-slate-700">Appearance</p>
          </div>
          <button
            onClick={toggleTheme}
            className="flex items-center gap-1 bg-slate-100 rounded-full p-1 transition"
          >
            <span className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${theme === "light" ? "bg-white shadow text-slate-800" : "text-slate-400"}`}>
              <Sun className="w-3.5 h-3.5" /> Light
            </span>
            <span className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${theme === "dark" ? "bg-slate-700 shadow text-white" : "text-slate-400"}`}>
              <Moon className="w-3.5 h-3.5" /> Dark
            </span>
          </button>
        </div>
      </div>

      {/* Notifications */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 mb-6">
        <div className="flex items-center gap-3">
          <Bell className="w-5 h-5 text-slate-500" />
          <p className="text-sm font-semibold text-slate-700">Notifications</p>
        </div>
        <p className="text-sm text-slate-400 mt-1">
          {profile?.phone ? `SMS fallback enabled (${profile.phone})` : "No SMS fallback — install the app to enable push notifications."}
        </p>
      </div>

      {/* Sign out */}
      <button
        onClick={handleSignOut}
        className="w-full flex items-center justify-center gap-2 border border-red-200 text-red-500 hover:bg-red-50 transition font-medium text-sm py-3.5 rounded-2xl"
      >
        <LogOut className="w-4 h-4" />
        Sign out
      </button>
    </div>
  );
}
