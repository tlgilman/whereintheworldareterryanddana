"use client";

import { useSession } from "next-auth/react";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { User } from "@/app/types/User";
import {
  Users as UsersIcon,
  UserPlus,
  Mail,
  RefreshCw,
  Key,
  ShieldCheck,
  ShieldAlert,
  ArrowLeft,
  CheckCircle,
  AlertCircle,
  Copy,
  Clock,
} from "lucide-react";

export default function AdminUsersPage() {
  const { data: session } = useSession();
  const router = useRouter();

  const [users, setUsers] = useState<User[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(true);

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    role: "user",
    autoGenerate: true,
  });

  const [status, setStatus] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [actionUserEmail, setActionUserEmail] = useState<string | null>(null);

  const [tempPasswordNotice, setTempPasswordNotice] = useState<{
    email: string;
    tempPassword: string;
    simulated: boolean;
  } | null>(null);

  const fetchUsers = async () => {
    try {
      setLoadingUsers(true);
      const res = await fetch("/api/users");
      if (res.ok) {
        const data = await res.json();
        setUsers(data);
      }
    } catch (e) {
      console.error("Error fetching users:", e);
    } finally {
      setLoadingUsers(false);
    }
  };

  useEffect(() => {
    if (session?.user?.role === "admin") {
      fetchUsers();
    }
  }, [session]);

  if (session?.user?.role !== "admin") {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white p-8 rounded-2xl shadow-md border text-center space-y-3">
          <ShieldAlert className="w-12 h-12 text-red-500 mx-auto" />
          <h2 className="text-xl font-bold text-gray-900">Access Denied</h2>
          <p className="text-sm text-gray-600">You must be logged in as an Admin to access this page.</p>
        </div>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus(null);
    setTempPasswordNotice(null);
    setIsSubmitting(true);

    try {
      const res = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formData.name,
          email: formData.email,
          role: formData.role,
          password: formData.autoGenerate ? "" : formData.password,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to create user");
      }

      setStatus({
        type: "success",
        message: `User ${formData.email} created successfully! Welcome email ${
          data.emailSimulated ? "generated (logged to console)" : "sent"
        }.`,
      });

      if (data.tempPassword) {
        setTempPasswordNotice({
          email: formData.email,
          tempPassword: data.tempPassword,
          simulated: data.emailSimulated,
        });
      }

      setFormData({ name: "", email: "", password: "", role: "user", autoGenerate: true });
      fetchUsers();
    } catch (error: unknown) {
      if (error instanceof Error) {
        setStatus({ type: "error", message: error.message });
      } else {
        setStatus({ type: "error", message: "An unknown error occurred" });
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResendEmail = async (email: string) => {
    try {
      setActionUserEmail(email);
      setStatus(null);
      setTempPasswordNotice(null);

      const res = await fetch("/api/users/resend", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to resend email");
      }

      setStatus({
        type: "success",
        message: `New temporary password generated & email ${
          data.emailSimulated ? "logged" : "sent"
        } to ${email}!`,
      });

      if (data.tempPassword) {
        setTempPasswordNotice({
          email: email,
          tempPassword: data.tempPassword,
          simulated: data.emailSimulated,
        });
      }

      fetchUsers();
    } catch (error: unknown) {
      if (error instanceof Error) {
        setStatus({ type: "error", message: error.message });
      }
    } finally {
      setActionUserEmail(null);
    }
  };

  const handleExpirePassword = async (email: string) => {
    try {
      setActionUserEmail(email);
      setStatus(null);

      const res = await fetch("/api/users/resend", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, action: "expire_only" }),
      });

      if (!res.ok) {
        throw new Error("Failed to expire password");
      }

      setStatus({ type: "success", message: `Password for ${email} marked as expired.` });
      fetchUsers();
    } catch (error: unknown) {
      if (error instanceof Error) {
        setStatus({ type: "error", message: error.message });
      }
    } finally {
      setActionUserEmail(null);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4 sm:p-8">
      <div className="max-w-6xl mx-auto space-y-8">
        
        {/* Top Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-extrabold text-gray-900 flex items-center gap-3">
              <UsersIcon className="w-8 h-8 text-blue-600" />
              <span>User & Credentials Management</span>
            </h1>
            <p className="text-sm text-gray-600 mt-1">
              Create accounts, send welcome emails with temporary passwords, and manage user access.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Link
              href="/"
              className="inline-flex items-center space-x-2 bg-slate-900 hover:bg-black text-white font-bold px-4 py-2 rounded-xl shadow-sm transition-all text-sm"
            >
              <span>🏠 Return to Main Site</span>
            </Link>

            <button
              onClick={() => router.push("/admin")}
              className="flex items-center space-x-2 text-sm font-semibold text-gray-700 hover:text-gray-900 bg-white px-4 py-2 rounded-xl border shadow-xs transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back to Admin</span>
            </button>
          </div>
        </div>

        {/* Global Status Banner */}
        {status && (
          <div
            className={`flex items-center space-x-3 p-4 rounded-xl text-sm font-medium ${
              status.type === "success"
                ? "bg-green-50 text-green-800 border border-green-200"
                : "bg-red-50 text-red-800 border border-red-200"
            }`}
          >
            {status.type === "success" ? (
              <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />
            ) : (
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
            )}
            <span>{status.message}</span>
          </div>
        )}

        {/* Temp Password Generated Card */}
        {tempPasswordNotice && (
          <div className="bg-gradient-to-r from-blue-900 to-indigo-900 text-white rounded-2xl p-6 shadow-xl border border-blue-700 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Key className="w-5 h-5 text-amber-400" />
                <h3 className="font-bold text-base">Temporary Password Generated</h3>
              </div>
              <button
                onClick={() => setTempPasswordNotice(null)}
                className="text-xs text-blue-200 hover:text-white underline"
              >
                Dismiss
              </button>
            </div>

            <p className="text-sm text-blue-100">
              Assigned to: <span className="font-semibold text-white">{tempPasswordNotice.email}</span>
            </p>

            <div className="flex items-center space-x-3 bg-black/30 p-3 rounded-xl border border-white/10 w-fit">
              <code className="text-lg font-mono font-bold text-amber-300">
                {tempPasswordNotice.tempPassword}
              </code>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(tempPasswordNotice.tempPassword);
                  alert("Temporary password copied to clipboard!");
                }}
                className="p-1.5 bg-white/10 hover:bg-white/20 rounded-lg transition-colors text-white"
                title="Copy to clipboard"
              >
                <Copy className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-blue-200">
              {tempPasswordNotice.simulated
                ? "💡 Note: SMTP credentials (SMTP_HOST, SMTP_USER, SMTP_PASS) were not passed to the server build. The email was logged to server output."
                : "✅ An automated welcome email containing this password has been sent to the user's inbox."}
            </p>
          </div>
        )}

        {/* Create User Card */}
        <div className="bg-white shadow-sm border border-gray-200 rounded-2xl p-6 space-y-6">
          <div className="flex items-center space-x-2 text-lg font-bold text-gray-900 border-b pb-4">
            <UserPlus className="w-5 h-5 text-blue-600" />
            <h2>Create New User Account</h2>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                  Full Name *
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g. Dana Gilman"
                  className="w-full px-3 py-2 border rounded-xl focus:ring-2 focus:ring-blue-500 text-sm text-gray-900"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                  Email Address *
                </label>
                <input
                  type="email"
                  required
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="dana@example.com"
                  className="w-full px-3 py-2 border rounded-xl focus:ring-2 focus:ring-blue-500 text-sm text-gray-900"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                  User Role
                </label>
                <select
                  value={formData.role}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                  className="w-full px-3 py-2 border rounded-xl focus:ring-2 focus:ring-blue-500 text-sm text-gray-900 bg-white"
                >
                  <option value="user">User (Standard Access)</option>
                  <option value="admin">Admin (Full Access & Management)</option>
                  <option value="guest">Guest (Read-only Access)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                  Password Mode
                </label>
                <div className="flex items-center space-x-4 pt-1">
                  <label className="flex items-center space-x-2 text-sm text-gray-700 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.autoGenerate}
                      onChange={(e) => setFormData({ ...formData, autoGenerate: e.target.checked })}
                      className="rounded text-blue-600 focus:ring-blue-500 w-4 h-4"
                    />
                    <span className="font-semibold">Auto-generate temporary password & email user</span>
                  </label>
                </div>
              </div>
            </div>

            {!formData.autoGenerate && (
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                  Custom Password
                </label>
                <input
                  type="password"
                  required={!formData.autoGenerate}
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  placeholder="Enter initial password"
                  className="w-full max-w-md px-3 py-2 border rounded-xl focus:ring-2 focus:ring-blue-500 text-sm text-gray-900"
                />
              </div>
            )}

            <div className="flex justify-end pt-2">
              <button
                type="submit"
                disabled={isSubmitting}
                className="flex items-center space-x-2 px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold shadow-md hover:shadow-lg transition-all disabled:opacity-50 text-sm"
              >
                <UserPlus className="w-4 h-4" />
                <span>{isSubmitting ? "Creating User..." : "Create User & Send Email"}</span>
              </button>
            </div>
          </form>
        </div>

        {/* Existing Users Directory */}
        <div className="bg-white shadow-sm border border-gray-200 rounded-2xl p-6 space-y-6">
          <div className="flex items-center justify-between border-b pb-4">
            <div className="flex items-center space-x-2 text-lg font-bold text-gray-900">
              <UsersIcon className="w-5 h-5 text-indigo-600" />
              <h2>Registered Users ({users.length})</h2>
            </div>

            <button
              onClick={fetchUsers}
              className="flex items-center space-x-1 text-xs text-blue-600 hover:text-blue-800 font-semibold"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loadingUsers ? "animate-spin" : ""}`} />
              <span>Refresh</span>
            </button>
          </div>

          {loadingUsers ? (
            <div className="py-12 text-center text-gray-500 text-sm">
              Loading users directory...
            </div>
          ) : users.length === 0 ? (
            <div className="py-12 text-center text-gray-500 text-sm">
              No users registered in Google Sheets yet.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b text-xs font-bold text-gray-500 uppercase tracking-wider bg-gray-50/50">
                    <th className="py-3 px-4">User</th>
                    <th className="py-3 px-4">Role</th>
                    <th className="py-3 px-4">Password Status</th>
                    <th className="py-3 px-4">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {users.map((u) => {
                    const isProcessing = actionUserEmail === u.email;
                    return (
                      <tr key={u.id || u.email} className="hover:bg-gray-50/80 transition-colors">
                        <td className="py-3.5 px-4">
                          <div className="font-bold text-gray-900">{u.name}</div>
                          <div className="text-xs text-gray-500 font-mono">{u.email}</div>
                        </td>

                        <td className="py-3.5 px-4">
                          <span
                            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wide ${
                              u.role === "admin"
                                ? "bg-purple-100 text-purple-800"
                                : u.role === "guest"
                                ? "bg-gray-100 text-gray-700"
                                : "bg-blue-100 text-blue-800"
                            }`}
                          >
                            {u.role}
                          </span>
                        </td>

                        <td className="py-3.5 px-4">
                          {u.mustChangePassword ? (
                            <span className="inline-flex items-center space-x-1 px-2.5 py-1 bg-amber-50 text-amber-700 border border-amber-200 rounded-lg text-xs font-semibold">
                              <Clock className="w-3.5 h-3.5 text-amber-500" />
                              <span>Temporary / Must Change</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center space-x-1 px-2.5 py-1 bg-green-50 text-green-700 border border-green-200 rounded-lg text-xs font-semibold">
                              <ShieldCheck className="w-3.5 h-3.5 text-green-600" />
                              <span>Active</span>
                            </span>
                          )}
                        </td>

                        <td className="py-3.5 px-4 space-x-2">
                          <button
                            onClick={() => handleResendEmail(u.email)}
                            disabled={isProcessing}
                            className="inline-flex items-center space-x-1.5 px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded-lg text-xs font-semibold transition-colors disabled:opacity-50"
                            title="Generate new temporary password and send email"
                          >
                            <Mail className="w-3.5 h-3.5" />
                            <span>Resend Email & Temp Password</span>
                          </button>

                          <button
                            onClick={() => handleExpirePassword(u.email)}
                            disabled={isProcessing || u.mustChangePassword}
                            className="inline-flex items-center space-x-1 px-2.5 py-1.5 bg-gray-50 hover:bg-amber-50 text-gray-700 hover:text-amber-800 border border-gray-200 rounded-lg text-xs font-medium transition-colors disabled:opacity-40"
                            title="Require password reset on next sign in"
                          >
                            <Key className="w-3.5 h-3.5 text-amber-600" />
                            <span>Expire Password</span>
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
