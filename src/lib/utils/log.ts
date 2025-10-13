import type { RequestEvent } from '@sveltejs/kit';

export const apiError = (...args: any[]) => error('API', ...args);
export const pageError = (...args: any[]) => error('PAGE', ...args);
export const notificationLog = (...args: any[]) => log('NOTIFICATION', ...args);
export const notificationError = (...args: any[]) =>
	error('NOTIFICATION', ...args);
export const emailLog = (...args: any[]) => log('EMAIL', ...args);
export const emailError = (...args: any[]) => error('EMAIL', ...args);
export const secretsError = (...args: any[]) => error('SECRETS', ...args);
export const serverError = (...args: any[]) => error('SERVER', ...args);
export const serverLog = (...args: any[]) => log('SERVER', ...args);

const RED = '\x1b[0;31m';
const BLUE = '\x1b[0;34m';
const NC = '\x1b[0m';

function log(tag: string, ...args: any[]) {
	console.log(`${BLUE}[${tag}]${NC}\t${new Date().toISOString()}\t| `, ...args);
}

function error(tag: string, ...args: any[]) {
	console.error(
		`${RED}[${tag}]${NC}\t${new Date().toISOString()}\t| `,
		...args
	);
}

type ServerErrorMeta = {
	status?: number;
	message?: string;
	method?: string;
	url?: string;
	routeId?: string | null;
	userId?: string | null;
};

function toError(input: unknown): Error {
	if (input instanceof Error) return input;
	try {
		if (typeof input === 'string') return new Error(input);
		return new Error(JSON.stringify(input));
	} catch {
		return new Error(String(input));
	}
}

export function logServerError(
	errorInput: unknown,
	meta: ServerErrorMeta = {}
) {
	const err = toError(errorInput);
	const payload: Record<string, unknown> = {
		status: meta.status,
		message: meta.message ?? err.message,
		errorName: err.name,
		errorMessage: err.message,
		method: meta.method,
		url: meta.url,
		routeId: meta.routeId,
		userId: meta.userId,
		stack: err.stack
	};

	serverError(payload);
}

export function logServerMinimal(meta: ServerErrorMeta = {}) {
	const parts: string[] = [];
	if (meta.status !== undefined) parts.push(`status=${meta.status}`);
	if (meta.method) parts.push(`method=${meta.method}`);
	if (meta.url) parts.push(`url=${meta.url}`);
	if (meta.routeId !== undefined) parts.push(`routeId=${meta.routeId}`);
	if (meta.userId !== undefined) parts.push(`userId=${meta.userId}`);
	if (meta.message) parts.push(`message=${meta.message}`);
	serverLog(parts.join(' '));
}

export function serverErrorFromEvent(params: {
	error: unknown;
	status?: number;
	message?: string;
	event: RequestEvent;
}) {
	const { error: errorInput, status, message, event } = params;
	const userId = (event.locals as any)?.user?.id ?? null;
	const commonMeta: ServerErrorMeta = {
		status,
		message,
		method: event.request.method,
		url: event.url.href,
		routeId: event.route.id,
		userId
	};

	if (typeof status === 'number' && status < 500) {
		logServerMinimal(commonMeta);
		return;
	}

	logServerError(errorInput, commonMeta);
}
