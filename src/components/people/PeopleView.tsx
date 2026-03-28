"use client";

import { useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Copy, Check, Camera } from "lucide-react";
import { generateInvite } from "@/lib/actions/invite.actions";
import { updateChildAvatarUrl } from "@/lib/actions/profile.actions";
import { createClient } from "@/lib/supabase/client";
import type { Profile, Child } from "@/types/database";
import { cn } from "@/lib/utils";

const SCHOOL_LABEL: Record<string, { name: string; dot: string; text: string }> = {
  A: { name: "Redeemer", dot: "bg-violet-500", text: "text-violet-600" },
  B: { name: "Trinity",  dot: "bg-emerald-500", text: "text-emerald-600" },
};

interface Props {
  profiles: Profile[];
  pendingInvites: { id: string; invite_token: string | null; invite_token_expires_at: string | null }[];
  children: Child[];
}

export default function PeopleView({ profiles, pendingInvites, children }: Props) {
  const [inviteLink, setInviteLink] = useState("");
  const [copied, setCopied] = useState(false);
  const [generating, setGenerating] = useState(false);

  async function handleGenerateInvite() {
    setGenerating(true);
    const link = await generateInvite();
    setInviteLink(link);
    setGenerating(false);
  }

  async function handleCopy() {
    await navigator.clipboard.writeText(inviteLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  const admins = profiles.filter(p => p.role === "admin");
  const helpers = profiles.filter(p => p.role === "helper");
  const schoolA = children.filter(c => c.school === "A");
  const schoolB = children.filter(c => c.school === "B");

  return (
    <div className="px-4 pt-4 pb-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold text-slate-800">People</h1>
        <button
          onClick={handleGenerateInvite}
          disabled={generating}
          className="flex items-center gap-1.5 bg-brand-600 hover:bg-brand-700 text-white text-sm font-semibold px-3 py-2 rounded-xl transition disabled:opacity-60"
        >
          <Plus className="w-4 h-4" />
          {generating ? "Generating…" : "Invite"}
        </button>
      </div>

      {/* Invite link */}
      <AnimatePresence>
        {inviteLink && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="bg-brand-50 border border-brand-200 rounded-2xl p-4 mb-5"
          >
            <p className="text-xs font-medium text-brand-600 mb-2">Single-use invite link — expires in 7 days</p>
            <div className="flex items-center gap-2 bg-white rounded-xl border border-brand-200 px-3 py-2.5">
              <span className="text-xs text-slate-600 flex-1 truncate">{inviteLink}</span>
              <button onClick={handleCopy} className="text-brand-600 hover:text-brand-700 transition shrink-0">
                {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Drivers */}
      <Section title="Admins">
        {admins.map(p => <PersonCard key={p.id} profile={p} />)}
      </Section>
      <Section title="Helpers">
        {helpers.length === 0 ? (
          <p className="text-sm text-slate-400 py-2">No helpers yet — invite someone above.</p>
        ) : (
          helpers.map(p => <PersonCard key={p.id} profile={p} />)
        )}
      </Section>

      {/* Kids */}
      <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-3">Kids</p>
      <div className="space-y-3">
        {[{ school: "A" as const, kids: schoolA }, { school: "B" as const, kids: schoolB }].map(({ school, kids }) => {
          const s = SCHOOL_LABEL[school];
          return (
            <div key={school} className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
              <div className={cn("flex items-center gap-2 px-4 py-2",
                school === "A" ? "bg-violet-50" : "bg-emerald-50"
              )}>
                <div className={cn("w-2 h-2 rounded-full", s.dot)} />
                <span className={cn("text-xs font-extrabold uppercase tracking-widest", s.text)}>{s.name}</span>
              </div>
              <div className="divide-y divide-slate-100">
                {kids.map(child => (
                  <KidCard key={child.id} child={child} school={school} />
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-5">
      <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">{title}</p>
      <div className="space-y-2">{children}</div>
    </div>
  );
}

function PersonCard({ profile }: { profile: Profile }) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 px-4 py-3 flex items-center gap-3">
      <div className="w-10 h-10 rounded-full overflow-hidden bg-brand-100 flex items-center justify-center shrink-0">
        {profile.avatar_url ? (
          <img src={profile.avatar_url} alt={profile.full_name} className="w-full h-full object-cover" />
        ) : (
          <span className="text-sm font-semibold text-brand-700">
            {profile.full_name.charAt(0).toUpperCase()}
          </span>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-slate-800 truncate">{profile.full_name}</p>
        {profile.phone && (
          <p className="text-xs text-slate-400 truncate">{profile.phone}</p>
        )}
      </div>
    </div>
  );
}

function KidCard({ child, school }: { child: Child; school: "A" | "B" }) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [avatarSrc, setAvatarSrc] = useState(child.avatar_url ?? null);
  const supabase = createClient();

  const avatarBg = school === "A" ? "bg-violet-500" : "bg-emerald-500";
  const cameraBg = school === "A" ? "bg-violet-600" : "bg-emerald-600";

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const ext = file.name.split(".").pop();
      const path = `children/${child.id}/avatar.${ext}`;
      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(path, file, { upsert: true });
      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage.from("avatars").getPublicUrl(path);
      const urlWithBust = `${publicUrl}?t=${Date.now()}`;
      await updateChildAvatarUrl(child.id, urlWithBust);
      setAvatarSrc(urlWithBust);
    } catch (err: any) {
      alert(err.message ?? "Upload failed");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="flex items-center gap-3 px-4 py-3">
      <div className="relative shrink-0">
        <button
          onClick={() => fileRef.current?.click()}
          disabled={uploading}
          className="w-10 h-10 rounded-full overflow-hidden focus:outline-none"
        >
          {avatarSrc ? (
            <img src={avatarSrc} alt={child.full_name} className="w-full h-full object-cover" />
          ) : (
            <div className={cn("w-full h-full flex items-center justify-center text-sm font-extrabold text-white", avatarBg)}>
              {child.full_name.charAt(0).toUpperCase()}
            </div>
          )}
        </button>
        <button
          onClick={() => fileRef.current?.click()}
          disabled={uploading}
          className={cn("absolute -bottom-0.5 -right-0.5 w-5 h-5 rounded-full flex items-center justify-center border-2 border-white", cameraBg)}
        >
          <Camera className="w-2.5 h-2.5 text-white" />
        </button>
        <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-slate-800">{child.full_name}</p>
        {uploading && <p className="text-xs text-slate-400">Uploading…</p>}
      </div>
    </div>
  );
}
