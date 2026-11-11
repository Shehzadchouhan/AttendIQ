import React, { useState } from 'react';
import {
  Sparkles,
  Camera,
  Users,
  Search,
  Mail,
  Lock,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Info,
  Calendar,
  Layers,
  Sliders,
  ExternalLink,
  Flame,
  ArrowRight,
  ShieldCheck,
  Download,
  Trash2,
  UserPlus
} from 'lucide-react';
import { toast, Toaster } from 'sonner';

import {
  Button,
  Card,
  CardHeader,
  CardBody,
  CardFooter,
  Badge,
  Input,
  Select,
  Modal,
  Drawer,
  Avatar,
  Skeleton,
  EmptyState,
  Tooltip,
  ThemeToggle,
  ThemeSegmentedControl,
} from '../components/ui';
import { useTheme } from '../context/ThemeContext';

export const DesignSystemPreview = () => {
  const { theme, isDark } = useTheme();

  // Interactive Component State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const [selectValue, setSelectValue] = useState('cs101');
  const [inputError, setInputError] = useState('');
  const [isButtonLoading, setIsButtonLoading] = useState(false);

  const triggerToast = (type) => {
    switch (type) {
      case 'success':
        toast.success('Roster Synchronized', {
          description: '28 attendance records saved successfully to the database.',
        });
        break;
      case 'error':
        toast.error('Face Verification Failed', {
          description: 'Lighting too dim or multiple faces detected in frame.',
        });
        break;
      case 'warning':
        toast.warning('Attendance Threshold Alert', {
          description: '3 students fell below the required 75% attendance criteria.',
        });
        break;
      case 'info':
        toast.info('AI Biometric Engine Online', {
          description: 'InsightFace engine ready with 512-D embedding matching.',
        });
        break;
      case 'action':
        toast('Session Locked', {
          description: 'This attendance register is now 24-hr tamper locked.',
          action: {
            label: 'Request Unlock',
            onClick: () => toast.info('Unlock request sent to Institute Admin.'),
          },
        });
        break;
      default:
        toast('Design System Notification');
    }
  };

  return (
    <div className="design-preview-page" style={{ padding: '2rem 1.5rem 5rem 1.5rem', maxWidth: '1200px', margin: '0 auto' }}>
      {/* Sonner Toast Container for Modern Toasts */}
      <Toaster richColors position="top-right" theme={isDark ? 'dark' : 'light'} />

      {/* Top Header Bar with Theme Switcher */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '2.5rem',
          flexWrap: 'wrap',
          gap: '1rem',
          paddingBottom: '1.25rem',
          borderBottom: '1px solid var(--border-color)',
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
            <Badge variant="accent" dot>
              Phase 5A Active
            </Badge>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              Design System Foundation
            </span>
          </div>
          <h1 style={{ fontSize: '1.85rem', fontWeight: 800, margin: 0, letterSpacing: '-0.025em', color: 'var(--text-primary)' }}>
            FaceMark Design Primitives
          </h1>
          <p style={{ margin: '0.25rem 0 0 0', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
            Interactive component gallery, responsive tokens, and light/dark theme specification.
          </p>
        </div>

        {/* Theme Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <ThemeSegmentedControl />
          <ThemeToggle size="md" />
        </div>
      </div>

      {/* Section 1: Color Tokens & Surface Swatches */}
      <section style={{ marginBottom: '3rem' }}>
        <h2 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: '1rem', color: 'var(--text-primary)' }}>
          1. Color Tokens & Surface Palette
        </h2>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
            gap: '1rem',
          }}
        >
          <Card padding="sm">
            <div style={{ height: '54px', borderRadius: '8px', background: 'var(--primary-gradient)', marginBottom: '0.75rem' }} />
            <div style={{ fontWeight: 700, fontSize: '0.9rem' }}>Primary Indigo/Violet</div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>#6366F1 → #8B5CF6</div>
          </Card>

          <Card padding="sm">
            <div style={{ height: '54px', borderRadius: '8px', background: 'var(--accent-gradient)', marginBottom: '0.75rem' }} />
            <div style={{ fontWeight: 700, fontSize: '0.9rem' }}>Accent Cyan/Teal</div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>#06B6D4 → #3B82F6</div>
          </Card>

          <Card padding="sm">
            <div style={{ height: '54px', borderRadius: '8px', background: 'var(--success)', marginBottom: '0.75rem' }} />
            <div style={{ fontWeight: 700, fontSize: '0.9rem' }}>Success Green</div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Present Status</div>
          </Card>

          <Card padding="sm">
            <div style={{ height: '54px', borderRadius: '8px', background: 'var(--warning)', marginBottom: '0.75rem' }} />
            <div style={{ fontWeight: 700, fontSize: '0.9rem' }}>Warning Amber</div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Review &gt; 75% Threshold</div>
          </Card>

          <Card padding="sm">
            <div style={{ height: '54px', borderRadius: '8px', background: 'var(--danger)', marginBottom: '0.75rem' }} />
            <div style={{ fontWeight: 700, fontSize: '0.9rem' }}>Danger Rose</div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Absent &amp; Unknown Faces</div>
          </Card>

          <Card padding="sm">
            <div style={{ height: '54px', borderRadius: '8px', background: 'var(--bg-main)', border: '1px solid var(--border-color)', marginBottom: '0.75rem' }} />
            <div style={{ fontWeight: 700, fontSize: '0.9rem' }}>Canvas Surface</div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{isDark ? 'Deep Navy #0B1020' : 'Off-White #F8FAFC'}</div>
          </Card>
        </div>
      </section>

      {/* Section 2: Buttons in all States */}
      <section style={{ marginBottom: '3rem' }}>
        <h2 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: '1rem', color: 'var(--text-primary)' }}>
          2. Buttons (All Variants, Sizes &amp; States)
        </h2>
        <Card padding="md">
          {/* Variants row */}
          <div style={{ marginBottom: '1.5rem' }}>
            <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '0.65rem', textTransform: 'uppercase' }}>
              Style Variants
            </div>
            <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'center' }}>
              <Button variant="primary">Primary Gradient</Button>
              <Button variant="secondary">Secondary Card</Button>
              <Button variant="accent">Accent Cyan</Button>
              <Button variant="outline">Outline</Button>
              <Button variant="ghost">Ghost Button</Button>
              <Button variant="danger">Danger Action</Button>
            </div>
          </div>

          {/* Sizes row */}
          <div style={{ marginBottom: '1.5rem' }}>
            <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '0.65rem', textTransform: 'uppercase' }}>
              Size Scale
            </div>
            <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'center' }}>
              <Button variant="primary" size="sm">Small (32px)</Button>
              <Button variant="primary" size="md">Medium (40px)</Button>
              <Button variant="primary" size="lg">Large (48px)</Button>
              <Button variant="secondary" size="icon" title="Icon Only"><Camera size={18} /></Button>
            </div>
          </div>

          {/* States: Loading, Disabled, With Icons */}
          <div>
            <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '0.65rem', textTransform: 'uppercase' }}>
              States &amp; Micro-Interactions
            </div>
            <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'center' }}>
              <Button variant="primary" leftIcon={<Camera size={16} />}>
                Left Icon
              </Button>
              <Button variant="secondary" rightIcon={<ArrowRight size={16} />}>
                Right Icon
              </Button>
              <Button variant="primary" disabled>
                Disabled State
              </Button>
              <Button
                variant="primary"
                isLoading={isButtonLoading}
                onClick={() => {
                  setIsButtonLoading(true);
                  setTimeout(() => setIsButtonLoading(false), 2000);
                }}
              >
                {isButtonLoading ? 'Processing...' : 'Click to Load'}
              </Button>
            </div>
          </div>
        </Card>
      </section>

      {/* Section 3: Badges & Chips */}
      <section style={{ marginBottom: '3rem' }}>
        <h2 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: '1rem', color: 'var(--text-primary)' }}>
          3. Badges &amp; Status Chips
        </h2>
        <Card padding="md">
          <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'center' }}>
            <Badge variant="primary" dot>Primary Dot</Badge>
            <Badge variant="accent" icon={<Sparkles size={12} />}>AI Engine</Badge>
            <Badge variant="success" dot>Present (95%)</Badge>
            <Badge variant="warning" dot>Needs Review</Badge>
            <Badge variant="danger" dot>Absent</Badge>
            <Badge variant="neutral">Faculty Batch</Badge>
            <Badge variant="default">Default Neutral</Badge>
            <Badge variant="success" size="sm">Small Badge</Badge>
          </div>
        </Card>
      </section>

      {/* Section 4: Form Controls (Input & Select) */}
      <section style={{ marginBottom: '3rem' }}>
        <h2 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: '1rem', color: 'var(--text-primary)' }}>
          4. Form Inputs &amp; Selects
        </h2>
        <Card padding="md">
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
              gap: '1.25rem',
            }}
          >
            <Input
              label="Student Full Name"
              placeholder="e.g. Aarav Sharma"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              helperText="Enter student legal name matching university ID."
              leftIcon={<Users size={16} />}
              required
            />

            <Input
              label="Email Address"
              type="email"
              placeholder="student@facemark.local"
              leftIcon={<Mail size={16} />}
              defaultValue="aarav@example.com"
            />

            <Input
              label="Validation Error State"
              placeholder="Required field..."
              value={inputError}
              onChange={(e) => setInputError(e.target.value)}
              error="Academic roll number is required (cannot be blank)."
              leftIcon={<AlertTriangle size={16} />}
            />

            <Input
              label="Disabled Input"
              value="System Generated UID: #FM-9021"
              disabled
              leftIcon={<Lock size={16} />}
            />

            <Select
              label="Select Coaching Batch"
              value={selectValue}
              onChange={(e) => setSelectValue(e.target.value)}
              leftIcon={<Layers size={16} />}
              options={[
                { value: 'cs101', label: 'Class 12 JEE Physics (Morning)' },
                { value: 'math201', label: 'Advanced Calculus Batch B' },
                { value: 'chem102', label: 'Organic Chemistry Masterclass' },
              ]}
              helperText="Select the target class for attendance recording."
            />

            <Select
              label="Disabled Select"
              disabled
              options={[{ value: 'none', label: 'No options available' }]}
            />
          </div>
        </Card>
      </section>

      {/* Section 5: Cards & Elevation Types */}
      <section style={{ marginBottom: '3rem' }}>
        <h2 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: '1rem', color: 'var(--text-primary)' }}>
          5. Cards &amp; Glassmorphic Surfaces
        </h2>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
            gap: '1.25rem',
          }}
        >
          <Card variant="default" padding="md">
            <CardHeader
              title="Standard Card"
              subtitle="Solid elevated card surface"
              action={<Badge variant="primary">Default</Badge>}
            />
            <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
              Standard surface for data tables, metric tiles, and dashboards.
            </p>
          </Card>

          <Card variant="glass" padding="md">
            <CardHeader
              title="Glassmorphic Card"
              subtitle="Translucent backdrop blur"
              action={<Badge variant="accent">Glass</Badge>}
            />
            <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
              Subtle 1px border, backdrop blur, and soft ambient glow.
            </p>
          </Card>

          <Card variant="interactive" padding="md" hoverLift glow>
            <CardHeader
              title="Interactive Card"
              subtitle="Hover lift + primary glow"
              action={<ArrowRight size={16} color="var(--primary)" />}
            />
            <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
              Hover over this card to preview the tactile lift and edge glow.
            </p>
          </Card>
        </div>
      </section>

      {/* Section 6: Avatars & Status */}
      <section style={{ marginBottom: '3rem' }}>
        <h2 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: '1rem', color: 'var(--text-primary)' }}>
          6. Avatars (Deterministic Initials &amp; Status)
        </h2>
        <Card padding="md">
          <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
            <Avatar name="Rajesh Sharma" size="xl" status="online" />
            <Avatar name="Neha Kapoor" size="lg" status="busy" />
            <Avatar name="Aarav Sharma" size="md" status="online" />
            <Avatar name="Priya Sen" size="sm" status="offline" />
            <Avatar name="Vikram Malhotra" size="xs" />
            <Avatar name="College Student" size="lg" shape="rounded" status="online" />
          </div>
          <div style={{ marginTop: '1rem', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
            Avatars auto-compute deterministic gradient backgrounds based on name characters when no photo is provided.
          </div>
        </Card>
      </section>

      {/* Section 7: Skeletons & Shimmer Loaders */}
      <section style={{ marginBottom: '3rem' }}>
        <h2 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: '1rem', color: 'var(--text-primary)' }}>
          7. Skeletons (Smooth Shimmer in Light &amp; Dark)
        </h2>
        <Card padding="md">
          <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', marginBottom: '1.25rem' }}>
            <Skeleton variant="circular" width={48} height={48} />
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <Skeleton variant="text" width="40%" height={16} />
              <Skeleton variant="text" width="70%" height={12} />
            </div>
          </div>
          <Skeleton variant="rectangular" height={90} />
        </Card>
      </section>

      {/* Section 8: Empty State Pattern */}
      <section style={{ marginBottom: '3rem' }}>
        <h2 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: '1rem', color: 'var(--text-primary)' }}>
          8. Empty State Component
        </h2>
        <Card padding="none">
          <EmptyState
            icon={Users}
            title="No Students Enrolled"
            description="Get started by adding your first student or importing a roster from CSV."
            action={
              <Button variant="primary" leftIcon={<UserPlus size={16} />}>
                Enroll First Student
              </Button>
            }
          />
        </Card>
      </section>

      {/* Section 9: Tooltips */}
      <section style={{ marginBottom: '3rem' }}>
        <h2 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: '1rem', color: 'var(--text-primary)' }}>
          9. Accessible Tooltips
        </h2>
        <Card padding="md">
          <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
            <Tooltip content="Tooltip positioned on top" position="top">
              <Button variant="secondary">Hover Me (Top)</Button>
            </Tooltip>
            <Tooltip content="Tooltip positioned on bottom" position="bottom">
              <Button variant="secondary">Hover Me (Bottom)</Button>
            </Tooltip>
            <Tooltip content="Biometric Face Data Encrypted with 512-D InsightFace" position="right">
              <Button variant="outline" leftIcon={<ShieldCheck size={16} />}>
                Privacy Tooltip
              </Button>
            </Tooltip>
          </div>
        </Card>
      </section>

      {/* Section 10: Interactive Modal & Drawer Overlays */}
      <section style={{ marginBottom: '3rem' }}>
        <h2 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: '1rem', color: 'var(--text-primary)' }}>
          10. Modals &amp; Slide-over Drawers (Framer Motion)
        </h2>
        <Card padding="md">
          <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
            <Button variant="primary" onClick={() => setIsModalOpen(true)}>
              Open Test Modal
            </Button>
            <Button variant="secondary" onClick={() => setIsDrawerOpen(true)}>
              Open Slide-over Drawer
            </Button>
          </div>
        </Card>
      </section>

      {/* Section 11: Sonner Toast Notifications */}
      <section style={{ marginBottom: '3rem' }}>
        <h2 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: '1rem', color: 'var(--text-primary)' }}>
          11. Sonner Stacked Toasts
        </h2>
        <Card padding="md">
          <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
            <Button variant="secondary" onClick={() => triggerToast('success')} leftIcon={<CheckCircle2 size={16} color="var(--success)" />}>
              Success Toast
            </Button>
            <Button variant="secondary" onClick={() => triggerToast('error')} leftIcon={<XCircle size={16} color="var(--danger)" />}>
              Error Toast
            </Button>
            <Button variant="secondary" onClick={() => triggerToast('warning')} leftIcon={<AlertTriangle size={16} color="var(--warning)" />}>
              Warning Toast
            </Button>
            <Button variant="secondary" onClick={() => triggerToast('info')} leftIcon={<Info size={16} color="var(--primary)" />}>
              Info Toast
            </Button>
            <Button variant="accent" onClick={() => triggerToast('action')}>
              Action Toast (with button)
            </Button>
          </div>
        </Card>
      </section>

      {/* Test Modal Component */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Sample Design Modal"
        description="Framer-motion spring animation with backdrop blur and escape key listener."
        footer={
          <>
            <Button variant="ghost" onClick={() => setIsModalOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={() => {
                setIsModalOpen(false);
                toast.success('Modal action submitted successfully!');
              }}
            >
              Save Changes
            </Button>
          </>
        }
      >
        <p style={{ margin: '0 0 1rem 0', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
          This modal renders seamlessly in both light mode and deep navy dark mode, respecting system motion preferences.
        </p>
        <Input
          label="Verification Code"
          placeholder="e.g. 9842"
          helperText="Enter 4-digit attendance confirmation pin."
        />
      </Modal>

      {/* Test Drawer Component */}
      <Drawer
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        title="Slide-over Configuration Panel"
        description="Used for Step-wise Student Registration, Batch Filters, and Attendance History."
        footer={
          <>
            <Button variant="ghost" onClick={() => setIsDrawerOpen(false)}>
              Close
            </Button>
            <Button variant="primary" onClick={() => setIsDrawerOpen(false)}>
              Apply Changes
            </Button>
          </>
        }
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <Input label="Filter By Student Name" placeholder="Search..." leftIcon={<Search size={16} />} />
          <Select
            label="Attendance Status"
            options={[
              { value: 'all', label: 'All Records' },
              { value: 'present', label: 'Present Only' },
              { value: 'absent', label: 'Absent Only' },
              { value: 'review', label: 'Flagged for Review' },
            ]}
          />
          <Card variant="subtle" padding="sm">
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <ShieldCheck size={18} color="var(--primary)" />
              <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>DPDP Biometric Compliance Active</span>
            </div>
          </Card>
        </div>
      </Drawer>
    </div>
  );
};

export default DesignSystemPreview;
