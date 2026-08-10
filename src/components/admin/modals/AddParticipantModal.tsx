import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Search, UserPlus } from "lucide-react";
import { EventItem, UserItem } from "@/lib/services/mockData";
import { registrationService } from "@/services/registrationService";
import { cn } from "@/lib/utils";

interface AddParticipantModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentEvent: EventItem | undefined;
  usersList: UserItem[];
  onSuccess: (message: string) => void;
  onError: (message: string) => void;
}

export function AddParticipantModal({ isOpen, onClose, currentEvent, usersList, onSuccess, onError }: AddParticipantModalProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedUser, setSelectedUser] = useState<UserItem | null>(null);
  
  // Manual Entry State
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [department, setDepartment] = useState("");
  const [year, setYear] = useState("");
  
  const [overrideCapacity, setOverrideCapacity] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // If a user is selected from global search, auto-fill
  const handleSelectUser = (user: UserItem) => {
    setSelectedUser(user);
    setName(user.name);
    setEmail(user.email);
    setDepartment(user.department || "");
    setYear(user.year || "");
    setSearchQuery("");
  };

  const clearSelection = () => {
    setSelectedUser(null);
    setName("");
    setEmail("");
    setDepartment("");
    setYear("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentEvent) return;

    setIsSubmitting(true);
    try {
      await registrationService.addRegistration({
        eventId: currentEvent.id,
        eventName: currentEvent.title,
        userId: selectedUser?.id || null,
        name,
        studentName: name,
        email,
        department,
        year,
        source: "admin",
        overrideCapacity
      });
      onSuccess("Participant successfully added.");
      onClose();
      clearSelection();
    } catch (err: any) {
      if (err.message?.includes("Waitlist")) {
        // Just show error for now, backend will auto-waitlist or reject
        onError(err.message);
      } else {
        onError(err.message || "Failed to add participant.");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // Filter global users (limit to top 5 matches)
  const filteredSearch = searchQuery.length > 1 
    ? usersList.filter(u => 
        (u.name?.toLowerCase().includes(searchQuery.toLowerCase()) || 
         u.email?.toLowerCase().includes(searchQuery.toLowerCase()))
      ).slice(0, 5)
    : [];

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/50 backdrop-blur-sm">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="bg-white dark:bg-gray-900 rounded-2xl shadow-xl w-full max-w-lg overflow-hidden border border-gray-200 dark:border-gray-800"
          >
            <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-800">
              <h3 className="font-bold text-gray-900 dark:text-white flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-blue-500" />
                Add Participant Manually
              </h3>
              <button onClick={onClose} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg">
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            <div className="p-4 space-y-4">
              {!selectedUser && (
                <div className="relative">
                  <label className="block text-xs font-semibold text-gray-500 mb-1">Search Global Users</label>
                  <div className="relative">
                    <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Search by name or email..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 text-sm bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                    />
                  </div>
                  
                  {filteredSearch.length > 0 && (
                    <div className="absolute top-full mt-1 w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-lg overflow-hidden z-10">
                      {filteredSearch.map(u => (
                        <div 
                          key={u.id}
                          onClick={() => handleSelectUser(u)}
                          className="p-3 hover:bg-blue-50 dark:hover:bg-blue-900/20 cursor-pointer border-b border-gray-100 dark:border-gray-700/50 last:border-0"
                        >
                          <p className="text-sm font-bold text-gray-900 dark:text-white">{u.name}</p>
                          <p className="text-xs text-gray-500">{u.email} • {u.department || 'N/A'}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {selectedUser && (
                <div className="p-3 bg-emerald-50 dark:bg-emerald-900/10 border border-emerald-200 dark:border-emerald-900/30 rounded-xl flex items-center justify-between">
                  <div>
                    <p className="text-xs font-bold text-emerald-800 dark:text-emerald-400">Selected User: {selectedUser.name}</p>
                    <p className="text-[10px] text-emerald-600 dark:text-emerald-500">{selectedUser.email}</p>
                  </div>
                  <button onClick={clearSelection} className="text-xs font-semibold text-red-500 hover:underline">
                    Clear
                  </button>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 mb-1">Full Name</label>
                    <input required type="text" value={name} onChange={e => setName(e.target.value)} className="w-full p-2 text-sm bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 mb-1">Email</label>
                    <input required type="email" value={email} onChange={e => setEmail(e.target.value)} className="w-full p-2 text-sm bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 mb-1">Department</label>
                    <input type="text" value={department} onChange={e => setDepartment(e.target.value)} className="w-full p-2 text-sm bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 mb-1">Year</label>
                    <input type="text" value={year} onChange={e => setYear(e.target.value)} className="w-full p-2 text-sm bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none" />
                  </div>
                </div>

                {currentEvent && currentEvent.capacity > 0 && currentEvent.registeredCount >= currentEvent.capacity && (
                  <div className="p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800/50 rounded-xl mt-4">
                    <p className="text-xs font-bold text-amber-800 dark:text-amber-400 mb-2">⚠ Event Capacity Reached ({currentEvent.registeredCount}/{currentEvent.capacity})</p>
                    <label className="flex items-center gap-2 text-xs text-amber-900 dark:text-amber-300">
                      <input type="checkbox" checked={overrideCapacity} onChange={e => setOverrideCapacity(e.target.checked)} className="rounded text-blue-600 focus:ring-blue-500" />
                      Override capacity limit and register anyway (Admin only)
                    </label>
                    {!overrideCapacity && (
                      <p className="text-[10px] text-amber-600 dark:text-amber-500 mt-1">If not checked, participant will be waitlisted.</p>
                    )}
                  </div>
                )}

                <div className="pt-4 border-t border-gray-200 dark:border-gray-800 flex justify-end gap-3">
                  <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-semibold text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl">
                    Cancel
                  </button>
                  <button disabled={isSubmitting} type="submit" className="px-4 py-2 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl flex items-center gap-2 disabled:opacity-50">
                    {isSubmitting ? "Adding..." : "Add Participant"}
                  </button>
                </div>
              </form>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
