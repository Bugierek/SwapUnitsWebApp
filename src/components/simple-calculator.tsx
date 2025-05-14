
'use client';

import * as React from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { SendHorizonal } from 'lucide-react'; // Import SendHorizonal icon

interface SimpleCalculatorProps {
  onSendValue: (value: string) => void; // Callback to send value to parent
}

const SimpleCalculator: React.FC<SimpleCalculatorProps> = ({ onSendValue }) => {
  const [displayValue, setDisplayValue] = React.useState<string>('0');
  const [firstOperand, setFirstOperand] = React.useState<number | null>(null);
  const [operator, setOperator] = React.useState<string | null>(null);
  const [waitingForSecondOperand, setWaitingForSecondOperand] = React.useState<boolean>(false);

  const inputDigit = (digit: string) => {
    if (displayValue.length >= 15 && !waitingForSecondOperand) return; // Limit input length
    if (waitingForSecondOperand) {
      setDisplayValue(digit);
      setWaitingForSecondOperand(false);
    } else {
      setDisplayValue(displayValue === '0' ? digit : displayValue + digit);
    }
  };

  const inputDecimal = () => {
    if (waitingForSecondOperand) {
      setDisplayValue('0.');
      setWaitingForSecondOperand(false);
      return;
    }
    if (!displayValue.includes('.')) {
      setDisplayValue(displayValue + '.');
    }
  };

  const clearDisplay = () => {
    setDisplayValue('0');
    setFirstOperand(null);
    setOperator(null);
    setWaitingForSecondOperand(false);
  };

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
  
  const performOperation = (nextOperator: string) => {
    const inputValue = parseFloat(displayValue);

    if (isNaN(inputValue) && displayValue !== 'Error') { 
        clearDisplay(); 
        return;
    }
    if (displayValue === 'Error') {
        // If display is "Error", only allow AC or digit input to reset
        if (nextOperator !== 'AC') { // AC is handled by clearDisplay
             setFirstOperand(null);
             setOperator(null);
             setWaitingForSecondOperand(true); // Prepare for new input if an operator is pressed
             // but don't change displayValue from "Error" until a digit is pressed
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
        setWaitingForSecondOperand(true); // Allow new calculation after error
        return;
      }
      const resultStr = String(parseFloat(result.toFixed(7))); 
      setDisplayValue(resultStr);
      setFirstOperand(parseFloat(resultStr)); 
    }

    setWaitingForSecondOperand(true);
    setOperator(nextOperator);
  };


  const handleEquals = () => {
    if (operator && firstOperand !== null) {
      const inputValue = parseFloat(displayValue);
       if (isNaN(inputValue) && displayValue !== 'Error') {
            setDisplayValue('Error');
            setFirstOperand(null);
            setOperator(null);
            setWaitingForSecondOperand(true);
            return;
        }
        if (displayValue === 'Error') return; // Don't calculate if current display is Error

      const result = calculate(firstOperand, inputValue, operator);
      
      if (isNaN(result)) {
        setDisplayValue('Error');
      } else {
        const resultStr = String(parseFloat(result.toFixed(7)));
        setDisplayValue(resultStr);
      }
      setFirstOperand(null); 
      setOperator(null);
      // setWaitingForSecondOperand to false to allow immediate new calculation or chaining result
      setWaitingForSecondOperand(false); 
    }
  };

  const handleSendValue = () => {
    if (displayValue === 'Error' || isNaN(parseFloat(displayValue))) {
      // Optionally, provide user feedback that "Error" cannot be sent
      // Or simply do nothing if the value is not valid to send.
      console.warn("Calculator value is 'Error' or invalid, cannot send.");
      // You might want to show a toast or alert to the user here.
      return;
    }
    onSendValue(displayValue);
  };

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
    { label: '=', action: handleEquals, className: 'bg-primary hover:bg-primary/90 text-primary-foreground', ariaLabel: "Equals" }, // Removed row-span-2
    { label: '0', action: () => inputDigit('0'), className: 'col-span-2' }, // Added col-span-2
    { label: '.', action: inputDecimal, ariaLabel: "Decimal" },
    { 
      label: <SendHorizonal className="h-5 w-5" />, 
      action: handleSendValue, 
      className: 'bg-secondary hover:bg-secondary/90 text-secondary-foreground',
      ariaLabel: 'Send value to converter'
    },
  ];

  return (
    <div className="w-full max-w-xs mx-auto p-4 bg-card rounded-lg shadow-xl border">
      <Input
        type="text"
        value={displayValue}
        readOnly
        className="w-full h-16 text-3xl sm:text-4xl text-right pr-4 mb-4 bg-muted text-foreground rounded-md"
        aria-label="Calculator display"
        tabIndex={-1} 
      />
      <div className="grid grid-cols-4 gap-2">
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
