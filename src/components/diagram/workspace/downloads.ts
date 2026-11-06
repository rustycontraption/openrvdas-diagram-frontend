export const DOWNLOAD_FILE_STEM = "data-flow-generated";

const GRAPHML_MIME_TYPE = "application/xml";
const SVG_MIME_TYPE = "image/svg+xml";
const PNG_MIME_TYPE = "image/png";

export function downloadBlob(blob: Blob, fileName: string) {
    const blobUrl = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = blobUrl;
    link.download = fileName;
    link.click();
    URL.revokeObjectURL(blobUrl);
}

export function createGraphmlBlob(graphml: string): Blob {
    return new Blob([graphml], { type: GRAPHML_MIME_TYPE });
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
