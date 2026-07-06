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
}

export interface SymbolObject extends BaseObject {
  type: 'symbol';
  /** MIL-STD-2525 / APP-6 Symbol Identification Code. */
  sidc: string;
  size: number;
  /** Optional short label rendered under the symbol. */
  label?: string;
}

export type MapObject = LabelObject | DrawingObject | SymbolObject;

export interface Project {
  id: string;
  name: string;
  createdAt: number;
  updatedAt: number;
  location: ProjectLocation;
  camera: Camera;
  objects: MapObject[];
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
