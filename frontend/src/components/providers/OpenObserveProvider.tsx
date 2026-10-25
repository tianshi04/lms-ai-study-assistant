"use client";

import React, { useEffect } from "react";
import { openobserveRum } from "@openobserve/browser-rum";
import { openobserveLogs } from "@openobserve/browser-logs";
import { useAuth } from "@/components/providers/AuthProvider";

export interface OpenObserveConfig {
  clientToken: string;
  applicationId: string;
  site: string;
  organizationIdentifier: string;
  service: string;
  env: string;
  version: string;
}

let isOpenObserveInitialized = false;

export function OpenObserveProvider({
  config,
  children,
}: {
  config: OpenObserveConfig;
  children: React.ReactNode;
}) {
  const { isAuthenticated, userId, userName, userEmail, userRole } = useAuth();

  useEffect(() => {
    if (!config.clientToken || isOpenObserveInitialized || typeof window === "undefined") {
      return;
    }

    const resolvedSite =
      config.site ||
      (window.location.hostname === "localhost" ? "localhost:5080" : window.location.host);
    const insecureHTTP =
      window.location.protocol === "http:" || resolvedSite.startsWith("localhost:");

    openobserveRum.init({
      applicationId: config.applicationId || "lms-frontend",
      clientToken: config.clientToken,
      site: resolvedSite,
      organizationIdentifier: config.organizationIdentifier || "default",
      service: config.service || "lms-frontend",
      env: config.env || "production",
      version: config.version || "1.0.0",
      apiVersion: "v1",
      insecureHTTP,
      sessionSampleRate: 100,
      sessionReplaySampleRate: 100,
      trackResources: true,
      trackLongTasks: true,
      trackUserInteractions: true,
      defaultPrivacyLevel: "mask-user-input",
      silentMultipleInit: true,
      allowedTracingUrls: [
        {
          match: (url: string) => url.startsWith(window.location.origin),
          propagatorTypes: ["tracecontext"],
        },
      ],
    });

    openobserveLogs.init({
      clientToken: config.clientToken,
      site: resolvedSite,
      organizationIdentifier: config.organizationIdentifier || "default",
      service: config.service || "lms-frontend",
      env: config.env || "production",
      version: config.version || "1.0.0",
      apiVersion: "v1",
      insecureHTTP,
      forwardErrorsToLogs: true,
      forwardConsoleLogs: ["error", "warn"],
      silentMultipleInit: true,
    });

    openobserveRum.startSessionReplayRecording();
    isOpenObserveInitialized = true;
  }, [config]);

  useEffect(() => {
    if (!config.clientToken || !isOpenObserveInitialized) {
      return;
    }

    if (isAuthenticated && userId) {
      openobserveRum.setUser({
        id: userId,
        name: userName || undefined,
        email: userEmail || undefined,
        role: userRole || undefined,
      });
    } else {
      openobserveRum.clearUser();
    }
  }, [config.clientToken, isAuthenticated, userId, userName, userEmail, userRole]);

  return <>{children}</>;
}
