import React from 'react';

export interface AudioWaveVisualizerProps {
  /** Whether the visualizer is actively undulating (speaking or listening) */
  active: boolean;
  /** Color theme: 'accent' uses app's active accent color from Settings; 'rose' uses recording accent */
  colorVariant?: 'accent' | 'rose';
  /** Size variant: 'sm' (compact for buttons) or 'md' (standard for cards and headers) */
  size?: 'sm' | 'md';
  /** Number of equalizer bars to render (defaults to 5 for sm, 7 for md) */
  barCount?: 5 | 7;
  /** Optional additional class names for the outer container */
  className?: string;
}

/**
 * Siri-style animated audio wave equalizer cluster.
 * Uses pure CSS keyframe animations with staggered timing loops and phase offsets
 * to create an organic, wave-like rippling visual effect.
 *
 * Smoothly settles to a flat/resting state when active is false without abrupt jump-cuts.
 */
export const AudioWaveVisualizer: React.FC<AudioWaveVisualizerProps> = ({
  active,
  colorVariant = 'accent',
  size = 'md',
  barCount = size === 'sm' ? 5 : 7,
  className = '',
}) => {
  // Height and dimensions matching compact/standard slots
  const isSm = size === 'sm';
  const containerHeight = isSm ? 'h-4' : 'h-5';
  const containerWidth = isSm 
    ? (barCount === 7 ? 'w-[26px]' : 'w-[20px]') 
    : (barCount === 5 ? 'w-[24px]' : 'w-[32px]');
  const barWidthClass = isSm ? 'w-[2px]' : 'w-[2.5px]';
  const barGapClass = isSm ? 'gap-[1.5px]' : 'gap-[2px]';

  // 7-bar configuration with staggered durations and phase delays
  // to ensure bars never move in unison, generating the organic wave ripple
  const barConfigs = [
    { keyframeClass: 'siri-wave-bar-1', duration: '1.05s', delay: '-0.2s' },
    { keyframeClass: 'siri-wave-bar-2', duration: '0.85s', delay: '-0.6s' },
    { keyframeClass: 'siri-wave-bar-3', duration: '1.2s', delay: '-0.35s' },
    { keyframeClass: 'siri-wave-bar-4', duration: '0.95s', delay: '-0.8s' },
    { keyframeClass: 'siri-wave-bar-5', duration: '1.1s', delay: '-0.15s' },
    { keyframeClass: 'siri-wave-bar-6', duration: '0.9s', delay: '-0.5s' },
    { keyframeClass: 'siri-wave-bar-7', duration: '1.15s', delay: '-0.75s' },
  ];

  // For 5 bars, select the center 5 bars for symmetrical aesthetic
  const bars = barCount === 5 ? barConfigs.slice(1, 6) : barConfigs;

  // Glow color selection
  const glowStyle = colorVariant === 'rose'
    ? { backgroundColor: '#f43f5e' }
    : { backgroundColor: 'var(--accent-500)' };

  const barColorClass = colorVariant === 'rose'
    ? 'siri-bar-rose'
    : 'siri-bar-accent';

  return (
    <div
      role="img"
      aria-label={active ? 'Audio wave active' : 'Audio wave idle'}
      className={`relative inline-flex items-center justify-center shrink-0 select-none overflow-visible ${containerHeight} ${containerWidth} ${className}`}
    >
      {/* Soft ambient blur/glow behind the bars */}
      <div
        className={`absolute inset-0 -m-1 rounded-full pointer-events-none transition-opacity duration-300 ease-out ${
          isSm ? 'blur-[4px]' : 'blur-[6px]'
        } ${active ? 'opacity-35 dark:opacity-55' : 'opacity-0'}`}
        style={glowStyle}
      />

      {/* Equalizer bars cluster */}
      <div className={`relative flex items-center justify-center h-full w-full ${barGapClass}`}>
        {bars.map((bar, index) => {
          return (
            <span
              key={index}
              className={`h-full ${barWidthClass} rounded-full transition-all duration-300 ease-out ${barColorClass} ${
                active ? `${bar.keyframeClass} siri-wave-animated` : 'siri-bar-idle'
              }`}
              style={{
                transformOrigin: 'center',
                // When inactive, smoothly collapses to flat pill rest height
                transform: active ? undefined : 'scaleY(0.18)',
              }}
            />
          );
        })}
      </div>
    </div>
  );
};
