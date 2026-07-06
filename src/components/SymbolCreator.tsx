import { useMemo, useState } from 'react';
import {
  AFFILIATIONS,
  buildSidc,
  ECHELONS,
  LAND_UNIT_ICONS,
  parseSidc,
  symbolToSvg,
} from '../lib/symbols';

interface Props {
  initialSidc?: string;
  initialLabel?: string;
  onSave: (value: { sidc: string; label: string; size: number }) => void;
  onCancel: () => void;
}

export default function SymbolCreator({ initialSidc, initialLabel = '', onSave, onCancel }: Props) {
  const initial = initialSidc ? parseSidc(initialSidc) : null;
  const [affiliation, setAffiliation] = useState(initial?.affiliation ?? '3');
  const [entity, setEntity] = useState(initial?.entity ?? '121100');
  const [echelon, setEchelon] = useState(initial?.echelon ?? '00');
  const [status, setStatus] = useState(initial?.status ?? '0');
  const [hq, setHq] = useState(initial?.hq ?? false);
  const [label, setLabel] = useState(initialLabel);

  const sidc = useMemo(
    () => buildSidc({ affiliation, entity, echelon, status, hq }),
    [affiliation, entity, echelon, status, hq],
  );
  const previewSvg = useMemo(() => symbolToSvg(sidc, { size: 60, label }), [sidc, label]);
  const iconSvg = (e: string) => symbolToSvg(buildSidc({ affiliation, entity: e, echelon: '00', status: '0', hq: false }), { size: 24 });

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-gray-950/97 pt-[max(0.5rem,env(safe-area-inset-top))]">
      <div className="flex items-center justify-between px-4 py-3">
        <h2 className="text-lg font-bold">Tactical symbol</h2>
        <button onClick={onCancel} className="rounded-full p-2 text-gray-400 hover:bg-gray-800" aria-label="Close">
          ✕
        </button>
      </div>

      <div className="flex flex-col items-center border-b border-gray-800 pb-3">
        <div className="flex h-24 items-center justify-center" dangerouslySetInnerHTML={{ __html: previewSvg }} />
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4">
        <section className="mb-5">
          <h3 className="mb-2 text-sm font-semibold text-gray-400">Affiliation</h3>
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
          <h3 className="mb-2 text-sm font-semibold text-gray-400">Icon</h3>
          <div className="grid grid-cols-4 gap-2">
            {LAND_UNIT_ICONS.map((icon) => (
              <button
                key={icon.entity}
                onClick={() => setEntity(icon.entity)}
                className={`flex flex-col items-center gap-1 rounded-lg p-2 text-center ${
                  entity === icon.entity ? 'bg-sky-600/30 ring-2 ring-sky-400' : 'bg-gray-800'
                }`}
              >
                <span className="flex h-7 items-center justify-center" dangerouslySetInnerHTML={{ __html: iconSvg(icon.entity) }} />
                <span className="text-[11px] leading-tight text-gray-300">{icon.name}</span>
              </button>
            ))}
          </div>
        </section>

        <section className="mb-5">
          <h3 className="mb-2 text-sm font-semibold text-gray-400">Echelon</h3>
          <select
            value={echelon}
            onChange={(e) => setEchelon(e.target.value)}
            className="w-full rounded-lg bg-gray-800 px-4 py-3 text-base outline-none"
          >
            {ECHELONS.map((e) => (
              <option key={e.code} value={e.code}>
                {e.name}
              </option>
            ))}
          </select>
        </section>

        <section className="mb-5 flex items-center gap-4">
          <label className="flex items-center gap-2 text-sm text-gray-300">
            <input type="checkbox" checked={hq} onChange={(e) => setHq(e.target.checked)} className="h-5 w-5" />
            Headquarters
          </label>
          <label className="flex items-center gap-2 text-sm text-gray-300">
            <input
              type="checkbox"
              checked={status === '1'}
              onChange={(e) => setStatus(e.target.checked ? '1' : '0')}
              className="h-5 w-5"
            />
            Planned / anticipated
          </label>
        </section>

        <section className="mb-2">
          <h3 className="mb-2 text-sm font-semibold text-gray-400">Designation (optional)</h3>
          <input
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder="e.g. 1-32 IN"
            className="w-full rounded-lg bg-gray-800 px-4 py-3 text-base outline-none ring-sky-500 focus:ring-2"
          />
        </section>
      </div>

      <div className="flex gap-3 border-t border-gray-800 p-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
        <button onClick={onCancel} className="flex-1 rounded-lg bg-gray-800 py-3 font-semibold text-gray-300">
          Cancel
        </button>
        <button
          onClick={() => onSave({ sidc, label: label.trim(), size: 40 })}
          className="flex-1 rounded-lg bg-sky-600 py-3 font-semibold text-white"
        >
          Save
        </button>
      </div>
    </div>
  );
}
