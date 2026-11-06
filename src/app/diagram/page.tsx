'use client'

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Center, Loader } from "@mantine/core";
import { DiagramWorkspace } from "@/components/diagram/workspace/DiagramWorkspace";
import { useDiagramSession } from "@/components/diagram/session/DiagramSessionProvider";

// Shows the current diagram. After a reload it restores the saved one, or goes back to the upload page if there is none.
export default function DiagramWorkspacePage() {
    const router = useRouter();
    const { diagram, restoreSavedDiagram, hasSelectedFiles } = useDiagramSession();

    useEffect(() => {
        if (diagram) {
            return;
        }
        restoreSavedDiagram()
            .then((wasRestored) => { if (!wasRestored) router.replace("/"); })
            .catch(() => router.replace("/"));
    }, [diagram, restoreSavedDiagram, router]);

    if (!diagram) {
        return <Center h="60vh"><Loader /></Center>;
    }

    return (
        <DiagramWorkspace
            key={diagram.id}
            diagram={diagram}
        />
    );
}
