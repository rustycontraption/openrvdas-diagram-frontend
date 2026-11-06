import type { SavedDiagram } from "@/components/diagram/model/diagram";

// sessionStorage keeps the last diagram through a reload of the same tab, but not the uploaded files
const SAVED_DIAGRAM_STORAGE_KEY = "openrvdas-diagram:last-diagram";

function isSavedDiagram(value: unknown): value is SavedDiagram {
    const savedDiagram = value as Partial<SavedDiagram> | null;
    return typeof savedDiagram?.dot === "string"
        && typeof savedDiagram?.graphml?.generic === "string"
        && typeof savedDiagram?.graphml?.yed == "string"
        && typeof savedDiagram.summary === "string";
}

export function saveDiagram(savedDiagram: SavedDiagram) {
    try {
        sessionStorage.setItem(SAVED_DIAGRAM_STORAGE_KEY, JSON.stringify(savedDiagram));
    } catch {
        // Storage can be unavailable or full; the diagram just won't survive a reload
        //TODO: This is probably a bad pattern
    }
}

export function loadSavedDiagram(): SavedDiagram | null {
    try {
        const storedText = sessionStorage.getItem(SAVED_DIAGRAM_STORAGE_KEY);
        const storedDiagram = storedText ? JSON.parse(storedText) : null;
        return isSavedDiagram(storedDiagram) ? storedDiagram : null;
    } catch {
        return null;
    }
}
