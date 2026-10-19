import { ApiErrorResponse, DiagramApiError, DiagramRequest, DiagramResult } from "./types";
import { userMessageFor } from "./userMessages";

// Matches the diagram API's limit, so oversized uploads fail fast without a round trip
const MAXIMUM_UPLOAD_BYTES = 4 * 1024 * 1024;
const LOCAL_DEVELOPMENT_API_URL = "http://localhost:3001";

function diagramEndpoint(): string {
    const apiUrl = process.env.NEXT_PUBLIC_DIAGRAM_API_URL
        ?? (process.env.NODE_ENV === "development" ? LOCAL_DEVELOPMENT_API_URL : undefined);
    if (!apiUrl) {
        throw new DiagramApiError("configuration_error", "The diagram service is not configured.");
    }
    return `${apiUrl.replace(/\/$/, "")}/diagram`;
}

function checkRequest(request: DiagramRequest): void {
    if (request.configFiles.length === 0) {
        throw new DiagramApiError("invalid_request", "Upload at least one logger config file.");
    }
    const totalBytes = [...request.configFiles, ...request.templateFiles]
        .reduce((total, file) => total + new TextEncoder().encode(file.content).length, 0);
    if (totalBytes > MAXIMUM_UPLOAD_BYTES) {
        throw new DiagramApiError("invalid_request", "Uploaded files are too large. The combined limit is 4 MB.");
    }
}

async function readErrorResponse(response: Response): Promise<DiagramApiError> {
    try {
        const { error } = (await response.json()) as ApiErrorResponse;
        return new DiagramApiError(error.code, userMessageFor(error), error.details, error.requestId);
    } catch {
        // Not our error format, e.g. an API Gateway throttling or timeout response
        return new DiagramApiError("internal_error", "Something went wrong while generating the diagram.");
    }
}

export async function requestDiagram(request: DiagramRequest): Promise<DiagramResult> {
    checkRequest(request);

    let response: Response;
    try {
        response = await fetch(diagramEndpoint(), {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(request),
        });
    } catch {
        throw new DiagramApiError("network_error", "Could not reach the diagram service. Please try again.");
    }

    if (!response.ok) {
        throw await readErrorResponse(response);
    }
    return withDotForEveryColorScheme(await response.json(), request.colorSchemes);
}

/**
 * Diagram services from before color schemes existed return a single `dot`; use it for every requested scheme
 * so the site keeps working while the service is being updated.
 */
function withDotForEveryColorScheme(
    responseBody: DiagramResult | { dot: string; graphml: string },
    colorSchemes: string[],
): DiagramResult {
    if ("dotByColorScheme" in responseBody) {
        return responseBody;
    }
    const dotByColorScheme = Object.fromEntries(colorSchemes.map((colorScheme) => [colorScheme, responseBody.dot]));
    return { dotByColorScheme, graphml: responseBody.graphml };
}
