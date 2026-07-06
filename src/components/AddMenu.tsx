interface Props {
  onSelect: (kind: 'label' | 'drawing' | 'symbol') => void;
  onClose: () => void;
}

const ITEMS: { kind: 'label' | 'drawing' | 'symbol'; icon: string; title: string; desc: string }[] = [
  { kind: 'label', icon: 'A', title: 'Label', desc: 'Add a text annotation' },
  { kind: 'drawing', icon: '✎', title: 'Drawing', desc: 'Sketch inside a movable box' },
  { kind: 'symbol', icon: '◆', title: 'Tactical symbol', desc: 'NATO APP-6 / MIL-STD-2525' },
];

export default function AddMenu({ onSelect, onClose }: Props) {
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50" onClick={onClose}>
      <div
        className="w-full max-w-lg rounded-t-2xl bg-gray-900 p-4 pb-[max(1rem,env(safe-area-inset-bottom))] shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mx-auto mb-3 h-1.5 w-10 rounded-full bg-gray-700" />
        <h2 className="mb-3 px-1 text-base font-semibold text-gray-300">Add to map</h2>
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
