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
  defaultTabId,
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

  React.useEffect(() => {
    if (!availableTabs.length) {
      setActiveTab(null);
      return;
    }
    if (!activeTab || !availableTabs.some((tab) => tab.id === activeTab)) {
      setActiveTab(availableTabs[0].id);
    }
  }, [availableTabs, activeTab]);

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
        'rounded-2xl border border-border/60 bg-background text-sm text-muted-foreground',
        !isOpen && 'rounded-b-none',
        className,
      )}
    >
      <div className="grid grid-cols-2 border-b border-border/60 text-[0.72rem]">
        {availableTabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            className={cn(
              'h-10 font-semibold transition',
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
