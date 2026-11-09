import { LocalizedText } from '@/components/ui/LocalizedText';
import React from 'react';
import { NavLink } from 'react-router-dom';
import { PermissionGate } from '@/components/auth/PermissionGate';

interface SidebarProps {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
}

export function Sidebar({ isOpen, setIsOpen }: SidebarProps) {
  /**
   * Active link style: blue background tint + bold blue text.
   * Inactive link: gray text, subtle hover.
   * FIX: Replaced undefined `bg-primary-50`/`text-primary-700` classes with
   * concrete Tailwind `bg-blue-50`/`text-blue-700` equivalents that actually
   * exist in the default theme. The old classes resolved to nothing, making
   * active nav items visually identical to inactive ones.
   */
  const navClass = ({ isActive }: { isActive: boolean }) =>
    `flex items-center px-3 py-2 text-sm rounded-md transition-colors ${
      isActive
        ? 'bg-blue-50 text-blue-700 font-semibold'
        : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
    }`;

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
        className={`fixed inset-y-0 left-0 z-30 w-64 bg-white border-r border-gray-200 flex flex-col transform transition-transform duration-300 ease-in-out md:relative ${
          isOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        }`}
      >
        {/*
          FIX: Header was using dark-theme colours (border-blue-800,
          text-blue-100) on a white bg-white sidebar, making the brand name
          and close button invisible in light mode. Changed to a solid blue
          background header consistent with the app's primary brand colour,
          with proper white text that is readable in both themes.
        */}
        <div className="flex items-center justify-between h-16 px-4 bg-blue-700 flex-shrink-0">
          <span className="text-lg font-bold text-white truncate">
            <LocalizedText text={'Cost Buildup'} />
          </span>
          <button
            className="md:hidden text-blue-100 hover:text-white focus:outline-none focus:ring-2 focus:ring-white rounded p-1"
            onClick={closeSidebar}
            aria-label="Close navigation menu"
          >
            <svg
              className="w-6 h-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
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

        <nav className="flex-1 px-2 py-4 space-y-1 overflow-y-auto">
          <NavLink to="/" end className={navClass} onClick={closeSidebar}>
            <LocalizedText text={'Dashboard'} />
          </NavLink>

          <PermissionGate permission="suppliers:read">
            <NavLink
              to="/suppliers"
              className={navClass}
              onClick={closeSidebar}
            >
              <LocalizedText text={'Suppliers'} />
            </NavLink>
          </PermissionGate>

          <PermissionGate permission="items:read">
            <NavLink to="/items" className={navClass} onClick={closeSidebar}>
              <LocalizedText text={'Items'} />
            </NavLink>
          </PermissionGate>

          <PermissionGate permission="po:read">
            <NavLink
              to="/purchase-orders"
              className={navClass}
              onClick={closeSidebar}
            >
              <LocalizedText text={'Purchase Orders'} />
            </NavLink>
          </PermissionGate>

          <PermissionGate permission="lc:read">
            <NavLink
              to="/letters-of-credit"
              className={navClass}
              onClick={closeSidebar}
            >
              <LocalizedText text={'Letters of Credit'} />
            </NavLink>
          </PermissionGate>

          <PermissionGate permission="shipment:read">
            <NavLink
              to="/shipments"
              className={navClass}
              onClick={closeSidebar}
            >
              <LocalizedText text={'Shipments'} />
            </NavLink>
          </PermissionGate>

          <PermissionGate permission="customs:read">
            <NavLink to="/customs" className={navClass} onClick={closeSidebar}>
              <LocalizedText text={'Customs'} />
            </NavLink>
          </PermissionGate>

          <PermissionGate permission="cost:read">
            <NavLink
              to="/cost-buildup"
              className={navClass}
              onClick={closeSidebar}
            >
              <LocalizedText text={'Cost Buildup'} />
            </NavLink>
            <NavLink
              to="/landed-cost"
              className={navClass}
              onClick={closeSidebar}
            >
              <LocalizedText text={'Landed Cost'} />
            </NavLink>
          </PermissionGate>

          <PermissionGate permission="grn:read">
            <NavLink
              to="/goods-receipts"
              className={navClass}
              onClick={closeSidebar}
            >
              <LocalizedText text={'Goods Receipts'} />
            </NavLink>
          </PermissionGate>

          <PermissionGate permission="variance:approve">
            <NavLink
              to="/variances"
              className={navClass}
              onClick={closeSidebar}
            >
              <LocalizedText text={'Variances'} />
            </NavLink>
          </PermissionGate>

          <NavLink to="/reports" className={navClass} onClick={closeSidebar}>
            <LocalizedText text={'Reports'} />
          </NavLink>

          {/*
            Administration section
            FIX: Separator and label were using dark-theme colours
            (border-blue-800, text-blue-300) on a white background, making them
            invisible in light mode. Changed to standard gray tones that work
            correctly in both light and dark themes.
          */}
          <div className="pt-4 mt-4 border-t border-gray-200">
            <p className="px-3 text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
              <LocalizedText text={'Administration'} />
            </p>

            <PermissionGate permission="users:read">
              <NavLink
                to="/admin/users"
                className={navClass}
                onClick={closeSidebar}
              >
                <LocalizedText text={'Users'} />
              </NavLink>
            </PermissionGate>

            <PermissionGate permission="settings:read">
              <NavLink
                to="/admin/settings"
                className={navClass}
                onClick={closeSidebar}
              >
                <LocalizedText text={'Settings'} />
              </NavLink>
              <NavLink
                to="/admin/cost-categories"
                className={navClass}
                onClick={closeSidebar}
              >
                <LocalizedText text={'Cost Categories'} />
              </NavLink>
            </PermissionGate>

            <PermissionGate permission="rates:read">
              <NavLink
                to="/admin/nbe-rates"
                className={navClass}
                onClick={closeSidebar}
              >
                <LocalizedText text={'NBE Rates'} />
              </NavLink>
            </PermissionGate>

            <PermissionGate permission="tariffs:read">
              <NavLink
                to="/admin/tariffs"
                className={navClass}
                onClick={closeSidebar}
              >
                <LocalizedText text={'Tariffs'} />
              </NavLink>
            </PermissionGate>

            <PermissionGate permission="audit:read">
              <NavLink to="/audit" className={navClass} onClick={closeSidebar}>
                <LocalizedText text={'Audit Logs'} />
              </NavLink>
            </PermissionGate>
          </div>
        </nav>
      </aside>
    </>
  );
}
