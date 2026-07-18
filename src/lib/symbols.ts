import ms from 'milsymbol';

/**
 * Helpers around milsymbol (MIL-STD-2525 / STANAG APP-6) symbol generation.
 *
 * SIDC layout used by milsymbol v3 (padded to 20 digits):
 *   [0-1]  version (13)
 *   [2]    context (0 = reality)
 *   [3]    affiliation / standard identity
 *   [4-5]  symbol set (10 = land unit)
 *   [6]    status (0 = present, 1 = planned)
 *   [7]    HQ / task force / dummy
 *   [8-9]  echelon / mobility amplifier
 *   [10-15] entity (main icon)
 */

export interface Affiliation {
  id: string;
  name: string;
  /** Standard identity digit. */
  code: string;
}

export const AFFILIATIONS: Affiliation[] = [
  { id: 'friend', name: 'Friend', code: '3' },
  { id: 'hostile', name: 'Hostile', code: '6' },
  { id: 'neutral', name: 'Neutral', code: '4' },
  { id: 'unknown', name: 'Unknown', code: '1' },
];

export interface Echelon {
  code: string;
  name: string;
}

export const ECHELONS: Echelon[] = [
  { code: '00', name: 'None' },
  { code: '11', name: 'Team / Crew' },
  { code: '12', name: 'Squad' },
  { code: '13', name: 'Section' },
  { code: '14', name: 'Platoon' },
  { code: '15', name: 'Company' },
  { code: '16', name: 'Battalion' },
  { code: '17', name: 'Regiment' },
  { code: '18', name: 'Brigade' },
  { code: '21', name: 'Division' },
  { code: '22', name: 'Corps' },
  { code: '23', name: 'Army' },
];

export interface SymbolIcon {
  /** 6-digit entity code. */
  entity: string;
  name: string;
}

export interface SymbolSetOption {
  /** 2-digit MIL-STD-2525 / APP-6 symbol set code. */
  code: string;
  name: string;
  description: string;
  defaultEntity: string;
  icons: SymbolIcon[];
  /** Unit-only modifiers that do not apply to tactical points. */
  allowEchelon: boolean;
  allowHq: boolean;
}

/** Curated set of common land-unit icons (symbol set 10). */
export const LAND_UNIT_ICONS: SymbolIcon[] = [
  { entity: '121100', name: 'Infantry' },
  { entity: '120500', name: 'Armour' },
  { entity: '121000', name: 'Combined Arms' },
  { entity: '121300', name: 'Reconnaissance' },
  { entity: '120400', name: 'Anti-Tank' },
  { entity: '130300', name: 'Field Artillery' },
  { entity: '130100', name: 'Air Defence' },
  { entity: '130800', name: 'Mortar' },
  { entity: '140700', name: 'Engineer' },
  { entity: '141200', name: 'Military Police' },
  { entity: '111000', name: 'Signal' },
  { entity: '161300', name: 'Medical' },
  { entity: '163400', name: 'Supply' },
  { entity: '161100', name: 'Maintenance' },
  { entity: '163600', name: 'Transportation' },
  { entity: '121500', name: 'Sniper' },
];

/** Curated set of common tactical point symbols (symbol set 25). */
export const TACTICAL_POINT_ICONS: SymbolIcon[] = [
  { entity: '160100', name: 'Observation Post / Outpost' },
  { entity: '160201', name: 'Reconnaissance Outpost' },
  { entity: '160202', name: 'Forward Observer Position' },
  { entity: '160203', name: 'CBRN Observation Post' },
  { entity: '160204', name: 'Sensor / Listening Post' },
  { entity: '160205', name: 'Combat Outpost' },
  { entity: '130300', name: 'Checkpoint' },
  { entity: '130500', name: 'Contact Point' },
  { entity: '130700', name: 'Decision Point' },
  { entity: '132200', name: 'Control Point' },
  { entity: '131400', name: 'Rally Point' },
  { entity: '160300', name: 'Target Reference Point' },
  { entity: '180100', name: 'Air Control Point' },
];

const LAND_UNIT_SET = '10';
const TACTICAL_POINT_SET = '25';

export const SYMBOL_SETS: SymbolSetOption[] = [
  {
    code: LAND_UNIT_SET,
    name: 'Land units',
    description: 'Unit frames such as infantry, armour and recon.',
    defaultEntity: '121100',
    icons: LAND_UNIT_ICONS,
    allowEchelon: true,
    allowHq: true,
  },
  {
    code: TACTICAL_POINT_SET,
    name: 'Tactical points',
    description: 'Point symbols such as observation posts and checkpoints.',
    defaultEntity: '160100',
    icons: TACTICAL_POINT_ICONS,
    allowEchelon: false,
    allowHq: false,
  },
];

export interface SidcParts {
  symbolSet?: string;
  affiliation: string;
  entity: string;
  echelon: string;
  status: string;
  hq: boolean;
}

export function buildSidc(parts: SidcParts): string {
  const { affiliation, entity, echelon, status, hq, symbolSet = LAND_UNIT_SET } = parts;
  const hqtfd = hq ? '2' : '0';
  const raw = '13' + '0' + affiliation + symbolSet + status + hqtfd + echelon + entity;
  return raw.padEnd(20, '0');
}

export function parseSidc(sidc: string): SidcParts {
  const padded = sidc.padEnd(20, '0');
  return {
    symbolSet: padded.slice(4, 6) || LAND_UNIT_SET,
    affiliation: padded[3] ?? '3',
    status: padded[6] ?? '0',
    hq: padded[7] === '2',
    echelon: padded.slice(8, 10) || '00',
    entity: padded.slice(10, 16) || '121100',
  };
}

export interface SymbolRenderOptions {
  size?: number;
  label?: string;
}

/** Render a SIDC to an SVG string. Returns a fallback marker if invalid. */
export function symbolToSvg(sidc: string, options: SymbolRenderOptions = {}): string {
  const symbol = new ms.Symbol(sidc, {
    size: options.size ?? 34,
    // Some tactical-point labels in milsymbol call its string-width helper
    // whenever the uniqueDesignation option is present; passing undefined then
    // crashes on `undefined.length`. Empty string renders no text but keeps the
    // label helper safe for those point symbols.
    uniqueDesignation: options.label ?? '',
    infoColor: '#ffffff',
    infoSize: 28,
    outlineColor: '#000000',
    outlineWidth: 2,
  });
  return symbol.asSVG();
}

export function symbolAnchor(sidc: string, size = 34): { x: number; y: number; width: number; height: number } {
  const symbol = new ms.Symbol(sidc, { size });
  const anchor = symbol.getAnchor();
  const dims = symbol.getSize();
  return { x: anchor.x, y: anchor.y, width: dims.width, height: dims.height };
}

/**
 * Render just the NATO affiliation frame (no icon) so custom content can be
 * overlaid inside it. For frame-only symbols milsymbol centers the frame at the
 * exact geometric center of the SVG, so overlaid text can sit at 50%/50%.
 */
export function frameSvg(
  affiliation: string,
  size = 40,
  color?: string,
): { svg: string; width: number; height: number } {
  const sidc = buildSidc({ affiliation, entity: '000000', echelon: '00', status: '0', hq: false });
  const symbol = new ms.Symbol(sidc, {
    size,
    icon: false,
    fill: true,
    fillColor: color || undefined,
    outlineColor: '#000000',
    outlineWidth: 2,
  });
  const dims = symbol.getSize();
  return { svg: symbol.asSVG(), width: dims.width, height: dims.height };
}
