import { Drawer, Stack, Text, Title } from "@mantine/core";
import classes from "./DiagramWorkspace.module.css";

interface SettingsPanelProps {
    isOpen: boolean;
    isNarrowScreen: boolean;
    onClose: () => void;
}

function SettingsContent() {
    return (
        <Stack gap="xs">
            <Title order={5}>Display</Title>
            <Text size="sm" c="dimmed">Colour scheme and layout options will appear here.</Text>
        </Stack>
    );
}

/** A side column on wide screens, and a slide-over drawer on narrow ones so the diagram keeps its space. */
export function SettingsPanel({ isOpen, isNarrowScreen, onClose }: SettingsPanelProps) {
    if (isNarrowScreen) {
        return (
            <Drawer opened={isOpen} onClose={onClose} position="right" size={280} title="Settings">
                <SettingsContent />
            </Drawer>
        );
    }
    if (!isOpen) {
        return null;
    }
    return (
        <aside className={classes.settingsPanel} aria-label="Diagram settings">
            <SettingsContent />
        </aside>
    );
}
