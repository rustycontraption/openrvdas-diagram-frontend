import type { ReactNode } from "react";
import { Drawer, Stack } from "@mantine/core";
import classes from "./SettingsPanel.module.css";

interface SettingsPanelProps {
    isOpen: boolean;
    isNarrowScreen: boolean;
    onClose: () => void;
    children: ReactNode;
}

// A drawer on narrow screens and a side panel otherwise; the settings sections are passed in as children
export function SettingsPanel({ isOpen, isNarrowScreen, onClose, children }: SettingsPanelProps) {
    const settingsSections = <Stack gap="xs">{children}</Stack>;
    if (isNarrowScreen) {
        return (
            <Drawer opened={isOpen} onClose={onClose} position="right" size={280} title="Settings">
                {settingsSections}
            </Drawer>
        );
    }
    if (!isOpen) {
        return null;
    }
    return (
        <aside className={classes.settingsPanel} aria-label="Diagram settings">
            {settingsSections}
        </aside>
    );
}
