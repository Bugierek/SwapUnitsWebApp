'use client';

import * as React from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';

export function FeatureRequestDialog() {
  const [isLoading, setIsLoading] = React.useState(false);
  const [category, setCategory] = React.useState('');
  const [fromUnit, setFromUnit] = React.useState('');
  const [toUnit, setToUnit] = React.useState('');
  const [additionalNotes, setAdditionalNotes] = React.useState('');
  const { toast } = useToast();
  const [open, setOpen] = React.useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const response = await fetch('/api/feature-request', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          category,
          fromUnit,
          toUnit,
          additionalNotes,
        }),
      });

      if (response.ok) {
        toast({
          title: 'Feature request submitted',
          description: 'Thank you for your suggestion!',
        });
        setOpen(false);
        setCategory('');
        setFromUnit('');
        setToUnit('');
        setAdditionalNotes('');
      } else {
        throw new Error('Failed to submit conversion pair request');
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to submit feature request. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm">
          Request Conversion Pair
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Request New Conversion Pair</DialogTitle>
          <DialogDescription>
            Request a new unit conversion pair to be added to SwapUnits.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <label htmlFor="category" className="text-sm font-medium">
              Category
            </label>
            <Input
              id="category"
              placeholder="e.g., length, energy, or propose a new category"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <label htmlFor="fromUnit" className="text-sm font-medium">
              From Unit
            </label>
            <Input
              id="fromUnit"
              placeholder="e.g., kilometers, pounds, etc."
              value={fromUnit}
              onChange={(e) => setFromUnit(e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <label htmlFor="toUnit" className="text-sm font-medium">
              To Unit
            </label>
            <Input
              id="toUnit"
              placeholder="e.g., miles, kilograms, etc."
              value={toUnit}
              onChange={(e) => setToUnit(e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <label htmlFor="additionalNotes" className="text-sm font-medium">
              Additional Notes
            </label>
            <Textarea
              id="additionalNotes"
              placeholder="Any additional context or information..."
              value={additionalNotes}
              onChange={(e) => setAdditionalNotes(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? 'Submitting...' : 'Submit Request'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}