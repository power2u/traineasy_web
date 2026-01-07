'use client';

import { useMemo, useEffect, useState } from 'react';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js';
import { Card } from '@heroui/react';
import type { BodyMeasurement, MeasurementType } from '@/lib/types';
import { MEASUREMENT_LABELS } from '@/lib/types';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

interface MeasurementChartProps {
  measurements: BodyMeasurement[];
  measurementType: MeasurementType;
  unit: 'kg' | 'lbs' | 'cm' | 'in';
}

export function MeasurementChart({ measurements, measurementType, unit }: MeasurementChartProps) {
  const [colors, setColors] = useState({
    primary: '#3b82f6',
    primaryAlpha: 'rgba(59, 130, 246, 0.1)',
    popover: '#1f2937',
    popoverForeground: '#f9fafb',
    border: '#374151',
    mutedForeground: '#9ca3af',
  });

  // Get computed CSS custom properties
  useEffect(() => {
    const updateColors = () => {
      const root = document.documentElement;
      const computedStyle = getComputedStyle(root);
      
      // Helper function to convert HSL to hex
      const hslToHex = (hslString: string) => {
        // Extract HSL values from string like "210 40% 50%"
        const values = hslString.trim().split(/\s+/);
        if (values.length !== 3) return '#3b82f6'; // fallback
        
        const h = parseInt(values[0]) / 360;
        const s = parseInt(values[1]) / 100;
        const l = parseInt(values[2]) / 100;
        
        const hue2rgb = (p: number, q: number, t: number) => {
          if (t < 0) t += 1;
          if (t > 1) t -= 1;
          if (t < 1/6) return p + (q - p) * 6 * t;
          if (t < 1/2) return q;
          if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
          return p;
        };
        
        let r, g, b;
        if (s === 0) {
          r = g = b = l;
        } else {
          const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
          const p = 2 * l - q;
          r = hue2rgb(p, q, h + 1/3);
          g = hue2rgb(p, q, h);
          b = hue2rgb(p, q, h - 1/3);
        }
        
        const toHex = (c: number) => {
          const hex = Math.round(c * 255).toString(16);
          return hex.length === 1 ? '0' + hex : hex;
        };
        
        return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
      };

      const primaryHsl = computedStyle.getPropertyValue('--primary').trim();
      const popoverHsl = computedStyle.getPropertyValue('--popover').trim();
      const popoverForegroundHsl = computedStyle.getPropertyValue('--popover-foreground').trim();
      const borderHsl = computedStyle.getPropertyValue('--border').trim();
      const mutedForegroundHsl = computedStyle.getPropertyValue('--muted-foreground').trim();

      const primaryHex = hslToHex(primaryHsl);
      const popoverHex = hslToHex(popoverHsl);
      const popoverForegroundHex = hslToHex(popoverForegroundHsl);
      
      // Ensure good contrast for tooltips
      const isDarkTheme = document.documentElement.classList.contains('dark');
      const tooltipBg = isDarkTheme ? '#1f2937' : '#ffffff';
      const tooltipText = isDarkTheme ? '#f9fafb' : '#1f2937';
      
      setColors({
        primary: primaryHex,
        primaryAlpha: `${primaryHex}1a`, // Add alpha
        popover: tooltipBg,
        popoverForeground: tooltipText,
        border: hslToHex(borderHsl),
        mutedForeground: hslToHex(mutedForegroundHsl),
      });
    };

    updateColors();
    
    // Update colors when theme changes
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.type === 'attributes' && mutation.attributeName === 'class') {
          updateColors();
        }
      });
    });
    
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class']
    });
    
    return () => observer.disconnect();
  }, []);

  const chartData = useMemo(() => {
    const sortedMeasurements = [...measurements].sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
    );

    return {
      labels: sortedMeasurements.map((m) =>
        new Date(m.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
      ),
      datasets: [
        {
          label: `${MEASUREMENT_LABELS[measurementType]} (${unit})`,
          data: sortedMeasurements.map((m) => m.value),
          borderColor: colors.primary,
          backgroundColor: colors.primaryAlpha,
          fill: true,
          tension: 0.4,
          pointBackgroundColor: colors.primary,
          pointBorderColor: colors.primary,
          pointHoverBackgroundColor: colors.primary,
          pointHoverBorderColor: '#ffffff',
          pointRadius: 4,
          pointHoverRadius: 6,
        },
      ],
    };
  }, [measurements, measurementType, unit, colors]);

  const options = useMemo(() => ({
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false,
      },
      tooltip: {
        backgroundColor: colors.popover,
        titleColor: colors.popoverForeground,
        bodyColor: colors.popoverForeground,
        borderColor: colors.border,
        borderWidth: 1,
        padding: 12,
        cornerRadius: 8,
        displayColors: false,
        titleFont: {
          size: 12,
          weight: 'bold' as const,
        },
        bodyFont: {
          size: 14,
          weight: 'normal' as const,
        },
        callbacks: {
          label: (context: any) => `${context.parsed.y.toFixed(1)} ${unit}`,
          title: (context: any) => context[0].label,
        },
      },
    },
    scales: {
      y: {
        beginAtZero: false,
        grid: {
          color: colors.border,
          drawBorder: false,
        },
        ticks: {
          color: colors.mutedForeground,
          font: {
            size: 12,
          },
          padding: 8,
        },
        border: {
          display: false,
        },
      },
      x: {
        grid: {
          display: false,
        },
        ticks: {
          color: colors.mutedForeground,
          font: {
            size: 12,
          },
          maxRotation: 45,
          minRotation: 45,
          padding: 8,
        },
        border: {
          display: false,
        },
      },
    },
    interaction: {
      intersect: false,
      mode: 'index' as const,
    },
  }), [colors, unit]);

  return (
    <Card className="p-4">
      <h3 className="mb-4 text-lg font-semibold text-foreground">Progress Chart</h3>
      <div className="h-[250px] md:h-[300px]">
        <Line data={chartData} options={options} />
      </div>
    </Card>
  );
}
