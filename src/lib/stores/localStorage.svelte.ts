export function createLocalStorageState<T>(key: string, initialValue: T) {
  const isBrowser =
    typeof window !== "undefined" && typeof localStorage !== "undefined";

  let storedValue = initialValue;
  if (isBrowser) {
    try {
      const item = localStorage.getItem(key);
      if (item !== null) {
        storedValue = JSON.parse(item);
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
