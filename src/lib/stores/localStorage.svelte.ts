export function createLocalStorageState<T>(key: string, initialValue: T, oldKey?: string) {
  const isBrowser =
    typeof window !== "undefined" && typeof localStorage !== "undefined";

  let storedValue = initialValue;
  if (isBrowser) {
    try {
      const item = localStorage.getItem(key);
      if (item !== null) {
        storedValue = JSON.parse(item);
      } else if (oldKey) {
        const oldItem = localStorage.getItem(oldKey);
        if (oldItem !== null) {
          storedValue = JSON.parse(oldItem);
          localStorage.setItem(key, JSON.stringify(storedValue));
          localStorage.removeItem(oldKey);
        }
      }
    } catch (error) {
      console.warn(`Failed to load localStorage key "${key}":`, error);
    }
  }

  let value = $state(storedValue);

  return {
    get value() {
      return value;
    },
    set value(newValue: T) {
      value = newValue;

      if (isBrowser) {
        try {
          localStorage.setItem(key, JSON.stringify(newValue));
        } catch (error) {
          console.warn(`Failed to save localStorage key "${key}":`, error);
        }
      }
    },

    clear() {
      value = initialValue;
      if (isBrowser) {
        try {
          localStorage.removeItem(key);
        } catch (error) {
          console.warn(`Failed to remove localStorage key "${key}":`, error);
        }
      }
    },
  };
}

export function createNestedLocalStorageState<T extends Record<string, any>>(
  key: string,
  initialValue: T,
  oldKey?: string
) {
  const isBrowser =
    typeof window !== "undefined" && typeof localStorage !== "undefined";

  let storedValue = initialValue;
  if (isBrowser) {
    try {
      const item = localStorage.getItem(key);
      if (item !== null) {
        storedValue = JSON.parse(item);
      } else if (oldKey) {
        const oldItem = localStorage.getItem(oldKey);
        if (oldItem !== null) {
          storedValue = JSON.parse(oldItem);
          localStorage.setItem(key, JSON.stringify(storedValue));
          localStorage.removeItem(oldKey);
        }
      }
    } catch (error) {
      console.warn(`Failed to load localStorage key "${key}":`, error);
    }
  }

  const state = $state(storedValue);

  let saveTimeout: ReturnType<typeof setTimeout> | null = null;
  function scheduleSave() {
    if (!isBrowser) return;

    if (saveTimeout) clearTimeout(saveTimeout);
    saveTimeout = setTimeout(() => {
      try {
        localStorage.setItem(key, JSON.stringify(state));
      } catch (error) {
        console.warn(`Failed to save localStorage key "${key}":`, error);
      }
    }, 100);
  }

  return new Proxy(state, {
    set(target, prop, value) {
      const result = Reflect.set(target, prop, value);
      scheduleSave();
      return result;
    },
  });
}
