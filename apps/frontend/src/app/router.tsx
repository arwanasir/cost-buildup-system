import React from 'react';
import { createBrowserRouter } from 'react-router-dom';
import { LoginPage } from '@/features/auth';
import { DashboardPage } from '@/features/dashboard';
import { SuppliersListPage } from '@/features/suppliers';
import { SupplierDetailPage } from '@/features/suppliers/pages/SupplierDetailPage';
import { ItemsListPage } from '@/features/items';
import { PurchaseOrdersListPage } from '@/features/purchase-orders';
import { PurchaseOrderDetailPage } from '@/features/purchase-orders/pages/PurchaseOrderDetailPage';
import {
  LettersOfCreditDashboard,
  LetterOfCreditCreatePage,
  LetterOfCreditDetailPage,
} from '@/features/letters-of-credit';
import { NotificationsPage } from '@/features/notifications';
import { UsersPage } from '@/features/users';
import { SettingsPage } from '@/features/settings';
import { CostCategoriesPage } from '@/features/cost-categories';
import { NbeRatesPage } from '@/features/exchange-rates';
import { TariffsPage } from '@/features/tariffs';
import { AuditLogPage } from '@/features/audit';
import { ProtectedRoute } from '@/components/auth';
import { AppLayout } from '@/components/layout/AppLayout';
import { CustomsListPage } from '@/features/customs/pages/CustomsListPage';
import { CustomsCreatePage } from '@/features/customs/pages/CustomsCreatePage';
import { CustomsDeclarationDetailPage } from '@/features/customs/pages/CustomsDeclarationDetailPage';
import { CostBuildupPage } from '@/features/cost-register/pages/CostBuildupPage';
import { LandedCostDashboardPage } from '@/features/landed-cost/pages/LandedCostDashboardPage';
import {
  ShipmentCreatePage,
  ShipmentDetailPage,
  ShipmentsListPage,
} from '@/features/import-shipments';
import { GoodsReceiptsListPage } from '@/features/goods-receipts/pages/GoodsReceiptsListPage';
import { GoodsReceiptFormPage } from '@/features/goods-receipts/pages/GoodsReceiptFormPage';
import { GoodsReceiptDetailPage } from '@/features/goods-receipts/pages/GoodsReceiptDetailPage';
import { VarianceQueuePage } from '@/features/variances/pages/VarianceQueuePage';
import { ReportsPage } from '@/features/reports/pages/ReportsPage';

export const router = createBrowserRouter([
  {
    path: '/login',
    element: <LoginPage />,
  },
  {
    path: '/',
    element: (
      <ProtectedRoute>
        <AppLayout />
      </ProtectedRoute>
    ),
    children: [
      { path: '/', element: <DashboardPage /> },
      {
        path: '/admin/users',
        element: (
          <ProtectedRoute requiredPermission="users:read">
            <UsersPage />
          </ProtectedRoute>
        ),
      },
      {
        path: '/admin/settings',
        element: (
          <ProtectedRoute requiredPermission="settings:read">
            <SettingsPage />
          </ProtectedRoute>
        ),
      },
      {
        path: '/admin/cost-categories',
        element: (
          <ProtectedRoute requiredPermission="settings:read">
            <CostCategoriesPage />
          </ProtectedRoute>
        ),
      },
      {
        path: '/admin/nbe-rates',
        element: (
          <ProtectedRoute requiredPermission="rates:read">
            <NbeRatesPage />
          </ProtectedRoute>
        ),
      },
      {
        path: '/admin/tariffs',
        element: (
          <ProtectedRoute requiredPermission="tariffs:read">
            <TariffsPage />
          </ProtectedRoute>
        ),
      },
      {
        path: '/suppliers',
        element: (
          <ProtectedRoute requiredPermission="suppliers:read">
            <SuppliersListPage />
          </ProtectedRoute>
        ),
      },
      {
        path: '/suppliers/new',
        element: (
          <ProtectedRoute requiredPermission="suppliers:write">
            <SuppliersListPage initialCreateOpen />
          </ProtectedRoute>
        ),
      },
      {
        path: '/suppliers/:id',
        element: (
          <ProtectedRoute requiredPermission="suppliers:read">
            <SupplierDetailPage />
          </ProtectedRoute>
        ),
      },
      {
        path: '/items',
        element: (
          <ProtectedRoute requiredPermission="items:read">
            <ItemsListPage />
          </ProtectedRoute>
        ),
      },
      {
        path: '/purchase-orders',
        element: (
          <ProtectedRoute requiredPermission="po:read">
            <PurchaseOrdersListPage />
          </ProtectedRoute>
        ),
      },
      {
        path: '/purchase-orders/:id',
        element: (
          <ProtectedRoute requiredPermission="po:read">
            <PurchaseOrderDetailPage />
          </ProtectedRoute>
        ),
      },
      {
        path: '/letters-of-credit',
        element: (
          <ProtectedRoute requiredPermission="lc:read">
            <LettersOfCreditDashboard />
          </ProtectedRoute>
        ),
      },
      {
        path: '/letters-of-credit/new',
        element: (
          <ProtectedRoute requiredPermission="lc:write">
            <LetterOfCreditCreatePage />
          </ProtectedRoute>
        ),
      },
      {
        path: '/letters-of-credit/:id',
        element: (
          <ProtectedRoute requiredPermission="lc:read">
            <LetterOfCreditDetailPage />
          </ProtectedRoute>
        ),
      },
      {
        path: '/shipments',
        element: (
          <ProtectedRoute requiredPermission="shipment:read">
            <ShipmentsListPage />
          </ProtectedRoute>
        ),
      },
      {
        path: '/shipments/new',
        element: (
          <ProtectedRoute requiredPermission="shipment:write">
            <ShipmentCreatePage />
          </ProtectedRoute>
        ),
      },
      {
        path: '/shipments/:id',
        element: (
          <ProtectedRoute requiredPermission="shipment:read">
            <ShipmentDetailPage />
          </ProtectedRoute>
        ),
      },
      {
        path: '/import-shipments',
        element: (
          <ProtectedRoute requiredPermission="shipment:read">
            <ShipmentsListPage />
          </ProtectedRoute>
        ),
      },
      {
        path: '/import-shipments/new',
        element: (
          <ProtectedRoute requiredPermission="shipment:write">
            <ShipmentCreatePage />
          </ProtectedRoute>
        ),
      },
      {
        path: '/import-shipments/:id',
        element: (
          <ProtectedRoute requiredPermission="shipment:read">
            <ShipmentDetailPage />
          </ProtectedRoute>
        ),
      },
      {
        path: '/customs',
        element: (
          <ProtectedRoute requiredPermission="customs:read">
            <CustomsListPage />
          </ProtectedRoute>
        ),
      },
      {
        path: '/customs/:id',
        element: (
          <ProtectedRoute requiredPermission="customs:read">
            <CustomsDeclarationDetailPage />
          </ProtectedRoute>
        ),
      },
      {
        path: '/customs/new',
        element: (
          <ProtectedRoute requiredPermission="customs:write">
            <CustomsCreatePage />
          </ProtectedRoute>
        ),
      },
      {
        path: '/cost-buildup',
        element: (
          <ProtectedRoute requiredPermission="cost:read">
            <CostBuildupPage />
          </ProtectedRoute>
        ),
      },
      {
        path: '/landed-cost',
        element: (
          <ProtectedRoute requiredPermission="cost:read">
            <LandedCostDashboardPage />
          </ProtectedRoute>
        ),
      },
      {
        path: '/goods-receipts',
        element: (
          <ProtectedRoute requiredPermission="grn:read">
            <GoodsReceiptsListPage />
          </ProtectedRoute>
        ),
      },
      {
        path: '/goods-receipts/new',
        element: (
          <ProtectedRoute requiredPermission="grn:write">
            <GoodsReceiptFormPage />
          </ProtectedRoute>
        ),
      },
      {
        path: '/goods-receipts/:id',
        element: (
          <ProtectedRoute requiredPermission="grn:read">
            <GoodsReceiptDetailPage />
          </ProtectedRoute>
        ),
      },
      {
        path: '/variances',
        element: (
          <ProtectedRoute requiredPermission="variance:read">
            <VarianceQueuePage />
          </ProtectedRoute>
        ),
      },
      {
        path: '/reports',
        element: (
          <ProtectedRoute
            requiredPermission={[
              'report:landed_cost_shipment:read',
              'report:landed_cost_item:read',
              'report:landed_cost_supplier:read',
              'report:import_cost_summary:read',
              'report:lc_status:read',
              'report:customs_duty:read',
              'report:shipment_status:read',
              'report:cost_variance:read',
              'report:supplier_performance:read',
              'admin:all',
            ]}
          >
            <ReportsPage />
          </ProtectedRoute>
        ),
      },
      {
        path: '/notifications',
        element: <NotificationsPage />,
      },
      {
        path: '/audit',
        element: (
          <ProtectedRoute requiredPermission="audit:read">
            <AuditLogPage />
          </ProtectedRoute>
        ),
      },
    ],
  },
]);
