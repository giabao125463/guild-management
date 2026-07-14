"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

export interface SpinWheelSegment {
  id: string;
  label: string;
}

interface SpinWheelProps {
  segments: SpinWheelSegment[];
  winnerId?: string | null;
  spinning?: boolean;
  size?: number;
  className?: string;
}

export function SpinWheel({
  segments,
  winnerId,
  spinning = false,
  size = 320,
  className,
}: SpinWheelProps) {
  const [rotation, setRotation] = React.useState(0);
  const segmentAngle = segments.length > 0 ? 360 / segments.length : 0;

  React.useEffect(() => {
    if (!spinning || !winnerId || segments.length === 0) return;

    const winnerIndex = segments.findIndex((s) => s.id === winnerId);
    if (winnerIndex < 0) return;

    const spins = 5;
    const targetAngle = 360 - (winnerIndex * segmentAngle + segmentAngle / 2);
    const totalRotation = spins * 360 + targetAngle;

    setRotation((prev) => prev + totalRotation);
  }, [spinning, winnerId, segments, segmentAngle]);

  if (segments.length === 0) {
    return (
      <div
        className={cn(
          "flex items-center justify-center rounded-full border-2 border-dashed border-muted-foreground/30 text-sm text-muted-foreground",
          className,
        )}
        style={{ width: size, height: size }}
      >
        Không có ứng viên
      </div>
    );
  }

  const colors = [
    "hsl(173 58% 39%)",
    "hsl(215 28% 35%)",
    "hsl(173 45% 50%)",
    "hsl(215 20% 50%)",
    "hsl(173 35% 55%)",
    "hsl(215 25% 45%)",
    "hsl(173 50% 32%)",
    "hsl(215 30% 40%)",
  ];

  return (
    <div className={cn("relative mx-auto", className)} style={{ width: size, height: size }}>
      <div
        className="absolute left-1/2 top-0 z-10 -translate-x-1/2 -translate-y-1"
        style={{
          width: 0,
          height: 0,
          borderLeft: "12px solid transparent",
          borderRight: "12px solid transparent",
          borderTop: "24px solid hsl(var(--primary))",
        }}
      />
      <div
        className="relative h-full w-full rounded-full border-4 border-primary/30 shadow-lg"
        style={{
          transform: `rotate(${rotation}deg)`,
          transition: spinning ? "transform 4s cubic-bezier(0.17, 0.67, 0.12, 0.99)" : "none",
        }}
      >
        <svg viewBox="0 0 100 100" className="h-full w-full">
          {segments.map((segment, index) => {
            const startAngle = (index * segmentAngle - 90) * (Math.PI / 180);
            const endAngle = ((index + 1) * segmentAngle - 90) * (Math.PI / 180);
            const x1 = 50 + 50 * Math.cos(startAngle);
            const y1 = 50 + 50 * Math.sin(startAngle);
            const x2 = 50 + 50 * Math.cos(endAngle);
            const y2 = 50 + 50 * Math.sin(endAngle);
            const largeArc = segmentAngle > 180 ? 1 : 0;
            const midAngle = ((index + 0.5) * segmentAngle - 90) * (Math.PI / 180);
            const labelX = 50 + 32 * Math.cos(midAngle);
            const labelY = 50 + 32 * Math.sin(midAngle);
            const labelRotation = index * segmentAngle + segmentAngle / 2;

            return (
              <g key={segment.id}>
                <path
                  d={`M 50 50 L ${x1} ${y1} A 50 50 0 ${largeArc} 1 ${x2} ${y2} Z`}
                  fill={colors[index % colors.length]}
                  stroke="hsl(var(--background))"
                  strokeWidth="0.3"
                />
                <text
                  x={labelX}
                  y={labelY}
                  fill="white"
                  fontSize="3"
                  fontWeight="600"
                  textAnchor="middle"
                  dominantBaseline="middle"
                  transform={`rotate(${labelRotation}, ${labelX}, ${labelY})`}
                >
                  {segment.label.length > 12
                    ? `${segment.label.slice(0, 10)}…`
                    : segment.label}
                </text>
              </g>
            );
          })}
          <circle cx="50" cy="50" r="8" fill="hsl(var(--background))" stroke="hsl(var(--primary))" strokeWidth="1" />
        </svg>
      </div>
    </div>
  );
}
