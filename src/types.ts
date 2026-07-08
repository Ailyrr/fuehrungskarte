export type LngLat = [number, number];

export interface Camera {
  center: LngLat;
  zoom: number;
  bearing: number;
  pitch: number;
}

export interface ProjectLocation {
  /** The raw text the user searched for. */
  query: string;
  /** The human readable label of the chosen result. */
  label: string;
}

export interface BaseObject {
  id: string;
  lngLat: LngLat;
}

export interface LabelObject extends BaseObject {
  type: 'label';
  text: string;
  color: string;
  /** Whether to render a solid background behind the text. */
  bg: boolean;
}

export interface Stroke {
  points: [number, number][];
  color: string;
  width: number;
}

export interface DrawingObject extends BaseObject {
  type: 'drawing';
  strokes: Stroke[];
  /** Container size in CSS pixels (the canvas the strokes were drawn on). */
  w: number;
  h: number;
  /** Display scale applied when rendering the drawing on the map. */
  scale?: number;
}

export interface SymbolObject extends BaseObject {
  type: 'symbol';
  /** MIL-STD-2525 / APP-6 Symbol Identification Code. */
  sidc: string;
  size: number;
  /** Optional short label rendered under the symbol. */
  label?: string;
}

/**
 * A custom tactical symbol: a standard NATO affiliation frame with arbitrary
 * text / content placed inside it.
 */
export interface CustomSymbolObject extends BaseObject {
  type: 'custom';
  /** milsymbol standard-identity digit: '3' friend, '6' hostile, '4' neutral, '1' unknown. */
  affiliation: string;
  /** Free-form content shown inside the frame. */
  text: string;
  /** Optional label rendered under the frame. */
  label?: string;
  size: number;
  /** Optional custom frame color; when unset the standard affiliation color is used. */
  color?: string;
}

/**
 * A highlighted region drawn as a polygon. Unlike point objects, areas are
 * geo-referenced and scale with the map zoom. `lngLat` is the polygon centroid,
 * used to anchor the label.
 */
export interface AreaObject extends BaseObject {
  type: 'area';
  points: LngLat[];
  color: string;
  label?: string;
}

export type MapObject =
  | LabelObject
  | DrawingObject
  | SymbolObject
  | CustomSymbolObject
  | AreaObject;

export interface Project {
  id: string;
  name: string;
  createdAt: number;
  updatedAt: number;
  location: ProjectLocation;
  camera: Camera;
  objects: MapObject[];
}

export interface CustomSymbolPreset {
  id: string;
  name: string;
  affiliation: string;
  text: string;
  label?: string;
  size: number;
  color?: string;
  createdAt: number;
}

export interface ProjectSummary {
  id: string;
  name: string;
  label: string;
  updatedAt: number;
  objectCount: number;
}

/** File format used for export / import. */
export interface ProjectExport {
  format: 'fuehrungskarte';
  version: 1;
  project: Project;
}
