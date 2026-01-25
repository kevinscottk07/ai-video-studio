import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Shield, Download, Trash2, Eye, Settings, AlertTriangle, CheckCircle } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Modal } from '../components/ui/modal';
import { toast } from '../components/ui/toast';
import { useAuth } from '../hooks/useAuth';

interface ConsentRecord {
  consentType: 'data_processing' | 'marketing' | 'analytics' | 'cookies';
  granted: boolean;
  grantedAt: string;
  version: string;
}

interface PrivacyRequest {
  type: 'export' | 'deletion';
  requestDate: string;
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled';
  scheduledDate?: string;
}

const consentTypeLabels = {
  data_processing: 'Data Processing',
  marketing: 'Marketing Communications',
  analytics: 'Analytics & Performance',
  cookies: 'Cookies & Tracking'
};

const consentDescriptions = {
  data_processing: 'Allow us to process your personal data to provide our services',
  marketing: 'Receive marketing emails and promotional content',
  analytics: 'Help us improve our service by analyzing usage patterns',
  cookies: 'Use cookies to enhance your browsing experience'
};

export const PrivacyPage: React.FC = () => {
  const { user } = useAuth();
  const [consents, setConsents] = useState<ConsentRecord[]>([]);
  const [requests, setRequests] = useState<PrivacyRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [showExportModal, setShowExportModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteReason, setDeleteReason] = useState('');

  useEffect(() => {
    loadPrivacyData();
  }, []);

  const loadPrivacyData = async () => {
    try {
      setLoading(true);
      
      // Load consent records
      const consentResponse = await fetch('/api/v1/privacy/consent', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      if (consentResponse.ok) {
        const consentData = await consentResponse.json();
        setConsents(consentData.data.consents || []);
      }

      // Load privacy requests
      const requestsResponse = await fetch('/api/v1/privacy/requests', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      if (requestsResponse.ok) {
        const requestsData = await requestsResponse.json();
        const allRequests = [
          ...requestsData.data.requests.exportRequests.map((r: any) => ({ ...r, type: 'export' })),
          ...requestsData.data.requests.deletionRequests.map((r: any) => ({ ...r, type: 'deletion' }))
        ];
        setRequests(allRequests);
      }
    } catch (error) {
      console.error('Error loading privacy data:', error);
      toast.error('Failed to load privacy settings');
    } finally {
      setLoading(false);
    }
  };

  const handleConsentChange = async (consentType: ConsentRecord['consentType'], granted: boolean) => {
    try {
      const response = await fetch('/api/v1/privacy/consent', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          consentType,
          granted,
          policyVersion: '1.0'
        })
      });

      if (response.ok) {
        toast.success(`${consentTypeLabels[consentType]} consent ${granted ? 'granted' : 'withdrawn'}`);
        loadPrivacyData(); // Reload to get updated consents
      } else {
        throw new Error('Failed to update consent');
      }
    } catch (error) {
      console.error('Error updating consent:', error);
      toast.error('Failed to update consent preferences');
    }
  };

  const handleDataExport = async () => {
    try {
      const response = await fetch('/api/v1/privacy/export', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        toast.success('Data export requested successfully. You will receive an email with download instructions.');
        setShowExportModal(false);
        loadPrivacyData();
      } else {
        throw new Error('Failed to request data export');
      }
    } catch (error) {
      console.error('Error requesting data export:', error);
      toast.error('Failed to request data export');
    }
  };

  const handleDataDeletion = async () => {
    try {
      const response = await fetch('/api/v1/privacy/delete', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          reason: deleteReason
        })
      });

      if (response.ok) {
        const data = await response.json();
        toast.success('Data deletion requested. Your data will be permanently deleted in 30 days.');
        setShowDeleteModal(false);
        setDeleteReason('');
        loadPrivacyData();
      } else {
        throw new Error('Failed to request data deletion');
      }
    } catch (error) {
      console.error('Error requesting data deletion:', error);
      toast.error('Failed to request data deletion');
    }
  };

  const handleCancelDeletion = async () => {
    try {
      const response = await fetch('/api/v1/privacy/delete/cancel', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (response.ok) {
        toast.success('Data deletion request cancelled successfully');
        loadPrivacyData();
      } else {
        throw new Error('Failed to cancel data deletion');
      }
    } catch (error) {
      console.error('Error cancelling data deletion:', error);
      toast.error('Failed to cancel data deletion request');
    }
  };

  const getConsentStatus = (consentType: ConsentRecord['consentType']) => {
    const consent = consents.find(c => c.consentType === consentType);
    return consent?.granted ?? false;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <div className="flex items-center gap-3 mb-4">
            <Shield className="h-8 w-8 text-primary" />
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              Privacy & Data Protection
            </h1>
          </div>
          <p className="text-gray-600 dark:text-gray-400">
            Manage your privacy settings and data protection preferences in compliance with GDPR and CCPA.
          </p>
        </motion.div>

        <div className="space-y-8">
          {/* Consent Management */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6"
          >
            <div className="flex items-center gap-3 mb-6">
              <Settings className="h-6 w-6 text-primary" />
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                Consent Preferences
              </h2>
            </div>

            <div className="space-y-4">
              {Object.entries(consentTypeLabels).map(([type, label]) => {
                const consentType = type as ConsentRecord['consentType'];
                const isGranted = getConsentStatus(consentType);
                
                return (
                  <div key={type} className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                    <div className="flex-1">
                      <h3 className="font-medium text-gray-900 dark:text-white">
                        {label}
                      </h3>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                        {consentDescriptions[consentType]}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className={`text-sm font-medium ${isGranted ? 'text-green-600' : 'text-gray-500'}`}>
                        {isGranted ? 'Granted' : 'Not granted'}
                      </span>
                      <Button
                        variant={isGranted ? 'outline' : 'primary'}
                        size="sm"
                        onClick={() => handleConsentChange(consentType, !isGranted)}
                      >
                        {isGranted ? 'Withdraw' : 'Grant'}
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          </motion.div>

          {/* Data Rights */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6"
          >
            <div className="flex items-center gap-3 mb-6">
              <Eye className="h-6 w-6 text-primary" />
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                Your Data Rights
              </h2>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              {/* Data Export */}
              <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                <div className="flex items-center gap-3 mb-3">
                  <Download className="h-5 w-5 text-blue-600" />
                  <h3 className="font-medium text-gray-900 dark:text-white">
                    Export Your Data
                  </h3>
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                  Download a complete copy of your personal data in a portable format.
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowExportModal(true)}
                  className="w-full"
                >
                  Request Data Export
                </Button>
              </div>

              {/* Data Deletion */}
              <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                <div className="flex items-center gap-3 mb-3">
                  <Trash2 className="h-5 w-5 text-red-600" />
                  <h3 className="font-medium text-gray-900 dark:text-white">
                    Delete Your Data
                  </h3>
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                  Permanently delete your account and all associated data.
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowDeleteModal(true)}
                  className="w-full text-red-600 border-red-600 hover:bg-red-50"
                >
                  Request Data Deletion
                </Button>
              </div>
            </div>
          </motion.div>

          {/* Privacy Requests Status */}
          {requests.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6"
            >
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-6">
                Privacy Request Status
              </h2>

              <div className="space-y-4">
                {requests.map((request, index) => (
                  <div key={index} className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                    <div>
                      <h3 className="font-medium text-gray-900 dark:text-white">
                        {request.type === 'export' ? 'Data Export' : 'Data Deletion'} Request
                      </h3>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        Requested on {new Date(request.requestDate).toLocaleDateString()}
                        {request.scheduledDate && ` • Scheduled for ${new Date(request.scheduledDate).toLocaleDateString()}`}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                        request.status === 'completed' ? 'bg-green-100 text-green-800' :
                        request.status === 'processing' ? 'bg-blue-100 text-blue-800' :
                        request.status === 'failed' ? 'bg-red-100 text-red-800' :
                        'bg-yellow-100 text-yellow-800'
                      }`}>
                        {request.status}
                      </span>
                      {request.type === 'deletion' && request.status === 'pending' && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={handleCancelDeletion}
                        >
                          Cancel
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          )}
        </div>

        {/* Data Export Modal */}
        <Modal
          isOpen={showExportModal}
          onClose={() => setShowExportModal(false)}
          title="Export Your Data"
        >
          <div className="space-y-4">
            <div className="flex items-start gap-3 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
              <CheckCircle className="h-5 w-5 text-blue-600 mt-0.5" />
              <div>
                <h3 className="font-medium text-blue-900 dark:text-blue-100">
                  Data Export Information
                </h3>
                <p className="text-sm text-blue-700 dark:text-blue-200 mt-1">
                  Your data export will include all personal information, projects, transactions, and activity logs. 
                  You will receive an email with a secure download link within 30 days.
                </p>
              </div>
            </div>

            <div className="flex gap-3 pt-4">
              <Button
                variant="outline"
                onClick={() => setShowExportModal(false)}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                onClick={handleDataExport}
                className="flex-1"
              >
                Request Export
              </Button>
            </div>
          </div>
        </Modal>

        {/* Data Deletion Modal */}
        <Modal
          isOpen={showDeleteModal}
          onClose={() => setShowDeleteModal(false)}
          title="Delete Your Data"
        >
          <div className="space-y-4">
            <div className="flex items-start gap-3 p-4 bg-red-50 dark:bg-red-900/20 rounded-lg">
              <AlertTriangle className="h-5 w-5 text-red-600 mt-0.5" />
              <div>
                <h3 className="font-medium text-red-900 dark:text-red-100">
                  Permanent Data Deletion
                </h3>
                <p className="text-sm text-red-700 dark:text-red-200 mt-1">
                  This action will permanently delete your account and all associated data after a 30-day grace period. 
                  This cannot be undone.
                </p>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Reason for deletion (optional)
              </label>
              <textarea
                value={deleteReason}
                onChange={(e) => setDeleteReason(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                rows={3}
                placeholder="Please let us know why you're deleting your account..."
              />
            </div>

            <div className="flex gap-3 pt-4">
              <Button
                variant="outline"
                onClick={() => setShowDeleteModal(false)}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                onClick={handleDataDeletion}
                className="flex-1 bg-red-600 hover:bg-red-700 text-white"
              >
                Request Deletion
              </Button>
            </div>
          </div>
        </Modal>
      </div>
    </div>
  );
};