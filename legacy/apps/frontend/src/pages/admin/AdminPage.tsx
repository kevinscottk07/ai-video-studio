import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
import { AdminDashboard } from '../../components/admin/AdminDashboard';
import { UserManagement } from '../../components/admin/UserManagement';
import { PricingConfiguration } from '../../components/admin/PricingConfiguration';
import { ModerationDashboard } from '../../components/admin/ModerationDashboard';

export const AdminPage = () => {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-7xl mx-auto">
        <Tabs defaultValue="dashboard" className="w-full">
          <div className="border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
            <div className="px-6 py-4">
              <TabsList className="grid w-full grid-cols-4 max-w-md">
                <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
                <TabsTrigger value="users">Users</TabsTrigger>
                <TabsTrigger value="pricing">Pricing</TabsTrigger>
                <TabsTrigger value="moderation">Moderation</TabsTrigger>
              </TabsList>
            </div>
          </div>

          <TabsContent value="dashboard" className="mt-0">
            <AdminDashboard />
          </TabsContent>

          <TabsContent value="users" className="mt-0">
            <UserManagement />
          </TabsContent>

          <TabsContent value="pricing" className="mt-0">
            <PricingConfiguration />
          </TabsContent>

          <TabsContent value="moderation" className="mt-0">
            <ModerationDashboard />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};