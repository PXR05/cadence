import { BASE_URL } from "$lib/constants";
import type { YoutubeDownloadResponse } from "$lib/schemas";

export interface YouTubeProgressEvent {
  type: "progress" | "complete" | "error" | "info";
  message: string;
  data?: {
    percent?: number;
    speed?: string;
    eta?: string;
    downloaded?: string;
    totalSize?: string;
  };
  playlistTitle?: string;
  playlistTotal?: number;
  playlistCurrent?: number;
  videoTitle?: string;
  result?: YoutubeDownloadResponse;
}

export async function downloadYoutubeWithProgress(
  url: string,
  stream: string,
  onProgress: (event: YouTubeProgressEvent) => void,
): Promise<void> {
  const params = new URLSearchParams({ url, stream });
  const eventSource = new EventSource(`${BASE_URL}/upload/youtube?${params}`, {
    withCredentials: true,
  });

  return new Promise((resolve, reject) => {
    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data) as YouTubeProgressEvent;
        onProgress(data);

        if (data.type === "complete") {
          eventSource.close();
          resolve();
        } else if (data.type === "error") {
          eventSource.close();
          reject(new Error(data.message));
        }
      } catch (error) {
        console.error("Error parsing SSE data:", error);
      }
    };

    eventSource.onerror = (event) => {
      console.error("SSE connection error:", event);
      reject(
        new Error(
          "Connection to server lost" +
            (event ? `: ${JSON.stringify(event)}` : ""),
        ),
      );
    };
  });
}
