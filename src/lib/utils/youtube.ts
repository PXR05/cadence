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
  result?: YoutubeDownloadResponse;
}

export async function downloadYoutubeWithProgress(
  url: string,
  onProgress: (event: YouTubeProgressEvent) => void,
): Promise<void> {
  const params = new URLSearchParams({ url });
  const eventSource = new EventSource(`${BASE_URL}/youtube?${params}`);

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

    eventSource.onerror = (error) => {
      eventSource.close();
      reject(new Error("Connection to server lost"));
    };
  });
}
