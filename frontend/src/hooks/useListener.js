import { useEffect } from "react";
import { onMessage } from "firebase/messaging";
import { useNotifications } from "../context/NotificationContext";
import { messaging } from "../lib/firebase";


// listen to foreground notifications and show toast and browser notification
export default function useListener(user) {
    const { addNotification } = useNotifications();
    useEffect(() => {
        if (!user) return;

        const unsubscribe = onMessage(messaging, (payload) => {
            console.log("Foreground notification:", payload);

            const { title, body } = payload.notification || {};

            if (title) {
                addNotification({
                    title,
                    body,
                    data: payload.data
                });

                if (Notification.permission === "granted") {
                    new Notification(title, {
                        body,
                        icon: "/logo.png",
                    });
                }
            }
        });

        return unsubscribe;
    }, [user]);
}