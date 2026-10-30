import React, { useState, useEffect } from 'react';
import {
  MapPin,
  Camera,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  Loader2,
  ChevronRight,
  ChevronLeft,
  X,
  Upload,
  ThumbsUp,
  Sparkles,
} from 'lucide-react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { useAuth } from '../../features/auth/AuthContext';
import type { ReportType, ReportSeverity, DuplicateCheckResult } from '../../features/reports/types';
import {
  checkDuplicateReport,
  createHazardReport,
} from '../../features/reports/reportsService';
import { INDIA_BBOX, validatePhotoFile } from '../../features/reports/schemas';
import { REPORT_TYPE_CONFIG } from './ReportCard';

export interface ReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultCoordinates?: [number, number]; // [lng, lat]
  onReportCreated?: () => void;
}

export const ReportModal: React.FC<ReportModalProps> = ({
  isOpen,
  onClose,
  defaultCoordinates = [77.1734, 31.1048], // Shimla default
  onReportCreated,
}) => {
  const { user } = useAuth();

  // Wizard Step (1 to 5, plus success state)
  const [step, setStep] = useState<number>(1);
  const [isSuccess, setIsSuccess] = useState<boolean>(false);
  const [earnedPoints, setEarnedPoints] = useState<number>(5);

  // Form State
  const [reportType, setReportType] = useState<ReportType>('landslide');
  const [severity, setSeverity] = useState<ReportSeverity>(2);
  const [description, setDescription] = useState<string>('');
  const [lng, setLng] = useState<number>(defaultCoordinates[0]);
  const [lat, setLat] = useState<number>(defaultCoordinates[1]);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);

  // Loading & Error States
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [isLocating, setIsLocating] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Duplicate Detection State
  const [duplicateCheck, setDuplicateCheck] = useState<DuplicateCheckResult | null>(null);
  const [isCheckingDuplicate, setIsCheckingDuplicate] = useState<boolean>(false);
  const [ignoreDuplicate, setIgnoreDuplicate] = useState<boolean>(false);

  // Reset form when modal opens
  useEffect(() => {
    if (isOpen) {
      setStep(1);
      setIsSuccess(false);
      setErrorMessage(null);
      setIgnoreDuplicate(false);
      setDuplicateCheck(null);
      setLng(defaultCoordinates[0]);
      setLat(defaultCoordinates[1]);
    }
  }, [isOpen, defaultCoordinates]);

  // Handle Photo selection
  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const validation = validatePhotoFile(file);
    if (!validation.valid) {
      setErrorMessage(validation.error || 'Invalid photo');
      return;
    }

    setErrorMessage(null);
    setPhotoFile(file);
    const objectUrl = URL.createObjectURL(file);
    setPhotoPreview(objectUrl);
  };

  const removePhoto = () => {
    if (photoPreview) URL.revokeObjectURL(photoPreview);
    setPhotoFile(null);
    setPhotoPreview(null);
  };

  // Device GPS Location
  const handleGetGpsLocation = () => {
    if (!navigator.geolocation) {
      setErrorMessage('Geolocation is not supported by your browser');
      return;
    }

    setIsLocating(true);
    setErrorMessage(null);

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setIsLocating(false);
        const userLat = Number(pos.coords.latitude.toFixed(5));
        const userLng = Number(pos.coords.longitude.toFixed(5));

        // Validate India bounding box
        if (
          userLat < INDIA_BBOX.minLat ||
          userLat > INDIA_BBOX.maxLat ||
          userLng < INDIA_BBOX.minLng ||
          userLng > INDIA_BBOX.maxLng
        ) {
          setErrorMessage('Your GPS location appears to be outside India.');
        } else {
          setLat(userLat);
          setLng(userLng);
        }
      },
      (err) => {
        setIsLocating(false);
        setErrorMessage(`Could not access GPS location: ${err.message}`);
      },
      { timeout: 10000, enableHighAccuracy: true }
    );
  };

  // Run duplicate detection before reaching Step 5
  const checkDuplicates = async () => {
    setIsCheckingDuplicate(true);
    try {
      const res = await checkDuplicateReport(reportType, [lng, lat]);
      setDuplicateCheck(res);
    } catch {
      setDuplicateCheck(null);
    } finally {
      setIsCheckingDuplicate(false);
    }
  };

  const goToStep = async (nextStep: number) => {
    setErrorMessage(null);

    // Step 3 validation (location)
    if (step === 3 && nextStep > 3) {
      if (
        lat < INDIA_BBOX.minLat ||
        lat > INDIA_BBOX.maxLat ||
        lng < INDIA_BBOX.minLng ||
        lng > INDIA_BBOX.maxLng
      ) {
        setErrorMessage(
          `Coordinates must be within India (lat ${INDIA_BBOX.minLat}–${INDIA_BBOX.maxLat}, lng ${INDIA_BBOX.minLng}–${INDIA_BBOX.maxLng}).`
        );
        return;
      }
    }

    if (nextStep === 5) {
      await checkDuplicates();
    }

    setStep(nextStep);
  };

  // Submit Report
  const handleSubmit = async () => {
    if (!user) {
      setErrorMessage('You must be logged in to submit hazard reports.');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const res = await createHazardReport(
        {
          type: reportType,
          severity,
          description,
          coordinates: [lng, lat],
          photoFile,
          is_test: false,
        },
        user.id
      );

      setIsSuccess(true);
      setEarnedPoints(res.isOfflineQueued ? 0 : 5);
      onReportCreated?.();
    } catch (err: unknown) {
      setErrorMessage(
        (err as Error).message ||
          'Failed to submit hazard report. Please try again.'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  // Types list for Step 1
  const reportTypes: ReportType[] = [
    'landslide',
    'road_blocked',
    'rockfall',
    'flood',
    'snow',
    'bridge_damage',
    'all_clear',
  ];

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={
        isSuccess
          ? 'Report Submitted'
          : `Report Hazard (Step ${step} of 5)`
      }
      className="max-w-lg w-full"
    >
      {/* 1. Login Prompt Barrier */}
      {!user && !isSuccess && (
        <div className="p-4 bg-surface rounded-btn border border-border text-center space-y-3">
          <AlertCircle size={32} className="mx-auto text-accent" />
          <h3 className="font-semibold text-text">Sign In Required</h3>
          <p className="text-xs text-text-2 leading-relaxed">
            Logging in prevents malicious spam and maintains trust on mountain
            highways. You also earn <strong>+5 points</strong> for each confirmed
            hazard report.
          </p>
          <div className="pt-2">
            <a
              href="/login"
              className="inline-flex items-center justify-center px-4 py-2 bg-brand text-white font-semibold rounded-btn text-xs hover:bg-brand-hover transition-colors"
            >
              Sign In / Sign Up
            </a>
          </div>
        </div>
      )}

      {/* 2. Success Screen */}
      {user && isSuccess && (
        <div className="py-6 text-center space-y-4 animate-fadeIn">
          <div className="w-16 h-16 rounded-full bg-risk-low-soft text-risk-low border border-risk-low/30 mx-auto flex items-center justify-center">
            <CheckCircle2 size={32} />
          </div>

          <div>
            <h3 className="text-h2 font-bold text-brand">Report Submitted!</h3>
            <p className="text-xs text-text-2 mt-1">
              Your report has been broadcast to fellow travellers and live map
              layers.
            </p>
          </div>

          {earnedPoints > 0 && (
            <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-brand-soft text-brand border border-brand/20 rounded-chip text-xs font-semibold">
              <Sparkles size={13} className="text-accent" />
              +{earnedPoints} Points added to your ledger!
            </div>
          )}

          <div className="p-3 bg-surface rounded-btn border border-border text-xs text-text-2 max-w-sm mx-auto">
            It starts as <strong>Pending</strong> and automatically upgrades to{' '}
            <strong>Verified</strong> when 3 travellers confirm with thumbs up.
          </div>

          <div className="pt-4 flex items-center justify-center gap-3">
            <Button variant="primary" onClick={onClose}>
              Done
            </Button>
          </div>
        </div>
      )}

      {/* 3. Wizard Steps (when logged in and not success) */}
      {user && !isSuccess && (
        <div className="space-y-4">
          {/* Progress bar */}
          <div className="w-full bg-surface-2 h-1.5 rounded-full overflow-hidden">
            <div
              className="bg-brand h-full transition-all duration-300 rounded-full"
              style={{ width: `${(step / 5) * 100}%` }}
            />
          </div>

          {/* STEP 1: Type Selection */}
          {step === 1 && (
            <div className="space-y-3 animate-fadeIn">
              <h3 className="text-sm font-semibold text-text">
                Select Hazard Type
              </h3>
              <div className="grid grid-cols-2 gap-2.5">
                {reportTypes.map((type) => {
                  const cfg = REPORT_TYPE_CONFIG[type];
                  const isSelected = reportType === type;
                  return (
                    <button
                      key={type}
                      type="button"
                      onClick={() => setReportType(type)}
                      className={`p-3 rounded-btn border text-left flex items-start gap-2.5 transition-all ${
                        isSelected
                          ? 'border-brand bg-brand-soft/40 shadow-xs ring-1 ring-brand'
                          : 'border-border bg-surface hover:bg-surface-2'
                      }`}
                    >
                      <div
                        className={`p-2 rounded-full shrink-0 ${cfg.bg}`}
                      >
                        {cfg.icon}
                      </div>
                      <div>
                        <span className="font-semibold text-xs text-text block leading-tight">
                          {cfg.label}
                        </span>
                        <span className="text-[10px] text-text-3 font-mono">
                          {type === 'landslide' || type === 'road_blocked'
                            ? 'High priority'
                            : type === 'all_clear'
                              ? 'Resolves block'
                              : 'Caution advised'}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* STEP 2: Severity & Description */}
          {step === 2 && (
            <div className="space-y-4 animate-fadeIn">
              <div>
                <h3 className="text-sm font-semibold text-text mb-2">
                  Severity Level
                </h3>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    {
                      lvl: 1 as ReportSeverity,
                      label: '1 - Minor',
                      desc: 'Passable with care',
                      border: 'border-risk-moderate',
                    },
                    {
                      lvl: 2 as ReportSeverity,
                      label: '2 - Moderate',
                      desc: 'One lane blocked',
                      border: 'border-risk-high',
                    },
                    {
                      lvl: 3 as ReportSeverity,
                      label: '3 - Severe',
                      desc: 'Road impassable',
                      border: 'border-risk-severe',
                    },
                  ].map((s) => (
                    <button
                      key={s.lvl}
                      type="button"
                      onClick={() => setSeverity(s.lvl)}
                      className={`p-2.5 rounded-btn border text-left transition-all ${
                        severity === s.lvl
                          ? `${s.border} bg-brand-soft/40 ring-1 ring-brand`
                          : 'border-border bg-surface hover:bg-surface-2'
                      }`}
                    >
                      <span className="font-semibold text-xs block text-text">
                        {s.label}
                      </span>
                      <span className="text-[10px] text-text-3 font-mono leading-tight">
                        {s.desc}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-semibold text-text">
                    Optional Description
                  </label>
                  <span className="text-[10px] text-text-3 font-mono">
                    {description.length}/500
                  </span>
                </div>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  maxLength={500}
                  rows={3}
                  placeholder="Describe obstruction size, landmark, detour options, or vehicles stuck..."
                  className="w-full p-2.5 rounded-btn border border-border text-xs text-text focus:outline-none focus:ring-1 focus:ring-brand resize-none bg-surface"
                />
              </div>
            </div>
          )}

          {/* STEP 3: Location */}
          {step === 3 && (
            <div className="space-y-4 animate-fadeIn">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-text">
                  Hazard Coordinates
                </h3>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={handleGetGpsLocation}
                  disabled={isLocating}
                  icon={
                    isLocating ? (
                      <Loader2 size={12} className="animate-spin" />
                    ) : (
                      <MapPin size={12} className="text-accent" />
                    )
                  }
                  className="text-xs"
                >
                  {isLocating ? 'Locating...' : 'Use Current GPS'}
                </Button>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-text-2 font-medium mb-1 block">
                    Latitude (°N)
                  </label>
                  <input
                    type="number"
                    step="0.0001"
                    value={lat}
                    onChange={(e) => setLat(parseFloat(e.target.value) || 0)}
                    className="w-full p-2 rounded-btn border border-border text-xs font-mono bg-surface"
                  />
                </div>
                <div>
                  <label className="text-xs text-text-2 font-medium mb-1 block">
                    Longitude (°E)
                  </label>
                  <input
                    type="number"
                    step="0.0001"
                    value={lng}
                    onChange={(e) => setLng(parseFloat(e.target.value) || 0)}
                    className="w-full p-2 rounded-btn border border-border text-xs font-mono bg-surface"
                  />
                </div>
              </div>

              <div className="p-3 bg-surface rounded-btn border border-border text-xs text-text-3 font-mono">
                Location must fall inside the India bounding box (lat 6°–38°, lng
                68°–98°).
              </div>
            </div>
          )}

          {/* STEP 4: Optional Photo */}
          {step === 4 && (
            <div className="space-y-4 animate-fadeIn">
              <h3 className="text-sm font-semibold text-text">
                Add Photo Evidence (Optional)
              </h3>

              {photoPreview ? (
                <div className="relative rounded-btn overflow-hidden border border-border bg-black max-h-52 flex items-center justify-center">
                  <img
                    src={photoPreview}
                    alt="Report preview"
                    className="max-h-48 w-auto object-contain"
                  />
                  <button
                    type="button"
                    onClick={removePhoto}
                    className="absolute top-2 right-2 p-1 rounded-full bg-black/60 text-white hover:bg-black/80"
                    aria-label="Remove photo"
                  >
                    <X size={14} />
                  </button>
                </div>
              ) : (
                <label className="border-2 border-dashed border-border hover:border-brand/60 rounded-btn p-6 flex flex-col items-center justify-center gap-2 cursor-pointer transition-colors bg-surface">
                  <Upload size={24} className="text-text-3" />
                  <span className="text-xs font-semibold text-text">
                    Click to upload or take a photo
                  </span>
                  <span className="text-[10px] text-text-3 font-mono">
                    JPEG, PNG, WebP up to 3 MB
                  </span>
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    onChange={handlePhotoSelect}
                    className="hidden"
                  />
                </label>
              )}
            </div>
          )}

          {/* STEP 5: Review & Submit (with Duplicate Detection) */}
          {step === 5 && (
            <div className="space-y-4 animate-fadeIn">
              {/* Duplicate Warning Callout */}
              {duplicateCheck?.hasDuplicate && !ignoreDuplicate && (
                <div className="p-3.5 rounded-card bg-amber-50 border border-amber-300 text-xs text-amber-900 space-y-2">
                  <div className="flex items-center gap-1.5 font-bold">
                    <AlertTriangle size={15} className="text-amber-600" />
                    <span>Similar Hazard Already Reported Nearby</span>
                  </div>
                  <p className="text-[11px] leading-relaxed text-amber-800">
                    A <strong>{duplicateCheck.duplicateReport?.type.replace('_', ' ')}</strong> was
                    recently reported approximately {duplicateCheck.distanceMeters} m from this spot.
                    Rather than creating a duplicate, please confirm the existing report:
                  </p>

                  <div className="pt-1 flex items-center gap-2">
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() => {
                        onClose();
                        // User proceeds to existing reports feed
                      }}
                      icon={<ThumbsUp size={11} />}
                      className="text-xs"
                    >
                      View & Vote on Existing Report
                    </Button>
                    <button
                      type="button"
                      onClick={() => setIgnoreDuplicate(true)}
                      className="text-xs text-text-2 hover:underline font-medium"
                    >
                      Submit Mine Anyway
                    </button>
                  </div>
                </div>
              )}

              {/* Summary Card */}
              <div className="p-3.5 bg-surface rounded-card border border-border space-y-2 text-xs">
                <div className="flex items-center justify-between pb-2 border-b border-border">
                  <span className="text-text-3 font-medium">Type</span>
                  <span className="font-semibold text-text uppercase">
                    {reportType.replace('_', ' ')}
                  </span>
                </div>
                <div className="flex items-center justify-between pb-2 border-b border-border">
                  <span className="text-text-3 font-medium">Severity</span>
                  <span className="font-semibold text-text">Level {severity}/3</span>
                </div>
                <div className="flex items-center justify-between pb-2 border-b border-border">
                  <span className="text-text-3 font-medium">Coordinates</span>
                  <span className="font-mono text-text">
                    {lat.toFixed(4)}°N, {lng.toFixed(4)}°E
                  </span>
                </div>
                {description && (
                  <div className="pt-1">
                    <span className="text-text-3 font-medium block mb-0.5">
                      Description
                    </span>
                    <p className="text-text font-normal italic">"{description}"</p>
                  </div>
                )}
                {photoFile && (
                  <div className="flex items-center gap-1 text-[11px] text-text-3 pt-1">
                    <Camera size={12} />
                    <span>Photo attached ({photoFile.name})</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Error Message */}
          {errorMessage && (
            <div className="p-2.5 rounded-btn bg-risk-severe-soft border border-risk-severe/30 text-xs text-risk-severe flex items-center gap-2">
              <AlertCircle size={14} className="shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Footer Navigation Buttons */}
          <div className="flex items-center justify-between pt-3 border-t border-border">
            {step > 1 ? (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => goToStep(step - 1)}
                icon={<ChevronLeft size={13} />}
                disabled={isSubmitting}
              >
                Back
              </Button>
            ) : (
              <div />
            )}

            {step < 5 ? (
              <Button
                variant="primary"
                size="sm"
                onClick={() => goToStep(step + 1)}
                disabled={isCheckingDuplicate}
                icon={
                  isCheckingDuplicate ? (
                    <Loader2 size={13} className="animate-spin" />
                  ) : (
                    <ChevronRight size={13} />
                  )
                }
              >
                Next
              </Button>
            ) : (
              <Button
                variant="primary"
                size="sm"
                onClick={handleSubmit}
                disabled={
                  isSubmitting ||
                  (duplicateCheck?.hasDuplicate && !ignoreDuplicate)
                }
                icon={
                  isSubmitting ? (
                    <Loader2 size={13} className="animate-spin" />
                  ) : (
                    <CheckCircle2 size={13} />
                  )
                }
              >
                {isSubmitting ? 'Submitting...' : 'Confirm & Post'}
              </Button>
            )}
          </div>
        </div>
      )}
    </Modal>
  );
};
