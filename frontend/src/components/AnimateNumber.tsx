import { useEffect, useState, useRef } from 'react';

interface AnimateNumberProps {
    value: number;
    precision?: number;
    prefix?: string;
    suffix?: string;
    duration?: number; // ms
}

export function AnimateNumber({
    value,
    precision = 2,
    prefix = '',
    suffix = '',
    duration = 800
}: AnimateNumberProps) {
    const [displayValue, setDisplayValue] = useState(value);
    const startValueRef = useRef(value);
    const endValueRef = useRef(value);
    const startTimeRef = useRef<number | null>(null);
    const displayValueRef = useRef(value);

    useEffect(() => {
        displayValueRef.current = displayValue;
    }, [displayValue]);

    useEffect(() => {
        startValueRef.current = displayValueRef.current;
        endValueRef.current = value;
        startTimeRef.current = null;

        let animationFrameId: number;

        const step = (timestamp: number) => {
            if (!startTimeRef.current) startTimeRef.current = timestamp;
            const progress = Math.min((timestamp - startTimeRef.current) / duration, 1);
            
            // Easing function: easeOutQuad
            const easeProgress = progress * (2 - progress);
            
            const current = startValueRef.current + (endValueRef.current - startValueRef.current) * easeProgress;
            setDisplayValue(current);

            if (progress < 1) {
                animationFrameId = requestAnimationFrame(step);
            }
        };

        animationFrameId = requestAnimationFrame(step);
        return () => cancelAnimationFrame(animationFrameId);
    }, [value, duration]);

    return (
        <span>
            {prefix}
            {displayValue.toLocaleString(undefined, {
                minimumFractionDigits: precision,
                maximumFractionDigits: precision
            })}
            {suffix}
        </span>
    );
}
