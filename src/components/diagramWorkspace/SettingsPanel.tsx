import { useState } from 'react';
import { Drawer, Group, Loader, SegmentedControl, Stack, Text, Title, Combobox, useCombobox, Input, Pill, PillsInput, Checkbox } from "@mantine/core";
import type { DatapathGroup } from "@/diagramRendering/diagramSvg";
import { COLOR_SCHEME_FAMILY_OPTIONS, isColorSchemeFamily, type ColorSchemeFamily } from "@/diagramRendering/colorSchemes";
import classes from "./DiagramWorkspace.module.css";

interface SettingsContentProps {
    colorSchemeFamily: ColorSchemeFamily;
    onColorSchemeFamilyChange: (colorSchemeFamily: ColorSchemeFamily) => void;
    isChangingColorScheme: boolean;
    canChangeColorScheme: boolean;
    datapathGroupsByElement?: Map<SVGGElement, DatapathGroup[]>;
}

interface SettingsPanelProps extends SettingsContentProps {
    isOpen: boolean;
    isNarrowScreen: boolean;
    onClose: () => void;
}

interface FilterComboboxProps {
    datapathGroupsByElement?: Map<SVGGElement, DatapathGroup[]>;
}


function FilterCombobox({ datapathGroupsByElement }: FilterComboboxProps) {
    console.log(datapathGroupsByElement);
    const comboBoxItems = ["test1", "test2"];
    const combobox = useCombobox({
        onDropdownClose: () => combobox.resetSelectedOption(),
        onDropdownOpen: () => combobox.updateSelectedOptionIndex('active'),
    });

    const [value, setValue] = useState<string[]>([]);

    const handleValueSelect = (val: string) =>
        setValue((current) =>
            current.includes(val) ? current.filter((v) => v !== val) : [...current, val]
        );

    const handleValueRemove = (val: string) =>
        setValue((current) => current.filter((v) => v !== val));


    const options = comboBoxItems.map((item) => (
        <Combobox.Option value={item} key={item} active={value.includes(item)}>
            <Group gap="sm">
                <Checkbox
                    checked={value.includes(item)}
                    onChange={() => { }}
                    aria-hidden
                    tabIndex={-1}
                    style={{ pointerEvents: 'none' }}
                />
                <span>{item}</span>
            </Group>
        </Combobox.Option>
    ));

    return (
        <Combobox store={combobox} onOptionSubmit={handleValueSelect} withinPortal={false}>
            <Combobox.DropdownTarget>
                <PillsInput pointer onClick={() => combobox.toggleDropdown()}>
                    <Pill.Group>
                        <Input.Placeholder>Pick one or more values</Input.Placeholder>
                        <Combobox.EventsTarget>
                            <PillsInput.Field
                                type="hidden"
                                onBlur={() => combobox.closeDropdown()}
                                onKeyDown={(event) => {
                                    if (event.key === 'Backspace' && value.length > 0) {
                                        event.preventDefault();
                                        handleValueRemove(value[value.length - 1]);
                                    }
                                }}
                            />
                        </Combobox.EventsTarget>
                    </Pill.Group>
                </PillsInput>
            </Combobox.DropdownTarget>
            <Combobox.Dropdown>
                <Combobox.Options>{options}</Combobox.Options>
            </Combobox.Dropdown>
        </Combobox>
    );
}

function SettingsContent({ colorSchemeFamily, onColorSchemeFamilyChange, isChangingColorScheme, canChangeColorScheme, datapathGroupsByElement }: SettingsContentProps) {
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
            <Title order={5}>Filter</Title>
            <Group gap="xs">
                <Text size="sm">Sources:</Text>
                <FilterCombobox group="sources" datapathGroupsByElement={datapathGroupsByElement} />
            </Group>

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
