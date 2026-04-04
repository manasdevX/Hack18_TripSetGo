"use client";
import { Bookmark, CalendarCheck, Loader2, MapPin, CheckCircle2 } from "lucide-react";

/**
 * TripActionBar — Sticky bottom bar shown after a trip plan is generated.
 * Two primary actions:
 * 1. "Save to My Trips" (status: saved)
 * 2. "Confirm & Schedule" (opens modal → status: active)
 */
export default function TripActionBar({
  tripData,
  onSave,
  onConfirm,
  isSaving,
  isConfirming,
  isSaved,
  isScheduled,
}) {
  if (!tripData) return null;

  const destination =
    tripData.destination?.name || tripData.destination || "Your Trip";
  const durationDays =
    tripData.destination?.num_days || tripData.duration_days || 0;
  const travellers =
    tripData.destination?.num_travelers || tripData.travellers || 1;
  const budget = tripData.budget?.total_budget || tripData.budget || 0;

  return (
    <div
      className="fixed bottom-0 left-0 right-0 z-50 p-4 sm:p-6"
      style={{
        background:
          "linear-gradient(to top, var(--bg-primary) 65%, transparent)",
      }}
    >
      <div className="max-w-4xl mx-auto card-pure border border-pure rounded-[28px] sm:rounded-[32px] p-4 sm:p-6 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-2xl">
        {/* Trip summary pill */}
        <div className="flex items-center gap-3 sm:gap-4">
          <div
            className="w-10 h-10 sm:w-12 sm:h-12 rounded-2xl flex items-center justify-center flex-shrink-0"
            style={{ background: "var(--accent-soft)" }}
          >
            <MapPin
              className="w-5 h-5 sm:w-6 sm:h-6"
              style={{ color: "var(--accent-primary)" }}
            />
          </div>
          <div>
            <p className="font-black text-main-pure text-sm sm:text-base leading-tight">
              {destination}
            </p>
            <p className="text-xs text-muted-pure font-bold mt-0.5">
              {durationDays > 0 && `${durationDays} days · `}
              {travellers} traveller{travellers !== 1 ? "s" : ""}
              {budget > 0 && ` · ₹${Number(budget).toLocaleString("en-IN")}`}
            </p>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex gap-2 sm:gap-3 w-full sm:w-auto">
          {/* Save to My Trips */}
          {!isScheduled && (
            <button
              onClick={onSave}
              disabled={isSaving || isSaved}
              className="flex-1 sm:flex-none px-4 sm:px-6 py-3 card-pure border border-pure rounded-2xl font-black text-main-pure transition-all text-sm flex items-center justify-center gap-2 hover:border-[var(--accent-primary)] disabled:opacity-60"
              style={{ cursor: isSaving || isSaved ? "not-allowed" : "pointer" }}
            >
              {isSaving ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : isSaved ? (
                <CheckCircle2
                  className="w-4 h-4"
                  style={{ color: "#10b981" }}
                />
              ) : (
                <Bookmark className="w-4 h-4" />
              )}
              <span className="hidden sm:inline">
                {isSaving ? "Saving..." : isSaved ? "Saved ✓" : "Save to My Trips"}
              </span>
              <span className="sm:hidden">
                {isSaving ? "Saving..." : isSaved ? "Saved" : "Save"}
              </span>
            </button>
          )}

          {/* Confirm & Schedule */}
          {!isScheduled ? (
            <button
              onClick={onConfirm}
              disabled={isConfirming}
              className="flex-1 sm:flex-none px-5 sm:px-8 py-3 text-white rounded-2xl font-black transition-all text-sm flex items-center justify-center gap-2 shadow-xl active:scale-95 disabled:opacity-60"
              style={{
                background: "var(--accent-primary)",
                cursor: isConfirming ? "not-allowed" : "pointer",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "var(--accent-hover)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "var(--accent-primary)";
              }}
            >
              {isConfirming ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <CalendarCheck className="w-4 h-4" />
              )}
              <span>
                {isConfirming ? "Scheduling..." : "Confirm & Schedule →"}
              </span>
            </button>
          ) : (
            <div
              className="flex-1 sm:flex-none px-5 sm:px-8 py-3 rounded-2xl font-black text-sm flex items-center justify-center gap-2"
              style={{ background: "rgba(16,185,129,0.15)", color: "#10b981" }}
            >
              <CheckCircle2 className="w-4 h-4" />
              Trip Scheduled ✓
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
