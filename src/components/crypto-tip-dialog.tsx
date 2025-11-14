'use client';

import * as React from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

declare global {
  interface Window {
    ethereum?: {
      isMetaMask?: boolean;
      request: (args: { method: string; params?: unknown[] }) => Promise<unknown>;
    };
  }
}

const CRYPTO_ADDRESSES = {
  BTC: 'your-btc-address',
  ETH: 'swapunits.eth',
  SOL: 'your-sol-address',
};

export function CryptoTipDialog() {
  const { toast } = useToast();
  const [hasMetaMask, setHasMetaMask] = React.useState(false);

  React.useEffect(() => {
    setHasMetaMask(!!window?.ethereum?.isMetaMask);
  }, []);

  const sendWithMetaMask = async () => {
    if (!window.ethereum) {
      toast({
        title: 'MetaMask not found',
        description: 'Please install MetaMask to use this feature',
        variant: 'destructive',
      });
      return;
    }

    try {
      // Request account access
      const accounts = await window.ethereum.request({
        method: 'eth_requestAccounts',
      });

      if (!accounts || accounts.length === 0) {
        throw new Error('No accounts found');
      }

      // Prepare the transaction
      const transactionParameters = {
        to: CRYPTO_ADDRESSES.ETH,
        from: accounts[0],
        value: '0x' + (0.01 * 1e18).toString(16), // Default 0.01 ETH, can be changed
      };

      // Send the transaction
      await window.ethereum.request({
        method: 'eth_sendTransaction',
        params: [transactionParameters],
      });

      toast({
        title: 'Transaction initiated',
        description: 'Check MetaMask for transaction details',
      });
    } catch (error) {
      toast({
        title: 'Transaction failed',
        description: error instanceof Error ? error.message : 'Please try again',
        variant: 'destructive',
      });
    }
  };

  const copyToClipboard = async (address: string, type: string) => {
    try {
      await navigator.clipboard.writeText(address);
      toast({
        title: 'Address copied!',
        description: `${type} address copied to clipboard`,
      });
    } catch (err) {
      console.error('Failed to copy crypto address', err);
      toast({
        title: 'Failed to copy',
        description: 'Please try copying manually',
        variant: 'destructive',
      });
    }
  };

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm">
          Buy me a coffee ☕
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Support SwapUnits</DialogTitle>
          <DialogDescription>
            Your support helps keep SwapUnits free and continuously improved!
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4">
          <div className="space-y-3">
            {Object.entries(CRYPTO_ADDRESSES).map(([type, address]) => (
              <div key={type} className="flex items-center gap-2">
                <div className="relative flex-1">
                  <Input value={address} readOnly className="pr-8" />
                  {type === 'ETH' && (
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <div className="absolute right-2 top-1/2 -translate-y-1/2">
                            <svg
                              width="16"
                              height="16"
                              viewBox="0 0 40 40"
                              fill="none"
                              xmlns="http://www.w3.org/2000/svg"
                              className="text-[#5298FF]"
                            >
                              <path
                                d="M20 40c11.046 0 20-8.954 20-20S31.046 0 20 0 0 8.954 0 20s8.954 20 20 20Z"
                                fill="currentColor"
                              />
                              <path
                                d="M14.789 15.881h6.116c3.604 0 6.24.831 6.24 4.765 0 3.932-2.636 4.765-6.24 4.765h-6.116c-.37 0-.666-.3-.666-.67v-8.192c0-.37.296-.668.666-.668Zm2.098 2.099v4.662c0 .37.296.668.666.668h2.852c2.337 0 3.098-.83 3.098-3 0-2.171-.761-3.001-3.098-3.001h-2.852c-.37 0-.666.3-.666.67Z"
                                fill="#fff"
                              />
                            </svg>
                          </div>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>ENS Domain</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  )}
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    onClick={() => copyToClipboard(address, type)}
                  >
                    Copy {type}
                  </Button>
                  {type === 'ETH' && hasMetaMask && (
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={sendWithMetaMask}
                      className="flex items-center gap-2"
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="16"
                        height="16"
                        viewBox="0 0 212 189"
                        className="text-orange-500"
                      >
                        <path
                          fill="currentColor"
                          d="M207 0L119 59l16-38L207 0zM4 0l87 60-15-39L4 0z"
                        />
                        <path
                          fill="currentColor"
                          d="M176 129l-27 41v-29l2-12h25zM35 129l27 41v-29l-2-12H35z"
                        />
                        <path
                          fill="currentColor"
                          d="M91 129v31l-27-41h27zM120 129v31l27-41h-27z"
                        />
                      </svg>
                      Send with MetaMask
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
          <p className="text-sm text-muted-foreground">
            Choose your preferred crypto to send a tip. Click the button to copy the address.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
