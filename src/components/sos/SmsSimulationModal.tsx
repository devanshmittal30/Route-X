import React from 'react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Phone, CheckCircle2, CloudOff, AlertTriangle, ExternalLink } from 'lucide-react';
import type { SosDispatchResult } from '../../features/sos/types';
import { EMERGENCY_NUMBERS } from '../../features/sos/sosService';

export interface SmsSimulationModalProps {
  isOpen: boolean;
  onClose: () => void;
  dispatchResult: SosDispatchResult | null;
}

export const SmsSimulationModal: React.FC<SmsSimulationModalProps> = ({
  isOpen,
  onClose,
  dispatchResult,
}) => {
  if (!dispatchResult) return null;

  // Extract maps link if present in message
  const mapsLinkMatch = dispatchResult.message.match(/https:\/\/maps\.google\.com\/\?q=[^\s]+/);
  const mapsLink = mapsLinkMatch ? mapsLinkMatch[0] : null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size="md"
      className="p-5"
    >
      {/* Simulation Banner */}
      <div className="mb-4 bg-amber-50 border border-amber-200 rounded-md p-2.5 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0" />
          <span className="text-xs font-bold uppercase tracking-wider text-amber-800">
            Simulated: not actually sent
          </span>
        </div>
        <span className="text-[10px] text-amber-700 bg-amber-100 px-2 py-0.5 rounded font-mono">
          Demo Mode
        </span>
      </div>

      {/* Simulated Phone Container */}
      <div className="bg-slate-900 text-white rounded-2xl p-4 shadow-xl border border-slate-800 relative overflow-hidden">
        {/* Phone Top Bar */}
        <div className="flex items-center justify-between text-[11px] text-slate-400 pb-3 mb-3 border-b border-slate-800">
          <div className="flex items-center gap-1.5">
            <span className="font-semibold text-slate-200">RouteX Emergency SMS</span>
            {dispatchResult.isQueued ? (
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] bg-amber-500/20 text-amber-300 font-mono">
                <CloudOff className="w-2.5 h-2.5" />
                Offline Queued
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] bg-emerald-500/20 text-emerald-300 font-mono">
                <CheckCircle2 className="w-2.5 h-2.5" />
                Live Dispatched
              </span>
            )}
          </div>
          <span className="font-mono text-slate-400">{dispatchResult.sentAt}</span>
        </div>

        {/* Recipients list */}
        <div className="mb-3 text-xs bg-slate-800/80 rounded-lg p-2.5 border border-slate-700/60">
          <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider mb-1">
            Recipients ({dispatchResult.recipients.length}):
          </div>
          <div className="flex flex-wrap gap-1.5">
            {dispatchResult.recipients.map((c) => (
              <span
                key={c.id}
                className="inline-flex items-center gap-1 px-2 py-0.5 bg-slate-700 text-slate-200 rounded text-[11px] font-mono"
              >
                <span>{c.name}</span>
                <span className="text-slate-400">({c.phone})</span>
              </span>
            ))}
          </div>
        </div>

        {/* SMS Bubble */}
        <div className="flex justify-end my-3">
          <div className="max-w-[92%] bg-blue-600 text-white rounded-2xl rounded-tr-xs p-3.5 shadow-md">
            <p className="text-xs leading-relaxed font-sans whitespace-pre-wrap select-all">
              {dispatchResult.message}
            </p>
            <div className="mt-2 pt-1 border-t border-blue-500/50 flex items-center justify-between text-[10px] text-blue-200">
              <span>SMS via Carrier Gateway</span>
              <span>Delivered</span>
            </div>
          </div>
        </div>

        {mapsLink && (
          <div className="mt-2 text-right">
            <a
              href={mapsLink}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-[11px] text-blue-400 hover:text-blue-300 underline"
            >
              Verify Location on Google Maps <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        )}
      </div>

      {/* Emergency Helplines Call-to-Action */}
      <div className="mt-4 pt-3 border-t border-border flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="w-full sm:w-auto flex flex-col sm:flex-row gap-2">
          {/* TODO: verify numbers before demo */}
          <a
            href={EMERGENCY_NUMBERS.national.tel}
            className="flex items-center justify-center gap-2 px-4 py-2 bg-sos text-white font-bold text-xs rounded-btn hover:opacity-90 transition-opacity"
          >
            <Phone className="w-3.5 h-3.5" />
            Dial 112 (National)
          </a>
          <a
            href={EMERGENCY_NUMBERS.ndma.tel}
            className="flex items-center justify-center gap-2 px-4 py-2 bg-surface text-text border border-border font-medium text-xs rounded-btn hover:bg-surface-hover transition-colors"
          >
            <Phone className="w-3.5 h-3.5 text-sos" />
            Dial 1078 (NDMA)
          </a>
        </div>

        <Button variant="secondary" size="sm" onClick={onClose}>
          Close Simulation
        </Button>
      </div>
    </Modal>
  );
};

