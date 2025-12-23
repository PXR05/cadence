import { createNestedLocalStorageState } from "./localStorage.svelte";

interface PersistedAppearanceState {
  disableBlur: boolean;
  disableAnimations: boolean;
}

class AppearanceState {
  private persistedState = createNestedLocalStorageState<PersistedAppearanceState>(
    "cadence.appearance_state",
    {
      disableBlur: false,
      disableAnimations: false,
    }
  );

  get disableBlur() {
    return this.persistedState.disableBlur;
  }
  set disableBlur(value: boolean) {
    this.persistedState.disableBlur = value;
  }

  get disableAnimations() {
    return this.persistedState.disableAnimations;
  }
  set disableAnimations(value: boolean) {
    this.persistedState.disableAnimations = value;
  }

  toggleBlur() {
    this.disableBlur = !this.disableBlur;
  }

  toggleAnimations() {
    this.disableAnimations = !this.disableAnimations;
  }
}

export const appearanceStore = new AppearanceState();
