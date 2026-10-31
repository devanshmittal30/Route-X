import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../features/auth/AuthContext';
import { supabase } from '../lib/supabase';
import { Card, Button, Input, Modal, Banner, Skeleton, Badge } from '../components/ui';
import { RiskBadge } from '../components/ui/RiskBadge';
import {
  ShieldCheck,
  Phone,
  User,
  Award,
  Plus,
  Trash2,
  LogOut,
  HeartHandshake,
  Bookmark,
  Compass,
  Car,
  Footprints,
  Calendar,
  Tag,
  FileText,
  ThumbsUp,
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import {
  getSavedRoutes,
  deleteSavedRoute,
  type SavedRoute,
} from '../features/routing/savedRoutesService';
import { levelFor } from '../features/risk';

interface EmergencyContact {
  id: string;
  name: string;
  phone: string;
  relation: string | null;
  created_at?: string;
}

export const ProfilePage: React.FC = () => {
  const navigate = useNavigate();
  const { user, profile, refreshProfile, signOut, loading: authLoading } = useAuth();

  const [displayName, setDisplayName] = useState('');
  const [phone, setPhone] = useState('');
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileMsg, setProfileMsg] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  const [contacts, setContacts] = useState<EmergencyContact[]>([]);
  const [loadingContacts, setLoadingContacts] = useState(false);
  const [contactModalOpen, setContactModalOpen] = useState(false);
  const [newContactName, setNewContactName] = useState('');
  const [newContactPhone, setNewContactPhone] = useState('');
  const [newContactRelation, setNewContactRelation] = useState('');
  const [contactError, setContactError] = useState<string | null>(null);
  const [savingContact, setSavingContact] = useState(false);

  // Saved Routes state
  const [savedRoutes, setSavedRoutes] = useState<SavedRoute[]>([]);
  const [loadingRoutes, setLoadingRoutes] = useState(false);
  const [deletingRouteId, setDeletingRouteId] = useState<string | null>(null);

  // My Reports & My Coupons state (FR-A2)
  interface MyReportItem {
    id: string;
    type: string;
    severity: number;
    description: string | null;
    status: string;
    up_count: number;
    down_count: number;
    created_at: string;
  }
  const [myReports, setMyReports] = useState<MyReportItem[]>([]);
  const [loadingReports, setLoadingReports] = useState(false);

  interface MyCouponItem {
    id: string;
    code: string;
    status: string;
    created_at: string;
    offers?: {
      title: string;
      points_cost: number;
    };
  }
  const [myCoupons, setMyCoupons] = useState<MyCouponItem[]>([]);
  const [loadingCoupons, setLoadingCoupons] = useState(false);

  // Sync profile fields
  useEffect(() => {
    if (profile) {
      setDisplayName(profile.display_name || '');
      setPhone(profile.phone || '');
    }
  }, [profile]);

  // Fetch emergency contacts
  const fetchContacts = useCallback(async () => {
    if (!user) return;
    setLoadingContacts(true);
    try {
      const { data, error } = await supabase
        .from('emergency_contacts')
        .select('*')
        .order('created_at', { ascending: true });

      if (error) {
        console.warn('Error fetching emergency contacts:', error.message);
      } else {
        setContacts(data || []);
      }
    } catch (err: unknown) {
      console.warn('Contacts fetch exception:', (err as Error).message);
    } finally {
      setLoadingContacts(false);
    }
  }, [user]);

  useEffect(() => {
    if (user) {
      fetchContacts();
    }
  }, [user, fetchContacts]);

  // Fetch saved routes
  const fetchUserSavedRoutes = useCallback(async () => {
    if (!user) return;
    setLoadingRoutes(true);
    try {
      const data = await getSavedRoutes();
      setSavedRoutes(data);
    } catch (err) {
      console.warn('Error fetching saved routes:', err);
    } finally {
      setLoadingRoutes(false);
    }
  }, [user]);

  useEffect(() => {
    if (user) {
      fetchUserSavedRoutes();
    }
  }, [user, fetchUserSavedRoutes]);

  const handleDeleteSavedRoute = async (id: string) => {
    if (!window.confirm('Delete this saved mountain route?')) return;
    setDeletingRouteId(id);
    try {
      await deleteSavedRoute(id);
      setSavedRoutes((prev) => prev.filter((r) => r.id !== id));
    } catch (err) {
      alert((err as Error).message || 'Failed to delete route.');
    } finally {
      setDeletingRouteId(null);
    }
  };

  // Fetch my hazard reports (FR-A2)
  const fetchMyReports = useCallback(async () => {
    if (!user) return;
    setLoadingReports(true);
    try {
      const { data } = await supabase
        .from('hazard_reports')
        .select('id, type, severity, description, status, up_count, down_count, created_at')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
      if (data) setMyReports(data);
    } catch (err) {
      console.warn('Error fetching user reports:', err);
    } finally {
      setLoadingReports(false);
    }
  }, [user]);

  // Fetch my redeemed coupons (FR-A2)
  const fetchMyCoupons = useCallback(async () => {
    if (!user) return;
    setLoadingCoupons(true);
    try {
      const { data } = await supabase
        .from('redemptions')
        .select('id, code, status, created_at, offers(title, points_cost)')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
      if (data) setMyCoupons(data as unknown as MyCouponItem[]);
    } catch (err) {
      console.warn('Error fetching user coupons:', err);
    } finally {
      setLoadingCoupons(false);
    }
  }, [user]);

  useEffect(() => {
    if (user) {
      fetchMyReports();
      fetchMyCoupons();
    }
  }, [user, fetchMyReports, fetchMyCoupons]);

  // Save profile changes
  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setSavingProfile(true);
    setProfileMsg(null);

    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          display_name: displayName.trim() || null,
          phone: phone.trim() || null,
        })
        .eq('id', user.id);

      if (error) {
        setProfileMsg({ text: error.message, type: 'error' });
      } else {
        setProfileMsg({ text: 'Profile updated successfully.', type: 'success' });
        await refreshProfile();
      }
    } catch (err: unknown) {
      setProfileMsg({ text: (err as Error).message, type: 'error' });
    } finally {
      setSavingProfile(false);
    }
  };

  // Add emergency contact
  const handleAddContact = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setContactError(null);

    if (!newContactName.trim() || !newContactPhone.trim()) {
      setContactError('Contact name and phone number are required.');
      return;
    }

    setSavingContact(true);
    try {
      const { data, error } = await supabase
        .from('emergency_contacts')
        .insert({
          user_id: user.id,
          name: newContactName.trim(),
          phone: newContactPhone.trim(),
          relation: newContactRelation.trim() || null,
        })
        .select()
        .single();

      if (error) {
        setContactError(error.message);
      } else if (data) {
        setContacts((prev) => [...prev, data]);
        setContactModalOpen(false);
        setNewContactName('');
        setNewContactPhone('');
        setNewContactRelation('');
      }
    } catch (err: unknown) {
      setContactError((err as Error).message);
    } finally {
      setSavingContact(false);
    }
  };

  // Delete emergency contact
  const handleDeleteContact = async (contactId: string) => {
    try {
      const { error } = await supabase
        .from('emergency_contacts')
        .delete()
        .eq('id', contactId);

      if (!error) {
        setContacts((prev) => prev.filter((c) => c.id !== contactId));
      }
    } catch (err: unknown) {
      console.warn('Error deleting contact:', (err as Error).message);
    }
  };

  if (authLoading) {
    return (
      <div className="max-w-[1000px] w-full mx-auto px-4 py-8 space-y-6">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-40 w-full" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="max-w-[600px] w-full mx-auto px-4 py-16 text-center space-y-4">
        <div className="w-16 h-16 rounded-full bg-brand-soft text-brand mx-auto flex items-center justify-center">
          <User className="w-8 h-8" />
        </div>
        <h1 className="text-h1 font-bold text-brand">Sign In Required</h1>
        <p className="text-body text-text-2">
          Sign in or create an account to view your points, manage your profile, and save emergency contacts.
        </p>
        <Link to="/login">
          <Button variant="primary">Sign In / Register</Button>
        </Link>
      </div>
    );
  }

  const rawName =
    profile?.display_name?.trim() ||
    displayName?.trim() ||
    (user?.user_metadata?.full_name as string)?.trim() ||
    (user?.user_metadata?.name as string)?.trim() ||
    (user?.email ? user.email.split('@')[0] : '');

  const formattedName = rawName
    ? rawName.charAt(0).toUpperCase() + rawName.slice(1)
    : 'there';

  return (
    <div className="max-w-[1000px] w-full mx-auto px-4 py-8 space-y-8">
      {/* Profile Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-border">
        <div>
          <h1 className="text-h1 font-bold text-brand flex items-center gap-2">
            <span>Hello, {formattedName}</span>
            <span className="text-2xl select-none">👋</span>
          </h1>
          <p className="text-small text-text-2">{user.email}</p>
        </div>
        <Button
          variant="secondary"
          onClick={() => signOut()}
          icon={<LogOut className="w-4 h-4" />}
        >
          Sign Out
        </Button>
      </div>

      {/* Points & Trust Score Overview */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Card className="flex items-center gap-4 bg-surface">
          <div className="w-12 h-12 rounded-full bg-verified-soft text-verified flex items-center justify-center shrink-0">
            <Award className="w-6 h-6" />
          </div>
          <div>
            <div className="text-h2 font-bold text-text">{profile?.points ?? 0}</div>
            <div className="text-small font-medium text-text-2">Reward Points Balance</div>
          </div>
        </Card>

        <Card className="flex items-center gap-4 bg-surface">
          <div className="w-12 h-12 rounded-full bg-risk-low-soft text-risk-low flex items-center justify-center shrink-0">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <div className="text-h2 font-bold text-text">{profile?.trust_score ?? 50} / 100</div>
            <div className="text-small font-medium text-text-2">Community Trust Score</div>
          </div>
        </Card>
      </div>

      {/* Personal Info Form */}
      <Card className="space-y-4">
        <h2 className="text-h2 font-semibold text-text">Personal Details</h2>
        <p className="text-small text-text-2">
          Your display name is visible when you submit crowdsourced hazard reports.
        </p>

        {profileMsg && (
          <Banner variant={profileMsg.type === 'success' ? 'info' : 'disclaimer'}>
            <span className={profileMsg.type === 'success' ? 'text-risk-low font-medium' : 'text-risk-severe font-medium'}>
              {profileMsg.text}
            </span>
          </Banner>
        )}

        <form onSubmit={handleSaveProfile} className="space-y-4 max-w-lg">
          <Input
            label="Display Name"
            placeholder="Your name"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
          />

          <Input
            label="Phone Number (Optional)"
            placeholder="+91 98765 43210"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            helperText="Used for emergency contact sharing in simulated SOS messages."
          />

          <Button type="submit" variant="primary" loading={savingProfile}>
            Save Changes
          </Button>
        </form>
      </Card>

      {/* Emergency Contacts Section */}
      <Card className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-h2 font-semibold text-text">Emergency Contacts</h2>
            <p className="text-small text-text-2">
              Recipients for SOS emergency alerts and safety check-ins.
            </p>
          </div>
          <Button
            variant="secondary"
            onClick={() => setContactModalOpen(true)}
            icon={<Plus className="w-4 h-4" />}
          >
            Add Contact
          </Button>
        </div>

        {loadingContacts ? (
          <div className="space-y-2">
            <Skeleton className="h-14 w-full" />
            <Skeleton className="h-14 w-full" />
          </div>
        ) : contacts.length === 0 ? (
          <div className="text-center py-8 border border-dashed border-border rounded-btn bg-surface space-y-2">
            <HeartHandshake className="w-8 h-8 text-text-3 mx-auto" />
            <p className="text-small font-medium text-text">No emergency contacts added yet</p>
            <p className="text-xs text-text-3 max-w-sm mx-auto">
              Add trusted family or trip leaders who should receive your location during an emergency.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-border border border-border rounded-btn overflow-hidden">
            {contacts.map((c) => (
              <div key={c.id} className="p-4 flex items-center justify-between gap-4 bg-white hover:bg-surface transition-colors">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-surface-2 text-text-2 flex items-center justify-center shrink-0">
                    <Phone className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="font-semibold text-text text-body">{c.name}</div>
                    <div className="text-small text-text-2">
                      {c.phone} {c.relation && <span className="text-text-3">({c.relation})</span>}
                    </div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => handleDeleteContact(c.id)}
                  aria-label={`Delete emergency contact ${c.name}`}
                  className="p-2 text-text-3 hover:text-risk-severe rounded-btn hover:bg-surface-2 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Saved Routes Section */}
      <Card className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-h2 font-semibold text-text">Saved Mountain Routes</h2>
            <p className="text-small text-text-2">
              Mountain routes saved to your profile for continuous disaster monitoring and live re-scoring.
            </p>
          </div>
          <Button
            variant="secondary"
            onClick={() => navigate('/route')}
            icon={<Plus className="w-4 h-4" />}
          >
            Plan New Route
          </Button>
        </div>

        {loadingRoutes ? (
          <div className="space-y-2">
            <Skeleton className="h-14 w-full" />
            <Skeleton className="h-14 w-full" />
          </div>
        ) : savedRoutes.length === 0 ? (
          <div className="text-center py-8 border border-dashed border-border rounded-btn bg-surface space-y-2">
            <Bookmark className="w-8 h-8 text-text-3 mx-auto" />
            <p className="text-small font-medium text-text">No saved routes yet</p>
            <p className="text-xs text-text-3 max-w-sm mx-auto">
              Plan any route between hill towns or trails and click "Save Route" to track live risk changes.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-border border border-border rounded-btn overflow-hidden">
            {savedRoutes.map((r) => {
              const level = levelFor(r.risk_score || 0);
              const dateStr = new Date(r.created_at).toLocaleDateString([], {
                month: 'short',
                day: 'numeric',
                year: 'numeric',
              });

              return (
                <div
                  key={r.id}
                  className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white hover:bg-surface transition-colors"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="p-1 rounded bg-surface-2 border border-border text-brand">
                        {r.mode === 'walk' ? <Footprints size={14} /> : <Car size={14} />}
                      </span>
                      <span className="font-semibold text-text text-body">
                        {r.from_label} → {r.to_label}
                      </span>
                    </div>

                    <div className="flex items-center gap-3 text-xs text-text-3 font-mono">
                      <span className="flex items-center gap-1">
                        <Calendar size={11} /> Saved {dateStr}
                      </span>
                      <span>·</span>
                      <span>Snapshot Score: {r.risk_score}/100</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 self-end sm:self-auto">
                    <RiskBadge
                      level={level.toLowerCase() as import('../components/ui/RiskBadge').RiskLevel}
                      score={r.risk_score}
                      size="sm"
                    />

                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => navigate(`/route?savedRouteId=${r.id}`)}
                      className="text-xs"
                      icon={<Compass size={13} />}
                    >
                      Inspect & Re-score
                    </Button>

                    <button
                      type="button"
                      disabled={deletingRouteId === r.id}
                      onClick={() => handleDeleteSavedRoute(r.id)}
                      aria-label={`Delete saved route ${r.from_label} to ${r.to_label}`}
                      className="p-2 text-text-3 hover:text-risk-severe rounded-btn hover:bg-surface-2 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>

      {/* My Submitted Hazard Reports (FR-A2) */}
      <Card className="space-y-4">
        <div>
          <h2 className="text-h2 font-semibold text-text">My Hazard Reports</h2>
          <p className="text-small text-text-2">
            Mountain hazard obstacles submitted to the RouteX community with live verification counts.
          </p>
        </div>

        {loadingReports ? (
          <div className="space-y-2">
            <Skeleton className="h-14 w-full" />
            <Skeleton className="h-14 w-full" />
          </div>
        ) : myReports.length === 0 ? (
          <div className="text-center py-8 border border-dashed border-border rounded-btn bg-surface space-y-2">
            <FileText className="w-8 h-8 text-text-3 mx-auto" />
            <p className="text-small font-medium text-text">No reports submitted yet</p>
            <p className="text-xs text-text-3 max-w-sm mx-auto">
              Spot a landslide or blocked pass? Submit a report to warn fellow travelers and earn community points.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-border border border-border rounded-btn overflow-hidden">
            {myReports.map((r) => (
              <div
                key={r.id}
                className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white hover:bg-surface transition-colors"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="capitalize font-semibold text-text text-body">
                      {r.type.replace('_', ' ')} (Severity {r.severity}/3)
                    </span>
                    <Badge variant={r.status === 'verified' ? 'verified' : 'neutral'}>
                      {r.status}
                    </Badge>
                  </div>

                  <p className="text-xs text-text-2 line-clamp-1">
                    {r.description || 'No description provided.'}
                  </p>

                  <div className="flex items-center gap-3 text-xs text-text-3 font-mono">
                    <span>{new Date(r.created_at).toLocaleDateString()}</span>
                    <span>·</span>
                    <span className="flex items-center gap-1 text-emerald-700">
                      <ThumbsUp size={11} /> {r.up_count} confirmations
                    </span>
                  </div>
                </div>

                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => navigate('/reports')}
                  className="text-xs self-end sm:self-auto"
                >
                  View in Feed
                </Button>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* My Redeemed Coupons (FR-A2) */}
      <Card className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-h2 font-semibold text-text">My Redeemed Coupons</h2>
            <p className="text-small text-text-2">
              Partner discount coupons redeemed with community karma points.
            </p>
          </div>
          <Button
            variant="secondary"
            onClick={() => navigate('/rewards')}
            icon={<Award className="w-4 h-4" />}
          >
            Explore Rewards
          </Button>
        </div>

        {loadingCoupons ? (
          <div className="space-y-2">
            <Skeleton className="h-14 w-full" />
          </div>
        ) : myCoupons.length === 0 ? (
          <div className="text-center py-8 border border-dashed border-border rounded-btn bg-surface space-y-2">
            <Tag className="w-8 h-8 text-text-3 mx-auto" />
            <p className="text-small font-medium text-text">No redeemed coupons yet</p>
            <p className="text-xs text-text-3 max-w-sm mx-auto">
              Contribute verified reports and safety check-ins to earn points redeemable for partner discounts.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-border border border-border rounded-btn overflow-hidden">
            {myCoupons.map((c) => (
              <div
                key={c.id}
                className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white hover:bg-surface transition-colors"
              >
                <div className="space-y-1">
                  <div className="font-semibold text-text text-body">
                    {c.offers?.title || 'Mountain Stay Partner Discount'}
                  </div>

                  <div className="flex items-center gap-2 text-xs text-text-3 font-mono">
                    <span>Redeemed {new Date(c.created_at).toLocaleDateString()}</span>
                    <span>·</span>
                    <Badge variant="sponsored">DEMO Offer</Badge>
                  </div>
                </div>

                <div className="flex items-center gap-2 self-end sm:self-auto">
                  <span className="px-3 py-1 bg-surface-2 border border-border rounded font-mono font-bold text-xs tracking-widest text-brand">
                    {c.code}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Add Contact Modal */}
      <Modal
        isOpen={contactModalOpen}
        onClose={() => setContactModalOpen(false)}
        title="Add Emergency Contact"
        description="Enter the details of a trusted person to notify during an SOS event."
      >
        <form onSubmit={handleAddContact} className="space-y-4">
          {contactError && (
            <Banner variant="disclaimer">
              <span className="text-risk-severe font-medium">{contactError}</span>
            </Banner>
          )}

          <Input
            label="Contact Name"
            placeholder="e.g. Priya Mittal"
            value={newContactName}
            onChange={(e) => setNewContactName(e.target.value)}
            required
          />

          <Input
            label="Phone Number"
            type="tel"
            placeholder="+91 98765 43210"
            value={newContactPhone}
            onChange={(e) => setNewContactPhone(e.target.value)}
            required
          />

          <Input
            label="Relation (Optional)"
            placeholder="e.g. Sister, Parent, Trek Guide"
            value={newContactRelation}
            onChange={(e) => setNewContactRelation(e.target.value)}
          />

          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setContactModalOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit" variant="primary" loading={savingContact}>
              Save Contact
            </Button>
          </div>
        </form>
      </Modal>

      {/* Privacy Notice */}
      <div className="p-4 rounded-card bg-surface border border-border text-xs text-text-3 leading-relaxed">
        <strong>Privacy Notice: </strong>
        Your contact details and emergency contacts are encrypted and protected by Supabase Row Level Security.
        Exact coordinates and personal phone numbers are never transmitted to external AI models or third-party advertisers.
      </div>
    </div>
  );
};
