import { useEffect } from "react";
import { getToken, onMessage } from "firebase/messaging";
import toast from "react-hot-toast";
import { messaging, VAPID_KEY } from "../lib/firebase";
import { saveFCMToken } from "../services/notificationService";

export default function useFCM(user) {
  useEffect(() => {
    if (!user) {
      console.log("User not logged in, skipping FCM setup");
      return;
    };



    const setupFCM = async () => {
    
      if (Notification.permission === "denied") {
        return;
      }

      if (Notification.permission === "default") {
        const permission = await Notification.requestPermission();

        if (permission !== "granted") {
          console.log("Setting up FCM", permission);

          return;
        }
      }



      try {

        const registration = await navigator.serviceWorker.ready;


        const token = await getToken(messaging, {
          vapidKey: VAPID_KEY,
          serviceWorkerRegistration: registration,
        });
      
        if (!token) return;

        if (token !== localStorage.getItem("fcm_token")) {
          await saveFCMToken({
            token,
            device: navigator.userAgent || "unknown",
          });
          localStorage.setItem("fcm_token", token);
        }
      } catch (err) {
        console.error("FCM setup error:", err);
      }
    };

    setupFCM();


    const unsubscribe = onMessage(messaging, (payload) => {
     

      const { title, body } = payload.notification || {};

      if (title) {
        toast.success(`${title}${body ? `: ${body}` : ""}`);

        // Optional: show browser notification even while tab is focused
        new Notification(title, {
          body,
          icon: "/logo.png",
        });
      }
    });

    return unsubscribe;
  }, [user]);
}
