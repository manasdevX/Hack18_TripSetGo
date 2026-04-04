"use client";
import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useTripStore } from "../../../store/tripStore";
import { useAuthStore } from "../../../store/authStore";
import {
  MapPin, Navigation, AlertCircle, Coffee, Hospital,
  Bus, Train, Hotel, ArrowLeft, Activity, Wifi, Clock,
  ChevronUp, ChevronDown, RefreshCw, Loader2
} from "lucide-react";

const PANEL_TABS = [
  { id: "hotels",     label: "Hotels",    icon: Hotel,     color: "text-violet-400",  bg: "bg-violet-500/20" },
  { id: "food",       label: "Food",      icon: Coffee,    color: "text-amber-400",   bg: "bg-amber-500/20"  },
  { id: "stations",   label: "Stations",  icon: Train,     color: "text-sky-400",     bg: "bg-sky-500/20"    },
  { id: "buses",      label: "Buses",     icon: Bus,       color: "text-emerald-400", bg: "bg-emerald-500/20"},
  { id: "hospitals",  label: "Medical",   icon: Hospital,  color: "text-rose-400",    bg: "bg-rose-500/20"   },
];

export default function ActiveTripPage() {
  const router = useRouter();
  const { tripData, currentTripId, isActiveTrip, nearbyPlaces, setNearbyPlaces } = useTripStore();
  const { isAuthenticated, isHydrated } = useAuthStore();
  
  const [activeTab, setActiveTab] = useState("food");
  const [drawerOpen, setDrawerOpen] = useState(true);
  const [wsStatus, setWsStatus] = useState("connecting"); // connecting | live | error
  const [currentLocation, setCurrentLocation] = useState(null);
  const [allNearby, setAllNearby] = useState({
    hotels: [], restaurants: [], stations: [], hospitals: [], pharmacies: [], bus_stops: []
  });

  const mapRef = useRef(null);
  const googleMapRef = useRef(null);
  const socketRef = useRef(null);
  const userMarkerRef = useRef(null);

  // Auth guard
  useEffect(() => {
    if (isHydrated && (!isAuthenticated || !isActiveTrip)) {
      router.replace("/dashboard/trips");
    }
  }, [isHydrated, isAuthenticated, isActiveTrip, router]);

  // Init Google Maps
  useEffect(() => {
    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
    if (!apiKey || !mapRef.current) return;
    
    if (window.google && window.google.maps) {
      initMap();
      return;
    }

    const script = document.createElement("script");
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places,geometry`;
    script.async = true;
    script.defer = true;
    script.onload = initMap;
    document.head.appendChild(script);
  }, [mapRef.current]);

  const initMap = () => {
    if (!window.google || !mapRef.current) return;
    
    googleMapRef.current = new window.google.maps.Map(mapRef.current, {
      center: { lat: 20.5937, lng: 78.9629 },
      zoom: 14,
      mapTypeId: "roadmap",
      disableDefaultUI: false,
      zoomControl: true,
      streetViewControl: false,
      fullscreenControl: false,
      styles: [
        { featureType: "poi", elementType: "labels", stylers: [{ visibility: "off" }] },
        { featureType: "transit", elementType: "labels.icon", stylers: [{ visibility: "on" }] },
      ]
    });
  };

  // WebSocket for live tracking
  useEffect(() => {
    if (!isActiveTrip || !currentTripId) return;
    const token = localStorage.getItem("access_token");
    if (!token) return;

    const baseUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1";
    const wsUrl = `${baseUrl.replace("http", "ws")}/trips/${currentTripId}/ws?token=${token}`;
    
    const ws = new WebSocket(wsUrl);
    socketRef.current = ws;
    setWsStatus("connecting");

    ws.onopen = () => setWsStatus("live");
    ws.onclose = () => setWsStatus("error");
    ws.onerror = () => setWsStatus("error");
    
    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (!data.error) {
        setAllNearby({
          hotels: data.nearby_hotels || [],
          restaurants: data.nearby_restaurants || [],
          stations: data.nearby_stations || [],
          hospitals: data.nearby_hospitals || [],
          pharmacies: data.nearby_pharmacies || [],
          bus_stops: data.nearby_bus_stops || [],
        });
        setNearbyPlaces(data);
      }
    };

    return () => { if (ws.readyState === WebSocket.OPEN) ws.close(); };
  }, [isActiveTrip, currentTripId, setNearbyPlaces]);

  // Live GPS tracking  
  useEffect(() => {
    if (!navigator.geolocation || !isActiveTrip) return;

    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        const { latitude: lat, longitude: lng } = pos.coords;
        setCurrentLocation({ lat, lng });

        // Update map center and marker
        if (googleMapRef.current && window.google) {
          const pos = { lat, lng };
          googleMapRef.current.panTo(pos);
          
          if (userMarkerRef.current) {
            userMarkerRef.current.setPosition(pos);
          } else {
            userMarkerRef.current = new window.google.maps.Marker({
              position: pos,
              map: googleMapRef.current,
              icon: {
                path: window.google.maps.SymbolPath.CIRCLE,
                scale: 12,
                fillColor: "#4F46E5",
                fillOpacity: 1,
                strokeWeight: 3,
                strokeColor: "#FFFFFF",
              },
              title: "You are here",
              zIndex: 999
            });
          }
        }

        // Push over WS
        if (socketRef.current?.readyState === WebSocket.OPEN) {
          socketRef.current.send(JSON.stringify({ lat, lng }));
        }
      },
      (err) => console.error("GPS error:", err),
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 5000 }
    );

    return () => navigator.geolocation.clearWatch(watchId);
  }, [isActiveTrip]);

  const getTabData = () => {
    switch (activeTab) {
      case "hotels":    return allNearby.hotels;
      case "food":      return allNearby.restaurants;
      case "stations":  return allNearby.stations;
      case "buses":     return allNearby.bus_stops;
      case "hospitals": return [...allNearby.hospitals, ...allNearby.pharmacies];
      default:          return [];
    }
  };

  if (!isHydrated || !isActiveTrip) return (
    <div className="min-h-screen flex items-center justify-center bg-slate-900">
      <Loader2 className="w-10 h-10 text-indigo-400 animate-spin" />
    </div>
  );

  const tabData = getTabData();
  const currentDay = tripData?.itinerary?.[0];

  return (
    <div className="relative w-full h-screen overflow-hidden bg-slate-900">
      {/* Full Screen Map */}
      <div ref={mapRef} className="absolute inset-0 w-full h-full" />

      {/* === TOP HUD === */}
      <div className="absolute top-0 left-0 right-0 z-20 p-4 flex items-start justify-between">
        {/* Back Button */}
        <button
          onClick={() => router.push("/dashboard/planner")}
          className="flex items-center gap-2 px-4 py-2.5 bg-slate-900/80 backdrop-blur-md text-white font-bold text-sm rounded-2xl border border-white/10 hover:bg-slate-700/80 transition"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Plan
        </button>

        {/* Trip Info + Status */}
        <div className="flex flex-col items-center gap-2">
          <div className="px-5 py-2.5 bg-slate-900/80 backdrop-blur-md text-white rounded-2xl border border-white/10 text-center">
            <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Active Trip</p>
            <p className="font-black text-lg leading-none">
              {tripData?.source} → {tripData?.destination}
            </p>
          </div>
          <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-black border backdrop-blur-md
            ${wsStatus === "live" ? "bg-emerald-500/20 border-emerald-400/30 text-emerald-300" : 
              wsStatus === "connecting" ? "bg-amber-500/20 border-amber-400/30 text-amber-300 animate-pulse" :
              "bg-rose-500/20 border-rose-400/30 text-rose-300"}`}
          >
            <Wifi className="w-3 h-3" />
            {wsStatus === "live" ? "Live Tracking" : wsStatus === "connecting" ? "Connecting..." : "Offline Mode"}
          </div>
        </div>

        {/* Current Location Display */}
        <div className="px-4 py-2.5 bg-slate-900/80 backdrop-blur-md text-white rounded-2xl border border-white/10 text-right">
          <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">GPS</p>
          <p className="font-black text-sm">
            {currentLocation ? `${currentLocation.lat.toFixed(4)}, ${currentLocation.lng.toFixed(4)}` : "Acquiring..."}
          </p>
        </div>
      </div>

      {/* === TODAY'S PLAN STRIP === */}
      {currentDay && (
        <div className="absolute top-24 left-4 right-4 z-20">
          <div className="bg-slate-900/80 backdrop-blur-md border border-white/10 rounded-2xl px-5 py-4">
            <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest mb-2 flex items-center gap-1">
              <Activity className="w-3 h-3" /> Today — Day {currentDay.day}
            </p>
            <div className="flex items-center gap-3 overflow-x-auto pb-1 no-scrollbar">
              {currentDay.activities?.slice(0, 4).map((act, i) => (
                <div key={i} className="flex-shrink-0 flex items-center gap-2 px-3 py-1.5 bg-white/10 rounded-xl">
                  <Clock className="w-3 h-3 text-slate-400" />
                  <span className="text-xs font-bold text-white whitespace-nowrap">{act.time}: {typeof act === 'string' ? act : act.task}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* === BOTTOM DRAWER === */}
      <div className={`absolute bottom-0 left-0 right-0 z-30 transition-all duration-500 ease-in-out
        ${drawerOpen ? "translate-y-0" : "translate-y-[calc(100%-4rem)]"}`}
      >
        {/* Drawer Handle */}
        <button
          onClick={() => setDrawerOpen(!drawerOpen)}
          className="w-full flex items-center justify-center gap-2 py-3 bg-slate-900 border-t border-white/10"
        >
          <div className="w-8 h-1 bg-slate-600 rounded-full" />
          {drawerOpen ? <ChevronDown className="w-4 h-4 text-slate-500" /> : <ChevronUp className="w-4 h-4 text-slate-500" />}
        </button>

        {/* Tab Selector */}
        <div className="bg-slate-900 border-t border-white/5">
          <div className="flex items-center gap-0 overflow-x-auto no-scrollbar px-4 pt-2">
            {PANEL_TABS.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-1.5 px-4 py-2.5 text-xs font-black uppercase tracking-widest whitespace-nowrap transition-all rounded-t-xl
                  ${activeTab === tab.id ? `${tab.bg} ${tab.color} border-b-2 border-current` : "text-slate-500 hover:text-slate-300"}`}
              >
                <tab.icon className="w-4 h-4" />
                {tab.label}
                {(() => {
                  const count = getTabData().length;
                  return activeTab === tab.id && count > 0 ? (
                    <span className={`${tab.bg} ${tab.color} text-[10px] font-black px-1.5 py-0.5 rounded-full`}>{count}</span>
                  ) : null;
                })()}
              </button>
            ))}
          </div>

          {/* Content */}
          <div className="bg-slate-950 max-h-64 overflow-y-auto px-4 py-4">
            {tabData.length === 0 ? (
              <div className="text-center py-8">
                <Navigation className="w-8 h-8 text-slate-700 mx-auto mb-2" />
                <p className="text-slate-500 text-sm font-bold">
                  {wsStatus === "live" ? "No results near your current location" : "Waiting for live location..."}
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {tabData.slice(0, 8).map((place, i) => {
                  const tab = PANEL_TABS.find(t => t.id === activeTab);
                  return (
                    <div key={i} className="flex items-start gap-3 p-4 bg-slate-900 rounded-2xl border border-white/5 hover:border-white/10 transition">
                      <div className={`w-9 h-9 flex-shrink-0 ${tab?.bg} ${tab?.color} flex items-center justify-center rounded-xl`}>
                        {tab && <tab.icon className="w-4 h-4" />}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-black text-white truncate">{place.name}</p>
                        {place.address && <p className="text-[11px] text-slate-400 font-medium truncate mt-0.5">{place.address}</p>}
                        <div className="flex items-center gap-2 mt-1">
                          {place.rating && (
                            <span className="text-[10px] font-black text-amber-400">★ {place.rating}</span>
                          )}
                          {place.open_now !== undefined && (
                            <span className={`text-[10px] font-black ${place.open_now ? "text-emerald-400" : "text-rose-400"}`}>
                              {place.open_now ? "Open" : "Closed"}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
