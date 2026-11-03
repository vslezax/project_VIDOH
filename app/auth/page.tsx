'use client';

import styles from "./page.module.css";
import scale from "./page.scale.module.css";
import anim from "./(utils)/authAnimation.module.css";
import NoisyVideo from "./(utils)/NoisyVideo";
import Logo from "@/public/VDH-Logo.svg";
import {
    AUTH_COPY,
    LoginBackgroundVideo,
    RegBackgroundVideo,
    TypedText,
    getAnimationVars,
    useAuthTransition,
} from "./(utils)/authAnimation";

import { AnimatedGradientShader } from "@/app/auth/(utils)/Shader";
import { useMemo } from "react";
import {shaderStops} from "@/app/auth/(utils)/shaderParams";

export default function Auth() {
    const { mode, phase, progress, isAnimating, toggleMode } = useAuthTransition();
    const copy = AUTH_COPY[mode];

    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-expect-error
    const timeline = getAnimationVars(mode, phase, progress)['--auth_timeline'] as number;
    const colorStops = useMemo(() => shaderStops(1 - timeline), [timeline]);

    return (
        <main
            className={`${styles.main} ${scale.root} ${anim.stage}`}
            style={getAnimationVars(mode, phase, progress)}
        >
            <div className={`${styles.BackgroundVideo} ${anim.regVideo}`} aria-hidden="true">
                <NoisyVideo
                    height={"100%"}
                    width={"100%"}
                    src={RegBackgroundVideo}
                    grainAmount={0.3}
                    grainSize={4.0}
                    grainSpeed={25}
                />
            </div>

            <div className={`${styles.BackgroundVideo} ${anim.loginVideo}`} aria-hidden="true">
                <NoisyVideo
                    height={"100%"}
                    width={"100%"}
                    src={LoginBackgroundVideo}
                    grainAmount={0.3}
                    grainSize={4.0}
                    grainSpeed={25}
                />
            </div>

            <div className={`${styles.container} ${anim.backgroundColor_WhiteToBlack}`}>
                <section
                    className={styles.content}
                    aria-labelledby="auth-title"
                >
                    <Logo
                        className={`${styles.logo} ${anim.color_PurpleToLemon}`}
                        aria-hidden="true"
                        focusable="false"
                    />
                    <h1 id="auth-title" className={`${styles.title} ${anim.color_BlackToWhite}`}>
                        <TypedText text={copy.title} phase={phase} progress={progress} />
                    </h1>
                    <p className={`${styles.subtitle} ${anim.color_BlackToWhite}`}>
                        Привет! Готовы ВЫДОХнуть?
                    </p>

                    <div className={`${styles.line} ${anim.backgroundColor_BlackToWhite}`} />

                    <form className={styles.EmailPasswordContainer} noValidate>
                        <div className={styles.EmailPasswordLowContainer}>
                            <label htmlFor="email" className={`${styles.EmailPasswordTitle} ${anim.color_BlackToWhite}`}>
                                Электронная почта
                            </label>
                            <div className={`${styles.EmailPasswordTextBox} ${anim.borderColor_LemonToPurple}`}>
                                <input
                                    id="email"
                                    name="email"
                                    type="email"
                                    autoComplete="email"
                                    placeholder="your.email@example.com"
                                    className={`${styles.EmailPasswordTextBoxText} ${anim.color_BlackToWhite}`}
                                    required
                                />
                            </div>
                        </div>

                        <div className={styles.EmailPasswordLowContainer}>
                            <label htmlFor="password" className={`${styles.EmailPasswordTitle} ${anim.color_BlackToWhite}`}>
                                Пароль
                            </label>
                            <div className={`${styles.EmailPasswordTextBox} ${anim.borderColor_LemonToPurple} ${anim.color_BlackToWhite}`}>
                                <input
                                    id="password"
                                    name="password"
                                    type="password"
                                    autoComplete={copy.passwordAutoComplete}
                                    placeholder="***********"
                                    className={`${styles.EmailPasswordTextBoxText} ${anim.color_BlackToWhite}`}
                                    required
                                />
                            </div>
                        </div>

                        <button type="submit" className={`${styles.RegLoginButtonContainer} ${anim.backgroundColor_PurpleToLemon}`}>
                            <span className={`${styles.RegLoginButtonText} ${anim.color_WhiteToBlack}`}>
                                <TypedText text={copy.submit} phase={phase} progress={progress} />
                            </span>
                        </button>
                    </form>

                    <p className={`${styles.AlreadyHaveAccountContainer} ${anim.fadeAnimation}`}>
                        <span className={`${styles.AlreadyHaveAccount} ${anim.color_BlackToWhite}`}>
                            <TypedText text={copy.prompt} phase={phase} progress={progress} />
                        </span>{" "}
                        <button
                            type="button"
                            className={`${styles.SignInUpButton} ${anim.switchButton} ${anim.color_BlackToWhite}`}
                            onClick={toggleMode}
                            aria-disabled={isAnimating}
                        >
                            <TypedText text={copy.switchLabel} phase={phase} progress={progress} />
                        </button>
                    </p>
                </section>

                <aside className={styles.shader} aria-label="Слоган">
                    <p className={`${styles.ShaderText}`}>
                        Позвольте себе отдохнуть душой от каждодневной рутины
                    </p>
                    <AnimatedGradientShader
                        width="100%"
                        height="100%"

                        // ============ 1. ГРАДИЕНТ ============
                        gradientAngle={Math.PI / 2}   // снизу вверх
                        gradientSoftness={.3}        // линейно
                        gradientContrast={2.5}        // граница уже, края плато
                        gradientPivot={0.5}           // центр

                        // ============ 2. FRACTAL DISPLACE ============
                        noiseScale={2}
                        octave2Scale={.1}
                        displaceStrength={1}
                        displaceLayer2={.1}
                        octaves={5}
                        fbmLacunarity={2.02}
                        fbmGain={.1}
                        fbmRotation={0.}
                        noiseOffsetX={0.0}
                        noiseOffsetY={0.0}
                        phaseSpeed={.5}
                        phaseSpeed2={1}
                        phaseOffset={0.0}

                        // ============ 3. COLOR RAMP ============
                        colorStops={colorStops}
                        brightness={1.2}
                        saturation={.5}

                        // ============ 4. СТЕКЛО ============
                        glassCenter={[0, 1]}
                        glassOpacity={.25}
                        glassStrength={.5}
                        glassScale={10.0}
                        glassRanOffsetX={0.0}
                        glassRanOffsetY={0.0}
                        glassRanAmplitude={2}
                        glassMaskRadius={10}         // >1.5 = без маски (на весь экран)
                        glassMaskSoftness={0}
                        glassScaleY={0}

                        // ============ прочее ============
                        paused={false}
                    />
                </aside>
            </div>
        </main>
    );
}
