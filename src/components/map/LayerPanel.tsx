import React, { useState } from 'react';
import { Layers, ChevronDown, ChevronUp, Eye, EyeOff } from 'lucide-react';
import type { MapLayerItem } from '../../features/map/types';

export interface LayerPanelProps {
  layers: MapLayerItem[];
  onToggleLayer: (id: string, visible: boolean) => void;
  className?: string;
  defaultExpanded?: boolean;
}

export const LayerPanel: React.FC<LayerPanelProps> = ({
  layers,
  onToggleLayer,
  className = '',
  defaultExpanded = true,
}) => {
  const [expanded, setExpanded] = useState(defaultExpanded);

  return (
    <div
      className={`bg-white/95 backdrop-blur-sm border border-border rounded-card shadow-sm transition-all duration-200 text-text ${className}`}
      aria-label="Map Layers Control"
    >
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between px-3 py-2 text-xs font-semibold text-text hover:bg-surface-2/60 rounded-card transition-colors select-none"
        aria-expanded={expanded}
      >
        <span className="flex items-center gap-1.5 font-semibold text-brand">
          <Layers size={14} className="text-accent" />
          Map Layers
          {layers.length > 0 && (
            <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-brand-soft text-brand font-mono font-medium">
              {layers.filter((l) => l.visible).length}/{layers.length}
            </span>
          )}
        </span>
        {expanded ? <ChevronDown size={14} className="text-text-3" /> : <ChevronUp size={14} className="text-text-3" />}
      </button>

      {expanded && (
        <div className="px-3 pb-3 pt-1 border-t border-border/60 text-xs">
          {layers.length === 0 ? (
            <div className="py-2 text-center text-text-3 text-xs italic">
              No active hazard layers
            </div>
          ) : (
            <div className="space-y-1.5">
              {layers.map((layer) => {
                const Icon = layer.icon;
                return (
                  <div
                    key={layer.id}
                    className="flex items-center justify-between py-1 px-1.5 rounded-btn hover:bg-surface-2 transition-colors cursor-pointer"
                    onClick={() => onToggleLayer(layer.id, !layer.visible)}
                  >
                    <div className="flex items-center gap-2">
                      {Icon ? (
                        <Icon size={14} className={layer.visible ? 'text-brand' : 'text-text-3'} />
                      ) : (
                        <span className="w-2 h-2 rounded-full bg-accent" />
                      )}
                      <span className={`font-medium ${layer.visible ? 'text-text' : 'text-text-3 line-through'}`}>
                        {layer.name}
                      </span>
                      {layer.count !== undefined && (
                        <span className="text-[10px] px-1 bg-surface-2 border border-border rounded-chip text-text-2 font-mono">
                          {layer.count}
                        </span>
                      )}
                    </div>
                    <button
                      type="button"
                      aria-label={`Toggle ${layer.name}`}
                      className="p-1 text-text-3 hover:text-brand transition-colors"
                    >
                      {layer.visible ? (
                        <Eye size={14} className="text-accent" />
                      ) : (
                        <EyeOff size={14} className="text-text-3" />
                      )}
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
