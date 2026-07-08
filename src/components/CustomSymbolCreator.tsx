import { useMemo, useState } from 'react';
import { AFFILIATIONS, frameSvg } from '../lib/symbols';

interface CustomSymbolValue {
  affiliation: string;
  text: string;
  label: string;
  color?: string;
  size: number;
}

interface Props {
  initialAffiliation?: string;
  initialText?: string;
  initialLabel?: string;
  initialColor?: string;
  allowPreset?: boolean;
  onSave: (value: CustomSymbolValue) => void;
  onSavePreset?: (value: CustomSymbolValue & { name: string }) => void;
  onCancel: () => void;
}

export default function CustomSymbolCreator({
  initialAffiliation = '3',
  initialText = '',
  initialLabel = '',
  initialColor,
  allowPreset = true,
  onSave,
  onSavePreset,
  onCancel,
}: Props) {
  const [affiliation, setAffiliation] = useState(initialAffiliation);
  const [text, setText] = useState(initialText);
  const [label, setLabel] = useState(initialLabel);
  const [presetName, setPresetName] = useState(initialLabel || initialText || '');
  const [useCustomColor, setUseCustomColor] = useState(!!initialColor);
  const [color, setColor] = useState(initialColor ?? '#f59e0b');

  const activeColor = useCustomColor ? color : undefined;
  const trimmedText = text.trim();
  const trimmedLabel = label.trim();
  const trimmedPresetName = presetName.trim();
  const value: CustomSymbolValue = {
    affiliation,
    text: trimmedText,
    label: trimmedLabel,
    color: activeColor,
    size: 44,
  };

  const preview = useMemo(() => {
    const { svg, width, height } = frameSvg(affiliation, 72, activeColor);
    const fontSize = Math.max(12, Math.round(height * 0.42));
    return { svg, width, height, fontSize };
  }, [affiliation, activeColor]);

  function savePreset() {
    if (!onSavePreset || !trimmedText) return;
    onSavePreset({ ...value, name: trimmedPresetName || trimmedLabel || trimmedText });
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-gray-950/97 pt-[max(0.5rem,env(safe-area-inset-top))]">
      <div className="flex items-center justify-between px-4 py-3">
        <h2 className="text-lg font-bold">Custom symbol</h2>
        <button onClick={onCancel} className="rounded-full p-2 text-gray-400 hover:bg-gray-800" aria-label="Close">
          ✕
        </button>
      </div>

      <div className="flex flex-col items-center border-b border-gray-800 pb-4">
        <div
          className="relative flex items-center justify-center"
          style={{ width: preview.width, height: preview.height }}
        >
          <div dangerouslySetInnerHTML={{ __html: preview.svg }} />
          <div
            className="pointer-events-none absolute inset-0 flex items-center justify-center px-1 text-center font-extrabold leading-none text-black"
            style={{ fontSize: preview.fontSize }}
          >
            {text}
          </div>
        </div>
        {label && <div className="mt-1 text-sm font-semibold text-white">{label}</div>}
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4">
        <section className="mb-5">
          <h3 className="mb-2 text-sm font-semibold text-gray-400">Affiliation (frame)</h3>
          <div className="grid grid-cols-4 gap-2">
            {AFFILIATIONS.map((a) => (
              <button
                key={a.id}
                onClick={() => setAffiliation(a.code)}
                className={`rounded-lg py-2 text-sm font-medium ${
                  affiliation === a.code ? 'bg-sky-600 text-white' : 'bg-gray-800 text-gray-300'
                }`}
              >
                {a.name}
              </button>
            ))}
          </div>
        </section>

        <section className="mb-5">
          <h3 className="mb-2 text-sm font-semibold text-gray-400">Content (anything you like)</h3>
          <input
            autoFocus
            value={text}
            onChange={(e) => {
              setText(e.target.value);
              if (!presetName.trim()) setPresetName(e.target.value);
            }}
            placeholder="e.g. HQ, C2, ⚑, 42"
            maxLength={8}
            className="w-full rounded-lg bg-gray-800 px-4 py-3 text-center text-xl font-bold outline-none ring-sky-500 focus:ring-2"
          />
          <p className="mt-1 text-xs text-gray-500">Letters, numbers or emoji — up to 8 characters.</p>
        </section>

        <section className="mb-5">
          <label className="mb-2 flex items-center gap-2 text-sm text-gray-300">
            <input
              type="checkbox"
              checked={useCustomColor}
              onChange={(e) => setUseCustomColor(e.target.checked)}
              className="h-5 w-5"
            />
            Custom frame color
          </label>
          {useCustomColor && (
            <input
              type="color"
              value={color}
              onChange={(e) => setColor(e.target.value)}
              className="h-10 w-full rounded-lg bg-gray-800"
            />
          )}
        </section>

        <section className="mb-5">
          <h3 className="mb-2 text-sm font-semibold text-gray-400">Label (optional)</h3>
          <input
            value={label}
            onChange={(e) => {
              setLabel(e.target.value);
              if (!presetName.trim()) setPresetName(e.target.value);
            }}
            placeholder="Rendered under the symbol"
            className="w-full rounded-lg bg-gray-800 px-4 py-3 text-base outline-none ring-sky-500 focus:ring-2"
          />
        </section>

        {allowPreset && (
          <section className="mb-2 rounded-xl border border-sky-900/70 bg-sky-950/30 p-3">
            <h3 className="mb-2 text-sm font-semibold text-sky-300">Preset name</h3>
            <input
              value={presetName}
              onChange={(e) => setPresetName(e.target.value)}
              placeholder="Name shown in the presets category"
              className="w-full rounded-lg bg-gray-800 px-4 py-3 text-base outline-none ring-sky-500 focus:ring-2"
            />
            <p className="mt-2 text-xs text-gray-400">
              Save as preset to reuse this symbol later without placing it on the current map.
            </p>
          </section>
        )}
      </div>

      <div className="flex gap-3 border-t border-gray-800 p-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
        <button onClick={onCancel} className="rounded-lg bg-gray-800 px-4 py-3 font-semibold text-gray-300">
          Cancel
        </button>
        {allowPreset && onSavePreset && (
          <button
            onClick={savePreset}
            disabled={!trimmedText}
            className="flex-1 rounded-lg bg-indigo-600 py-3 font-semibold text-white disabled:bg-gray-700 disabled:text-gray-500"
          >
            Save preset
          </button>
        )}
        <button
          onClick={() => onSave(value)}
          disabled={!trimmedText}
          className="flex-1 rounded-lg bg-sky-600 py-3 font-semibold text-white disabled:bg-gray-700 disabled:text-gray-500"
        >
          {allowPreset ? 'Add to map' : 'Save'}
        </button>
      </div>
    </div>
  );
}
