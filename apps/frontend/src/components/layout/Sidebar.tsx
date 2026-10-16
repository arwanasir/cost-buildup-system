import React from 'react';
import { NavLink } from 'react-router-dom';
import { PermissionGate } from '@/components/auth/PermissionGate';
import { useTranslation } from 'react-i18next';

interface SidebarProps {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
}

export function Sidebar({ isOpen, setIsOpen }: SidebarProps) {
  const { t } = useTranslation();

  const navClass = ({ isActive }: { isActive: boolean }) =>
    `block px-4 py-2 text-sm rounded-md transition-colors ${isActive ? 'bg-primary-50 text-primary-700 font-medium' : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'}`;

  const closeSidebar = () => setIsOpen(false);

  return (
    <>
      {/* Mobile/Tablet Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 z-20 bg-gray-900 bg-opacity-50 md:hidden"
          onClick={closeSidebar}
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={`fixed inset-y-0 left-0 z-30 w-64 bg-white border-r border-gray-200 transform transition-transform duration-300 ease-in-out md:relative ${isOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}`}
      >
        <div className="flex items-center justify-between h-16 px-4 border-b border-blue-800">
          <span className="text-lg font-bold truncate">Cost Buildup</span>
          <button
            className="md:hidden text-blue-100 hover:text-white"
            onClick={closeSidebar}
          >
            <svg
              className="w-6 h-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        <nav className="flex-1 px-2 py-4 space-y-1 overflow-y-auto h-[calc(100vh-4rem)]">
          <NavLink to="/" className={navClass} onClick={closeSidebar}>
            Dashboard
          </NavLink>

          <PermissionGate permission="suppliers:read">
            <NavLink
              to="/suppliers"
              className={navClass}
              onClick={closeSidebar}
            >
              Suppliers
            </NavLink>
          </PermissionGate>

          <PermissionGate permission="items:read">
            <NavLink to="/items" className={navClass} onClick={closeSidebar}>
              Items
            </NavLink>
          </PermissionGate>

          <PermissionGate permission="po:read">
            <NavLink
              to="/purchase-orders"
              className={navClass}
              onClick={closeSidebar}
            >
              Purchase Orders
            </NavLink>
          </PermissionGate>

          <PermissionGate permission="lc:read">
            <NavLink
              to="/letters-of-credit"
              className={navClass}
              onClick={closeSidebar}
            >
              Letters of Credit
            </NavLink>
          </PermissionGate>

          <PermissionGate permission="shipment:read">
            <NavLink
              to="/shipments"
              className={navClass}
              onClick={closeSidebar}
            >
              Shipments
            </NavLink>
          </PermissionGate>

          <PermissionGate permission="customs:read">
            <NavLink to="/customs" className={navClass} onClick={closeSidebar}>
              Customs
            </NavLink>
          </PermissionGate>

          <PermissionGate permission="cost:read">
            <NavLink
              to="/cost-buildup"
              className={navClass}
              onClick={closeSidebar}
            >
              Cost Buildup
            </NavLink>
            <NavLink
              to="/landed-cost"
              className={navClass}
              onClick={closeSidebar}
            >
              Landed Cost
            </NavLink>
          </PermissionGate>

          <PermissionGate permission="grn:read">
            <NavLink
              to="/goods-receipts"
              className={navClass}
              onClick={closeSidebar}
            >
              Goods Receipts
            </NavLink>
          </PermissionGate>

          <PermissionGate permission="variance:approve">
            <NavLink
              to="/variances"
              className={navClass}
              onClick={closeSidebar}
            >
              Variances
            </NavLink>
          </PermissionGate>

          <NavLink to="/reports" className={navClass} onClick={closeSidebar}>
            Reports
          </NavLink>

          <div className="pt-4 mt-4 border-t border-blue-800">
            <p className="px-4 text-xs font-semibold text-blue-300 uppercase tracking-wider mb-2">
              Administration
            </p>
            <PermissionGate permission="users:read">
              <NavLink
                to="/admin/users"
                className={navClass}
                onClick={closeSidebar}
              >
                Users
              </NavLink>
            </PermissionGate>
            <PermissionGate permission="settings:read">
              <NavLink
                to="/admin/settings"
                className={navClass}
                onClick={closeSidebar}
              >
                Settings
              </NavLink>
              <NavLink
                to="/admin/cost-categories"
                className={navClass}
                onClick={closeSidebar}
              >
                Cost Categories
              </NavLink>
            </PermissionGate>
            <PermissionGate permission="rates:read">
              <NavLink
                to="/admin/nbe-rates"
                className={navClass}
                onClick={closeSidebar}
              >
                NBE Rates
              </NavLink>
            </PermissionGate>
            <PermissionGate permission="tariffs:read">
              <NavLink
                to="/admin/tariffs"
                className={navClass}
                onClick={closeSidebar}
              >
                Tariffs
              </NavLink>
            </PermissionGate>
            <PermissionGate permission="audit:read">
              <NavLink to="/audit" className={navClass} onClick={closeSidebar}>
                Audit Logs
              </NavLink>
            </PermissionGate>
          </div>
        </nav>
      </aside>
    </>
  );
}
