import { create } from "zustand";
import { io } from "socket.io-client";
import api from "../lib/api";
import { useAuthStore } from "./authStore";

const SOCKET_URL = process.env.NEXT_PUBLIC_API_URL?.replace("/api/v1", "") || "http://127.0.0.1:8000";

let socket = null;

export const useNotificationStore = create((set, get) => ({
  notifications: [],
  unreadCount: 0,
  isLoading: false,

  initSocket: () => {
    const token = localStorage.getItem("access_token");
    const user = useAuthStore.getState().user;
    
    if (!token || !user || socket) return;

    socket = io(SOCKET_URL, {
      transports: ["websocket", "polling"],
    });

    socket.on("connect", () => {
      console.log("Socket connected for notifications");
      socket.emit("join", { user_id: user.id || user.user_id });
    });

    socket.on("new_notification", (notif) => {
      set((state) => ({
        notifications: [notif, ...state.notifications],
        unreadCount: state.unreadCount + 1,
      }));
      
      // Optional: If you had a toast system like react-hot-toast, you'd trigger it here
      // toast.success(notif.message);
    });

    socket.on("disconnect", () => {
      console.log("Socket disconnected");
    });
  },

  disconnectSocket: () => {
    if (socket) {
      socket.disconnect();
      socket = null;
    }
  },

  fetchNotifications: async () => {
    set({ isLoading: true });
    try {
      const res = await api.get("/notifications");
      set({ 
        notifications: res.data.notifications, 
        unreadCount: res.data.unread_count,
        isLoading: false 
      });
    } catch (err) {
      console.error("Failed to fetch notifications", err);
      set({ isLoading: false });
    }
  },

  markAsRead: async (notificationId) => {
    try {
      await api.patch(`/notifications/${notificationId}/read`);
      set((state) => ({
        notifications: state.notifications.map((n) => 
          n.id === notificationId ? { ...n, is_read: true } : n
        ),
        unreadCount: Math.max(0, state.unreadCount - 1),
      }));
    } catch (err) {
      console.error("Failed to mark as read", err);
    }
  },

  markAllAsRead: async () => {
    try {
      await api.patch("/notifications/read/all");
      set((state) => ({
        notifications: state.notifications.map((n) => ({ ...n, is_read: true })),
        unreadCount: 0,
      }));
    } catch (err) {
      console.error("Failed to mark all as read", err);
    }
  }
}));
