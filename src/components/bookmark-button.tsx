
'use client';

import * as React from 'react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Bookmark } from 'lucide-react';

export function BookmarkButton() {
  const { toast } = useToast();
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


  const handleBookmarkClick = () => {
    const keyCombination = isMac ? 'Cmd+D' : 'Ctrl+D';

    // Show toast notification first
    toast({
      variant: "success", // Use the success variant
      // Update title to include icon and new text
      title: (
        <>
          <Bookmark className="inline-block mr-2 h-4 w-4" aria-hidden="true" />
          Add to Bookmarks
        </>
      ),
      description: `Press ${keyCombination} to bookmark this page.`,
      duration: 5000, // Show toast for 5 seconds
    });

    // NOTE: Programmatically triggering the browser's bookmark dialog (like simulating Ctrl+D)
    // is generally blocked by browsers for security reasons. Relying on the user instruction
    // in the toast is the standard and reliable approach.
    // The code below is mostly for demonstration and unlikely to work across browsers.
    try {
      // Older Firefox method (mostly deprecated)
      if ((window as any).sidebar && (window as any).sidebar.addPanel) {
        (window as any).sidebar.addPanel(document.title, window.location.href, '');
         console.log("Attempted Firefox addPanel bookmark method.");
      }
      // Attempt for IE (highly deprecated)
      else if ((window as any).external && ('AddFavorite' in (window as any).external)) {
        (window as any).external.AddFavorite(window.location.href, document.title);
         console.log("Attempted IE AddFavorite bookmark method.");
      }
      // Generic alert fallback (if specific methods fail or aren't applicable)
      else {
         // No reliable cross-browser way exists. The toast is the user guidance.
         console.warn("Automatic bookmark triggering is not reliably supported. Please use the keyboard shortcut shown.");
      }
    } catch (error) {
      console.error("Error attempting to trigger bookmark dialog:", error);
      // The toast message providing instructions is already displayed.
    }
  };

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handleBookmarkClick}
      aria-label="Add this page to your bookmarks"
    >
      <Bookmark className="mr-2 h-4 w-4" />
      Add to Bookmarks
    </Button>
  );
}
