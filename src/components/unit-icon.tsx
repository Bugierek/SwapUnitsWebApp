import * as React from 'react';
import {
  Thermometer,
  Weight,
  Ruler,
  Clock,
  Gauge,
  AreaChart,
  Waves, 
  CloudLightning, 
  HelpCircle, 
  GaugeCircle, 
  Fuel, 
  HardDrive, 
  Network, 
  Bitcoin,
  ArrowLeftRight,
  DollarSign,
  // Signal, // For EM Frequency - Removed
  // Volume2, // For Sound Frequency - Removed
} from 'lucide-react';
import type { UnitCategory } from '@/types';

interface UnitIconProps extends React.SVGProps<SVGSVGElement> {
    category: UnitCategory | string;
}

// Removed EthereumIcon as the category is removed

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
    case 'Currency':
        return <DollarSign {...props} />;
    case 'SI Prefixes':
        return <ArrowLeftRight {...props} />;
    // Removed cases for 'Ethereum', 'EM Frequency', 'Sound Frequency'
    default:
      return <HelpCircle {...props} />;
  }
});

UnitIcon.displayName = 'UnitIcon';
