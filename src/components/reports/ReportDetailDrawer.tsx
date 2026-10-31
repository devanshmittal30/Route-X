import React from 'react';
import { Drawer } from '../ui/Drawer';
import type { HazardReport } from '../../features/reports/types';
import { REPORT_TYPE_CONFIG } from './ReportCard';
import { VerifyBar } from './VerifyBar';
import { TestBadge } from '../ui/StatusBadges';
import { Clock, MapPin } from 'lucide-react';

export interface ReportDetailDrawerProps {
  report: HazardReport | null;
  isOpen: boolean;
  onClose: () => void;
}

export const ReportDetailDrawer: React.FC<ReportDetailDrawerProps> = ({
  report,
  isOpen,
  onClose,
}) => {
  if (!report) return null;

  const typeConfig = REPORT_TYPE_CONFIG[report.type] || REPORT_TYPE_CONFIG.landslide;

  return (
    <Drawer
      isOpen={isOpen}
      onClose={onClose}
      title={`${typeConfig.label} Hazard Detail`}
    >
      <div className="space-y-4">
        {/* Type & Status */}
        <div className="flex items-start justify-between gap-3 p-3.5 bg-surface rounded-card border border-border">
          <div className="flex items-center gap-2.5">
            <div className={`p-2.5 rounded-full ${typeConfig.bg}`}>
              {typeConfig.icon}
            </div>
            <div>
              <div className="flex items-center gap-1.5 flex-wrap">
                <h3 className="font-bold text-sm text-text leading-tight">
                  {typeConfig.label}
                </h3>
                {report.is_test && <TestBadge size="sm" />}
              </div>
              <p className="text-xs text-text-3 font-mono mt-0.5">
                Severity {report.severity}/3 · Status: {report.status}
              </p>
            </div>
          </div>

          <span className="px-2 py-0.5 rounded-chip text-[11px] font-mono font-medium bg-white border border-border">
            S{report.severity}
          </span>
        </div>

        {/* Description */}
        {report.description && (
          <div className="space-y-1">
            <h4 className="text-xs font-semibold text-text-3 uppercase tracking-wider">
              Description
            </h4>
            <p className="text-xs text-text leading-relaxed bg-surface p-3 rounded-btn border border-border">
              {report.description}
            </p>
          </div>
        )}

        {/* Photo view */}
        {report.photo_url && (
          <div className="space-y-1">
            <h4 className="text-xs font-semibold text-text-3 uppercase tracking-wider">
              Evidence Photo
            </h4>
            <div className="rounded-btn overflow-hidden border border-border bg-black max-h-60 flex items-center justify-center">
              <img
                src={report.photo_url}
                alt="Hazard report evidence"
                onError={(e) => {
                  (e.target as HTMLElement).parentElement?.classList.add('hidden');
                }}
                className="max-h-56 w-auto object-contain"
              />
            </div>
          </div>
        )}

        {/* Location & Timestamp details */}
        <div className="p-3 bg-surface rounded-btn border border-border space-y-2 text-xs font-mono">
          <div className="flex items-center justify-between text-text-2">
            <span className="flex items-center gap-1">
              <MapPin size={12} className="text-brand" />
              Coordinates
            </span>
            <span className="text-text font-semibold">
              {report.coordinates[1].toFixed(4)}°N, {report.coordinates[0].toFixed(4)}°E
            </span>
          </div>

          <div className="flex items-center justify-between text-text-2">
            <span className="flex items-center gap-1">
              <Clock size={12} />
              Created
            </span>
            <span>{new Date(report.created_at).toLocaleString()}</span>
          </div>

          <div className="flex items-center justify-between text-text-2">
            <span>Expires</span>
            <span>{new Date(report.expires_at).toLocaleString()}</span>
          </div>
        </div>

        {/* Peer Verification Bar */}
        <div className="p-3 bg-brand-soft/30 rounded-card border border-brand/20 space-y-2">
          <h4 className="text-xs font-semibold text-brand uppercase tracking-wider">
            Community Peer Verification
          </h4>
          <VerifyBar
            reportId={report.id}
            reportUserId={report.user_id}
            upCount={report.up_count}
            downCount={report.down_count}
            status={report.status}
          />
        </div>
      </div>
    </Drawer>
  );
};
