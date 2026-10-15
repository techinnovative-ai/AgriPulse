import React from 'react';
import { AgriSenseLogo } from './AgriSenseLogo';

interface AgriPulseLogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  theme?: 'dark' | 'light';
  showTagline?: boolean;
  subtitle?: string;
  className?: string;
}

export const AgriPulseLogo: React.FC<AgriPulseLogoProps> = (props) => {
  return <AgriSenseLogo {...props} />;
};
