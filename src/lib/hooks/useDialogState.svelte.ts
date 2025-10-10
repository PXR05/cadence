import { goto } from "$app/navigation";
import { page } from "$app/state";

export function useDialogState(dialogName: string) {
  let isOpen = $derived(page.url.searchParams.has(dialogName));

  function open() {
    const url = new URL(page.url);
    url.searchParams.set(dialogName, "");
    goto(url.toString(), {
      replaceState: false,
      noScroll: true,
      keepFocus: true,
    });
  }

  function close() {
    if (isOpen) {
      history.back();
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
