declare global {
  namespace App {
    // interface Error {}
    // interface Locals {}
    // interface PageData {}
    // interface PageState {}
    // interface Platform {}
  }

  // Background Fetch API type declarations
  interface BackgroundFetchManager {
    fetch(
      id: string,
      requests: string[] | Request[],
      options?: BackgroundFetchOptions
    ): Promise<BackgroundFetchRegistration>;
    get(id: string): Promise<BackgroundFetchRegistration | undefined>;
    getIds(): Promise<string[]>;
  }

  interface BackgroundFetchOptions {
    title?: string;
    icons?: Array<{ sizes: string; src: string; type: string }>;
    downloadTotal?: number;
  }

  interface BackgroundFetchRegistration extends EventTarget {
    id: string;
    uploadTotal: number;
    uploaded: number;
    downloadTotal: number;
    downloaded: number;
    result: "" | "success" | "failure";
    failureReason:
      | ""
      | "aborted"
      | "bad-status"
      | "fetch-error"
      | "quota-exceeded"
      | "download-total-exceeded";
    recordsAvailable: boolean;

    abort(): Promise<boolean>;
    match(
      request: Request | string,
      options?: CacheQueryOptions
    ): Promise<BackgroundFetchRecord | undefined>;
    matchAll(
      request?: Request | string,
      options?: CacheQueryOptions
    ): Promise<BackgroundFetchRecord[]>;
    updateUI(options?: {
      title?: string;
      icons?: Array<{ sizes: string; src: string; type: string }>;
    }): Promise<void>;

    onprogress: ((this: BackgroundFetchRegistration, ev: Event) => any) | null;
    addEventListener(type: "progress", listener: (ev: Event) => void): void;
    removeEventListener(type: "progress", listener: (ev: Event) => void): void;
  }

  interface BackgroundFetchRecord {
    request: Request;
    responseReady: Promise<Response>;
  }

  interface BackgroundFetchEvent extends ExtendableEvent {
    registration: BackgroundFetchRegistration;
  }

  interface BackgroundFetchUpdateUIEvent extends BackgroundFetchEvent {
    updateUI(options?: {
      title?: string;
      icons?: Array<{ sizes: string; src: string; type: string }>;
    }): Promise<void>;
  }

  interface ServiceWorkerRegistration {
    readonly backgroundFetch: BackgroundFetchManager;
  }

  interface ServiceWorkerGlobalScopeEventMap {
    backgroundfetchsuccess: BackgroundFetchUpdateUIEvent;
    backgroundfetchfail: BackgroundFetchUpdateUIEvent;
    backgroundfetchabort: BackgroundFetchEvent;
    backgroundfetchclick: BackgroundFetchEvent;
  }
}

export {};
