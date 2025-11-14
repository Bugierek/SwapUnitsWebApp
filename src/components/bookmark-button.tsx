
'use client';

import * as React from 'react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { useIsMobile } from '@/hooks/use-mobile'; // Import useIsMobile
import { Bookmark } from 'lucide-react';
import { cn } from '@/lib/utils';

type BookmarkCapableWindow = Window & {
  sidebar?: {
    addPanel?: (title: string, url: string, panelId?: string) => void;
  };
  external?: {
    AddFavorite?: (url: string, title: string) => void;
  };
};

// Memoize the component
export const BookmarkButton = React.memo(function BookmarkButtonComponent() {
  const { toast } = useToast();
  const isMobile = useIsMobile(); // Use the hook
  const [isMac, setIsMac] = React.useState(false);

  React.useEffect(() => {
    // This check runs only on the client after hydration
    // Use navigator.userAgent or navigator.platform for OS detection
    const userAgent = window.navigator.userAgent;
    const platform = window.navigator.platform;
    const macosPlatforms = ['Macintosh', 'MacIntel', 'MacPPC', 'Mac68K'];
    const windowsPlatforms = ['Win32', 'Win64', 'Windows', 'WinCE'];
    let detectedMac = false;

    if (macosPlatforms.indexOf(platform) !== -1) {
      detectedMac = true;
    } else if (windowsPlatforms.indexOf(platform) !== -1) {
      detectedMac = false;
    } else if (/Mac/.test(userAgent)) {
        // Fallback for newer Mac versions or different browser reports
      detectedMac = true;
    }
    // Default to false (Ctrl+D) if unsure

    setIsMac(detectedMac);
  }, []); // Empty dependency array ensures this runs once on mount


  const handleBookmarkClick = React.useCallback(() => {
    const keyCombination = isMac ? 'Cmd+D' : 'Ctrl+D';
    // Conditionally set the description based on isMobile
    const toastDescription = isMobile
      ? "Click your browser's menu (often three dots/lines) and look for a star icon or 'Add to Bookmarks/Favorites'."
      : `Press ${keyCombination} to bookmark this page.`;


    // Show toast notification first
    toast({
      variant: "success", // Use the success variant
      // Update title to include icon and new text
      title: (
        <div className="flex items-center justify-center gap-2"> {/* Use flex container */}
            <Bookmark className="h-4 w-4" aria-hidden="true" />
            Add to Bookmarks
        </div>
      ),
      description: toastDescription, // Use the conditional description
      duration: 3000, // Show toast for 3 seconds (3000ms)
    });

    // NOTE: Programmatically triggering the browser's bookmark dialog (like simulating Ctrl+D)
    // is generally blocked by browsers for security reasons. Relying on the user instruction
    // in the toast is the standard and reliable approach.
    // The code below is mostly for demonstration and unlikely to work across browsers.
    try {
      const legacyWindow = window as BookmarkCapableWindow;
      // Older Firefox method (mostly deprecated)
      if (legacyWindow.sidebar?.addPanel) {
        legacyWindow.sidebar.addPanel(document.title, window.location.href, '');
         console.log("Attempted Firefox addPanel bookmark method.");
      }
      // Attempt for IE (highly deprecated)
      else if (legacyWindow.external?.AddFavorite) {
        legacyWindow.external.AddFavorite(window.location.href, document.title);
         console.log("Attempted IE AddFavorite bookmark method.");
      }
      // Generic alert fallback (if specific methods fail or aren't applicable)
      else {
         // No reliable cross-browser way exists. The toast is the user guidance.
         console.warn("Automatic bookmark triggering is not reliably supported. Please use the keyboard shortcut or browser menu shown.");
      }
    } catch (error) {
      console.error("Error attempting to trigger bookmark dialog:", error);
      // The toast message providing instructions is already displayed.
    }
  }, [isMac, isMobile, toast]);

  return (
    <Button
        variant="outline"
        size="icon" // Default to icon size, text revealed on wider screens via className logic
        onClick={handleBookmarkClick}
        aria-label="Add this page to your bookmarks"
        // Combined styles for button structure and hover effects
        // Ensure height matches header height for consistency (h-9)
        // Add group class for coordinated hover effects
        className={cn(
            "group", // Add group class here
            "inline-flex items-stretch h-9 w-9 md:w-auto overflow-hidden rounded-md border border-input bg-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
            "hover:bg-background" // Prevent background change on hover for the whole button itself
            )}
    >
        {/* Icon Span - Adjusted padding and hover effect */}
        {/* Apply hover styles directly here using group-hover */}
        <span className={cn(
            "flex items-center justify-center px-2 transition-colors duration-150",
            // Change background/text on group hover (i.e., when hovering button or text)
            "group-hover:bg-accent group-hover:text-accent-foreground"
            )}>
            <Bookmark className="h-4 w-4" />
        </span>

        {/* Text Span - Hidden on mobile, shown on md+, specific padding */}
        <span className={cn(
            "hidden md:flex items-center px-1.5 text-sm text-foreground transition-colors", // hidden by default, flex on md, adjust padding
            // Ensure text color doesn't change unexpectedly on hover
            "hover:text-foreground group-hover:text-foreground"
            )}>
            Add to Bookmarks
        </span>
    </Button>
  );
});

BookmarkButton.displayName = 'BookmarkButton';
