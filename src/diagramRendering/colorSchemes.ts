export type DiagramTheme = "light" | "dark";

export const DIAGRAM_THEMES: DiagramTheme[] = ["light", "dark"];

/**
 * The openrvdas-diagram color scheme drawn for each site theme.
 * This is the only place the site names color schemes; the colors themselves come from the tool.
 */
export const COLOR_SCHEME_BY_THEME: Record<DiagramTheme, string> = {
    light: "classic-light",
    dark: "classic-dark",
};
