import type { CustomSymbolPreset } from '../types';

export type AddKind = 'label' | 'drawing' | 'symbol' | 'custom' | 'area';

interface Props {
  presets: CustomSymbolPreset[];
  onSelect: (kind: AddKind) => void;
  onPreset: (preset: CustomSymbolPreset) => void;
  onClose: () => void;
}

const ITEMS: { kind: AddKind; icon: string; title: string; desc: string }[] = [
  { kind: 'area', icon: '⬠', title: 'Area', desc: 'Highlight a region (scales with the map)' },
  { kind: 'label', icon: 'A', title: 'Label', desc: 'Add a text annotation' },
  { kind: 'drawing', icon: '✎', title: 'Drawing', desc: 'Sketch inside a movable box' },
  { kind: 'symbol', icon: '◆', title: 'Tactical symbol', desc: 'NATO APP-6 / MIL-STD-2525' },
  { kind: 'custom', icon: '✱', title: 'Custom symbol', desc: 'Create one or save it as a preset' },
];

export default function AddMenu({ presets, onSelect, onPreset, onClose }: Props) {
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50" onClick={onClose}>
      <div
        className="max-h-[85vh] w-full max-w-lg overflow-y-auto rounded-t-2xl bg-gray-900 p-4 pb-[max(1rem,env(safe-area-inset-bottom))] shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mx-auto mb-3 h-1.5 w-10 rounded-full bg-gray-700" />
        <h2 className="mb-3 px-1 text-base font-semibold text-gray-300">Add to map</h2>

        {presets.length > 0 && (
          <section className="mb-4">
            <h3 className="mb-2 px-1 text-sm font-semibold uppercase tracking-wide text-sky-300">Presets</h3>
            <div className="flex flex-col gap-2">
              {presets.map((preset) => (
                <button
                  key={preset.id}
                  onClick={() => onPreset(preset)}
                  className="flex items-center gap-4 rounded-xl bg-sky-950/70 px-4 py-3 text-left active:bg-sky-900"
                >
                  <span className="flex h-11 w-11 items-center justify-center rounded-lg bg-sky-600 text-lg font-extrabold text-white">
                    {preset.text}
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate text-base font-semibold">{preset.name}</span>
                    <span className="block truncate text-sm text-gray-400">
                      {preset.label ? `${preset.label} · ` : ''}Custom tactical symbol
                    </span>
                  </span>
                </button>
              ))}
            </div>
          </section>
        )}

        <div className="flex flex-col gap-2">
          {ITEMS.map((item) => (
            <button
              key={item.kind}
              onClick={() => onSelect(item.kind)}
              className="flex items-center gap-4 rounded-xl bg-gray-800 px-4 py-4 text-left active:bg-gray-700"
            >
              <span className="flex h-11 w-11 items-center justify-center rounded-lg bg-sky-600 text-xl font-bold text-white">
                {item.icon}
              </span>
              <span>
                <span className="block text-base font-semibold">{item.title}</span>
                <span className="block text-sm text-gray-400">{item.desc}</span>
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
