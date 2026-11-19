export type DiagramTheme = "light" | "dark";

export type ColorSchemeFamily = "classic" | "viridis";

export interface ColorScheme {
    // Given to sources and destinations, and to the edges that leave or reach them
    nodeColors: readonly string[];
    nodeFillColor: string;
    // For loggers, which sit between a colored source and a colored destination
    defaultNodeBorderColor: string;
    defaultEdgeColor: string;
    textColor: string;
    // What the diagram is shown on; group boxes are tinted toward it
    backgroundColor: string;
}

const LIGHT_BACKGROUND_COLOR = "#FFFFFF";
const DARK_BACKGROUND_COLOR = "#1E1E1E";

// The values match openrvdas-diagram's color_schemes.py, so the site and the CLI draw the same colors
export const COLOR_SCHEMES: Record<ColorSchemeFamily, Record<DiagramTheme, ColorScheme>> = {
    classic: {
        light: {
            // Seven evenly spaced hues around the color wheel, dark enough to show up on white
            nodeColors: ["#BD0F0F", "#BDA40F", "#41BD0F", "#0FBD72", "#0F72BD", "#410FBD", "#BD0FA4"],
            nodeFillColor: "#FFFFFF",
            defaultNodeBorderColor: "#000000",
            defaultEdgeColor: "#555555",
            textColor: "#000000",
            backgroundColor: LIGHT_BACKGROUND_COLOR,
        },
        dark: {
            // The same seven hues, light enough to show up on a dark background
            nodeColors: ["#ED5E5E", "#EDD95E", "#87ED5E", "#5EEDB0", "#5EB0ED", "#875EED", "#ED5ED9"],
            nodeFillColor: "#2B2B2B",
            defaultNodeBorderColor: "#BBBBBB",
            defaultEdgeColor: "#9A9A9A",
            textColor: "#E6E6E6",
            backgroundColor: DARK_BACKGROUND_COLOR,
        },
    },
    viridis: {
        light: {
            // Samples of matplotlib's viridis colormap, leaving out the pale yellow end that is hard to see on white
            nodeColors: ["#440154", "#45337D", "#365D8C", "#27818D", "#22A485", "#53C468", "#FFCF20"],
            nodeFillColor: "#FFFFFF",
            defaultNodeBorderColor: "#333333",
            defaultEdgeColor: "#666666",
            textColor: "#1A1A1A",
            backgroundColor: LIGHT_BACKGROUND_COLOR,
        },
        dark: {
            // Samples of viridis, leaving out the near-black purple end that is hard to see on a dark background
            nodeColors: ["#414487", "#306A8D", "#228F8C", "#2EB07D", "#70CE57", "#CEE126", "#FDE725"],
            nodeFillColor: "#2B2B2B",
            defaultNodeBorderColor: "#BBBBBB",
            defaultEdgeColor: "#9A9A9A",
            textColor: "#E6E6E6",
            backgroundColor: DARK_BACKGROUND_COLOR,
        },
    },
};

export const COLOR_SCHEME_FAMILY_OPTIONS: { value: ColorSchemeFamily; label: string }[] = [
    { value: "classic", label: "Classic" },
    { value: "viridis", label: "Viridis" },
];

export const DEFAULT_COLOR_SCHEME_FAMILY: ColorSchemeFamily = "classic";

export function isColorSchemeFamily(value: unknown): value is ColorSchemeFamily {
    return typeof value === "string" && value in COLOR_SCHEMES;
}
