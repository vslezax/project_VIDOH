'use client';

/**
 * Анимация перехода формы «Регистрация» ⇄ «Авторизация».
 *
 * Всё, что относится к переходу, живёт здесь:
 *  - глобальные переменные анимации (EraseTime, GrowUpTime);
 *  - тексты обоих состояний формы;
 *  - источники фоновых видео;
 *  - хук-оркестратор фаз (стирание → прорастание);
 *  - компонент посимвольного текста;
 *  - прокидка значений таймлайна в CSS-переменные.
 */

import {
    useCallback,
    useEffect,
    useRef,
    useState,
    type CSSProperties,
} from 'react';

import anim from './authAnimation.module.css';

/* =====================================================================
 * 1. ГЛОБАЛЬНЫЕ ПЕРЕМЕННЫЕ АНИМАЦИИ (значения в секундах)
 * ===================================================================== */

/** Время, за которое стирается текст и уходят элементы. */
export const EraseTime = 0.3;

/** Время, за которое проявляется новый текст и возвращаются элементы. */
export const GrowUpTime = 0.3;

/** Полная длительность перехода: стирание + прорастание. */
export const TotalTime = EraseTime + GrowUpTime;

const ERASE_MS = EraseTime * 1000;
const GROW_MS = GrowUpTime * 1000;

/** Доля стирания в общем таймлайне — для сквозных эффектов (видео, логотип). */
const ERASE_WEIGHT = EraseTime / TotalTime;

/* =====================================================================
 * 2. ИСТОЧНИКИ ФОНОВЫХ ВИДЕО
 * ===================================================================== */
export type VideoSrcSet = {
    desktop: string;
    tablet: string;
    mobile: string;
};

export const RegBackgroundVideo: VideoSrcSet = {
    desktop: '/videos/RegBackgroundVideo.mp4',
    tablet:  '/videos/RegBackgroundVideo.tablet.mp4',
    mobile:  '/videos/RegBackgroundVideo.mobile.mp4',
};

export const LoginBackgroundVideo: VideoSrcSet = {
    desktop: '/videos/LoginBackgroundVideo.mp4',
    tablet:  '/videos/LoginBackgroundVideo.tablet.mp4',
    mobile:  '/videos/LoginBackgroundVideo.mobile.mp4',
};

/* =====================================================================
 * 3. ТЕКСТЫ ДВУХ СОСТОЯНИЙ ФОРМЫ
 * ===================================================================== */

export type AuthMode = 'signup' | 'signin';

export type AuthCopy = {
    /** Заголовок формы. */
    title: string;
    /** Текст основной кнопки. */
    submit: string;
    /** Надпись перед кнопкой-переключателем. */
    prompt: string;
    /** Текст кнопки-переключателя. */
    switchLabel: string;
    /** Значение autocomplete для поля пароля. */
    passwordAutoComplete: string;
};

export const AUTH_COPY: Record<AuthMode, AuthCopy> = {
    signup: {
        title: 'Регистрация',
        submit: 'Создать аккаунт',
        prompt: 'Уже есть аккаунт?',
        switchLabel: 'Войти',
        passwordAutoComplete: 'new-password',
    },
    signin: {
        title: 'Авторизация',
        submit: 'Авторизоваться',
        prompt: 'Нет аккаунта?',
        switchLabel: 'Зарегистрироваться',
        passwordAutoComplete: 'current-password',
    },
};

/* =====================================================================
 * 4. ФАЗЫ ПЕРЕХОДА И ХУК-ОРКЕСТРАТОР
 * ===================================================================== */

export type TransitionPhase = 'idle' | 'erasing' | 'growing';

export type AuthTransition = {
    /** Текущий (после середины перехода — целевой) режим формы. */
    mode: AuthMode;
    phase: TransitionPhase;
    /** Прогресс текущей фазы: 0 → 1. */
    progress: number;
    isAnimating: boolean;
    toggleMode: () => void;
};

/**
 * Держит состояние формы и проигрывает переход при каждом переключении:
 *   idle → erasing (EraseTime) → growing (GrowUpTime) → idle
 * Тексты подменяются в момент, когда текстовые слои уже пусты.
 */
export function useAuthTransition(initialMode: AuthMode = 'signup'): AuthTransition {
    const [mode, setMode] = useState<AuthMode>(initialMode);
    const [phase, setPhase] = useState<TransitionPhase>('idle');
    const [progress, setProgress] = useState(0);
    const busyRef = useRef(false);

    const toggleMode = useCallback(() => {
        // клики во время перехода игнорируются — анимация не рвётся
        if (busyRef.current) return;

        busyRef.current = true;
        setProgress(0);
        setPhase('erasing');
    }, []);

    useEffect(() => {
        if (phase === 'idle') return;

        const duration = phase === 'erasing' ? ERASE_MS : GROW_MS;
        const startedAt = performance.now();
        let frame = 0;

        const tick = (now: number) => {
            const value = Math.min(1, (now - startedAt) / duration);
            setProgress(value);

            if (value < 1) {
                frame = requestAnimationFrame(tick);
                return;
            }

            if (phase === 'erasing') {
                // текстовые слои пусты — подменяем тексты и начинаем прорастание
                setMode((current) => (current === 'signup' ? 'signin' : 'signup'));
                setProgress(0);
                setPhase('growing');
                return;
            }

            busyRef.current = false;
            setPhase('idle');
        };

        frame = requestAnimationFrame(tick);

        return () => cancelAnimationFrame(frame);
    }, [phase]);

    return { mode, phase, progress, isAnimating: phase !== 'idle', toggleMode };
}

/* =====================================================================
 * 5. ПОСИМВОЛЬНЫЙ ТЕКСТ
 * ===================================================================== */

const clamp01 = (value: number) => (value < 0 ? 0 : value > 1 ? 1 : value);
const easeInOut = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

/**
 * Видимая часть строки в текущей фазе:
 *  - «erasing» — строка съедается справа налево;
 *  - «growing» — строка прорастает слева направо.
 */
export function getVisibleText(
    text: string,
    phase: TransitionPhase,
    progress: number,
): string {
    if (phase === 'idle') return text;

    const chars = Array.from(text);
    const ratio = phase === 'erasing' ? 1 - clamp01(progress) : clamp01(progress);
    const visible = chars.slice(0, Math.round(chars.length * ratio)).join('');

    // пустой слой не должен «схлопываться» по высоте
    return visible.length > 0 ? visible : '\u00A0';
}

export type TypedTextProps = {
    text: string;
    phase: TransitionPhase;
    progress: number;
    className?: string;
};

/**
 * Текст, который стирается и прорастает посимвольно.
 * Невидимая «распорка» держит финальную ширину строки (вёрстка не прыгает)
 * и одновременно отдаёт полный текст скринридерам.
 */
export function TypedText({ text, phase, progress, className }: TypedTextProps) {
    return (
        <span className={[anim.typed, className].filter(Boolean).join(' ')}>
            <span className={anim.typedGhost}>{text}</span>
            <span className={anim.typedLive} aria-hidden="true">
                {getVisibleText(text, phase, progress)}
            </span>
        </span>
    );
}

/* =====================================================================
 * 6. ЗНАЧЕНИЯ ТАЙМЛАЙНА ДЛЯ CSS
 * ===================================================================== */

/**
 * CSS-переменные перехода, которые вешает на корень страницы:
 *  - `--auth_timeline` (0 → 1) — сквозной прогресс: видео и цвет логотипа;
 *  - `--auth_fade` (1 → 0 → 1) — уход и возврат контейнера со ссылкой.
 *
 * `mode` обязателен: в покое (`idle`) таймлайн должен оставаться на значении
 * целевого режима (0 — регистрация, 1 — авторизация), иначе после анимации
 * видео и цвет логотипа откатываются к состоянию регистрации.
 */
export function getAnimationVars(
    mode: AuthMode,
    phase: TransitionPhase,
    progress: number,
): CSSProperties {
    const eased = clamp01(progress);

    // конечная точка таймлайна для текущего (в фазе growing — уже нового) режима
    const target = mode === 'signin' ? 1 : 0;

    // середина перехода: к этому моменту видео/логотип проходят свою долю пути
    const middle = mode === 'signin' ? 1 - ERASE_WEIGHT : ERASE_WEIGHT;

    let timeline = target;
    let fade = 1;

    if (phase === 'erasing') {
        // стирание идёт от текущего состояния режима к середине таймлайна
        timeline = target + (middle - target) * eased;
        fade = 1 - eased;
    } else if (phase === 'growing') {
        // прорастание идёт от середины к состоянию нового режима
        timeline = middle + (target - middle) * eased;
        fade = eased;
    }

    return {
        '--auth_timeline': timeline,
        '--auth_fade': fade,
    } as CSSProperties;
}
