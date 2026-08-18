# Backend integration

All backend URLs, authentication rules, capabilities, and endpoint templates
live in this directory. Application components and stores must call a service
from `services/`; they must not construct endpoint URLs or call `fetch`
directly.

## Adapting Cadence to a backend

Edit `config.ts` to set:

- `defaultBaseUrl`, normally supplied by `PUBLIC_API_URL`;
- the authentication mode and bearer header;
- endpoint route builders;
- the capabilities implemented by the backend;
- enabled YouTube and Tidal search/import providers.

Capabilities are operation-level. For example, playlists can be readable while
creation or item mutation is disabled, and remote search can remain enabled
while remote imports are disabled. Disabled operations are removed from the UI
and are also rejected at the service boundary.

The services currently parse the AudioStream response contract with the
Valibot schemas in `src/lib/schemas`. If another backend returns different
shapes, adapt its responses inside the corresponding service so the rest of the
application continues to receive the existing `User`, `AudioFile`, `Playlist`,
and `RemoteSearchResult` domain types.

`PUBLIC_API_URL` is a Vite public build-time variable. Users can override the
active URL at runtime only when `backendUrlSelection` is enabled; that override
is stored in the browser.

## Boundary rules

- HTTP and authentication: `client.ts`
- Runtime/default URL: `runtime.svelte.ts`
- Endpoint paths and feature switches: `config.ts`
- JSON operations: `services/`
- Multipart progress and remote SSE transport: `services/uploads.ts`
- Stream, ticket, and image behavior: `services/media.ts`
- Backend switching and cache invalidation: `switchBackend.ts`

The service worker imports the same config for media path recognition. Its own
`fetch` calls are the only network calls intentionally outside this directory.
