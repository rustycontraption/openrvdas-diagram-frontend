import { Group, Loader, SegmentedControl, Text, Title } from "@mantine/core";
import { COLOR_SCHEME_FAMILY_OPTIONS, isColorSchemeFamily, type ColorSchemeFamily } from "@/components/diagram/model/colorSchemes";

interface ColorSchemeSettingsProps {
    colorSchemeFamily: ColorSchemeFamily;
    onColorSchemeFamilyChange: (colorSchemeFamily: ColorSchemeFamily) => void;
    isChangingColorScheme: boolean;
    canChangeColorScheme: boolean;
}

export function ColorSchemeSettings({
    colorSchemeFamily, onColorSchemeFamilyChange, isChangingColorScheme, canChangeColorScheme,
}: ColorSchemeSettingsProps) {
    return (
        <>
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
        </>
    );
}
