import { LocalizedText } from '@/components/ui/LocalizedText';
import { AppIcon } from './AppIcon';
import { PermissionGate } from '@/components/auth/PermissionGate';
import { NavLink } from 'react-router-dom';

interface SidebarProps {
  isMobileOpen: boolean;
  isDesktopOpen: boolean;
  setIsMobileOpen: (isOpen: boolean) => void;
}

const linkBase =
  'group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors';
const navClass = ({ isActive }: { isActive: boolean }) =>
  `${linkBase} ${isActive ? 'bg-sky-500/15 text-sky-200 ring-1 ring-inset ring-sky-300/15' : 'text-slate-300 hover:bg-white/8 hover:text-white'}`;

export function Sidebar({
  isMobileOpen,
  isDesktopOpen,
  setIsMobileOpen,
}: SidebarProps) {
  const close = () => setIsMobileOpen(false);
  const item = (path: string, label: string, icon: string, end = false) => (
    <NavLink to={path} end={end} className={navClass} onClick={close}>
      <AppIcon name={icon} className="h-[18px] w-[18px] shrink-0 opacity-85" />
      <span>
        <LocalizedText text={label} />
      </span>
    </NavLink>
  );

  return (
    <>
      {isMobileOpen && (
        <button
          aria-label="Close navigation"
          className="fixed inset-0 z-30 bg-slate-950/55 backdrop-blur-[2px] md:hidden"
          onClick={close}
        />
      )}
      <aside
        id="main-navigation"
        className={`fixed inset-y-0 left-0 z-40 flex w-[264px] flex-col overflow-hidden border-r border-white/8 bg-[#101b2d] text-white shadow-2xl transition-[width,transform] duration-300 md:relative md:z-auto md:translate-x-0 md:shadow-none ${isMobileOpen ? 'translate-x-0' : '-translate-x-full'} ${isDesktopOpen ? 'md:w-[264px]' : 'md:w-0 md:border-r-0'}`}
      >
        <div className="flex h-[76px] shrink-0 items-center justify-between border-b border-white/10 px-5">
          <div className="flex min-w-0 items-center gap-3">
            <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-sky-400 text-slate-950 shadow-lg shadow-sky-950/30">
              <AppIcon name="ship" className="h-6 w-6" />
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-bold tracking-wide text-white">
                <LocalizedText text="Cost Buildup" />
              </p>
              <p className="mt-0.5 truncate text-[10px] font-semibold uppercase tracking-[.17em] text-slate-400">
                <LocalizedText text="Import operations" />
              </p>
            </div>
          </div>
          <button
            className="rounded-lg p-2 text-slate-400 hover:bg-white/10 hover:text-white md:hidden"
            onClick={close}
            aria-label="Close navigation"
          >
            <AppIcon name="close" className="h-5 w-5" />
          </button>
        </div>
        <nav
          aria-label="Main navigation"
          className="flex-1 space-y-1 overflow-y-auto px-3 py-5"
        >
          <p className="mb-2 px-3 text-[10px] font-bold uppercase tracking-[.16em] text-slate-500">
            <LocalizedText text="Workspace" />
          </p>
          {item('/', 'Dashboard', 'dashboard', true)}
          <PermissionGate permission="suppliers:read">
            {item('/suppliers', 'Suppliers', 'suppliers')}
          </PermissionGate>
          <PermissionGate permission="items:read">
            {item('/items', 'Items', 'items')}
          </PermissionGate>
          <PermissionGate permission="po:read">
            {item('/purchase-orders', 'Purchase Orders', 'orders')}
          </PermissionGate>
          <PermissionGate permission="lc:read">
            {item('/letters-of-credit', 'Letters of Credit', 'bank')}
          </PermissionGate>
          <PermissionGate permission="shipment:read">
            {item('/shipments', 'Shipments', 'ship')}
          </PermissionGate>
          <PermissionGate permission="customs:read">
            {item('/customs', 'Customs', 'customs')}
          </PermissionGate>
          <PermissionGate permission="cost:read">
            {item('/cost-buildup', 'Cost Buildup', 'cost')}
            {item('/landed-cost', 'Landed Cost', 'cost')}
          </PermissionGate>
          <PermissionGate permission="grn:read">
            {item('/goods-receipts', 'Goods Receipts', 'receipt')}
          </PermissionGate>
          <PermissionGate permission="variance:read">
            {item('/variances', 'Variances', 'variance')}
          </PermissionGate>
          <PermissionGate
            permission={[
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
            {item('/reports', 'Reports', 'reports')}
          </PermissionGate>
          <div className="!mt-5 border-t border-white/10 pt-5">
            <p className="mb-2 px-3 text-[10px] font-bold uppercase tracking-[.16em] text-slate-500">
              <LocalizedText text="Administration" />
            </p>
            <PermissionGate permission="users:read">
              {item('/admin/users', 'Users', 'users')}
            </PermissionGate>
            <PermissionGate permission="settings:read">
              {item('/admin/settings', 'Settings', 'settings')}
              {item('/admin/cost-categories', 'Cost Categories', 'cost')}
            </PermissionGate>
            <PermissionGate permission="rates:read">
              {item('/admin/nbe-rates', 'NBE Rates', 'rates')}
            </PermissionGate>
            <PermissionGate permission="tariffs:read">
              {item('/admin/tariffs', 'Tariffs', 'tariffs')}
            </PermissionGate>
            <PermissionGate permission="audit:read">
              {item('/audit', 'Audit Logs', 'audit')}
            </PermissionGate>
          </div>
        </nav>
        <div className="mx-3 mb-3 rounded-xl border border-white/8 bg-white/[.04] px-3 py-3 text-xs text-slate-400">
          <span className="mb-2 flex items-center gap-2 font-semibold text-slate-200">
            <span className="h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_10px_#34d399]" />
            <LocalizedText text="Operations workspace" />
          </span>
          <LocalizedText text="Track each import from purchase order through receipt." />
        </div>
      </aside>
    </>
  );
}
