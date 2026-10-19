import { Drawer, Group, Loader, SegmentedControl, Stack, Text, Title } from "@mantine/core";
import { COLOR_SCHEME_FAMILY_OPTIONS, isColorSchemeFamily, type ColorSchemeFamily } from "@/diagramRendering/colorSchemes";
import classes from "./DiagramWorkspace.module.css";

interface SettingsContentProps {
    colorSchemeFamily: ColorSchemeFamily;
    onColorSchemeFamilyChange: (colorSchemeFamily: ColorSchemeFamily) => void;
    isChangingColorScheme: boolean;
    canChangeColorScheme: boolean;
}

interface SettingsPanelProps extends SettingsContentProps {
    isOpen: boolean;
    isNarrowScreen: boolean;
    onClose: () => void;
}

function SettingsContent({ colorSchemeFamily, onColorSchemeFamilyChange, isChangingColorScheme, canChangeColorScheme }: SettingsContentProps) {
    return (
        <Stack gap="xs">
            <Title order={5}>Display</Title>
            <Group gap="xs">
                <Text size="sm" fw={500}>Color scheme</Text>
                {isChangingColorScheme && <Loader size="xs" />}
            </Group>
            <SegmentedControl
                fullWidth
                data={COLOR_SCHEME_FAMILY_OPTIONS}
                value={colorSchemeFamily}
                onChange={(value) => { if (isColorSchemeFamily(value)) onColorSchemeFamilyChange(value); }}
                disabled={isChangingColorScheme || !canChangeColorScheme}
            />
        </Stack>
    );
}

export function SettingsPanel({ isOpen, isNarrowScreen, onClose, ...settings }: SettingsPanelProps) {
    if (isNarrowScreen) {
        return (
            <Drawer opened={isOpen} onClose={onClose} position="right" size={280} title="Settings">
                <SettingsContent {...settings} />
            </Drawer>
        );
    }
    if (!isOpen) {
        return null;
    }
    return (
        <aside className={classes.settingsPanel} aria-label="Diagram settings">
            <SettingsContent {...settings} />
        </aside>
    );
}
