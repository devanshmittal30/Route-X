import React, { useState, useEffect } from 'react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { RiskBadge } from '../ui/RiskBadge';
import { getSavedRoutes, deleteSavedRoute, type SavedRoute } from '../../features/routing/savedRoutesService';
import { levelFor } from '../../features/risk';
import { Bookmark, Trash2, Car, Footprints, Loader2, Calendar } from 'lucide-react';

export interface SavedRoutesModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectRoute: (savedRoute: SavedRoute) => void;
}

export const SavedRoutesModal: React.FC<SavedRoutesModalProps> = ({
  isOpen,
  onClose,
  onSelectRoute,
}) => {
  const [routes, setRoutes] = useState<SavedRoute[]>([]);
  const [loading, setLoading] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const fetchRoutes = async () => {
    setLoading(true);
    try {
      const data = await getSavedRoutes();
      setRoutes(data);
    } catch (err) {
      console.warn('Failed to fetch saved routes:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchRoutes();
    }
  }, [isOpen]);

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!window.confirm('Are you sure you want to delete this saved route?')) return;
    setDeletingId(id);
    try {
      await deleteSavedRoute(id);
      setRoutes((prev) => prev.filter((r) => r.id !== id));
    } catch (err) {
      alert((err as Error).message || 'Failed to delete route.');
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Saved Mountain Routes"
      size="md"
    >
      <div className="space-y-4">
        <p className="text-xs text-text-3">
          Select any saved route to load its coordinates and trigger a live risk re-scoring.
        </p>

        {loading ? (
          <div className="py-8 flex flex-col items-center justify-center text-text-3 gap-2">
            <Loader2 size={24} className="animate-spin text-accent" />
            <span className="text-xs">Loading saved routes...</span>
          </div>
        ) : routes.length === 0 ? (
          <div className="py-8 text-center space-y-2 border border-dashed border-border rounded-card p-6">
            <Bookmark size={28} className="mx-auto text-text-3" />
            <p className="text-body font-semibold text-text">No Saved Routes Yet</p>
            <p className="text-xs text-text-3 max-w-sm mx-auto">
              Plan any route between hill towns or trails and tap "Save Route" to keep it in your profile for quick re-scoring and alerts.
            </p>
          </div>
        ) : (
          <div className="space-y-2.5 max-h-[400px] overflow-y-auto pr-1">
            {routes.map((r) => {
              const level = levelFor(r.risk_score || 0);
              const dateStr = new Date(r.created_at).toLocaleDateString([], {
                month: 'short',
                day: 'numeric',
                year: 'numeric',
              });

              return (
                <div
                  key={r.id}
                  onClick={() => {
                    onSelectRoute(r);
                    onClose();
                  }}
                  className="p-3.5 rounded-card bg-surface hover:bg-surface-2 border border-border transition-all cursor-pointer flex items-center justify-between group"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="p-1 rounded bg-surface-2 border border-border text-brand">
                        {r.mode === 'walk' ? (
                          <Footprints size={13} />
                        ) : (
                          <Car size={13} />
                        )}
                      </span>
                      <span className="text-body font-semibold text-text group-hover:text-brand transition-colors">
                        {r.from_label} → {r.to_label}
                      </span>
                    </div>

                    <div className="flex items-center gap-3 text-[11px] text-text-3 font-mono">
                      <span className="flex items-center gap-1">
                        <Calendar size={11} /> Saved {dateStr}
                      </span>
                      <span>·</span>
                      <span>Saved Score: {r.risk_score}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <RiskBadge
                      level={level.toLowerCase() as import('../ui/RiskBadge').RiskLevel}
                      score={r.risk_score}
                      size="sm"
                    />
                    <button
                      type="button"
                      disabled={deletingId === r.id}
                      onClick={(e) => handleDelete(r.id, e)}
                      aria-label="Delete route"
                      className="p-1.5 rounded text-text-3 hover:text-danger hover:bg-danger-soft transition-colors ml-1"
                    >
                      {deletingId === r.id ? (
                        <Loader2 size={14} className="animate-spin text-danger" />
                      ) : (
                        <Trash2 size={14} />
                      )}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <div className="pt-2 flex justify-end">
          <Button variant="secondary" size="sm" onClick={onClose}>
            Close
          </Button>
        </div>
      </div>
    </Modal>
  );
};
