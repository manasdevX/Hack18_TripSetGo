"use client";
import { useState } from "react";
import {
  X,
  CalendarCheck,
  Loader2,
  MapPin,
  Calendar,
  Users,
  IndianRupee,
  Clock,
  Bell,
  CheckCircle2,
} from "lucide-react";

function StatItem({ label, value, accent }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-xs font-bold text-muted-pure uppercase tracking-wide">
        {label}
      </span>
      <span
        className={`text-sm font-black ${accent ? "" : "text-main-pure"}`}
        style={accent ? { color: "var(--accent-primary)" } : {}}
      >
        {value}
      </span>
    </div>
  );
}

function Toggle({ value, onChange }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!value)}
      className="relative w-12 h-6 rounded-full transition-all flex-shrink-0"
      style={{
        background: value ? "var(--accent-primary)" : "var(--bg-secondary)",
        border: "1px solid var(--border-main)",
      }}
    >
      <div
        className="absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-all duration-200"
        style={{ left: value ? "calc(100% - 22px)" : "2px" }}
      />
    </button>
  );
}

/**
 * ScheduleConfirmModal — Opens when user clicks "Confirm & Schedule"
 * Shows trip summary, schedule options, day-by-day preview, and final confirm button.
 */
export default function ScheduleConfirmModal({
  tripData,
  onConfirm,
  onClose,
  isLoading,
}) {
  const [reminderDaysBefore, setReminderDaysBefore] = useState(7);
  const [setAsActive, setSetAsActive] = useState(true);

  const destination =
    tripData?.destination?.name || tripData?.destination || "Your Trip";
  const durationDays =
    tripData?.destination?.num_days || tripData?.duration_days || 0;
  const startDate =
    tripData?.destination?.start_date || tripData?.start_date || "";
  const returnDate =
    tripData?.destination?.return_date ||
    tripData?.return_date ||
    tripData?.end_date ||
    "";
  const budget = tripData?.budget?.total_budget || tripData?.budget || 0;
  const travellers =
    tripData?.destination?.num_travelers || tripData?.travellers || 1;

  const itineraryDays = tripData?.itinerary?.days || [];

  const handleConfirm = () => {
    onConfirm({ set_active: setAsActive, reminder_days: reminderDaysBefore });
  };

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.7)", backdropFilter: "blur(8px)" }}
    >
      <div
        className="card-pure w-full max-w-2xl rounded-[40px] sm:rounded-[48px] p-6 sm:p-10 shadow-2xl overflow-y-auto max-h-[90vh]"
        style={{ animation: "zoom-in 0.2s ease" }}
      >
        {/* Header */}
        <div className="flex justify-between items-center mb-6 sm:mb-8">
          <div>
            <h2 className="text-2xl sm:text-3xl font-black text-main-pure tracking-tighter">
              Lock it in.
            </h2>
            <p className="text-muted-pure font-bold mt-1 text-sm">
              Confirm & we'll schedule everything.
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 sm:p-3 bg-secondary-pure rounded-full hover:rotate-90 transition-all"
          >
            <X className="w-4 h-4 sm:w-5 sm:h-5 text-main-pure" />
          </button>
        </div>

        {/* Trip Summary */}
        <div
          className="rounded-[24px] sm:rounded-[32px] p-4 sm:p-6 mb-6 sm:mb-8"
          style={{ background: "var(--accent-soft)" }}
        >
          <div className="flex items-center gap-3 mb-4">
            <div
              className="w-10 h-10 rounded-2xl flex items-center justify-center"
              style={{ background: "var(--accent-primary)" }}
            >
              <MapPin className="w-5 h-5 text-white" />
            </div>
            <div>
              <p
                className="font-black text-lg leading-tight"
                style={{ color: "var(--accent-primary)" }}
              >
                {destination}
              </p>
              <p className="text-xs text-muted-pure font-bold">
                Your upcoming adventure
              </p>
            </div>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4">
            <StatItem
              label="Duration"
              value={durationDays > 0 ? `${durationDays} days` : "—"}
            />
            <StatItem
              label="Travellers"
              value={`${travellers} person${travellers !== 1 ? "s" : ""}`}
            />
            <StatItem
              label="Budget"
              value={
                budget > 0
                  ? `₹${Number(budget).toLocaleString("en-IN")}`
                  : "—"
              }
              accent
            />
            {startDate && (
              <StatItem
                label="Departure"
                value={new Date(startDate).toLocaleDateString("en-IN", {
                  day: "numeric",
                  month: "short",
                  year: "numeric",
                })}
              />
            )}
            {returnDate && (
              <StatItem
                label="Return"
                value={new Date(returnDate).toLocaleDateString("en-IN", {
                  day: "numeric",
                  month: "short",
                  year: "numeric",
                })}
              />
            )}
            <StatItem label="Status" value="Will be Active ✓" accent />
          </div>
        </div>

        {/* Schedule Options */}
        <div className="space-y-3 mb-6 sm:mb-8">
          <h3
            className="text-xs font-black text-muted-pure uppercase tracking-[0.15em] mb-3"
          >
            Schedule Settings
          </h3>

          {/* Set as Active Trip */}
          <div className="flex items-center justify-between p-4 bg-secondary-pure rounded-2xl">
            <div>
              <p className="font-black text-main-pure text-sm">
                Set as Active Trip
              </p>
              <p className="text-xs text-muted-pure mt-0.5">
                Show in your dashboard Active Trip widget
              </p>
            </div>
            <Toggle value={setAsActive} onChange={setSetAsActive} />
          </div>

          {/* Reminder */}
          <div className="flex items-center justify-between p-4 bg-secondary-pure rounded-2xl gap-4">
            <div className="flex-1">
              <p className="font-black text-main-pure text-sm flex items-center gap-2">
                <Bell className="w-3.5 h-3.5 text-muted-pure" />
                Trip Reminder
              </p>
              <p className="text-xs text-muted-pure mt-0.5">
                Remind me before departure
              </p>
            </div>
            <select
              value={reminderDaysBefore}
              onChange={(e) => setReminderDaysBefore(Number(e.target.value))}
              className="input-pure text-sm font-bold px-3 py-2 rounded-xl text-main-pure"
            >
              <option value={1}>1 day before</option>
              <option value={3}>3 days before</option>
              <option value={7}>1 week before</option>
              <option value={14}>2 weeks before</option>
            </select>
          </div>
        </div>

        {/* Day-by-Day Schedule Preview */}
        {itineraryDays.length > 0 && (
          <div className="mb-6 sm:mb-8">
            <h3 className="text-xs font-black text-muted-pure uppercase tracking-[0.15em] mb-3">
              Your Schedule ({itineraryDays.length} days)
            </h3>
            <div className="space-y-2 max-h-44 overflow-y-auto pr-1">
              {itineraryDays.map((day, i) => {
                const dayNum = day.day || day.day_number || (i + 1);
                const dayTitle =
                  day.title ||
                  (day.activities && day.activities[0]?.place
                    ? day.activities[0].place.slice(0, 40)
                    : `Day ${dayNum}`);
                const actCount = day.activities?.filter(
                  (a) => !a.task?.includes("🍽")
                ).length || 0;

                return (
                  <div
                    key={i}
                    className="flex items-center gap-3 p-3 bg-secondary-pure rounded-xl"
                  >
                    <div
                      className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0"
                      style={{ background: "var(--accent-primary)" }}
                    >
                      <span className="text-white font-black text-xs">
                        {dayNum}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-black text-main-pure text-sm truncate">
                        {dayTitle}
                      </p>
                      {day.date && (
                        <p className="text-xs text-muted-pure">
                          {day.date}
                          {actCount > 0 && ` · ${actCount} activities`}
                        </p>
                      )}
                    </div>
                    <CheckCircle2 className="w-4 h-4 text-muted-pure flex-shrink-0" />
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Confirm Button */}
        <button
          onClick={handleConfirm}
          disabled={isLoading}
          className="w-full py-4 sm:py-5 text-white rounded-2xl font-black text-base sm:text-lg transition-all active:scale-95 flex items-center justify-center gap-3 shadow-xl disabled:opacity-60"
          style={{
            background: "var(--accent-primary)",
            cursor: isLoading ? "not-allowed" : "pointer",
          }}
          onMouseEnter={(e) => {
            if (!isLoading)
              e.currentTarget.style.background = "var(--accent-hover)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = "var(--accent-primary)";
          }}
        >
          {isLoading ? (
            <Loader2 className="w-5 h-5 sm:w-6 sm:h-6 animate-spin" />
          ) : (
            <CalendarCheck className="w-5 h-5 sm:w-6 sm:h-6" />
          )}
          {isLoading ? "Scheduling your trip..." : "✈️ Confirm & Schedule Trip"}
        </button>

        <p className="text-center text-xs text-muted-pure mt-4 font-medium">
          Your trip will appear in My Trips as Active
        </p>
      </div>
    </div>
  );
}
