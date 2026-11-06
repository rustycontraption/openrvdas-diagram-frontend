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
