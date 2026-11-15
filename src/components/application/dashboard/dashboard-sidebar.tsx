"use client";

import { useTemplateCopy } from "@/components/foundations/template-copy/template-copy";

import {
  useState,
  type ComponentType,
  type ReactNode,
} from "react";
import { useNavigate } from "react-router-dom";
import { useInvoices } from "@/context/InvoiceContext";
import {
  RiCloseLine,
  RiHomeLine,
  RiSideBarFill,
  RiSettings4Line,
  RiShieldKeyholeLine,
  RiSearchLine,
  RiFileTextLine,
  RiPaletteLine,
  RiUserSharedLine,
  RiAddLine,
  RiSparklingFill,
} from "@remixicon/react";
import { SettingsModal, type BusinessSettingsTab } from "@/components/application/settings/settings-modal";
import { LicenseModal } from "@/components/LicenseModal/LicenseModal";
import { useLicense, IS_STANDALONE_UNLOCKED } from "@/context/LicenseContext";
import { ThemeToggle } from "@/components/application/theme/theme-toggle";
import { Badge } from "@/components/base/badges/badge";
import { Kbd } from "@/components/base/kbd/kbd";
import {
  CommandPalette,
  CommandPaletteSection,
  CommandPaletteItem,
} from "@/components/base/command-palette/command-palette";
import { cx } from "@/utils/cx";
import { DashboardTeamMenu } from "./dashboard-team-menu";
import { DashboardUserMenu } from "./dashboard-user-menu";

/**
 * Figma sources:
 *   expanded  → Board UI → dashboard 1 → Sidebar (node 3731:2934)
 *   collapsed → Board UI → Sidebar (node 3768:3382)
 *
 * Floating sidebar panel. Expanded: 260px wide, p 12, radius/3xl (24px),
 * white 1px border, "Background/Sidebar Elevation" shadow, bg
 * background/secondary. Collapsed: 60px wide (36px icon items + 12px
 * padding); collapse button sits centered above the workspace avatar, quick
 * search becomes a 36px neutral-200 square, nav items become icon-only
 * squares, the team card reduces to its avatar.
 *
 * The two states morph into each other: the panel width animates while
 * labels / badges / kbd collapse via max-width + opacity.
 */

type IconComponent = ComponentType<{
  className?: string;
  "aria-hidden"?: boolean | "true" | "false";
}>;

/**
 * Collapsible text/badge slot: blurs + fades + shrinks away when the rail
 * closes, and blurs back in on expand. The icons/rows themselves stay pinned in
 * place — only these label/badge slots animate — so nothing jumps to center.
 */
function Collapsible({ collapsed, children, className }: { collapsed: boolean; children: ReactNode; className?: string }) {
  const localize = useTemplateCopy();
  return localize((
    <span
      className={cx(
        "flex min-w-0 items-center overflow-hidden transition-[max-width,opacity,filter] duration-300 ease-in-out",
        // Expanded, the cap is the row itself: a fixed cap (it was 160px)
        // clipped any label wider than it, "Components and Blocks" included.
        collapsed ? "max-w-0 opacity-0 blur-[3px]" : "max-w-full opacity-100 blur-0",
        className,
      )}
    >
      {children}
    </span>
  ));
}

function NavItem({
  icon: Icon,
  label,
  badge,
  isSelected = false,
  collapsed = false,
  href = "#",
  onClick,
}: {
  icon: IconComponent;
  label: string;
  badge?: ReactNode;
  isSelected?: boolean;
  collapsed?: boolean;
  href?: string;
  /** Action rows (e.g. Settings → modal) intercept the navigation. */
  onClick?: () => void;
}) {
  const localize = useTemplateCopy();
  return localize((
    <a
      href={href}
      onClick={
        onClick
          ? (event) => {
              event.preventDefault();
              onClick();
            }
          : undefined
      }
      aria-current={isSelected ? "page" : undefined}
      aria-label={label}
      title={collapsed ? label : undefined}
      className={cx(
        "flex items-center justify-between overflow-hidden rounded-2lg p-2",
        "transition-[width,background-color] duration-300 ease-in-out",
        collapsed ? "w-9" : "w-full",
        isSelected
          ? "bg-accent-600 text-white shadow-xs"
          : "hover:bg-background-secondary-hover",
      )}
    >
      <span className="flex min-w-0 items-center gap-2">
        <Icon
          className={cx("size-5 shrink-0", isSelected ? "text-white" : "text-foreground-icon-secondary")}
          aria-hidden
        />
        <Collapsible collapsed={collapsed}>
          <span
            className={cx(
              "text-body-medium whitespace-nowrap",
              isSelected ? "text-white" : "text-text-secondary",
            )}
          >
            {label}
          </span>
        </Collapsible>
      </span>
      {badge && <Collapsible collapsed={collapsed}>{badge}</Collapsible>}
    </a>
  ));
}

/** A primary navigation row. Rows without an `href` are decoration only. */
export interface DashboardNavItem {
  key: string;
  label: string;
  icon: IconComponent;
  href?: string;
  badge?: string | number;
  onClick?: () => void;
}

/** Kept as a name for callers that typed their `selected` prop; any key works. */
export type DashboardNavKey = string;

/** Default fallback navigation if none provided */
const DEFAULT_NAV: DashboardNavItem[] = [
  { key: "invoices", label: "Invoices", icon: RiHomeLine },
];

/**
 * The primary rows. A component of its own so the closures over `collapsed`
 * and the search query live here: built inline in the sidebar, the compiler
 * could not tell they leave `mobile` untouched and dropped the sidebar's
 * manual memoization.
 */
function NavRows({
  items,
  selected,
  collapsed,
}: {
  items: DashboardNavItem[];
  selected: string;
  collapsed: boolean;
}) {
  return items.map((item) => {
    const isSelected = selected === item.key;
    return (
      <NavItem
        key={item.key}
        icon={item.icon}
        label={item.label}
        href={item.href}
        isSelected={isSelected}
        collapsed={collapsed}
        onClick={item.onClick}
        badge={
          item.badge !== undefined ? (
            <Badge color={isSelected ? "primary" : "neutral"}>{item.badge}</Badge>
          ) : undefined
        }
      />
    );
  });
}

export function DashboardSidebar({
  mobile = false,
  onClose,
  fluid = false,
  showThemeToggle = true,
  selected = "invoices",
  items = DEFAULT_NAV,
  flat = false,
  className,
}: {
  /** Rendered inside the mobile drawer: always expanded, close button instead of collapse. */
  mobile?: boolean;
  onClose?: () => void;
  /** Expanded width fills its container below `lg` instead of the fixed
   *  260px (e.g. the landing page, where the sidebar isn't in a drawer).
   *  Collapsed width stays the fixed 60px rail at every breakpoint — the
   *  whole point of collapsing is to shrink, so it must never get
   *  overridden back to full width. */
  fluid?: boolean;
  /** Hide the app-level theme control when the sidebar is used as marketing artwork. */
  showThemeToggle?: boolean;
  /** Which nav item shows the selected (filled blue) state. */
  selected?: DashboardNavKey;
  /** Primary navigation rows. The Pro dashboard's set unless a screen brings its own. */
  items?: DashboardNavItem[];
  /** Removes the floating panel treatment for a sidebar revealed beneath mobile content. */
  flat?: boolean;
  className?: string;
} = {}) {
  const localize = useTemplateCopy();
  const navigate = useNavigate();
  const { invoices } = useInvoices();
  const { license } = useLicense();
  const [collapsedState, setCollapsed] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [licenseOpen, setLicenseOpen] = useState(false);
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);
  const [settingsTab, setSettingsTab] = useState<BusinessSettingsTab>("identity");
  const [suppressUserHover, setSuppressUserHover] = useState(false);
  const collapsed = mobile ? false : collapsedState;

  return localize((
    <aside
      className={cx(
        "flex h-full shrink-0 flex-col justify-between overflow-hidden",
        flat
          ? "bg-background-full"
          : "rounded-3xl border border-border-button-white bg-background-secondary-default shadow-sidebar",
        "transition-[width] duration-300 ease-in-out",
        // Collapsed rail keeps the 60px spec: 1px border + 11px padding on each
        // side leaves an exactly 36px column so the w-9 (36px) icon items center.
        collapsed
          ? "w-[60px] px-[11px] py-3"
          : fluid
            ? "w-full p-3 lg:w-[260px]"
            : "w-[260px] p-3",
        className,
      )}
    >
      {/* `overflow-y: auto` forces the x axis to clip too, and this box hugs
          its contents on every side — so the selected item's 1px ring, the
          profile's hover pill (which outsets 6px) and focus rings all landed
          outside it. Padding moves the clip edge out; the matching negative
          margin borrows that space back from the rail's own padding, leaving
          every child exactly where it was. */}
      <div
        className="-m-2 flex min-h-0 w-[calc(100%+16px)] flex-col gap-3 overflow-y-auto p-2 [scrollbar-width:none]"
      >
        {/* Workspace switcher / collapse control */}
        <div
          className={cx(
            "flex w-full transition-[gap] duration-300 ease-in-out",
            collapsed
              ? "flex-col-reverse items-start justify-center gap-2.5"
              : "flex-row items-center justify-between",
          )}
        >
          <div
            className="-m-2 min-w-0 overflow-hidden p-2 transition-[max-width,opacity,transform] duration-300 ease-in-out max-w-[206px] scale-100 opacity-100"
          >
            <DashboardUserMenu
              collapsed={collapsed}
              suppressHover={suppressUserHover}
              onHoverSuppressionEnd={() => setSuppressUserHover(false)}
              onOpenSettings={() => {
                setSettingsTab("identity");
                setSettingsOpen(true);
              }}
              avatarClassName={
                flat
                  ? "bg-background-tertiary-default dark:bg-background-secondary-default"
                  : undefined
              }
            />
          </div>
          {mobile ? (
            <button
              type="button"
              aria-label="Close sidebar"
              onClick={onClose}
              className="cursor-pointer text-foreground-icon-secondary"
            >
              <RiCloseLine className="size-5" aria-hidden />
            </button>
          ) : (
            <button
              type="button"
              aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
              aria-expanded={!collapsed}
              onClick={() => {
                const isExpanding = collapsedState;
                setCollapsed(!collapsedState);
                setSuppressUserHover(isExpanding);
              }}
              className={cx(
                "cursor-pointer text-foreground-icon-secondary transition-transform duration-300 ease-in-out",
                collapsed && "flex w-9 items-center justify-center",
              )}
            >
              <RiSideBarFill
                className={cx("size-5 transition-transform duration-300 ease-in-out", collapsed ? "rtl:-scale-x-100" : "-scale-x-100 rtl:scale-x-100")}
                aria-hidden
              />
            </button>
          )}
        </div>

        <div className="flex w-full flex-col gap-3">
          {/* Quick Search Shortcut Pill (BoardUI quick-search node 3731:2955) */}
          <button
            type="button"
            onClick={() => setCommandPaletteOpen(true)}
            aria-label="Quick search or jump (Ctrl+K)"
            className={cx(
              "flex items-center rounded-xl border border-border-button-default bg-background-primary-default text-text-tertiary shadow-2xs hover:border-border-button-hover hover:bg-background-primary-hover hover:text-text-primary transition-all duration-150 cursor-pointer",
              collapsed ? "justify-center p-2 size-9" : "w-full justify-between px-2.5 py-1.5"
            )}
          >
            <div className="flex items-center gap-2 min-w-0">
              <RiSearchLine className="size-4 shrink-0 text-foreground-icon-secondary" />
              {!collapsed && <span className="text-xs truncate">Search or jump...</span>}
            </div>
            {!collapsed && <Kbd className="text-[10px]">Ctrl+K</Kbd>}
          </button>

          {/* Primary nav. The 2px inset is for the expanded rail only: the
              collapsed column is exactly as wide as a 36px item, so padding
              here pushes every item 2px right and the rail's own clip shaves
              that much off its selected fill and hover state. */}
          <nav className={cx("flex w-full flex-col gap-1", !collapsed && "px-0.5")}>
            <NavRows
              items={items}
              selected={selected}
              collapsed={collapsed}
            />
          </nav>
        </div>
      </div>

      <div className="flex w-full shrink-0 flex-col gap-3">
        {showThemeToggle &&
          (collapsed ? (
            <ThemeToggle collapsed />
          ) : (
            <ThemeToggle
              appearance="sidebar-segmented"
              className={flat ? "!bg-background-secondary-default" : undefined}
            />
          ))}
        {/* Secondary nav: Preferences, License & Settings */}
        <nav className="flex w-full flex-col gap-1">
          {!IS_STANDALONE_UNLOCKED && (
            <NavItem
              icon={RiShieldKeyholeLine}
              label="License & Activation"
              collapsed={collapsed}
              badge={
                <Badge color={license.status === "active" ? "primary" : "neutral"}>
                  {license.tierCode}
                </Badge>
              }
              onClick={() => setLicenseOpen(true)}
            />
          )}
          <NavItem
            icon={RiSettings4Line}
            label="Settings"
            collapsed={collapsed}
            onClick={() => {
              setSettingsTab("identity");
              setSettingsOpen(true);
            }}
          />
        </nav>

        {/* Business account card → opens profile popover & settings */}
        <DashboardTeamMenu
          collapsed={collapsed}
          className={flat ? "!bg-background-secondary-default" : undefined}
          onOpenSettings={(tab) => {
            if (tab) setSettingsTab(tab);
            setSettingsOpen(true);
          }}
        />
      </div>

      <SettingsModal
        isOpen={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        defaultTab={settingsTab}
      />

      <LicenseModal
        isOpen={licenseOpen}
        onClose={() => setLicenseOpen(false)}
      />

      {/* ─── OFFICIAL BOARDUI COMMAND PALETTE (CTRL+K / ⌘K) ─── */}
      <CommandPalette
        isOpen={commandPaletteOpen}
        onOpenChange={setCommandPaletteOpen}
        shortcut="k"
        placeholder="Type a command or search invoices, clients..."
      >
        <CommandPaletteSection title="Navigation">
          <CommandPaletteItem
            id="nav-invoices"
            icon={RiHomeLine}
            shortcut="G I"
            onAction={() => {
              setCommandPaletteOpen(false);
              navigate('/invoices');
            }}
          >
            Invoices Directory
          </CommandPaletteItem>
          <CommandPaletteItem
            id="nav-templates"
            icon={RiPaletteLine}
            shortcut="G T"
            onAction={() => {
              setCommandPaletteOpen(false);
              navigate('/design');
            }}
          >
            Invoice Templates Gallery
          </CommandPaletteItem>
          <CommandPaletteItem
            id="nav-clients"
            icon={RiUserSharedLine}
            shortcut="G C"
            onAction={() => {
              setCommandPaletteOpen(false);
              navigate('/clients');
            }}
          >
            Client Directory &amp; Ledger
          </CommandPaletteItem>
        </CommandPaletteSection>

        <CommandPaletteSection title="Quick Billing Actions">
          <CommandPaletteItem
            id="act-daily"
            icon={RiAddLine}
            shortcut="N"
            description="Create blank invoice"
            onAction={() => {
              setCommandPaletteOpen(false);
              navigate('/invoices');
            }}
          >
            New Daily Invoice
          </CommandPaletteItem>
          <CommandPaletteItem
            id="act-settings"
            icon={RiSettings4Line}
            shortcut=","
            description="Business profile &amp; bank info"
            onAction={() => {
              setCommandPaletteOpen(false);
              setSettingsOpen(true);
            }}
          >
            Business Profile Settings
          </CommandPaletteItem>
          <CommandPaletteItem
            id="act-updates"
            icon={RiSparklingFill}
            shortcut="U"
            description="Check GitHub for software updates"
            onAction={() => {
              setCommandPaletteOpen(false);
              setSettingsTab("updates");
              setSettingsOpen(true);
            }}
          >
            Check for Software Updates
          </CommandPaletteItem>
          {!IS_STANDALONE_UNLOCKED && (
            <CommandPaletteItem
              id="act-license"
              icon={RiShieldKeyholeLine}
              description="Manage workstation activation"
              onAction={() => {
                setCommandPaletteOpen(false);
                setLicenseOpen(true);
              }}
            >
              Commercial License Status
            </CommandPaletteItem>
          )}
        </CommandPaletteSection>

        {invoices.length > 0 && (
          <CommandPaletteSection title="Invoices Ledger">
            {invoices.slice(0, 10).map((inv) => (
              <CommandPaletteItem
                key={inv.id}
                id={`inv-${inv.id}`}
                icon={RiFileTextLine}
                description={inv.data?.client?.name || inv.clientName || 'General Client'}
                onAction={() => {
                  setCommandPaletteOpen(false);
                  navigate('/invoices');
                }}
              >
                {inv.invoiceNumber}
              </CommandPaletteItem>
            ))}
          </CommandPaletteSection>
        )}
      </CommandPalette>
    </aside>
  ));
}
