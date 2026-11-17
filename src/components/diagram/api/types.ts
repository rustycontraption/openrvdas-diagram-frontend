export interface YamlFile {
    name: string;
    content: string;
}

export type GraphmlFormats = "generic" | "yed";

export interface DiagramRequest {
    configFiles: YamlFile[];
    templateFiles: YamlFile[];
    graphmlFormats: GraphmlFormats[];
}

export interface DiagramResult {
    dot: string;
    graphml: Record<GraphmlFormats, string>;
}