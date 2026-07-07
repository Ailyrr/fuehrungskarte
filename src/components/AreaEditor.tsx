import { useState } from 'react';

interface Props {
  initialColor?: string;
  initialLabel?: string;
  isNew: boolean;
  onSave: (value: { color: string; label: string }) => void;
  onCancel: () => void;
}

const COLORS = ['#ef4444', '#38bdf8', '#22c55e', '#eab308', '#a855f7', '#f97316', '#ffffff'];

export default function AreaEditor({ initialColor = '#ef4444', initialLabel = '', isNew, onSave, onCancel }: Props) {
  const [color, setColor] = useState(initialColor);
  const [label, setLabel] = useState(initialLabel);

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 sm:items-center" onClick={onCancel}>
      <div
        className="w-full max-w-md rounded-t-2xl bg-gray-900 p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] shadow-2xl sm:rounded-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="mb-4 text-lg font-bold">{isNew ? 'New area' : 'Edit area'}</h2>

        <div className="mb-4">
          <span className="mb-2 block text-sm text-gray-400">Color</span>
          <div className="flex flex-wrap gap-2">
            {COLORS.map((c) => (
              <button
                key={c}
                onClick={() => setColor(c)}
                style={{ background: c }}
                className={`h-9 w-9 rounded-full border-2 ${color === c ? 'border-sky-400' : 'border-gray-600'}`}
                aria-label={`color ${c}`}
              />
            ))}
          </div>
        </div>

        <label className="mb-1 block text-sm text-gray-400">Label (optional)</label>
        <input
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          placeholder="e.g. Objective ALPHA"
          className="mb-5 w-full rounded-lg bg-gray-800 px-4 py-3 text-base outline-none ring-sky-500 focus:ring-2"
        />

        <div className="flex gap-3">
          <button onClick={onCancel} className="flex-1 rounded-lg bg-gray-800 py-3 font-semibold text-gray-300">
            Cancel
          </button>
          <button
            onClick={() => onSave({ color, label: label.trim() })}
            className="flex-1 rounded-lg bg-sky-600 py-3 font-semibold text-white"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
}
