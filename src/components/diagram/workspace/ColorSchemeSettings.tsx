import { SegmentedControl, Text, Title } from "@mantine/core";
import { COLOR_SCHEME_FAMILY_OPTIONS, isColorSchemeFamily, type ColorSchemeFamily } from "@/components/diagram/model/colorSchemes";

interface ColorSchemeSettingsProps {
    colorSchemeFamily: ColorSchemeFamily;
    onColorSchemeFamilyChange: (colorSchemeFamily: ColorSchemeFamily) => void;
}

export function ColorSchemeSettings({ colorSchemeFamily, onColorSchemeFamilyChange }: ColorSchemeSettingsProps) {
    return (
        <>
            <Title order={5}>Display</Title>
            <Text size="sm" fw={500}>Color scheme</Text>
            <SegmentedControl
                fullWidth
                data={COLOR_SCHEME_FAMILY_OPTIONS}
                value={colorSchemeFamily}
                onChange={(value) => { if (isColorSchemeFamily(value)) onColorSchemeFamilyChange(value); }}
            />
        </>
    );
}
