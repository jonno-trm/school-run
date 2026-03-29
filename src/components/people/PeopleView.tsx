"use client";

import { useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Camera, Copy, Check, X, Trash2 } from "lucide-react";
import { createDriver, deleteDriver } from "@/lib/actions/driver.actions";
import { updateChildAvatarUrl } from "@/lib/actions/profile.actions";
import { createClient } from "@/lib/supabase/client";
import type { Profile, Child } from "@/types/database";
import { cn } from "@/lib/utils";

const SCHOOL_LABEL: Record<string, { name: string; dot: string; text: string; headerBg: string }> = {
  A: { name: "Redeemer", dot: "bg-violet-500", text: "text-white", headerBg: "bg-gradient-to-r from-violet-500 to-violet-700" },
  B: { name: "Trinity",  dot: "bg-emerald-500", text: "text-white", headerBg: "bg-gradient-to-r from-emerald-500 to-emerald-700" },
};

interface Props {
  profiles: Profile[];
  children: Child[];
}

export default function PeopleView({ profiles, children }: Props) {
  const [addingDriver, setAddingDriver] = useState(false);
  const [credentials, setCredentials] = useState<{ name: string; email: string; password: string } | null>(null);
  const [copied, setCopied] = useState(false);

  const admins  = profiles.filter(p => p.role === "admin");
  const helpers = profiles.filter(p => p.role === "helper");
  const schoolA = children.filter(c => c.school === "A");
  const schoolB = children.filter(c => c.school === "B");

  async function handleCreate(data: { name: string; email: string; phone: string }) {
    const result = await createDriver(data);
    setAddingDriver(false);
    setCredentials({ name: data.name, email: data.email, password: result.password });
  }

  async function handleCopyCredentials() {
    if (!credentials) return;
    const appUrl = window.location.origin;
    const text = `School Runs login\nURL: ${appUrl}\nEmail: ${credentials.email}\nPassword: ${credentials.password}`;
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  }

  return (
    <div className="px-4 pt-4 pb-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold text-slate-800">People</h1>
        <button
          onClick={() => setAddingDriver(true)}
          className="flex items-center gap-1.5 bg-brand-600 hover:bg-brand-700 text-white text-sm font-semibold px-3 py-2 rounded-xl transition"
        >
          <Plus className="w-4 h-4" />
          Add driver
        </button>
      </div>

      {/* Credentials card shown once after creation */}
      <AnimatePresence>
        {credentials && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="bg-brand-50 border border-brand-200 rounded-2xl p-4 mb-5"
          >
            <div className="flex items-start justify-between mb-2">
              <p className="text-sm font-bold text-brand-700">Share with {credentials.name}</p>
              <button onClick={() => setCredentials(null)} className="text-brand-400 hover:text-brand-600">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="bg-white rounded-xl border border-brand-100 px-3 py-2.5 space-y-1 text-xs text-slate-600 font-mono mb-3">
              <p><span className="text-slate-400">Email: </span>{credentials.email}</p>
              <p><span className="text-slate-400">Password: </span><span className="font-bold text-slate-800">{credentials.password}</span></p>
            </div>
            <button
              onClick={handleCopyCredentials}
              className="w-full flex items-center justify-center gap-2 bg-brand-600 hover:bg-brand-700 text-white text-sm font-semibold py-2.5 rounded-xl transition"
            >
              {copied ? <><Check className="w-4 h-4" /> Copied!</> : <><Copy className="w-4 h-4" /> Copy login details</>}
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Drivers */}
      <Section title="Admins">
        {admins.map(p => <PersonCard key={p.id} profile={p} showDelete={false} />)}
      </Section>
      <Section title="Drivers">
        {helpers.length === 0 ? (
          <p className="text-sm text-slate-400 py-2">No drivers yet — add one above.</p>
        ) : (
          helpers.map(p => <PersonCard key={p.id} profile={p} showDelete onDelete={() => deleteDriver(p.id)} />)
        )}
      </Section>

      {/* Kids */}
      <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-3">Kids</p>
      <div className="space-y-3">
        {(["A", "B"] as const).map(school => {
          const kids = school === "A" ? schoolA : schoolB;
          const s = SCHOOL_LABEL[school];
          return (
            <div key={school} className="rounded-2xl overflow-hidden border border-slate-100">
              <div className={cn("px-4 py-2.5", s.headerBg)}>
                <span className={cn("text-xs font-black uppercase tracking-widest", s.text)}>{s.name}</span>
              </div>
              <div className="bg-white divide-y divide-slate-100">
                {kids.map(child => <KidCard key={child.id} child={child} school={school} />)}
              </div>
            </div>
          );
        })}
      </div>

      {/* Add Driver modal */}
      <AnimatePresence>
        {addingDriver && (
          <AddDriverModal onClose={() => setAddingDriver(false)} onCreate={handleCreate} />
        )}
      </AnimatePresence>
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

function PersonCard({ profile, showDelete, onDelete }: { profile: Profile; showDelete: boolean; onDelete?: () => void }) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 px-4 py-3 flex items-center gap-3">
      <div className="w-10 h-10 rounded-full overflow-hidden bg-brand-100 flex items-center justify-center shrink-0">
        {profile.avatar_url ? (
          <img src={profile.avatar_url} alt={profile.full_name} className="w-full h-full object-cover" />
        ) : (
          <span className="text-sm font-semibold text-brand-700">{profile.full_name.charAt(0).toUpperCase()}</span>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-slate-800 truncate">{profile.full_name}</p>
        {profile.phone && <p className="text-xs text-slate-400 truncate">{profile.phone}</p>}
      </div>
      {showDelete && onDelete && (
        <button
          onClick={onDelete}
          className="p-1.5 text-slate-300 hover:text-red-400 transition shrink-0"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      )}
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
      const { error: uploadError } = await supabase.storage.from("avatars").upload(path, file, { upsert: true });
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
        <button onClick={() => fileRef.current?.click()} disabled={uploading} className="w-10 h-10 rounded-full overflow-hidden focus:outline-none">
          {avatarSrc ? (
            <img src={avatarSrc} alt={child.full_name} className="w-full h-full object-cover" />
          ) : (
            <div className={cn("w-full h-full flex items-center justify-center text-sm font-extrabold text-white", avatarBg)}>
              {child.full_name.charAt(0).toUpperCase()}
            </div>
          )}
        </button>
        <button onClick={() => fileRef.current?.click()} disabled={uploading}
          className={cn("absolute -bottom-0.5 -right-0.5 w-5 h-5 rounded-full flex items-center justify-center border-2 border-white", cameraBg)}>
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

function AddDriverModal({ onClose, onCreate }: {
  onClose: () => void;
  onCreate: (data: { name: string; email: string; phone: string }) => Promise<void>;
}) {
  const [name, setName]   = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      await onCreate({ name, email, phone });
    } catch (err: any) {
      setError(err.message ?? "Something went wrong");
      setLoading(false);
    }
  }

  return (
    <>
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        onClick={onClose}
        className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[60]"
      />
      <motion.div
        initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
        transition={{ type: "spring", damping: 30, stiffness: 300 }}
        className="fixed bottom-0 left-0 right-0 z-[70] bg-white rounded-t-3xl max-w-lg mx-auto"
      >
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 bg-slate-200 rounded-full" />
        </div>
        <div className="px-5 pt-3 pb-8">
          <div className="flex items-center justify-between mb-5">
            <h3 className="text-base font-bold text-slate-800">Add driver</h3>
            <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full bg-slate-100">
              <X className="w-4 h-4 text-slate-500" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-3">
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1.5">Full name</label>
              <input
                type="text" value={name} onChange={e => setName(e.target.value)} required
                placeholder="Sarah Jones"
                className="w-full px-4 py-3 rounded-xl border border-slate-200 text-slate-800 text-base focus:outline-none focus:ring-2 focus:ring-brand-500 transition"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1.5">Email (for login)</label>
              <input
                type="email" value={email} onChange={e => setEmail(e.target.value)} required
                placeholder="sarah@example.com"
                className="w-full px-4 py-3 rounded-xl border border-slate-200 text-slate-800 text-base focus:outline-none focus:ring-2 focus:ring-brand-500 transition"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1.5">Phone <span className="font-normal text-slate-400">(optional)</span></label>
              <input
                type="tel" value={phone} onChange={e => setPhone(e.target.value)}
                placeholder="+61 400 000 000"
                className="w-full px-4 py-3 rounded-xl border border-slate-200 text-slate-800 text-base focus:outline-none focus:ring-2 focus:ring-brand-500 transition"
              />
            </div>

            {error && <p className="text-sm text-red-500 bg-red-50 rounded-xl px-3 py-2">{error}</p>}

            <button
              type="submit" disabled={loading}
              className="w-full mt-2 py-3.5 rounded-xl bg-brand-600 hover:bg-brand-700 text-white text-sm font-bold transition disabled:opacity-60"
            >
              {loading ? "Creating…" : "Create driver account"}
            </button>
            <p className="text-xs text-center text-slate-400">A login password will be generated — you can copy and share it.</p>
          </form>
        </div>
      </motion.div>
    </>
  );
}
