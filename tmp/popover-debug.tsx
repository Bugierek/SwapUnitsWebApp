import React from 'react';
import * as Popover from '@radix-ui/react-popover';
import * as SelectPrimitive from '@radix-ui/react-select';
import * as Select from '@radix-ui/react-select';

const TestPopover = () => (
  <div style={{ padding: 20 }}>
    <SelectPrimitive.Root>
      <SelectPrimitive.Trigger className="trigger">
        Trigger
      </SelectPrimitive.Trigger>
      <SelectPrimitive.Content
        position="popper"
        side="bottom"
        sideOffset={8}
        align="start"
        className="content"
      >
        <div style={{ width: 'var(--radix-select-trigger-width)', background: 'red' }}>
          Popper content
        </div>
      </SelectPrimitive.Content>
    </SelectPrimitive.Root>
  </div>
);

export default TestPopover;
