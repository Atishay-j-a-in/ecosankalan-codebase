import { createContext, useContext, useEffect, useMemo, useState } from "react";

const NotificationContext = createContext(null);

const STORAGE_KEY = "ecosankalan_notifications";

export const NotificationProvider = ({ children }) => {
    const [notifications, setNotifications] = useState(() => {
        try {
            const stored = localStorage.getItem(STORAGE_KEY);
            return stored ? JSON.parse(stored) : [];
        } catch {
            return [];
        }
    });

    // Persist notifications
    useEffect(() => {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(notifications));
    }, [notifications]);

    /**
     * Add a notification to the top of the list
     */
    const addNotification = ({
        title,
        body,
        data = {},
    }) => {
        const notification = {
            id: crypto.randomUUID(),
            title,
            body,
            data,
            read: false,
            receivedAt: new Date().toISOString(),
        };

        setNotifications(prev => {

            const exists = prev.some(n =>

                n.title === notification.title &&

                n.body === notification.body &&

                Math.abs(

                    new Date(notification.receivedAt) - new Date(n.receivedAt)

                ) < 3000

            );

            if (exists) return prev;
            const updated = [notification, ...prev];

            return updated.slice(0, 10);
            
        });
    };

    /**
     * Mark one notification as read
     */
    const markAsRead = (id) => {
        setNotifications((prev) =>
            prev.map((n) =>
                n.id === id ? { ...n, read: true } : n
            )
        );
    };

    /**
     * Mark all notifications as read
     */
    const markAllAsRead = () => {
        setNotifications((prev) =>
            prev.map((n) => ({
                ...n,
                read: true,
            }))
        );
    };

    /**
     * Remove a single notification
     */
    const removeNotification = (id) => {
        setNotifications((prev) =>
            prev.filter((n) => n.id !== id)
        );
    };

    /**
     * Clear all notifications
     */
    const clearNotifications = () => {
        setNotifications([]);
    };

    const unreadCount = useMemo(
        () => notifications.filter((n) => !n.read).length,
        [notifications]
    );

    const value = {
        notifications,
        unreadCount,
        addNotification,
        markAsRead,
        markAllAsRead,
        removeNotification,
        clearNotifications,
    };

    return (
        <NotificationContext.Provider value={value}>
            {children}
        </NotificationContext.Provider>
    );
};

export const useNotifications = () => {
    const context = useContext(NotificationContext);

    if (!context) {
        throw new Error(
            "useNotifications must be used inside NotificationProvider"
        );
    }

    return context;
};