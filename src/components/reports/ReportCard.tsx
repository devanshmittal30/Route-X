import React, { useState } from 'react';
import {
  Ban,
  Mountain,
  Droplets,
  Snowflake,
  AlertTriangle,
  ShieldCheck,
  Clock,
  Navigation,
  ExternalLink,
} from 'lucide-react';
import type { HazardReport, ReportType } from '../../features/reports/types';
import { VerifyBar } from './VerifyBar';
import { TestBadge } from '../ui/StatusBadges';
import { Modal } from '../ui/Modal';

export interface ReportCardProps {
  report: HazardReport;
  onSelect?: () => void;
  className?: string;
}

export const REPORT_TYPE_CONFIG: Record<
  ReportType,
  { label: string; icon: React.ReactElement; color: string; bg: string }
> = {
  landslide: {
    label: 'Landslide',
    icon: <Mountain className="w-4 h-4 text-risk-severe" />,
    color: 'text-risk-severe',
    bg: 'bg-risk-severe-soft',
  },
  road_blocked: {
    label: 'Road Blocked',
    icon: <Ban className="w-4 h-4 text-risk-blocked" />,
    color: 'text-risk-blocked',
    bg: 'bg-risk-blocked-soft',
  },
  rockfall: {
    label: 'Rockfall',
    icon: <Mountain className="w-4 h-4 text-risk-high" />,
    color: 'text-risk-high',
    bg: 'bg-risk-high-soft',
  },
  flood: {
    label: 'Flood / Waterlogged',
    icon: <Droplets className="w-4 h-4 text-blue-600" />,
    color: 'text-blue-600',
    bg: 'bg-blue-50',
  },
  snow: {
    label: 'Heavy Snow / Ice',
    icon: <Snowflake className="w-4 h-4 text-cyan-600" />,
    color: 'text-cyan-600',
    bg: 'bg-cyan-50',
  },
  bridge_damage: {
    label: 'Bridge Damage',
    icon: <AlertTriangle className="w-4 h-4 text-amber-600" />,
    color: 'text-amber-600',
    bg: 'bg-amber-50',
  },
  all_clear: {
    label: 'All Clear',
    icon: <ShieldCheck className="w-4 h-4 text-risk-low" />,
    color: 'text-risk-low',
    bg: 'bg-risk-low-soft',
  },
};

function formatTimeAgo(isoString: string): string {
  const diffMs = Date.now() - new Date(isoString).getTime();
  const diffMins = Math.floor(diffMs / (1000 * 60));
  if (diffMins < 1) return 'just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  return `${Math.floor(diffHours / 24)}d ago`;
}

function formatDistanceMeters(meters?: number): string {
  if (meters === undefined) return '';
  if (meters < 1000) return `${meters} m away`;
  return `${(meters / 1000).toFixed(1)} km away`;
}

export const ReportCard: React.FC<ReportCardProps> = ({
  report,
  onSelect,
  className = '',
}) => {
  const [photoModalOpen, setPhotoModalOpen] = useState<boolean>(false);
  const typeConfig = REPORT_TYPE_CONFIG[report.type] || REPORT_TYPE_CONFIG.landslide;

  return (
    <div
      onClick={onSelect}
      className={`p-4 bg-white rounded-card border border-border transition-all shadow-xs hover:border-brand/40 ${
        onSelect ? 'cursor-pointer' : ''
      } ${className}`}
    >
      {/* Top row: Type, Severity dots, Badges */}
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex items-center gap-2">
          <div
            className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${typeConfig.bg}`}
          >
            {typeConfig.icon}
          </div>
          <div>
            <div className="flex items-center gap-1.5 flex-wrap">
              <h4 className="font-semibold text-sm text-text leading-tight">
                {typeConfig.label}
              </h4>
              {report.is_test && <TestBadge size="sm" />}
            </div>

            <div className="flex items-center gap-2 mt-0.5 text-xs text-text-3 font-mono">
              <span className="flex items-center gap-0.5">
                <Clock size={11} />
                {formatTimeAgo(report.created_at)}
              </span>
              {report.distance_m !== undefined && (
                <>
                  <span>·</span>
                  <span className="flex items-center gap-0.5 text-text-2 font-medium">
                    <Navigation size={10} />
                    {formatDistanceMeters(report.distance_m)}
                  </span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Severity Indicator: 1 to 3 dots */}
        <div className="flex items-center gap-1" title={`Severity ${report.severity}/3`}>
          {[1, 2, 3].map((level) => (
            <span
              key={level}
              className={`w-2 h-2 rounded-full ${
                level <= report.severity
                  ? report.severity === 3
                    ? 'bg-risk-severe'
                    : report.severity === 2
                      ? 'bg-risk-high'
                      : 'bg-risk-moderate'
                  : 'bg-surface-2 border border-border'
              }`}
            />
          ))}
          <span className="text-[10px] text-text-3 font-mono ml-0.5">
            S{report.severity}
          </span>
        </div>
      </div>

      {/* Description */}
      {report.description && (
        <p className="text-xs text-text-2 leading-relaxed mb-3 pl-10">
          {report.description}
        </p>
      )}

      {/* Photo thumbnail if uploaded */}
      {report.photo_url && (
        <div className="pl-10 mb-3">
          <div
            onClick={(e) => {
              e.stopPropagation();
              setPhotoModalOpen(true);
            }}
            className="group relative w-20 h-14 rounded-btn overflow-hidden border border-border bg-surface cursor-pointer"
          >
            <img
              src={report.photo_url}
              alt="Hazard report evidence"
              className="w-full h-full object-cover transition-transform group-hover:scale-105"
            />
            <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
              <ExternalLink size={12} className="text-white" />
            </div>
          </div>
        </div>
      )}

      {/* Embedded Peer Verification Bar */}
      <div className="pt-2.5 border-t border-border/60 pl-10">
        <VerifyBar
          reportId={report.id}
          reportUserId={report.user_id}
          upCount={report.up_count}
          downCount={report.down_count}
          status={report.status}
          initialUserVote={report.user_vote}
        />
      </div>

      {/* Photo Preview Modal */}
      {report.photo_url && (
        <Modal
          isOpen={photoModalOpen}
          onClose={() => setPhotoModalOpen(false)}
          title={`Photo Evidence: ${typeConfig.label}`}
        >
          <div className="space-y-3">
            <div className="max-h-[70vh] overflow-hidden rounded-btn bg-black flex items-center justify-center">
              <img
                src={report.photo_url}
                alt="Hazard report full view"
                className="max-h-[65vh] w-auto object-contain"
              />
            </div>
            <p className="text-xs text-text-3 font-mono">
              Coordinates: {report.coordinates[1].toFixed(4)}, {report.coordinates[0].toFixed(4)} · Submitted {new Date(report.created_at).toLocaleString()}
            </p>
          </div>
        </Modal>
      )}
    </div>
  );
};
