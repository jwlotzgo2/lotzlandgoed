"use client";

import { useEffect, useState } from "react";
import { Plus, Search, Edit, UserX, UserCheck, Phone, Gauge, Loader2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import toast from "react-hot-toast";
import { Loading } from "@/components/ui/loading";

interface User {
  id: string;
  phone: string;
  name: string;
  role: "ADMIN" | "USER";
  isActive: boolean;
  mustChangePassword: boolean;
  meters: { id: string; meterNumber: string }[];
  _count: { payments: number };
}

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [formData, setFormData] = useState({
    phone: "",
    name: "",
    password: "",
    meterNumber: "",
    role: "USER" as "ADMIN" | "USER",
  });
  const [submitting, setSubmitting] = useState(false);

  const fetchUsers = async () => {
    try {
      const res = await fetch("/api/users");
      const data = await res.json();
      setUsers(data ?? []);
    } catch (error) {
      console.error("Error fetching users:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const filteredUsers = users.filter(
    (user) =>
      user?.name?.toLowerCase()?.includes(searchTerm?.toLowerCase() ?? "") ||
      user?.phone?.includes(searchTerm ?? "")
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      if (editingUser) {
        // Update user
        const res = await fetch(`/api/users/${editingUser.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: formData.name,
            phone: formData.phone,
            ...(formData.password ? { password: formData.password } : {}),
            role: formData.role,
          }),
        });

        if (!res.ok) {
          const data = await res.json();
          throw new Error(data?.error ?? "Failed to update user");
        }

        toast.success("User updated successfully");
      } else {
        // Create user
        const res = await fetch("/api/users", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(formData),
        });

        if (!res.ok) {
          const data = await res.json();
          throw new Error(data?.error ?? "Failed to create user");
        }

        toast.success("User created successfully");
      }

      setShowModal(false);
      setEditingUser(null);
      setFormData({ phone: "", name: "", password: "", meterNumber: "", role: "USER" });
      fetchUsers();
    } catch (error: any) {
      toast.error(error?.message ?? "An error occurred");
    } finally {
      setSubmitting(false);
    }
  };

  const toggleUserStatus = async (user: User) => {
    try {
      const res = await fetch(`/api/users/${user.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !user.isActive }),
      });

      if (!res.ok) throw new Error("Failed to update user");

      toast.success(`User ${user.isActive ? "disabled" : "enabled"} successfully`);
      fetchUsers();
    } catch (error) {
      toast.error("Failed to update user status");
    }
  };

  const openEditModal = (user: User) => {
    setEditingUser(user);
    setFormData({
      phone: user.phone,
      name: user.name,
      password: "",
      meterNumber: user.meters?.[0]?.meterNumber ?? "",
      role: user.role,
    });
    setShowModal(true);
  };

  const openCreateModal = () => {
    setEditingUser(null);
    setFormData({ phone: "", name: "", password: "", meterNumber: "", role: "USER" });
    setShowModal(true);
  };

  if (loading) {
    return <Loading text="Loading users..." />;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">User Management</h1>
          <p className="text-gray-500 mt-1">Create and manage user accounts</p>
        </div>
        <button onClick={openCreateModal} className="btn-primary flex items-center gap-2">
          <Plus className="w-5 h-5" />
          Add User
        </button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="input pl-11"
          placeholder="Search by name or phone..."
        />
      </div>

      {/* Mobile: card list (under md). One card per user, vertical hierarchy, touch-sized actions. */}
      <div className="md:hidden space-y-3">
        {filteredUsers.map((user) => (
          <div
            key={user.id}
            className="bg-white rounded-xl shadow-sm border border-gray-100 p-4"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <div className="font-semibold text-gray-900 truncate">{user.name}</div>
                <div className="mt-1 flex items-center gap-2 text-sm text-gray-600">
                  <Phone className="w-4 h-4 shrink-0" />
                  <span className="truncate">{user.phone}</span>
                </div>
              </div>
              <div className="flex flex-col items-end gap-1.5 shrink-0">
                <span
                  className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                    user.role === "ADMIN"
                      ? "bg-purple-100 text-purple-800"
                      : "bg-gray-100 text-gray-800"
                  }`}
                >
                  {user.role}
                </span>
                <span
                  className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                    user.isActive
                      ? "bg-green-100 text-green-800"
                      : "bg-red-100 text-red-800"
                  }`}
                >
                  {user.isActive ? "Active" : "Disabled"}
                </span>
              </div>
            </div>

            <div className="mt-3 flex items-start gap-2 text-sm text-gray-700">
              <Gauge className="w-4 h-4 mt-0.5 shrink-0 text-[#1e5631]" />
              {user.meters?.length > 0 ? (
                <span className="break-all">
                  {user.meters.map((m) => m.meterNumber).join(", ")}
                </span>
              ) : (
                <span className="text-gray-400">No meter assigned</span>
              )}
            </div>

            <div className="mt-4 grid grid-cols-2 gap-2">
              <button
                onClick={() => openEditModal(user)}
                className="flex items-center justify-center gap-2 min-h-[44px] px-4 rounded-lg border border-gray-200 text-gray-700 hover:bg-gray-50 active:bg-gray-100 transition-colors"
              >
                <Edit className="w-4 h-4" />
                <span className="text-sm font-medium">Edit</span>
              </button>
              <button
                onClick={() => toggleUserStatus(user)}
                className={`flex items-center justify-center gap-2 min-h-[44px] px-4 rounded-lg border transition-colors ${
                  user.isActive
                    ? "border-red-200 text-red-600 hover:bg-red-50 active:bg-red-100"
                    : "border-green-200 text-green-700 hover:bg-green-50 active:bg-green-100"
                }`}
              >
                {user.isActive ? (
                  <>
                    <UserX className="w-4 h-4" />
                    <span className="text-sm font-medium">Disable</span>
                  </>
                ) : (
                  <>
                    <UserCheck className="w-4 h-4" />
                    <span className="text-sm font-medium">Enable</span>
                  </>
                )}
              </button>
            </div>
          </div>
        ))}
        {filteredUsers.length === 0 && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-8 text-center text-gray-500">
            No users found
          </div>
        )}
      </div>

      {/* Desktop: table (md and up) */}
      <div className="hidden md:block table-container overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="table-header">
              <th className="px-6 py-3">User</th>
              <th className="px-6 py-3">Phone</th>
              <th className="px-6 py-3">Meters</th>
              <th className="px-6 py-3">Role</th>
              <th className="px-6 py-3">Status</th>
              <th className="px-6 py-3">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {filteredUsers.map((user) => (
              <tr key={user.id} className="hover:bg-gray-50">
                <td className="table-cell">
                  <div className="font-medium text-gray-900">{user.name}</div>
                </td>
                <td className="table-cell">
                  <div className="flex items-center gap-2 text-gray-600">
                    <Phone className="w-4 h-4" />
                    {user.phone}
                  </div>
                </td>
                <td className="table-cell">
                  {user.meters?.length > 0 ? (
                    <div className="flex items-center gap-2">
                      <Gauge className="w-4 h-4 text-[#1e5631]" />
                      {user.meters.map((m) => m.meterNumber).join(", ")}
                    </div>
                  ) : (
                    <span className="text-gray-400">None</span>
                  )}
                </td>
                <td className="table-cell">
                  <span
                    className={`px-2 py-1 rounded-full text-xs font-medium ${
                      user.role === "ADMIN"
                        ? "bg-purple-100 text-purple-800"
                        : "bg-gray-100 text-gray-800"
                    }`}
                  >
                    {user.role}
                  </span>
                </td>
                <td className="table-cell">
                  <span
                    className={`px-2 py-1 rounded-full text-xs font-medium ${
                      user.isActive
                        ? "bg-green-100 text-green-800"
                        : "bg-red-100 text-red-800"
                    }`}
                  >
                    {user.isActive ? "Active" : "Disabled"}
                  </span>
                </td>
                <td className="table-cell">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => openEditModal(user)}
                      className="p-2 text-gray-500 hover:text-[#1e5631] hover:bg-gray-100 rounded-lg transition-colors"
                      title="Edit user"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => toggleUserStatus(user)}
                      className={`p-2 rounded-lg transition-colors ${
                        user.isActive
                          ? "text-gray-500 hover:text-red-500 hover:bg-red-50"
                          : "text-gray-500 hover:text-green-500 hover:bg-green-50"
                      }`}
                      title={user.isActive ? "Disable user" : "Enable user"}
                    >
                      {user.isActive ? (
                        <UserX className="w-4 h-4" />
                      ) : (
                        <UserCheck className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filteredUsers.length === 0 && (
          <p className="text-center text-gray-500 py-8">No users found</p>
        )}
      </div>

      {/* Modal */}
      <AnimatePresence>
        {showModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/50"
              onClick={() => setShowModal(false)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative bg-white rounded-2xl shadow-xl p-6 w-full max-w-md"
            >
              <h2 className="text-xl font-bold text-gray-900 mb-4">
                {editingUser ? "Edit User" : "Create User"}
              </h2>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="label">Name</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="input"
                    required
                  />
                </div>
                <div>
                  <label className="label">Phone Number</label>
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="input"
                    placeholder="0712345678"
                    required
                  />
                </div>
                <div>
                  <label className="label">
                    {editingUser ? "New Password (leave blank to keep)" : "Password"}
                  </label>
                  <input
                    type="password"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    className="input"
                    {...(!editingUser ? { required: true } : {})}
                    minLength={6}
                  />
                </div>
                {!editingUser && (
                  <div>
                    <label className="label">Meter Number (Optional)</label>
                    <input
                      type="text"
                      value={formData.meterNumber}
                      onChange={(e) => setFormData({ ...formData, meterNumber: e.target.value })}
                      className="input"
                      placeholder="Enter meter number"
                    />
                  </div>
                )}
                <div>
                  <label className="label">Role</label>
                  <select
                    value={formData.role}
                    onChange={(e) =>
                      setFormData({ ...formData, role: e.target.value as "ADMIN" | "USER" })
                    }
                    className="input"
                  >
                    <option value="USER">User</option>
                    <option value="ADMIN">Admin</option>
                  </select>
                </div>
                <div className="flex gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowModal(false)}
                    className="flex-1 btn-secondary"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="flex-1 btn-primary flex items-center justify-center gap-2"
                  >
                    {submitting ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Saving...
                      </>
                    ) : editingUser ? (
                      "Update"
                    ) : (
                      "Create"
                    )}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
