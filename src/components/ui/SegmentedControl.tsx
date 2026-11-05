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
    <div style={{ marginBottom: 12 }}>
      {label && (
        <label
          style={{
            display: 'block',
            fontSize: '12px',
            fontWeight: 600,
            color: '#475569',
            marginBottom: 4,
            textTransform: 'uppercase',
            letterSpacing: '0.04em',
          }}
        >
          {label}
        </label>
      )}
      <div
        style={{
          display: 'flex',
          backgroundColor: '#f1f5f9',
          padding: 2,
          borderRadius: 8,
          border: '1px solid #e2e8f0',
        }}
      >
        {options.map((opt) => {
          const isSelected = opt.value === value;
          return (
            <button
              key={opt.value}
              type="button"
              onClick={() => onChange(opt.value)}
              style={{
                flex: 1,
                padding: '6px 8px',
                fontSize: '12px',
                fontWeight: isSelected ? 600 : 500,
                color: isSelected ? '#0f172a' : '#64748b',
                backgroundColor: isSelected ? '#ffffff' : 'transparent',
                borderRadius: 6,
                border: 'none',
                cursor: 'pointer',
                boxShadow: isSelected ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                transition: 'all 0.15s ease',
              }}
            >
              {opt.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
