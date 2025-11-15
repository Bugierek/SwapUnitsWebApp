
'use client';

import * as React from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { SendHorizonal } from 'lucide-react'; // Removed X icon import
// Removed: import { DialogClose } from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';

interface SimpleCalculatorProps {
  onSendValue: (value: string) => void; // Callback to send value to parent
  onClose?: () => void; // Optional callback for closing
}

const SimpleCalculator: React.FC<SimpleCalculatorProps> = ({ onSendValue, onClose }) => {
  const [displayValue, setDisplayValue] = React.useState<string>('0');
  const [firstOperand, setFirstOperand] = React.useState<number | null>(null);
  const [operator, setOperator] = React.useState<string | null>(null);
  const [waitingForSecondOperand, setWaitingForSecondOperand] = React.useState<boolean>(false);
  const [enterArmed, setEnterArmed] = React.useState(false);

  const clearDisplay = React.useCallback(() => {
    setEnterArmed(false);
    setDisplayValue('0');
    setFirstOperand(null);
    setOperator(null);
    setWaitingForSecondOperand(false);
  }, []);

  const inputDigit = React.useCallback((digit: string) => {
    setEnterArmed(false);
    if (displayValue.length >= 15 && !waitingForSecondOperand) return; // Limit input length
    if (waitingForSecondOperand) {
      setDisplayValue(digit);
      setWaitingForSecondOperand(false);
    } else {
      setDisplayValue(displayValue === '0' ? digit : displayValue + digit);
    }
  }, [displayValue, waitingForSecondOperand]);

  const inputDecimal = React.useCallback(() => {
    setEnterArmed(false);
    if (waitingForSecondOperand) {
      setDisplayValue('0.');
      setWaitingForSecondOperand(false);
      return;
    }
    if (!displayValue.includes('.')) {
      setDisplayValue(displayValue + '.');
    }
  }, [displayValue, waitingForSecondOperand]);

  const handleBackspace = React.useCallback(() => {
    setEnterArmed(false);
    setDisplayValue((prev) => {
      if (waitingForSecondOperand) {
        return prev;
      }
      if (prev === 'Error') {
        return '0';
      }
      if (prev.length <= 1) {
        return '0';
      }
      return prev.slice(0, -1);
    });
  }, [waitingForSecondOperand, setEnterArmed]);

  const calculate = (operand1: number, operand2: number, currentOperator: string): number => {
    switch (currentOperator) {
      case '+':
        return operand1 + operand2;
      case '-':
        return operand1 - operand2;
      case '*':
        return operand1 * operand2;
      case '/':
        if (operand2 === 0) {
            return NaN;
        }
        return operand1 / operand2;
      default:
        return operand2;
    }
  };

  const performOperation = React.useCallback((nextOperator: string) => {
    setEnterArmed(false);
    const inputValue = parseFloat(displayValue);

    if (isNaN(inputValue) && displayValue !== 'Error') {
        clearDisplay();
        return;
    }
    if (displayValue === 'Error') {
        if (nextOperator !== 'AC') {
             setFirstOperand(null);
             setOperator(null);
             setWaitingForSecondOperand(true);
             return;
        }
    }


    if (firstOperand === null) {
      setFirstOperand(inputValue);
    } else if (operator) {
      const result = calculate(firstOperand, inputValue, operator);
      if (isNaN(result)) {
        setDisplayValue('Error');
        setFirstOperand(null);
        setOperator(null);
        setWaitingForSecondOperand(true);
        return;
      }
      const resultStr = String(parseFloat(result.toFixed(7)));
      setDisplayValue(resultStr);
      setFirstOperand(parseFloat(resultStr));
    }

    setWaitingForSecondOperand(true);
    setOperator(nextOperator);
  }, [clearDisplay, displayValue, firstOperand, operator]);


  const handleEquals = React.useCallback((): string | null => {
    if (operator && firstOperand !== null) {
      const inputValue = parseFloat(displayValue);
      if (isNaN(inputValue) && displayValue !== 'Error') {
        setDisplayValue('Error');
        setFirstOperand(null);
        setOperator(null);
        setWaitingForSecondOperand(true);
        return null;
      }
      if (displayValue === 'Error') return null;

      const result = calculate(firstOperand, inputValue, operator);

      if (isNaN(result)) {
        setDisplayValue('Error');
        setFirstOperand(null);
        setOperator(null);
        setWaitingForSecondOperand(true);
        return null;
      }

      const resultStr = String(parseFloat(result.toFixed(7)));
      setDisplayValue(resultStr);
      setFirstOperand(null);
      setOperator(null);
      setWaitingForSecondOperand(false);
      return resultStr;
    }

    if (displayValue === 'Error') {
      return null;
    }

    return displayValue;
  }, [displayValue, firstOperand, operator]);

  const handleSendValue = React.useCallback((valueOverride?: string) => {
    const valueToEmit = valueOverride ?? displayValue;
    if (valueToEmit === 'Error' || isNaN(parseFloat(valueToEmit))) {
      console.warn("Calculator value is 'Error' or invalid, cannot send.");
      return;
    }
    const normalized = String(parseFloat(valueToEmit));
    onSendValue(normalized);
    setEnterArmed(false);
    if (onClose) onClose(); // Call onClose if provided
  }, [displayValue, onClose, onSendValue]);

  const handleKeyboardInput = React.useCallback(
    (event: React.KeyboardEvent<HTMLInputElement | HTMLDivElement>) => {
      const key = event.key;

      if (/^[0-9]$/.test(key)) {
        event.preventDefault();
        inputDigit(key);
        return;
      }

      if (key === '.' || key === ',') {
        event.preventDefault();
        inputDecimal();
        return;
      }

      if (key === '+' || key === '-' || key === '*' || key === '/' || key === 'x' || key === 'X') {
        event.preventDefault();
        const op = key === 'x' || key === 'X' ? '*' : key;
        performOperation(op);
        return;
      }

      if (key === 'Enter' || key === '=' || key === 'NumpadEnter') {
        event.preventDefault();
        if (enterArmed) {
          handleSendValue(displayValue);
          setEnterArmed(false);
          return;
        }
        const result = handleEquals();
        const nextValue = result ?? displayValue;
        if (nextValue !== 'Error' && !Number.isNaN(parseFloat(nextValue))) {
          setEnterArmed(true);
        } else {
          setEnterArmed(false);
        }
        return;
      }

      if (key === 'Backspace' || key === 'Delete') {
        event.preventDefault();
        handleBackspace();
        return;
      }

      if (key === 'Escape') {
        event.preventDefault();
        if (onClose) onClose();
        return;
      }
    },
    [
      displayValue,
      enterArmed,
      handleBackspace,
      handleEquals,
      handleSendValue,
      inputDecimal,
      inputDigit,
      onClose,
      performOperation,
    ],
  );

  const buttons = [
    { label: 'AC', action: clearDisplay, className: 'col-span-2 bg-destructive hover:bg-destructive/90 text-destructive-foreground', ariaLabel: "All Clear" },
    { label: '÷', action: () => performOperation('/'), className: 'bg-accent hover:bg-accent/90 text-accent-foreground', ariaLabel: "Divide" },
    { label: '×', action: () => performOperation('*'), className: 'bg-accent hover:bg-accent/90 text-accent-foreground', ariaLabel: "Multiply" },
    { label: '7', action: () => inputDigit('7') },
    { label: '8', action: () => inputDigit('8') },
    { label: '9', action: () => inputDigit('9') },
    { label: '-', action: () => performOperation('-'), className: 'bg-accent hover:bg-accent/90 text-accent-foreground', ariaLabel: "Subtract" },
    { label: '4', action: () => inputDigit('4') },
    { label: '5', action: () => inputDigit('5') },
    { label: '6', action: () => inputDigit('6') },
    { label: '+', action: () => performOperation('+'), className: 'bg-accent hover:bg-accent/90 text-accent-foreground', ariaLabel: "Add" },
    { label: '1', action: () => inputDigit('1') },
    { label: '2', action: () => inputDigit('2') },
    { label: '3', action: () => inputDigit('3') },
    {
      label: '=',
      action: () => {
        const result = handleEquals();
        const nextValue = result ?? displayValue;
        if (nextValue !== 'Error' && !Number.isNaN(parseFloat(nextValue))) {
          setEnterArmed(true);
        } else {
          setEnterArmed(false);
        }
      },
      className: 'bg-primary hover:bg-primary/90 text-primary-foreground',
      ariaLabel: "Equals"
    },
    { label: '0', action: () => inputDigit('0'), className: 'col-span-2' },
    { label: '.', action: inputDecimal, ariaLabel: "Decimal" },
    {
      label: <SendHorizonal className="h-5 w-5" />,
      action: () => handleSendValue(),
      className: 'bg-secondary hover:bg-secondary/90 text-secondary-foreground',
      ariaLabel: 'Send value to converter'
    },
  ];

  return (
    <div
      className="relative mx-auto w-full max-w-xs rounded-xl border border-border/60 bg-card/95 px-5 pb-5 pt-7 shadow-xl"
      onKeyDown={handleKeyboardInput}
      tabIndex={-1}
      aria-label="Calculator dialog"
    >
      {/* Removed DialogClose and X icon button from here */}
      <Separator className="mb-3 mt-1" /> {/* Slightly increased spacing so divider clears close button */}
      <Input
        id="calculator-display"
        name="calculator-display"
        type="text"
        value={displayValue}
        readOnly
        className="w-full h-16 text-3xl sm:text-4xl text-right pr-4 mb-4 bg-muted text-foreground rounded-md"
        aria-label="Calculator display"
        tabIndex={-1}
        autoFocus
      />
      <div className="grid grid-cols-4 gap-2" role="group" aria-label="Calculator keypad">
        {buttons.map((btn, index) => (
          <Button
            key={typeof btn.label === 'string' ? btn.label : btn.ariaLabel || `calc-btn-${index}`}
            onClick={btn.action}
            variant={btn.className?.includes('bg-destructive') || btn.className?.includes('bg-accent') || btn.className?.includes('bg-primary') || btn.className?.includes('bg-secondary') ? 'default' : 'outline'}
            className={cn(
              "h-14 sm:h-16 text-xl sm:text-2xl focus:ring-2 focus:ring-ring shadow-sm",
              btn.className
            )}
            aria-label={typeof btn.label === 'string' ? btn.label : btn.ariaLabel}
          >
            {btn.label}
          </Button>
        ))}
      </div>
    </div>
  );
};

export default SimpleCalculator;
