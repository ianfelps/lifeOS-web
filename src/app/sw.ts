/// <reference lib="webworker" />

import { defaultCache } from "@serwist/next/worker";
import { ExpirationPlugin, NetworkFirst, Serwist } from "serwist";

declare const self: ServiceWorkerGlobalScope & {
  __SW_MANIFEST: (string | { revision?: string; url: string })[];
};

const serwist = new Serwist({
  precacheEntries: self.__SW_MANIFEST,
  skipWaiting: true,
  clientsClaim: true,
  runtimeCaching: [
    ...defaultCache,
    {
      matcher: ({ request, url }) => request.method === "GET" && url.pathname.startsWith("/bff/"),
      handler: new NetworkFirst({
        cacheName: "lifeos-bff",
        plugins: [
          new ExpirationPlugin({
            maxEntries: 100,
            maxAgeSeconds: 60 * 60 * 24,
          }),
        ],
      }),
    },
  ],
});

serwist.addEventListeners();
