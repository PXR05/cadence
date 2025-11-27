import { goto } from "$app/navigation";
import { page } from "$app/state";
import { untrack } from "svelte";

export function useDialogState(dialogName: string) {
  let isOpen = $state(page.url.searchParams.has(dialogName));

  $effect.pre(() => {
    const currentlyOpen = page.url.searchParams.has(dialogName);
    if (currentlyOpen !== untrack(() => isOpen)) {
      isOpen = currentlyOpen;
    }
  });

  function open() {
    if (isOpen) return;

    const url = new URL(page.url);
    url.searchParams.set(dialogName, "");
    goto(url.toString(), {
      replaceState: false,
      noScroll: true,
      keepFocus: true,
    });
    isOpen = true;
  }

  function close() {
    if (isOpen) {
      history.back();
      isOpen = false;
    }
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
