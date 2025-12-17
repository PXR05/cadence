import { goto } from "$app/navigation";
import { page } from "$app/state";
import { untrack } from "svelte";

export function useDialogState(dialogName: string) {
  let isOpen = $state(page.url.searchParams.has(dialogName));
  let skipNextSync = false;

  $effect(() => {
    const currentlyOpen = page.url.searchParams.has(dialogName);
    
    if (skipNextSync) {
      skipNextSync = false;
      return;
    }
    
    if (currentlyOpen !== untrack(() => isOpen)) {
      isOpen = currentlyOpen;
    }
  });

  function open() {
    if (isOpen) return;

    skipNextSync = true;
    isOpen = true;

    const url = new URL(page.url);
    url.searchParams.set(dialogName, "");
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

  function toggle() {
    if (isOpen) {
      close();
    } else {
      open();
    }
  }

  return {
    get isOpen() {
      return isOpen;
    },
    open,
    close,
    toggle,
  };
}
