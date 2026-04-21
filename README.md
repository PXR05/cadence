# Cadence

Cadence is a SvelteKit web music player that works with [AudioStream](https://github.com/PXR05/audiostream) as its backend. It supports browsing and searching your library, managing playlists, and controlling playback with queue and listening history support. The web app is optimized for mobile devices, and includes offline playback support through local caching so you can continue listening when network access is limited.

## Deployment

If you only want to deploy and run the app, start with just the compose and env files.

1. Download deployment files:

   ```bash
   wget https://raw.githubusercontent.com/PXR05/cadence/main/compose.yaml
   wget https://raw.githubusercontent.com/PXR05/cadence/main/.env.example -O .env
   ```

2. Edit `.env` and set these values:
   - `PROTOCOL`
   - `DOMAIN`
   - `VITE_API_URL` (pointing to your [AudioStream](https://github.com/PXR05/audiostream) instance)

3. Start the stack:

   ```bash
   docker compose up -d
   ```

4. Open the app:
   - `http://localhost:6128` (default port mapping from `compose.yaml`)

This deploy path uses the prebuilt image from GHCR (`ghcr.io/pxr05/cadence:latest`).

## Run Locally From This Repository

If you cloned this repository and want to run it with Docker using local source.

1. Create env file:

   ```bash
   cp .env.example .env
   ```

2. Build and run locally:

   ```bash
   docker compose -f compose.local.yaml up -d --build
   ```

3. Open the app:
   - `http://localhost:6128`

## Develop Locally

If you want fast iteration while editing code.

1. Install dependencies:

   ```bash
   bun install
   ```

2. Create env file:

   ```bash
   cp .env.example .env
   ```

3. Start the dev server:

   ```bash
   bun run dev
   ```

4. Open the app:
   - `http://localhost:5173` (Vite default)

## Compose Files

- `compose.yaml`: production-style deployment using `ghcr.io/pxr05/cadence:latest`
- `compose.local.yaml`: builds image from local source and runs it with Docker Compose
