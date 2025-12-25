import { goto } from "$app/navigation";
import { page } from "$app/state";
import { untrack } from "svelte";

interface MenuDialogOptions<T> {
  paramName: string;
  onOpen?: (id: string) => void | Promise<void>;
  onClose?: () => void;
  getIdFromItem?: (item: T) => string;
}

export function useMenuDialogState<T>(options: MenuDialogOptions<T>) {
  const { paramName, onOpen, onClose, getIdFromItem } = options;

  let isOpen = $state(page.url.searchParams.has(paramName));
  let skipNextSync = false;

  $effect(() => {
    const idFromUrl = page.url.searchParams.get(paramName);
    const currentlyOpen = idFromUrl !== null;

    if (skipNextSync) {
      skipNextSync = false;
      return;
    }

    if (currentlyOpen !== untrack(() => isOpen)) {
      isOpen = currentlyOpen;

      if (currentlyOpen && idFromUrl) {
        onOpen?.(idFromUrl);
      } else if (!currentlyOpen) {
        onClose?.();
      }
    }
  });

  function open(id: string) {
    if (isOpen) return;

    skipNextSync = true;
    isOpen = true;

    const url = new URL(page.url);
    url.searchParams.set(paramName, id);
    goto(url.toString(), {
      replaceState: false,
      noScroll: true,
      keepFocus: true,
    });
  }

  function close() {
    if (!isOpen) return;

    skipNextSync = true;
    isOpen = false;

    history.back();
  }

  function handleOpenChange(open: boolean) {
    if (!open && isOpen) {
      close();
    }
  }

  return {
    get isOpen() {
      return isOpen;
    },
    open,
    close,
    handleOpenChange,
  };
}
