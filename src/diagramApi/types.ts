// The contract with the diagram API in lambda/ (see lambda/README.md).

export interface YamlFile {
    name: string;
    content: string;
}

export interface DiagramRequest {
    configFiles: YamlFile[];
    templateFiles: YamlFile[];
    /** The openrvdas-diagram color schemes to draw; DOT comes back for just these */
    colorSchemes: string[];
}

export interface DiagramResult {
    /** Graphviz DOT source for each requested color scheme, laid out and drawn in the browser */
    dotByColorScheme: Record<string, string>;
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
