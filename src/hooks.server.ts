import { serverErrorFromEvent } from "$lib/utils/log";

export const handleError = async ({ error, event, status, message }) => {
  serverErrorFromEvent({ error, status, message, event });
};
