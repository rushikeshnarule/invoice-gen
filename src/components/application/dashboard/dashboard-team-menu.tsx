"use client";

import { useTemplateCopy } from "@/components/foundations/template-copy/template-copy";
import { useDirection } from "@/components/foundations/direction/direction";
import { useState, useSyncExternalStore, type ComponentType, type ReactNode } from "react";
import {
  RiBankCardLine,
  RiBuildingLine,
  RiFileTextLine,
  RiDatabase2Line,
  RiSettings4Line,
} from "@remixicon/react";
import {
  Button as AriaButton,
  Dialog as AriaDialog,
  DialogTrigger as AriaDialogTrigger,
  Popover as AriaPopover,
} from "react-aria-components";
import { Avatar } from "@/components/base/avatar/avatar";
import { ChevronDownSmall } from "@/components/foundations/icons/chevrons";
import { cx } from "@/utils/cx";
import { useInvoices } from "@/context/InvoiceContext";

type IconComponent = ComponentType<{
  className?: string;
  "aria-hidden"?: boolean | "true" | "false";
}>;

type MenuRow = {
  icon: IconComponent;
  label: string;
  badge?: string;
  tab?: "identity" | "address" | "banking" | "terms" | "backup";
};

/** Label/chevron slot on the trigger: blurs + fades away as the rail collapses. */
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

function TeamMenuItem({
  icon: Icon,
  label,
  badge,
  onSelect,
}: MenuRow & { onSelect: () => void }) {
  const localize = useTemplateCopy();
  return localize((
    <AriaButton
      type="button"
      onPress={onSelect}
      className={cx(
        "flex w-full cursor-pointer items-center gap-2.5 rounded-2lg p-2 text-start outline-none transition-colors",
        "hover:bg-background-primary-hover focus-visible:bg-background-primary-hover",
      )}
    >
      <span className="flex min-w-0 flex-1 items-center gap-2">
        <Icon className="size-4 shrink-0 text-foreground-icon-secondary" aria-hidden />
        <span className="truncate text-body-medium text-text-primary text-xs">{label}</span>
      </span>
      {badge && (
        <span className="text-[10px] font-mono font-semibold px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 border border-slate-200">
          {badge}
        </span>
      )}
    </AriaButton>
  ));
}

const mobileSnapshot = () => window.matchMedia("(max-width: 639px)").matches;
const subscribeMobile = (listener: () => void) => {
  const query = window.matchMedia("(max-width: 639px)");
  query.addEventListener("change", listener);
  return () => query.removeEventListener("change", listener);
};

export function DashboardTeamMenu({
  collapsed = false,
  className,
  onOpenSettings,
}: {
  collapsed?: boolean;
  className?: string;
  onOpenSettings?: (tab?: "identity" | "address" | "banking" | "terms" | "backup") => void;
}) {
  const localize = useTemplateCopy();
  const direction = useDirection();
  const { businessProfile, invoices, clients } = useInvoices();
  const [isOpen, setIsOpen] = useState(false);
  const isMobile = useSyncExternalStore(subscribeMobile, mobileSnapshot, () => false);

  const initials = businessProfile.name
    ? businessProfile.name
        .split(/\s+/)
        .filter(Boolean)
        .map((w) => w[0])
        .slice(0, 2)
        .join("")
        .toUpperCase()
    : "IG";

  const menuRows: MenuRow[] = [
    {
      icon: RiBuildingLine,
      label: "Business Profile & Identity",
      tab: "identity",
    },
    {
      icon: RiFileTextLine,
      label: "GST & Tax Configuration",
      badge: businessProfile.state || "MH",
      tab: "address",
    },
    {
      icon: RiBankCardLine,
      label: "Bank Account & UPI ID",
      badge: businessProfile.bankDetails?.upiId ? "Active" : "Add UPI",
      tab: "banking",
    },
    {
      icon: RiDatabase2Line,
      label: "Offline PC Backup & Export",
      badge: `${invoices.length} Bills`,
      tab: "backup",
    },
  ];

  return localize((
    <AriaDialogTrigger isOpen={isOpen} onOpenChange={setIsOpen}>
      <AriaButton
        aria-label="Business Account Profile"
        className={cx(
          "flex cursor-pointer items-center overflow-hidden outline-none",
          "border-2 border-transparent hover:border-border-button-hover",
          "transition-[width,background-color,border-color,padding] duration-300 ease-in-out",
          "focus-visible:ring-2 focus-visible:ring-border-focus-ring focus-visible:ring-offset-2",
          collapsed
            ? "size-9 justify-start rounded-full bg-transparent p-0"
            : "w-full justify-between rounded-xl bg-background-tertiary-default py-2 pe-3 ps-2.5",
          className,
        )}
      >
        <span className="flex min-w-0 items-center gap-2">
          <Avatar size="md" color="blue" initials={initials} alt={businessProfile.name} />
          <Collapsible collapsed={collapsed}>
            <span className="flex min-w-0 flex-col items-start justify-center text-left">
              <span className="text-body-medium whitespace-nowrap text-text-primary font-bold truncate max-w-[130px]">
                {businessProfile.name}
              </span>
              <span className="text-body-regular whitespace-nowrap text-text-secondary text-[11px] font-mono truncate max-w-[130px]">
                {businessProfile.gstin ? `GST: ${businessProfile.gstin}` : businessProfile.email || "Offline Software"}
              </span>
            </span>
          </Collapsible>
        </span>
        <Collapsible collapsed={collapsed}>
          <span className="flex size-4 shrink-0 items-center justify-center rounded-[3px] bg-background-tertiary-hover">
            <ChevronDownSmall
              className={cx("size-4 text-text-secondary transition-transform duration-200 ease", isOpen && "rotate-180")}
            />
          </span>
        </Collapsible>
      </AriaButton>

      <AriaPopover
        placement={isMobile ? "bottom start" : direction === "rtl" ? "left bottom" : "right bottom"}
        offset={8}
        className={cx(
          "w-[275px] max-w-[calc(100vw-32px)] origin-bottom-left overflow-y-auto",
          "rounded-2xl border border-slate-200 bg-white p-2.5 shadow-lg",
          "transition duration-150 ease-out",
          "data-[entering]:opacity-0 data-[entering]:scale-95",
          "data-[exiting]:opacity-0 data-[exiting]:scale-95",
        )}
      >
        <AriaDialog aria-label="Business Account Menu" className="flex flex-col gap-2 outline-none">
          {/* Header */}
          <div className="flex w-full items-center gap-2.5 px-2 pt-1 pb-2 border-b border-slate-100">
            <Avatar size="md" color="blue" initials={initials} alt={businessProfile.name} />
            <div className="flex min-w-0 flex-col items-start justify-center text-left">
              <span className="text-xs font-bold text-slate-900 truncate max-w-[180px]">
                {businessProfile.name}
              </span>
              <span className="text-[11px] font-mono text-slate-500 truncate max-w-[180px]">
                {businessProfile.gstin ? `GSTIN: ${businessProfile.gstin}` : businessProfile.phone || "Offline Edition"}
              </span>
            </div>
          </div>

          {/* Quick Shortcuts */}
          <div className="flex w-full flex-col gap-0.5">
            {menuRows.map((row) => (
              <TeamMenuItem
                key={row.label}
                {...row}
                onSelect={() => {
                  setIsOpen(false);
                  onOpenSettings?.(row.tab);
                }}
              />
            ))}
          </div>

          {/* Direct Settings CTA */}
          <div className="pt-1.5 border-t border-slate-100">
            <button
              type="button"
              onClick={() => {
                setIsOpen(false);
                onOpenSettings?.("identity");
              }}
              className="w-full flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition-colors"
            >
              <RiSettings4Line className="size-3.5 text-slate-500" />
              <span>Configure Business Profile</span>
            </button>
          </div>

          {/* Footer - No BoardUI branding, purely offline invoice software */}
          <div className="flex w-full items-center justify-between px-2 pt-1 text-[10px] text-slate-400 font-mono">
            <span>Offline Ledger DB</span>
            <span>{clients.length} Clients • {invoices.length} Invoices</span>
          </div>
        </AriaDialog>
      </AriaPopover>
    </AriaDialogTrigger>
  ));
}
