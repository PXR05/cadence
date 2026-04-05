declare global {
  interface NativeBridgeApi {
    getNativeInfo: () => string;
    postMessage: (message: string) => void;
  }

  interface Window {
    NativeBridge?: NativeBridgeApi;
  }

  namespace App {
    // interface Error {}
    // interface Locals {}
    // interface PageData {}
    // interface PageState {}
    // interface Platform {}
  }
}

export {};
