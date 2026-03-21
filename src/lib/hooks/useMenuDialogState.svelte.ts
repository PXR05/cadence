import { goto } from "$app/navigation";
import { page } from "$app/state";
import { untrack } from "svelte";
import { browser } from "$app/environment";

interface MenuDialogOptions {
  paramName: string;
  onOpen?: (id: string) => void | Promise<void>;
  onClose?: () => void;
}

export function useMenuDialogState(options: MenuDialogOptions) {
  const { paramName, onOpen, onClose } = options;

  let isOpen = $state(browser ? page.url.searchParams.has(paramName) : false);
  let skipNextSync = false;

  $effect(() => {
    if (!browser) return;

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
    onOpen?.(id);

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
