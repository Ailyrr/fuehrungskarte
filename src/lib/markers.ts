import type { DrawingObject, LabelObject, MapObject, SymbolObject } from '../types';
import { symbolToSvg } from './symbols';

function escapeHtml(text: string): string {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

export function strokesToSvg(drawing: DrawingObject): string {
  const paths = drawing.strokes
    .map((stroke) => {
      if (stroke.points.length === 0) return '';
      const d = stroke.points
        .map((p, i) => `${i === 0 ? 'M' : 'L'}${p[0].toFixed(1)} ${p[1].toFixed(1)}`)
        .join(' ');
      return `<path d="${d}" fill="none" stroke="${stroke.color}" stroke-width="${stroke.width}" stroke-linecap="round" stroke-linejoin="round" />`;
    })
    .join('');
  return `<svg width="${drawing.w}" height="${drawing.h}" viewBox="0 0 ${drawing.w} ${drawing.h}" xmlns="http://www.w3.org/2000/svg">${paths}</svg>`;
}

function labelHtml(label: LabelObject): string {
  const bg = label.bg ? 'background:rgba(17,24,39,0.85);padding:4px 8px;border-radius:6px;' : 'text-shadow:0 1px 2px #000,0 0 2px #000;';
  return `<div class="fk-label" style="color:${label.color};${bg}">${escapeHtml(label.text) || '&nbsp;'}</div>`;
}

function drawingHtml(drawing: DrawingObject): string {
  return `<div class="fk-drawing" style="width:${drawing.w}px;height:${drawing.h}px;">${strokesToSvg(drawing)}</div>`;
}

function symbolHtml(symbol: SymbolObject): string {
  return `<div class="fk-symbol">${symbolToSvg(symbol.sidc, { size: symbol.size, label: symbol.label })}</div>`;
}

export function objectInnerHtml(object: MapObject): string {
  switch (object.type) {
    case 'label':
      return labelHtml(object);
    case 'drawing':
      return drawingHtml(object);
    case 'symbol':
      return symbolHtml(object);
  }
}

/** Create the DOM element used as a MapLibre marker for the given object. */
export function createMarkerElement(object: MapObject): HTMLDivElement {
  const el = document.createElement('div');
  el.className = 'fk-marker no-select';
  el.dataset.id = object.id;
  el.innerHTML = objectInnerHtml(object);
  return el;
}

export function updateMarkerElement(el: HTMLDivElement, object: MapObject, selected: boolean): void {
  el.innerHTML = objectInnerHtml(object);
  el.classList.toggle('fk-marker-selected', selected);
}
