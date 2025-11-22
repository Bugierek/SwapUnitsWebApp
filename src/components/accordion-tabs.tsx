"use client";

import * as React from 'react';

import { cn } from '@/lib/utils';

export type AccordionTabItem = {
  id: string;
  label: string;
  content: React.ReactNode;
  description?: React.ReactNode;
};

type AccordionTabsProps = {
  tabs: AccordionTabItem[];
  defaultTabId?: string;
  initiallyOpen?: boolean;
  className?: string;
};

export function AccordionTabs({
  tabs,
  defaultTabId = 'formula',
  initiallyOpen = true,
  className,
}: AccordionTabsProps) {
  const availableTabs = React.useMemo(
    () => tabs.filter((tab) => tab.content !== null && tab.content !== undefined),
    [tabs],
  );
  const [activeTab, setActiveTab] = React.useState<string | null>(() => {
    if (defaultTabId && availableTabs.some((tab) => tab.id === defaultTabId)) {
      return defaultTabId;
    }
    return availableTabs[0]?.id ?? null;
  });
  const [isOpen, setIsOpen] = React.useState<boolean>(initiallyOpen);
  const availableTabIds = React.useMemo(
    () => availableTabs.map((tab) => tab.id),
    [availableTabs],
  );
  const hasAvailableTabs = availableTabIds.length > 0;
  const preferredTab = React.useMemo(() => {
    if (!hasAvailableTabs) {
      return null;
    }
    if (defaultTabId && availableTabIds.includes(defaultTabId)) {
      return defaultTabId;
    }
    return availableTabIds[0];
  }, [availableTabIds, defaultTabId, hasAvailableTabs]);
  const activeTabMissing = React.useMemo(
    () => !activeTab || !availableTabIds.includes(activeTab),
    [activeTab, availableTabIds],
  );

  React.useEffect(() => {
    if (!hasAvailableTabs) {
      setActiveTab(null);
      return;
    }
    if (!activeTabMissing) {
      return;
    }
    setActiveTab(preferredTab);
  }, [hasAvailableTabs, activeTabMissing, preferredTab]);

  const activeContent = availableTabs.find((tab) => tab.id === activeTab);
  const contentId = React.useId();

  if (!availableTabs.length) {
    return null;
  }

  const handleTabClick = (tabId: string) => {
    if (activeTab === tabId) {
      setIsOpen((prev) => !prev);
      return;
    }
    setActiveTab(tabId);
    if (!isOpen) {
      setIsOpen(true);
    }
  };

  return (
    <div
      className={cn(
        'rounded-2xl border border-border/60 bg-background text-sm text-muted-foreground border-solid',
        !isOpen && 'rounded-b-none',
        className,
      )}
    >
      <div className="grid grid-flow-col auto-cols-fr border-b border-border/60 text-[0.72rem] border-solid">
        {availableTabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            className={cn(
              'h-10 w-full px-3 font-semibold transition border-solid',
              tab.id === activeTab
                ? 'border-b-2 border-primary bg-primary/5 text-primary'
                : 'border-b-2 border-transparent hover:text-primary hover:border-muted-foreground/40',
            )}
            aria-pressed={tab.id === activeTab}
            onClick={() => handleTabClick(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>
      {isOpen && activeContent && (
        <div id={contentId} className="px-4 py-4">
          {activeContent.content}
        </div>
      )}
    </div>
  );
}
