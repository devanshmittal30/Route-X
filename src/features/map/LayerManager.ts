import maplibregl from 'maplibre-gl';
import type { Map as MapLibreMap, GeoJSONSource, AddLayerObject } from 'maplibre-gl';
import type { GeoJSON } from 'geojson';
import type { LayerManagerAPI, MapLayerItem, MapLayerStyle, MarkerHandle, MarkerOptions } from './types';
import { createMarkerElement, buildPopupHtml } from './markerUtils';

export class LayerManager implements LayerManagerAPI {
  private map: MapLibreMap;
  private layers = new Map<string, MapLayerItem>();
  private markers = new Map<string, { marker: maplibregl.Marker; popup?: maplibregl.Popup }>();
  private onLayersChange?: (layers: MapLayerItem[]) => void;

  constructor(map: MapLibreMap, onLayersChange?: (layers: MapLayerItem[]) => void) {
    this.map = map;
    this.onLayersChange = onLayersChange;
  }

  private notify() {
    this.onLayersChange?.(this.getLayers());
  }

  getLayers(): MapLayerItem[] {
    return Array.from(this.layers.values());
  }

  addGeoJSONLayer(
    id: string,
    data: GeoJSON | string,
    style?: MapLayerStyle,
    name: string = id
  ): void {
    if (!this.map.isStyleLoaded()) {
      this.map.once('load', () => this.addGeoJSONLayer(id, data, style, name));
      return;
    }

    const sourceId = `src-${id}`;
    const existingSource = this.map.getSource(sourceId) as GeoJSONSource | undefined;

    if (existingSource) {
      if (typeof data !== 'string') {
        existingSource.setData(data);
      }
    } else {
      this.map.addSource(sourceId, {
        type: 'geojson',
        data,
      });

      const layerType = style?.type || 'line';
      const paint = style?.paint || {
        'line-color': '#0B3C5D',
        'line-width': 3,
      };
      const layout = {
        visibility: 'visible',
        ...(style?.layout || {}),
      };

      const layerSpec: AddLayerObject = {
        id,
        source: sourceId,
        type: layerType,
        paint: paint as Record<string, unknown>,
        layout: layout as Record<string, unknown>,
      } as unknown as AddLayerObject;

      this.map.addLayer(layerSpec, style?.beforeId);

      this.layers.set(id, {
        id,
        name,
        visible: true,
      });
      this.notify();
    }
  }

  removeLayer(id: string): void {
    const sourceId = `src-${id}`;
    if (this.map.getLayer(id)) {
      this.map.removeLayer(id);
    }
    if (this.map.getSource(sourceId)) {
      this.map.removeSource(sourceId);
    }
    if (this.layers.has(id)) {
      this.layers.delete(id);
      this.notify();
    }
  }

  toggleLayer(id: string, visible: boolean): void {
    if (this.map.getLayer(id)) {
      this.map.setLayoutProperty(id, 'visibility', visible ? 'visible' : 'none');
      const item = this.layers.get(id);
      if (item) {
        item.visible = visible;
        this.notify();
      }
    }
  }

  fitToBounds(
    bounds: maplibregl.LngLatBoundsLike,
    options?: {
      padding?: number | { top: number; bottom: number; left: number; right: number };
      maxZoom?: number;
    }
  ): void {
    this.map.fitBounds(bounds, {
      padding: options?.padding ?? 40,
      maxZoom: options?.maxZoom ?? 15,
      duration: 1000,
    });
  }

  flyTo(
    center: maplibregl.LngLatLike,
    zoom?: number,
    options?: { duration?: number; essential?: boolean }
  ): void {
    this.map.flyTo({
      center,
      zoom: zoom ?? this.map.getZoom(),
      duration: options?.duration ?? 1200,
      essential: options?.essential ?? true,
    });
  }

  addMarker(options: MarkerOptions): MarkerHandle {
    const markerId = `marker-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
    const el = createMarkerElement(options);

    let popupInstance: maplibregl.Popup | undefined;
    if (options.popup) {
      popupInstance = new maplibregl.Popup({
        offset: [0, -14],
        closeButton: true,
        closeOnClick: false,
        className: 'routex-custom-popup',
      }).setHTML(buildPopupHtml(options.popup));
    }

    const marker = new maplibregl.Marker({
      element: el,
      anchor: 'bottom',
    })
      .setLngLat(options.lngLat)
      .addTo(this.map);

    if (popupInstance) {
      marker.setPopup(popupInstance);
    }

    this.markers.set(markerId, { marker, popup: popupInstance });

    return {
      id: markerId,
      remove: () => {
        marker.remove();
        this.markers.delete(markerId);
      },
      updateLngLat: (coords: [number, number]) => {
        marker.setLngLat(coords);
      },
      togglePopup: () => {
        marker.togglePopup();
      },
    };
  }

  clearMarkers(): void {
    for (const { marker } of this.markers.values()) {
      marker.remove();
    }
    this.markers.clear();
  }

  getZoom(): number {
    return this.map.getZoom();
  }

  onZoom(callback: (zoom: number) => void): () => void {
    const handler = () => callback(this.map.getZoom());
    this.map.on('zoomend', handler);
    return () => {
      this.map.off('zoomend', handler);
    };
  }
}
