import type { Graphviz } from "@hpcc-js/wasm-graphviz";

const SVG_MIME_TYPE = "image/svg+xml";
const PNG_MIME_TYPE = "image/png";

let graphvizLoading: Promise<Graphviz> | null = null;

// The WebAssembly build of Graphviz is large, so it is only downloaded the first time a diagram is drawn
function loadGraphviz(): Promise<Graphviz> {
    graphvizLoading ??= import("@hpcc-js/wasm-graphviz").then(({ Graphviz }) => Graphviz.load());
    return graphvizLoading;
}

export async function renderSvg(dot: string): Promise<string> {
    const graphviz = await loadGraphviz();
    return graphviz.dot(dot);
}

export function createSvgBlob(svg: string): Blob {
    return new Blob([svg], { type: SVG_MIME_TYPE });
}

function loadImage(url: string): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
        const image = new Image();
        image.onload = () => resolve(image);
        image.onerror = () => reject(new Error("The diagram SVG could not be loaded as an image."));
        image.src = url;
    });
}

/** Draws the SVG onto a canvas and exports it, scaled up so the PNG stays sharp. */
export async function convertSvgToPngBlob(svg: string, backgroundColor: string, scale = 2): Promise<Blob> {
    const svgUrl = URL.createObjectURL(createSvgBlob(svg));
    try {
        const image = await loadImage(svgUrl);
        const canvas = document.createElement("canvas");
        canvas.width = Math.ceil(image.naturalWidth * scale);
        canvas.height = Math.ceil(image.naturalHeight * scale);
        const context = canvas.getContext("2d");
        if (!context) {
            throw new Error("This browser cannot draw to a canvas.");
        }
        context.fillStyle = backgroundColor;
        context.fillRect(0, 0, canvas.width, canvas.height);
        context.drawImage(image, 0, 0, canvas.width, canvas.height);
        return await new Promise<Blob>((resolve, reject) => {
            canvas.toBlob(
                (pngBlob) => (pngBlob ? resolve(pngBlob) : reject(new Error("The PNG could not be created."))),
                PNG_MIME_TYPE,
            );
        });
    } finally {
        URL.revokeObjectURL(svgUrl);
    }
}
