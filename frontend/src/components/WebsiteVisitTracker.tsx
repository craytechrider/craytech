import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import api from "../lib/api";

const getOrCreateId = (storage: Storage, key: string): string => {
  let id = storage.getItem(key);

  if (!id) {
    id =
      typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random().toString(36).substring(2)}-${Math.random().toString(36).substring(2)}`;

    storage.setItem(key, id);
  }

  return id;
};

const WebsiteVisitTracker: React.FC = () => {
  const location = useLocation();

  useEffect(() => {
    const trackVisit = async () => {
      try {
        const visitorId = getOrCreateId(localStorage, "craytech_visitor_id");

        const sessionId = getOrCreateId(sessionStorage, "craytech_session_id");

        await api.post("/website-visits", {
          visitor_id: visitorId,
          session_id: sessionId,
          path: location.pathname + location.search,
          referrer: document.referrer || null,
        });
      } catch (error) {
        console.error("Website visit tracking failed:", error);
      }
    };

    trackVisit();
  }, [location.pathname, location.search]);

  return null;
};

export default WebsiteVisitTracker;
