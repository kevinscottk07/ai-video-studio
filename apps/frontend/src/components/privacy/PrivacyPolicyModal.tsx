import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Shield, Mail, Calendar, Globe } from 'lucide-react';
import { Modal } from '../ui/modal';
import { Button } from '../ui/button';

interface PrivacyPolicyInfo {
  version: string;
  lastUpdated: string;
  effectiveDate: string;
  compliance: string[];
  dataRetentionPeriod: string;
  contactEmail: string;
  dpoEmail: string;
  rights: string[];
}

interface PrivacyPolicyModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const PrivacyPolicyModal: React.FC<PrivacyPolicyModalProps> = ({
  isOpen,
  onClose
}) => {
  const [policyInfo, setPolicyInfo] = useState<PrivacyPolicyInfo | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isOpen) {
      loadPrivacyPolicy();
    }
  }, [isOpen]);

  const loadPrivacyPolicy = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/v1/privacy/policy');
      
      if (response.ok) {
        const data = await response.json();
        setPolicyInfo(data.data.policy);
      }
    } catch (error) {
      console.error('Error loading privacy policy:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Modal isOpen={isOpen} onClose={onClose} title="Privacy Policy" size="lg">
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </Modal>
    );
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Privacy Policy" size="lg">
      <div className="space-y-6 max-h-96 overflow-y-auto">
        {policyInfo && (
          <>
            {/* Header Information */}
            <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="font-medium text-gray-700 dark:text-gray-300">Version:</span>
                  <span className="ml-2 text-gray-900 dark:text-white">{policyInfo.version}</span>
                </div>
                <div>
                  <span className="font-medium text-gray-700 dark:text-gray-300">Last Updated:</span>
                  <span className="ml-2 text-gray-900 dark:text-white">
                    {new Date(policyInfo.lastUpdated).toLocaleDateString()}
                  </span>
                </div>
                <div>
                  <span className="font-medium text-gray-700 dark:text-gray-300">Effective Date:</span>
                  <span className="ml-2 text-gray-900 dark:text-white">
                    {new Date(policyInfo.effectiveDate).toLocaleDateString()}
                  </span>
                </div>
                <div>
                  <span className="font-medium text-gray-700 dark:text-gray-300">Compliance:</span>
                  <span className="ml-2 text-gray-900 dark:text-white">
                    {policyInfo.compliance.join(', ')}
                  </span>
                </div>
              </div>
            </div>

            {/* Introduction */}
            <section>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
                Introduction
              </h3>
              <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
                AI Video Studio ("we," "our," or "us") is committed to protecting your privacy and personal data. 
                This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you 
                use our AI-powered video creation platform. We comply with the General Data Protection Regulation (GDPR), 
                California Consumer Privacy Act (CCPA), and other applicable privacy laws.
              </p>
            </section>

            {/* Data Collection */}
            <section>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
                Information We Collect
              </h3>
              <div className="space-y-3 text-gray-600 dark:text-gray-400">
                <div>
                  <h4 className="font-medium text-gray-900 dark:text-white">Personal Information:</h4>
                  <p>Name, email address, profile information, and authentication data from third-party providers.</p>
                </div>
                <div>
                  <h4 className="font-medium text-gray-900 dark:text-white">Usage Data:</h4>
                  <p>Information about how you interact with our platform, including video generation requests, project data, and feature usage.</p>
                </div>
                <div>
                  <h4 className="font-medium text-gray-900 dark:text-white">Content Data:</h4>
                  <p>Videos, images, scripts, and other content you create or upload to our platform.</p>
                </div>
                <div>
                  <h4 className="font-medium text-gray-900 dark:text-white">Technical Data:</h4>
                  <p>IP address, browser type, device information, and cookies for platform functionality and analytics.</p>
                </div>
              </div>
            </section>

            {/* Data Usage */}
            <section>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
                How We Use Your Information
              </h3>
              <ul className="list-disc list-inside space-y-2 text-gray-600 dark:text-gray-400">
                <li>Provide and maintain our AI video generation services</li>
                <li>Process your video creation requests and manage your projects</li>
                <li>Handle billing, subscriptions, and credit transactions</li>
                <li>Improve our AI models and platform functionality</li>
                <li>Send important service notifications and updates</li>
                <li>Provide customer support and respond to inquiries</li>
                <li>Ensure platform security and prevent fraud</li>
                <li>Comply with legal obligations and enforce our terms</li>
              </ul>
            </section>

            {/* Your Rights */}
            <section>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
                Your Privacy Rights
              </h3>
              <div className="space-y-2">
                {policyInfo.rights.map((right, index) => (
                  <div key={index} className="flex items-start gap-2">
                    <Shield className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                    <span className="text-gray-600 dark:text-gray-400">{right}</span>
                  </div>
                ))}
              </div>
            </section>

            {/* Data Retention */}
            <section>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
                Data Retention
              </h3>
              <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
                We retain your personal data for as long as necessary to provide our services and comply with legal obligations. 
                Generally, we retain data for up to {policyInfo.dataRetentionPeriod} after account closure, unless a longer 
                retention period is required by law. You can request deletion of your data at any time through your privacy settings.
              </p>
            </section>

            {/* Data Security */}
            <section>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
                Data Security
              </h3>
              <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
                We implement industry-standard security measures to protect your data, including encryption at rest and in transit, 
                secure cloud infrastructure, regular security audits, and access controls. However, no method of transmission over 
                the internet is 100% secure, and we cannot guarantee absolute security.
              </p>
            </section>

            {/* International Transfers */}
            <section>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
                International Data Transfers
              </h3>
              <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
                Your data may be transferred to and processed in countries other than your own. We ensure appropriate safeguards 
                are in place for international transfers, including Standard Contractual Clauses and adequacy decisions where applicable.
              </p>
            </section>

            {/* Contact Information */}
            <section>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
                Contact Us
              </h3>
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <Mail className="h-4 w-4 text-primary" />
                  <div>
                    <span className="font-medium text-gray-900 dark:text-white">Privacy Questions:</span>
                    <a href={`mailto:${policyInfo.contactEmail}`} className="ml-2 text-primary hover:underline">
                      {policyInfo.contactEmail}
                    </a>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Shield className="h-4 w-4 text-primary" />
                  <div>
                    <span className="font-medium text-gray-900 dark:text-white">Data Protection Officer:</span>
                    <a href={`mailto:${policyInfo.dpoEmail}`} className="ml-2 text-primary hover:underline">
                      {policyInfo.dpoEmail}
                    </a>
                  </div>
                </div>
              </div>
            </section>

            {/* Updates */}
            <section>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
                Policy Updates
              </h3>
              <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
                We may update this Privacy Policy from time to time. We will notify you of any material changes by email 
                or through our platform. Your continued use of our services after such modifications constitutes acceptance 
                of the updated Privacy Policy.
              </p>
            </section>
          </>
        )}
      </div>

      <div className="flex justify-end pt-6 border-t border-gray-200 dark:border-gray-700">
        <Button onClick={onClose}>
          Close
        </Button>
      </div>
    </Modal>
  );
};