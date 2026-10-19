export interface YamlFile {
    name: string;
    content: string;
}

export interface DiagramRequest {
    configFiles: YamlFile[];
    templateFiles: YamlFile[];
    colorSchemes: string[];
    graphmlFormat?: "generic" | "yed"
}

export interface DiagramResult {
    dotByColorScheme: Record<string, string>;
    graphml: string;
}

export type ErrorDetails = Record<string, string | number>;

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
