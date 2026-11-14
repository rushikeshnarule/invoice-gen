import {
  SegmentedControl as BoardUISegmentedControl,
  SegmentedControlItem,
} from '@/components/base/segmented-control/segmented-control';

interface Option<T extends string> {
  value: T;
  label: string;
}

interface SegmentedControlProps<T extends string> {
  label?: string;
  value: T;
  onChange: (val: T) => void;
  options: Option<T>[];
}

export function SegmentedControl<T extends string>({
  label,
  value,
  onChange,
  options,
}: SegmentedControlProps<T>) {
  return (
    <div className="mb-3">
      {label && (
        <span className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1">
          {label}
        </span>
      )}
      <BoardUISegmentedControl
        selectedKeys={new Set([value])}
        onSelectionChange={(keys) => {
          const val = Array.from(keys)[0];
          if (val) onChange(String(val) as T);
        }}
        className="bg-slate-100 p-0.5"
      >
        {options.map((opt) => (
          <SegmentedControlItem key={opt.value} id={opt.value} className="text-xs px-2.5 py-1">
            {opt.label}
          </SegmentedControlItem>
        ))}
      </BoardUISegmentedControl>
    </div>
  );
}
