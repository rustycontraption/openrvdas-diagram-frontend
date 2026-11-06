const INTERNAL_ERROR_CODE = "internal_error";

export type ErrorDetails = Record<string, string | number>;

// The error body the diagram service sends with a failed response
export interface ApiErrorResponse {
    error: {
        code: string;
        message: string;
        details?: ErrorDetails;
        requestId?: string;
    };
}

export class DiagramApiError extends Error {
    constructor(
        readonly code: string,
        message: string,
        readonly details: ErrorDetails = {},
        readonly requestId?: string,
    ) {
        super(message);
        this.name = "DiagramApiError";
    }
}

type MessageBuilder = (details: ErrorDetails) => string;

const MESSAGE_BUILDERS_BY_CODE: Partial<Record<string, MessageBuilder>> = {
    missing_template_file: (details) =>
        `${details.config_file} includes ${details.template_file}, which wasn't uploaded. ` +
        `Add it under Logger template files.`,
    unknown_logger_template: (details) =>
        `Logger "${details.logger}" in ${details.config_file} uses the template "${details.logger_template}", ` +
        `but none of the uploaded template files define it.`,
    invalid_yaml: (details) =>
        `${details.file}${details.line ? ` (line ${details.line})` : ""} isn't valid YAML. Check the file and upload it again.`,
};

// Rewrites the service's message in terms of the user's files, when the error code has details for that
export function userMessageFor(error: ApiErrorResponse["error"]): string {
    const buildMessage = MESSAGE_BUILDERS_BY_CODE[error.code];
    return buildMessage && error.details ? buildMessage(error.details) : error.message;
}

export interface DisplayedError {
    message: string;
    referenceId?: string;
}

// Turns any thrown error into the text a page shows
export function toDisplayedError(error: unknown): DisplayedError {
    if (!(error instanceof DiagramApiError)) {
        console.error(error);
        return { message: "Something went wrong while generating the diagram." };
    }
    // Only unexpected errors need a reference to match the user's report to the server log
    return { message: error.message, referenceId: error.code === INTERNAL_ERROR_CODE ? error.requestId : undefined };
}
