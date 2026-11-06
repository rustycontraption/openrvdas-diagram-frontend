export type DiagramTheme = "light" | "dark";

export const DIAGRAM_THEMES: DiagramTheme[] = ["light", "dark"];

export type ColorSchemeFamily = "classic" | "viridis";

export const COLOR_SCHEMES_BY_FAMILY: Record<ColorSchemeFamily, Record<DiagramTheme, string>> = {
    classic: { light: "classic-light", dark: "classic-dark" },
    viridis: { light: "viridis-light", dark: "viridis-dark" },
};

export const COLOR_SCHEME_FAMILY_OPTIONS: { value: ColorSchemeFamily; label: string }[] = [
    { value: "classic", label: "Classic" },
    { value: "viridis", label: "Viridis" },
];

export const DEFAULT_COLOR_SCHEME_FAMILY: ColorSchemeFamily = "classic";

export function isColorSchemeFamily(value: unknown): value is ColorSchemeFamily {
    return typeof value === "string" && value in COLOR_SCHEMES_BY_FAMILY;
}
