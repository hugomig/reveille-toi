import { useState } from "react";
import { View } from "react-native";

import { ApplyToAllRow, BottomSheet, OptionRow, SheetHeader, sheetStyles } from "@/components/sheet";
import type { Option } from "@/lib/alarmOptions";

type Props<T extends string> = {
  visible: boolean;
  title: string;
  subtitle?: string;
  options: readonly Option<T>[];
  value: T;
  /** Affiche l'interrupteur « Appliquer à tous les réveils ». */
  showApplyToAll?: boolean;
  onSelect: (value: T, applyToAll: boolean) => void;
  onClose: () => void;
};

/** Panneau du bas pour choisir une option dans une liste (choix appliqué au toucher). */
export function OptionSheet<T extends string>({
  visible,
  title,
  subtitle,
  options,
  value,
  showApplyToAll = false,
  onSelect,
  onClose,
}: Props<T>) {
  const [applyToAll, setApplyToAll] = useState(false);

  // Repart de « ce réveil seulement » à la prochaine ouverture.
  const close = () => {
    setApplyToAll(false);
    onClose();
  };
  const select = (v: T) => {
    onSelect(v, applyToAll);
    setApplyToAll(false);
  };

  return (
    <BottomSheet visible={visible} onClose={close}>
      <SheetHeader title={title} subtitle={subtitle} />
      <View style={sheetStyles.options} accessibilityRole="radiogroup">
        {options.map((opt) => (
          <OptionRow
            key={opt.value}
            label={opt.label}
            description={opt.description}
            selected={opt.value === value}
            onPress={() => select(opt.value)}
          />
        ))}
      </View>
      {showApplyToAll && <ApplyToAllRow value={applyToAll} onChange={setApplyToAll} />}
    </BottomSheet>
  );
}
