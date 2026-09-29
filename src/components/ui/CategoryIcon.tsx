import React from 'react';
import {
  Home,
  Utensils,
  Car,
  Film,
  HeartPulse,
  GraduationCap,
  Package,
} from 'lucide-react';
import type { LucideProps } from 'lucide-react';
import type { CategoryId } from '../../types/expense';

interface CategoryIconProps extends LucideProps {
  categoryId: CategoryId | string;
}

export const CategoryIcon: React.FC<CategoryIconProps> = ({ categoryId, ...props }) => {
  switch (categoryId) {
    case 'vivienda':
      return <Home {...props} />;
    case 'alimentacion':
      return <Utensils {...props} />;
    case 'transporte':
      return <Car {...props} />;
    case 'ocio':
      return <Film {...props} />;
    case 'salud':
      return <HeartPulse {...props} />;
    case 'educacion':
      return <GraduationCap {...props} />;
    case 'otros':
    default:
      return <Package {...props} />;
  }
};
