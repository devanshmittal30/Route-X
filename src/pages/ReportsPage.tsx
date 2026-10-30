import React, { useState, useEffect, useCallback } from 'react';
import {
  Plus,
  Search,
  RefreshCw,
  AlertTriangle,
  Radio,
} from 'lucide-react';
import { Button } from '../components/ui/Button';
import { EmptyState } from '../components/ui/EmptyState';
import { ReportCard } from '../components/reports/ReportCard';
import { ReportModal } from '../components/reports/ReportModal';
import {
  fetchHazardReports,
  subscribeToHazardReports,
} from '../features/reports/reportsService';
import type { HazardReport } from '../features/reports/types';
import { useDemoStore } from '../lib/demoStore';

export const ReportsPage: React.FC = () => {
  const demoMode = useDemoStore((state) => state.demoMode);

  // Filter & Sort State
  const [statusFilter, setStatusFilter] = useState<'all' | 'verified' | 'pending'>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'newest' | 'distance'>('newest');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Data & Loading State
  const [reports, setReports] = useState<HazardReport[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [userCoords, setUserCoords] = useState<[number, number] | undefined>(undefined);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);

  // Fetch Reports
  const loadReports = useCallback(
    async (showRefreshSpinner = false) => {
      if (showRefreshSpinner) setIsRefreshing(true);
      else setIsLoading(true);

      try {
        const data = await fetchHazardReports({
          includeTest: demoMode,
          statusFilter,
          sortBy,
          userCoords,
          limit: 100,
        });
        setReports(data);
      } catch {
        setReports([]);
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    },
    [demoMode, statusFilter, sortBy, userCoords]
  );

  // Attempt user GPS for distance sorting
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setUserCoords([pos.coords.longitude, pos.coords.latitude]);
        },
        () => {
          // fallback to Shimla coords
          setUserCoords([77.1734, 31.1048]);
        },
        { timeout: 5000 }
      );
    }
  }, []);

  // Initial fetch and on filter changes
  useEffect(() => {
    loadReports();
  }, [loadReports]);

  // Realtime Replication subscription
  useEffect(() => {
    const unsubscribe = subscribeToHazardReports(({ eventType, newReport }) => {
      if (!newReport) return;

      // Filter test data if demo mode is off
      if (!demoMode && newReport.is_test) return;

      setReports((prev) => {
        if (eventType === 'INSERT') {
          // Prevent duplicates
          if (prev.some((r) => r.id === newReport.id)) return prev;
          return [newReport, ...prev];
        }

        if (eventType === 'UPDATE') {
          return prev.map((r) => (r.id === newReport.id ? { ...r, ...newReport } : r));
        }

        if (eventType === 'DELETE') {
          return prev.filter((r) => r.id !== newReport.id);
        }

        return prev;
      });
    });

    return () => {
      unsubscribe();
    };
  }, [demoMode]);

  // Client-side type & search filtering
  const filteredReports = reports.filter((r) => {
    if (typeFilter !== 'all' && r.type !== typeFilter) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const desc = (r.description || '').toLowerCase();
      const typeStr = r.type.toLowerCase();
      if (!desc.includes(q) && !typeStr.includes(q)) return false;
    }
    return true;
  });

  return (
    <div className="max-w-[1000px] w-full mx-auto px-4 py-8 space-y-6">
      {/* Header bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-h1 font-bold text-brand">Community Reports</h1>
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-chip text-[11px] font-mono font-medium bg-surface text-text-3 border border-border">
              <Radio size={10} className="text-accent animate-pulse" />
              Live
            </span>
          </div>
          <p className="text-body text-text-2 mt-1">
            Real-time peer-reported mountain hazards with crowdsourced verification.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => loadReports(true)}
            disabled={isRefreshing}
            icon={<RefreshCw size={14} className={isRefreshing ? 'animate-spin' : ''} />}
          >
            Refresh
          </Button>

          <Button
            variant="primary"
            onClick={() => setIsModalOpen(true)}
            icon={<Plus size={16} />}
          >
            Report Hazard
          </Button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
        {/* Status Filter Tabs */}
        <div className="flex items-center bg-surface border border-border rounded-btn p-0.5 text-xs">
          {[
            { id: 'all', label: 'All Reports' },
            { id: 'verified', label: 'Verified Only' },
            { id: 'pending', label: 'Pending Review' },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setStatusFilter(tab.id as typeof statusFilter)}
              className={`px-3 py-1.5 rounded-btn font-medium transition-colors ${
                statusFilter === tab.id
                  ? 'bg-white shadow-xs text-brand font-bold'
                  : 'text-text-3 hover:text-text'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Search & Sort controls */}
        <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
          <div className="relative flex-1 sm:w-64">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-3" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search reports by keyword..."
              className="w-full pl-8 pr-3 py-1.5 rounded-btn border border-border text-xs bg-surface focus:outline-none focus:ring-1 focus:ring-brand"
            />
          </div>

          <div className="flex items-center gap-1.5 shrink-0 text-xs">
            <span className="text-text-3 font-medium">Sort:</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
              className="px-2.5 py-1.5 rounded-btn border border-border bg-surface text-xs text-text focus:outline-none focus:ring-1 focus:ring-brand"
            >
              <option value="newest">Newest First</option>
              <option value="distance">Nearest to Me</option>
            </select>
          </div>
        </div>
      </div>

      {/* Type pill filter bar */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-text-3 shrink-0 mr-1">
          Type:
        </span>
        {[
          { id: 'all', label: 'All Types' },
          { id: 'landslide', label: 'Landslides' },
          { id: 'road_blocked', label: 'Road Blocks' },
          { id: 'rockfall', label: 'Rockfalls' },
          { id: 'flood', label: 'Floods' },
          { id: 'snow', label: 'Snow / Ice' },
          { id: 'bridge_damage', label: 'Bridge Damage' },
          { id: 'all_clear', label: 'All Clear' },
        ].map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setTypeFilter(item.id)}
            className={`px-2.5 py-1 rounded-chip transition-colors shrink-0 ${
              typeFilter === item.id
                ? 'bg-brand text-white font-semibold'
                : 'bg-surface hover:bg-surface-2 text-text-2 border border-border'
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>

      {/* Reports Feed List */}
      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="p-4 bg-white rounded-card border border-border animate-pulse space-y-3"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-surface-2" />
                <div className="space-y-1.5 flex-1">
                  <div className="h-4 bg-surface-2 rounded-btn w-1/4" />
                  <div className="h-3 bg-surface-2 rounded-btn w-1/3" />
                </div>
              </div>
              <div className="h-3 bg-surface-2 rounded-btn w-3/4" />
            </div>
          ))}
        </div>
      ) : filteredReports.length === 0 ? (
        <EmptyState
          icon={AlertTriangle}
          title="No Hazard Reports Found"
          description={
            searchQuery || typeFilter !== 'all' || statusFilter !== 'all'
              ? 'No reports match your selected filters. Try clearing your search or filters.'
              : 'There are no active hazard reports in this area.'
          }
          action={
            <Button variant="secondary" onClick={() => setIsModalOpen(true)}>
              Report a Hazard
            </Button>
          }
        />
      ) : (
        <div className="space-y-3">
          {filteredReports.map((report) => (
            <ReportCard key={report.id} report={report} />
          ))}
        </div>
      )}

      {/* Report Modal */}
      <ReportModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        defaultCoordinates={userCoords}
        onReportCreated={() => loadReports(true)}
      />
    </div>
  );
};
