import { DiagramApiError } from "./types";

const INTERNAL_ERROR_CODE = "internal_error";

export interface DisplayedError {
    message: string;
    referenceId?: string;
}

export function toDisplayedError(error: unknown): DisplayedError {
    if (!(error instanceof DiagramApiError)) {
        console.error(error);
        return { message: "Something went wrong while generating the diagram." };
    }
    // Only unexpected errors need a reference to match the user's report to the server log
    return { message: error.message, referenceId: error.code === INTERNAL_ERROR_CODE ? error.requestId : undefined };
}
