
import * as React from 'react';
import {
  Thermometer,
  Weight,
  Ruler,
  Clock,
  Gauge,
  AreaChart,
  Waves, // Using Waves for Volume as Cube isn't available
  CloudLightning, // Using CloudLightning for Energy as Bolt isn't available
  HelpCircle, // Default icon
  GaugeCircle, // For Speed
  Fuel, // For Fuel Economy
  HardDrive, // For Data Storage
  Network, // For Data Transfer Rate (or Wifi)
  Bitcoin,
  Sun, // For Light category
  Signal, // For Frequency category
} from 'lucide-react';
import type { UnitCategory } from '@/types';

interface UnitIconProps extends React.SVGProps<SVGSVGElement> {
    category: UnitCategory | string;
}

const EthereumIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    {...props}
  >
    <path
      d="M12 1.75L18.9282 9L12 12.5L5.0718 9L12 1.75Z"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M5.0718 15L12 22.25L18.9282 15L12 11.5L5.0718 15Z"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

export const UnitIcon = React.memo(function UnitIconComponent({ category, ...props }: UnitIconProps) {
  switch (category as UnitCategory) {
    case 'Length':
      return <Ruler {...props} />;
    case 'Mass':
      return <Weight {...props} />;
    case 'Temperature':
      return <Thermometer {...props} />;
    case 'Time':
      return <Clock {...props} />;
    case 'Pressure':
      return <Gauge {...props} />;
    case 'Area':
        return <AreaChart {...props} />;
    case 'Volume':
        return <Waves {...props} />;
    case 'Energy':
        return <CloudLightning {...props} />;
    case 'Speed':
        return <GaugeCircle {...props} />;
    case 'Fuel Economy':
        return <Fuel {...props} />;
    case 'Data Storage':
        return <HardDrive {...props} />;
    case 'Data Transfer Rate':
        return <Network {...props} />;
    case 'Bitcoin':
        return <Bitcoin {...props} />;
    case 'Ethereum':
        return <EthereumIcon {...props} />;
    case 'Light':
        return <Sun {...props} />;
    case 'Frequency':
        return <Signal {...props} />;
    default:
      return <HelpCircle {...props} />;
  }
});

UnitIcon.displayName = 'UnitIcon';
