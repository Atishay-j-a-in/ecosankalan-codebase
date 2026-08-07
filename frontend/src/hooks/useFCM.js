import { useEffect } from "react";
import { getToken } from "firebase/messaging";
import { messaging, VAPID_KEY } from "../lib/firebase";
import { saveFCMToken } from "../services/notificationService";


//setup fcm token and save it to the backend
export default function useFCM(user) {

  useEffect(() => {

    if (!user) return;

    const setup = async () => {

      if (Notification.permission === "denied") {
        return;
      }

      if (Notification.permission === "default") {

        const permission =
          await Notification.requestPermission();

        if (permission !== "granted") return;
      }

      const registration =
        await navigator.serviceWorker.ready;

      const token = await getToken(messaging, {
        vapidKey: VAPID_KEY,
        serviceWorkerRegistration: registration,
      });

      if (!token) return;

      if (token !== localStorage.getItem("fcm_token")) {

        await saveFCMToken({
          token,
          device: navigator.userAgent,
        });

        localStorage.setItem("fcm_token", token);

      }

    };

    setup();

  }, [user]);

}