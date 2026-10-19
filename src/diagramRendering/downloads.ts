export const DOWNLOAD_FILE_STEM = "data-flow-generated";

const GRAPHML_MIME_TYPE = "application/xml";

export function downloadBlob(blob: Blob, fileName: string) {
    const blobUrl = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = blobUrl;
    link.download = fileName;
    link.click();
    URL.revokeObjectURL(blobUrl);
}

export function downloadGraphml(graphml: string) {
    downloadBlob(new Blob([graphml], { type: GRAPHML_MIME_TYPE }), `${DOWNLOAD_FILE_STEM}.graphml`);
}

export function exportYed(yedGraphml: string) {
    downloadBlob(new Blob([yedGraphml], { type: GRAPHML_MIME_TYPE }), `${DOWNLOAD_FILE_STEM}-yed.graphml`);
}
