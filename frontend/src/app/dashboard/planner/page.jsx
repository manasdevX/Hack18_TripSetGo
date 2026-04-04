"use client";
import TripForm from "../../../components/TripForm";
import Dashboard from "../../../components/Dashboard";

export default function PlannerPage() {
  return (
    <div className="max-w-7xl mx-auto animate-fade-in pb-20 px-4 sm:px-0">
      {/* Page Header - No Italics */}
      <div className="mb-12 py-10">
        <h1 className="text-5xl font-black text-main-pure mb-4 tracking-tighter uppercase leading-none">
            AI TRIP PLANNER
        </h1>
        <p className="text-muted-pure text-xl font-bold opacity-80 uppercase tracking-widest">
          Let our multi-agent system craft your perfect expedition matrix.
        </p>
      </div>

      <div className="space-y-16">
        <TripForm />
        <Dashboard />
      </div>
    </div>
  );
}
