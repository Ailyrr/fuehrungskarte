import { useState } from 'react';

interface Props {
  initialText?: string;
  initialColor?: string;
  initialBg?: boolean;
  onSave: (value: { text: string; color: string; bg: boolean }) => void;
  onCancel: () => void;
}

const COLORS = ['#ffffff', '#38bdf8', '#22c55e', '#ef4444', '#eab308', '#f97316', '#000000'];

export default function LabelEditor({
  initialText = '',
  initialColor = '#ffffff',
  initialBg = true,
  onSave,
  onCancel,
}: Props) {
  const [text, setText] = useState(initialText);
  const [color, setColor] = useState(initialColor);
  const [bg, setBg] = useState(initialBg);

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 sm:items-center" onClick={onCancel}>
      <div
        className="w-full max-w-md rounded-t-2xl bg-gray-900 p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] shadow-2xl sm:rounded-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="mb-4 text-lg font-bold">{initialText ? 'Edit label' : 'New label'}</h2>
        <textarea
          autoFocus
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={2}
          placeholder="Label text"
          className="mb-4 w-full resize-none rounded-lg bg-gray-800 px-4 py-3 text-base outline-none ring-sky-500 focus:ring-2"
        />

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

        <label className="mb-5 flex items-center gap-3 text-sm text-gray-300">
          <input type="checkbox" checked={bg} onChange={(e) => setBg(e.target.checked)} className="h-5 w-5" />
          Background panel behind text
        </label>

        <div className="flex gap-3">
          <button onClick={onCancel} className="flex-1 rounded-lg bg-gray-800 py-3 font-semibold text-gray-300">
            Cancel
          </button>
          <button
            onClick={() => onSave({ text: text.trim(), color, bg })}
            disabled={!text.trim()}
            className="flex-1 rounded-lg bg-sky-600 py-3 font-semibold text-white disabled:bg-gray-700 disabled:text-gray-500"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
}
