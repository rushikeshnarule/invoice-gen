"use client";

import { useTemplateCopy } from "@/components/foundations/template-copy/template-copy";
import { useDirection } from "@/components/foundations/direction/direction";
import { useState, useSyncExternalStore, type ReactNode } from "react";
import {
  RiCheckLine,
  RiSettings4Line,
  RiShieldCheckLine,
} from "@remixicon/react";
import {
  Button as AriaButton,
  Dialog as AriaDialog,
  DialogTrigger as AriaDialogTrigger,
  Popover as AriaPopover,
} from "react-aria-components";
import { ChevronUpDownSmall } from "@/components/foundations/icons/chevrons";
import { cx } from "@/utils/cx";
import { useInvoices } from "@/context/InvoiceContext";

/** Label slot on the trigger: blurs + fades away as the rail collapses. */
function Collapsible({ collapsed, children }: { collapsed: boolean; children: ReactNode }) {
  const localize = useTemplateCopy();
  return localize((
    <span
      className={cx(
        "flex min-w-0 items-center overflow-hidden transition-[max-width,opacity,filter] duration-300 ease-in-out",
        collapsed ? "max-w-0 opacity-0 blur-[3px]" : "max-w-40 opacity-100 blur-0",
      )}
    >
      {children}
    </span>
  ));
}

const mobileSnapshot = () => typeof window !== "undefined" && window.matchMedia("(max-width: 639px)").matches;
const subscribeMobile = (listener: () => void) => {
  if (typeof window === "undefined") return () => {};
  const query = window.matchMedia("(max-width: 639px)");
  query.addEventListener("change", listener);
  return () => query.removeEventListener("change", listener);
};

export function DashboardUserMenu({
  collapsed = false,
  suppressHover = false,
  onHoverSuppressionEnd,
  onOpenSettings,
}: {
  collapsed?: boolean;
  suppressHover?: boolean;
  onHoverSuppressionEnd?: () => void;
  avatarClassName?: string;
  onOpenSettings?: () => void;
}) {
  const localize = useTemplateCopy();
  const direction = useDirection();
  const { businessProfile, invoices, clients } = useInvoices();
  const [isOpen, setIsOpen] = useState(false);
  const isMobile = useSyncExternalStore(subscribeMobile, mobileSnapshot, () => false);

  return localize((
    <AriaDialogTrigger isOpen={isOpen} onOpenChange={setIsOpen}>
      <AriaButton
        aria-label="Active Business Workspace"
        onPointerLeave={() => {
          if (suppressHover) onHoverSuppressionEnd?.();
        }}
        className={cx(
          "relative flex min-w-0 cursor-pointer items-center gap-2 rounded-xl p-1 outline-none text-start",
          "focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2",
          "hover:bg-slate-100 transition-colors duration-150",
          collapsed && "w-9 justify-center gap-0 p-0",
        )}
      >
        <img
          src="/app-icon.png"
          alt="Invoice Gen"
          className="size-8 object-contain shrink-0 drop-shadow-2xs"
        />
        <Collapsible collapsed={collapsed}>
          <div className="flex flex-col min-w-0 leading-tight">
            <span className="flex items-center gap-1">
              <span className="text-xs font-bold truncate max-w-[120px] text-slate-900">
                {businessProfile.name || "Invoice Gen"}
              </span>
              <ChevronUpDownSmall className="size-3.5 shrink-0 text-slate-400" />
            </span>
            <span className="text-[10px] font-mono text-emerald-600 flex items-center gap-1.5">
              <span className="size-1.5 rounded-full bg-emerald-500 shrink-0" />
              Offline Ready
            </span>
          </div>
        </Collapsible>
      </AriaButton>

      <AriaPopover
        placement={isMobile ? "bottom start" : direction === "rtl" ? "left top" : "right top"}
        offset={8}
        className={cx(
          "w-[280px] max-w-[calc(100vw-32px)] origin-top-left overflow-y-auto",
          "rounded-2xl border border-slate-200 bg-white p-3 shadow-xl",
          "transition duration-150 ease-out",
          "data-[entering]:opacity-0 data-[entering]:scale-95",
          "data-[exiting]:opacity-0 data-[exiting]:scale-95",
        )}
      >
        <AriaDialog aria-label="Business Workspace Details" className="flex flex-col gap-2.5 outline-none">
          {/* Active Company Header */}
          <div className="flex items-center gap-2.5 pb-2.5 border-b border-slate-100">
            <img
              src="/app-icon.png"
              alt="Invoice Gen"
              className="size-10 object-contain shrink-0 drop-shadow-2xs"
            />
            <div className="flex flex-col min-w-0 text-start">
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-bold text-slate-900 truncate max-w-[160px]">
                  {businessProfile.name}
                </span>
                <span title="Active Ledger" className="inline-flex items-center">
                  <RiShieldCheckLine className="size-3.5 text-blue-600 shrink-0" />
                </span>
              </div>
              <span className="text-[11px] font-mono text-slate-500 truncate max-w-[170px]">
                {businessProfile.gstin ? `GSTIN: ${businessProfile.gstin}` : businessProfile.email || "Offline Software"}
              </span>
            </div>
          </div>

          {/* Quick Ledger Overview */}
          <div className="grid grid-cols-2 gap-1.5 py-1">
            <div className="flex flex-col p-2 rounded-lg bg-slate-50 border border-slate-100 text-start">
              <span className="text-[11px] text-slate-500 font-medium">Invoices</span>
              <span className="text-sm font-bold text-slate-800 font-mono">{invoices.length}</span>
            </div>
            <div className="flex flex-col p-2 rounded-lg bg-slate-50 border border-slate-100 text-start">
              <span className="text-[11px] text-slate-500 font-medium">Clients</span>
              <span className="text-sm font-bold text-slate-800 font-mono">{clients.length}</span>
            </div>
          </div>

          {/* Security & Offline Guarantee */}
          <div className="flex items-center gap-2 px-2 py-1.5 rounded-lg bg-emerald-50/70 border border-emerald-100 text-emerald-800 text-[11px]">
            <RiCheckLine className="size-3.5 text-emerald-600 shrink-0" />
            <span className="leading-tight">Data is 100% private &amp; stored locally on this machine</span>
          </div>

          {/* Action button */}
          <div className="pt-1 border-t border-slate-100">
            <button
              type="button"
              onClick={() => {
                setIsOpen(false);
                onOpenSettings?.();
              }}
              className="w-full flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-medium transition-colors cursor-pointer"
            >
              <RiSettings4Line className="size-3.5 text-slate-300" />
              <span>Edit Business Profile &amp; Bank Details</span>
            </button>
          </div>
        </AriaDialog>
      </AriaPopover>
    </AriaDialogTrigger>
  ));
}

