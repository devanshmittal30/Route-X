import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ReportModal } from '../components/reports/ReportModal';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { AlertTriangle, Plus, ArrowLeft } from 'lucide-react';

export const ReportPage: React.FC = () => {
  const navigate = useNavigate();
  const [modalOpen, setModalOpen] = useState<boolean>(true);

  return (
    <div className="max-w-[800px] w-full mx-auto px-4 py-8 space-y-6">
      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate('/reports')}
          icon={<ArrowLeft size={16} />}
        >
          Back to Reports
        </Button>
      </div>

      <Card className="text-center py-12 px-4 space-y-4">
        <div className="w-14 h-14 rounded-full bg-brand-soft text-brand mx-auto flex items-center justify-center">
          <AlertTriangle size={28} />
        </div>

        <div>
          <h1 className="text-h2 font-bold text-brand">Report a Mountain Road Hazard</h1>
          <p className="text-body text-text-2 max-w-md mx-auto mt-1">
            Help mountain travellers stay safe by reporting landslides, rockfalls, flooded road segments, or clearing status.
          </p>
        </div>

        <div className="pt-2">
          <Button
            variant="primary"
            onClick={() => setModalOpen(true)}
            icon={<Plus size={16} />}
          >
            Open Report Wizard
          </Button>
        </div>
      </Card>

      <ReportModal
        isOpen={modalOpen}
        onClose={() => {
          setModalOpen(false);
          navigate('/reports');
        }}
        onReportCreated={() => {
          navigate('/reports');
        }}
      />
    </div>
  );
};
