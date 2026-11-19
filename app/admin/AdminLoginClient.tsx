"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function AdminLoginClient() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Invalid credentials.");
        setLoading(false);
        return;
      }
      router.refresh();
    } catch {
      setError("Network error while signing in.");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#ffffff] dark:bg-[#0e0e0e] text-[#111111] dark:text-[#e0e0e0] flex items-center justify-center p-4">
      <div className="max-w-md w-full border-2 border-[#333] dark:border-[#666] bg-[#f6f6f4] dark:bg-[#141414]">
        <div className="bg-[#2b2b2b] text-white px-4 py-2.5 font-sans font-bold text-xs tracking-wider uppercase flex justify-between items-center">
          <span>FOSS Club KIET // Visual CMS Login</span>
          <Link href="/" className="text-[#ccc] hover:text-white underline">
            ← Back to Gazette
          </Link>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4 font-sans text-xs">
          <div>
            <h1 className="text-2xl font-serif font-bold text-[#000] dark:text-[#fff] mb-1">
              Editorial &amp; Admin Access
            </h1>
            <p className="font-serif italic text-[#555] dark:text-[#aaa]">
              Sign in with your club credentials to drag-and-drop announcements,
              toggle recruitment status, log weekly meetup gists, and update
              monthly research paper discussions.
            </p>
          </div>

          {error && (
            <div className="p-2.5 bg-[#ffebee] dark:bg-[#3b1212] border border-[#c62828] text-[#c62828] dark:text-[#ff8a80] font-bold">
              {error}
            </div>
          )}

          <div>
            <label className="block font-bold mb-1 uppercase tracking-wide text-[11px]">
              Admin Username
            </label>
            <input
              type="text"
              required
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="admin"
              className="w-full border border-[#888] bg-white dark:bg-[#0e0e0e] px-3 py-2 text-sm focus:outline-none focus:border-[#000] dark:focus:border-[#fff]"
            />
          </div>

          <div>
            <label className="block font-bold mb-1 uppercase tracking-wide text-[11px]">
              Admin Password
            </label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full border border-[#888] bg-white dark:bg-[#0e0e0e] px-3 py-2 text-sm focus:outline-none focus:border-[#000] dark:focus:border-[#fff]"
            />
          </div>

          <div className="pt-2 flex items-center justify-between">
            <span className="text-[11px] text-[#666] dark:text-[#888]">
              Configured via <code>.env.local</code>
            </span>
            <button
              type="submit"
              disabled={loading}
              className="bg-[#222] dark:bg-[#b58900] text-white dark:text-black font-bold px-5 py-2 border border-black hover:opacity-90"
            >
              {loading ? "Signing In..." : "Enter Visual Editor →"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
