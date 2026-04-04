"use client";
import { useState } from "react";
import {
  User,
  Bell,
  Shield,
  Zap,
  Globe,
  Save,
  Check,
  UserCircle,
  Camera,
  Moon,
  Smartphone,
  Lock,
  Key,
  LogOut,
  Mail,
  MapPin,
  CreditCard,
  Briefcase
} from "lucide-react";
import { useAuthStore } from "../../../store/authStore";
import { useThemeStore } from "../../../store/themeStore";

export default function SettingsPage() {
  const { user } = useAuthStore();
  const { darkMode, toggleDarkMode } = useThemeStore();
  const [saved, setSaved] = useState(false);

  // Local state for UI toggles
  const [activeTab, setActiveTab] = useState("profile");
  const [notifications, setNotifications] = useState(true);
  const [pace, setPace] = useState("Moderate");

  const handleSave = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  const renderContent = () => {
    switch (activeTab) {
      case "profile":
        return (
          <div className="space-y-6 animate-fade-in">
            {/* Profile Avatar Section */}
            <div className="card-pure p-8 rounded-3xl">
              <h3 className="text-xl font-bold mb-6 flex items-center gap-2">
                <UserCircle className="w-5 h-5 text-indigo-500" /> Public Profile
              </h3>
              <div className="flex flex-col sm:flex-row items-center gap-8">
                <div className="relative group">
                  <div className="w-28 h-28 bg-secondary-pure rounded-full flex items-center justify-center border-4 border-pure shadow-md overflow-hidden transition-all">
                    {user?.picture ? (
                      <img src={user.picture} alt="Profile" className="w-full h-full object-cover" />
                    ) : (
                      <User className="w-12 h-12 text-muted-pure" />
                    )}
                  </div>
                  <button className="absolute bottom-1 right-1 p-2 bg-indigo-600 text-white rounded-full shadow-lg border-2 border-pure hover:bg-indigo-700 transition-colors">
                    <Camera className="w-4 h-4" />
                  </button>
                </div>
                <div className="flex-1 text-center sm:text-left">
                  <h4 className="text-lg font-bold mb-1 font-inter">Profile Picture</h4>
                  <p className="text-sm text-muted-pure mb-4">PNG, JPG or GIF. Max size of 5MB.</p>
                  <div className="flex gap-3 justify-center sm:justify-start">
                    <button className="px-4 py-2 bg-secondary-pure text-main-pure font-semibold rounded-lg hover:bg-indigo-50 dark:hover:bg-indigo-900/10 transition-colors text-sm">
                      Upload New
                    </button>
                    <button className="px-4 py-2 border border-pure text-red-600 font-semibold rounded-lg hover:bg-red-50 dark:hover:bg-red-900/10 transition-colors text-sm">
                      Remove
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Personal Information */}
            <div className="card-pure p-8 rounded-3xl">
              <h3 className="text-lg font-bold mb-6 font-inter">Personal Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-bold text-muted-pure mb-2 uppercase tracking-wide">Display Name</label>
                  <div className="relative">
                    <User className="absolute left-4 top-3.5 w-5 h-5 text-muted-pure" />
                    <input
                      type="text"
                      defaultValue={user?.full_name || "Traveler"}
                      className="input-pure w-full pl-12 pr-4 py-3 rounded-xl font-medium"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-bold text-muted-pure mb-2 uppercase tracking-wide">Email Address</label>
                  <div className="relative">
                    <Mail className="absolute left-4 top-3.5 w-5 h-5 text-muted-pure" />
                    <input
                      type="email"
                      defaultValue={user?.email || "agnihotri@gmail.com"}
                      className="input-pure w-full pl-12 pr-4 py-3 rounded-xl font-medium"
                    />
                  </div>
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-bold text-muted-pure mb-2 uppercase tracking-wide">Home City / Airport</label>
                  <div className="relative">
                    <Globe className="absolute left-4 top-3.5 w-5 h-5 text-muted-pure" />
                    <input
                      type="text"
                      defaultValue="Prayagraj, India"
                      placeholder="e.g. New York, JFK"
                      className="input-pure w-full pl-12 pr-4 py-3 rounded-xl font-medium"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        );
      case "preferences":
        return (
          <div className="space-y-6 animate-fade-in">
            {/* AI Settings */}
            <div className="card-pure rounded-3xl p-8 shadow-sm border border-pure relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3 group-hover:scale-110 transition-transform" />
              <h3 className="text-xl font-black text-main-pure mb-8 flex items-center gap-3 relative z-10 uppercase tracking-tighter">
                <Zap className="w-6 h-6 text-indigo-500" /> AI Behavior Settings
              </h3>
              
              <div className="relative z-10 space-y-8">
                <div>
                  <label className="block text-[10px] font-black text-muted-pure mb-4 uppercase tracking-[0.2em] opacity-80">
                    Default Travel Pace
                  </label>
                  <div className="grid grid-cols-3 gap-4">
                    {["Relaxed", "Moderate", "Fast"].map((p) => (
                      <button
                        key={p}
                        onClick={() => setPace(p)}
                        className={`py-3.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all border-2 ${
                          pace === p 
                            ? "bg-indigo-600 text-white border-indigo-600 shadow-xl shadow-indigo-500/20" 
                            : "bg-secondary-pure text-muted-pure border-pure hover:bg-pure hover:text-main-pure"
                        }`}
                      >
                        {p}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* App Preferences */}
            <div className="card-pure rounded-3xl p-8 shadow-sm">
              <h3 className="text-lg font-bold mb-6 font-inter">App Preferences</h3>
              <div className="space-y-6">
                <PreferenceToggle 
                  label="Push Notifications" 
                  desc="Live rerouting & trip alerts updates" 
                  icon={Bell} 
                  active={notifications} 
                  onToggle={() => setNotifications(!notifications)} 
                />
                <PreferenceToggle 
                  label="Dark Mode" 
                  desc="Auto-switch interface visual theme" 
                  icon={Moon} 
                  active={darkMode} 
                  onToggle={toggleDarkMode} 
                />
              </div>
            </div>
          </div>
        );
      case "security":
        return (
          <div className="space-y-6 animate-fade-in">
            <div className="card-pure rounded-3xl p-8 shadow-sm">
              <h3 className="text-xl font-bold mb-6 flex items-center gap-2">
                <Shield className="w-5 h-5 text-indigo-500" /> Security Settings
              </h3>
              
              <div className="mb-8">
                <h4 className="text-base font-bold mb-4 font-inter text-main-pure">Change Password</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="relative">
                    <Lock className="absolute left-4 top-3.5 w-5 h-5 text-muted-pure" />
                    <input
                      type="password"
                      placeholder="Current Password"
                      className="input-pure w-full pl-12 pr-4 py-3 rounded-xl"
                    />
                  </div>
                  <div className="relative">
                    <Key className="absolute left-4 top-3.5 w-5 h-5 text-muted-pure" />
                    <input
                      type="password"
                      placeholder="New Password"
                      className="input-pure w-full pl-12 pr-4 py-3 rounded-xl"
                    />
                  </div>
                </div>
                <div className="mt-4 flex justify-end">
                  <button className="px-6 py-2.5 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition-colors">
                    Update Password
                  </button>
                </div>
              </div>
            </div>
          </div>
        );
      case "integrations":
        return (
          <div className="space-y-6 animate-fade-in">
            <div className="card-pure rounded-3xl p-8 shadow-sm">
              <h3 className="text-xl font-bold mb-6 flex items-center gap-2">
                <Briefcase className="w-5 h-5 text-indigo-500" /> Connected Apps
              </h3>
              <p className="text-muted-pure mb-8 text-sm">
                Connect external accounts to sync your itineraries, bookings, and expenses seamlessly.
              </p>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-5 border border-pure rounded-2xl flex flex-col gap-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-white border border-pure shadow-sm rounded-xl flex items-center justify-center text-[#4285F4] font-black text-xl">
                      G
                    </div>
                    <div>
                      <h4 className="font-bold text-main-pure">Google Calendar</h4>
                      <p className="text-xs text-muted-pure">Auto-sync approved itineraries</p>
                    </div>
                  </div>
                  <button className="w-full py-2 bg-secondary-pure border border-pure rounded-xl text-main-pure font-bold hover:bg-indigo-50 dark:hover:bg-indigo-900/10 transition-colors text-sm">
                    Connect Account
                  </button>
                </div>
              </div>
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="max-w-6xl mx-auto animate-fade-in pb-20">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-10 gap-6">
        <div>
          <h1 className="text-4xl font-extrabold text-main-pure mb-2 tracking-tight lowercase">
            settings<span className="text-indigo-500">.</span>
          </h1>
          <p className="text-muted-pure text-lg font-medium">
            Manage your personal data, app preferences, and security.
          </p>
        </div>
        <button
          onClick={handleSave}
          className={`flex items-center gap-2 px-8 py-3.5 rounded-2xl font-bold transition-all shadow-lg active:scale-95 ${
            saved
              ? "bg-emerald-500 text-white shadow-emerald-500/25"
              : "bg-indigo-600 text-white hover:bg-indigo-700 shadow-indigo-600/25"
          }`}
        >
          {saved ? <Check className="w-5 h-5" /> : <Save className="w-5 h-5" />}
          {saved ? "Changes Saved!" : "Save Changes"}
        </button>
      </div>

      <div className="flex flex-col lg:flex-row gap-8">
        <div className="lg:w-72 shrink-0">
          <div className="card-pure rounded-3xl p-4 sticky top-6 shadow-sm">
            <nav className="flex flex-col space-y-2">
              <TabButton active={activeTab === "profile"} onClick={() => setActiveTab("profile")} icon={UserCircle} label="Public Profile" />
              <TabButton active={activeTab === "preferences"} onClick={() => setActiveTab("preferences")} icon={Zap} label="AI Preferences" />
              <TabButton active={activeTab === "security"} onClick={() => setActiveTab("security")} icon={Shield} label="Security" />
              <TabButton active={activeTab === "integrations"} onClick={() => setActiveTab("integrations")} icon={Briefcase} label="Integrations" />
            </nav>
          </div>
        </div>

        <div className="flex-1 min-w-0 pb-8">
          {renderContent()}
        </div>
      </div>
    </div>
  );
}

function TabButton({ active, onClick, icon: Icon, label }) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-3 px-4 py-3.5 rounded-2xl font-bold transition-all text-left ${active ? "bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-400" : "text-muted-pure hover:bg-indigo-50 dark:hover:bg-indigo-900/10 hover:text-indigo-600"}`}
    >
      <Icon className={`w-5 h-5 ${active ? "text-indigo-600" : "text-muted-pure"}`} /> 
      {label}
    </button>
  );
}

function PreferenceToggle({ label, desc, icon: Icon, active, onToggle }) {
  return (
    <div className="flex items-center justify-between p-4 bg-secondary-pure rounded-2xl border border-pure">
      <div className="flex items-center gap-4">
        <div className={`p-3 rounded-xl ${active ? "bg-indigo-600 text-white" : "bg-pure text-muted-pure"}`}>
          <Icon className="w-5 h-5" />
        </div>
        <div>
          <p className="font-bold text-main-pure">{label}</p>
          <p className="text-sm text-muted-pure">{desc}</p>
        </div>
      </div>
      <button
        onClick={onToggle}
        className={`w-14 h-7 rounded-full relative transition-colors ${active ? "bg-indigo-600" : "bg-slate-300 dark:bg-slate-700"}`}
      >
        <div className={`absolute top-1 w-5 h-5 bg-white rounded-full transition-all shadow-sm ${active ? "right-1" : "left-1"}`} />
      </button>
    </div>
  );
}
