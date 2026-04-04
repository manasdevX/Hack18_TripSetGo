"use client";
import { useState } from "react";
import { useTripStore } from "../store/tripStore";
import { 
  MapPin as MapPinIcon, 
  Calendar as CalendarIcon, 
  Sparkles as SparklesIcon, 
  Users as UsersIcon,
  ChevronDown
} from "lucide-react";

export default function TripForm() {
  const { generateTrip, isLoading } = useTripStore();
  const [formData, setFormData] = useState({
    origin: "",
    destination: "",
    startDate: "",
    endDate: "",
    budget: "",
    travellers: 1,
    groupType: "solo",
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (formData.origin && formData.destination && formData.startDate && formData.endDate && formData.budget && formData.travellers && formData.groupType) {
      generateTrip(formData);
    }
  };

  return (
    <div className="card-pure w-full max-w-4xl mx-auto rounded-[32px] p-8 md:p-12 shadow-2xl relative overflow-hidden transition-all duration-500">
      {/* Decorative pulse for AI feeling */}
      <div className="absolute top-0 right-0 w-64 h-64 bg-accent-soft blur-[80px] rounded-full -translate-y-1/2 translate-x-1/2 -z-10" />
      
      <div className="mb-12 text-center">
        <h2 className="text-3xl md:text-4xl font-black text-main-pure tracking-tight">
          Configure Your Adventure
        </h2>
        <p className="text-muted-pure mt-3 text-lg font-bold opacity-80">
          Our specialized agents will tailor an itinerary based on your inputs.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Origin */}
          <FormGroup label="Departure From" icon={MapPinIcon}>
            <input
              type="text"
              placeholder="e.g. New York"
              className="input-pure w-full pl-12 pr-4 py-4 rounded-2xl font-bold"
              value={formData.origin}
              onChange={(e) => setFormData({ ...formData, origin: e.target.value })}
              required
            />
          </FormGroup>

          {/* Destination */}
          <FormGroup label="Going To" icon={MapPinIcon}>
            <input
              type="text"
              placeholder="e.g. Tokyo"
              className="input-pure w-full pl-12 pr-4 py-4 rounded-2xl font-bold"
              value={formData.destination}
              onChange={(e) => setFormData({ ...formData, destination: e.target.value })}
              required
            />
          </FormGroup>

          {/* Start Date */}
          <FormGroup label="Departure Date" icon={CalendarIcon}>
            <input
              type="date"
              className="input-pure w-full pl-12 pr-4 py-4 rounded-2xl font-bold"
              value={formData.startDate}
              onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
              required
            />
          </FormGroup>

          {/* Return Date */}
          <FormGroup label="Return Date" icon={CalendarIcon}>
            <input
              type="date"
              className="input-pure w-full pl-12 pr-4 py-4 rounded-2xl font-bold"
              value={formData.endDate}
              onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
              required
            />
          </FormGroup>

          {/* Budget */}
          <FormGroup label="Trip Budget (INR)" icon={() => <span className="absolute left-5 top-1/2 -translate-y-1/2 font-black text-lg text-muted-pure">₹</span>}>
            <input
              type="number"
              placeholder="Total Budget"
              min="0"
              className="input-pure w-full pl-12 pr-4 py-4 rounded-2xl font-bold"
              value={formData.budget}
              onChange={(e) => setFormData({ ...formData, budget: e.target.value })}
              required
            />
          </FormGroup>

          {/* People */}
          <FormGroup label="No. of Explorers" icon={UsersIcon}>
            <input
              type="number"
              placeholder="Participants"
              min="1"
              className="input-pure w-full pl-12 pr-4 py-4 rounded-2xl font-bold"
              value={formData.travellers}
              onChange={(e) => setFormData({ ...formData, travellers: parseInt(e.target.value) || 1 })}
              required
            />
          </FormGroup>

          {/* Vibe */}
          <div className="md:col-span-2">
            <FormGroup label="Trip Vibe" icon={SparklesIcon}>
              <div className="relative">
                <select
                  className="input-pure w-full pl-12 pr-12 py-4 rounded-2xl font-black appearance-none cursor-pointer"
                  value={formData.groupType}
                  onChange={(e) => setFormData({ ...formData, groupType: e.target.value })}
                  required
                >
                  <option value="solo">Solo Immersion</option>
                  <option value="couple">Romantic Duo</option>
                  <option value="family">Family Unit</option>
                  <option value="friends">Friends Outing</option>
                </select>
                <ChevronDown className="absolute right-5 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-pure pointer-events-none" />
              </div>
            </FormGroup>
          </div>
        </div>

        <button
          type="submit"
          disabled={isLoading}
          className="bg-indigo-600 hover:bg-indigo-700 text-white px-10 py-5 rounded-[24px] font-black text-xl flex items-center justify-center gap-3 transition-all hover:scale-105 active:scale-95 disabled:opacity-50 disabled:grayscale shadow-2xl shadow-indigo-500/20 w-full mt-4"
        >
          {isLoading ? (
            <div className="w-6 h-6 border-4 border-white/20 border-t-white rounded-full animate-spin" />
          ) : (
            <>
              <SparklesIcon className="w-6 h-6" />
              Calibrate & Ingest Itinerary
            </>
          )}
        </button>
      </form>
    </div>
  );
}

function FormGroup({ label, icon: Icon, children }) {
  return (
    <div className="flex flex-col gap-3 group">
      <label className="text-xs font-black uppercase tracking-[0.15em] text-muted-pure ml-1 group-focus-within:text-accent-primary transition-colors">
        {label}
      </label>
      <div className="relative">
        {typeof Icon === 'function' ? <Icon /> : <Icon className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-pure group-focus-within:text-accent-primary transition-colors" />}
        {children}
      </div>
    </div>
  );
}
