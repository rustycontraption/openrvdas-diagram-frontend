// The contract with the diagram API in lambda/ (see lambda/README.md).

export interface YamlFile {
    name: string;
    content: string;
}

export interface DiagramRequest {
    configFiles: YamlFile[];
    templateFiles: YamlFile[];
}

export interface DiagramResult {
    pngBase64: string;
    graphml: string;
}

export type ErrorDetails = Record<string, string | number>;

/** The error body every failed diagram API response carries. */
export interface ApiErrorResponse {
    error: {
        code: string;
        message: string;
        details?: ErrorDetails;
        requestId?: string;
    };
}

/** A failed diagram request, with a message ready to show the user. */
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
