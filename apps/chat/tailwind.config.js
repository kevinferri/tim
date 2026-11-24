/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ["class"],
  content: [
    "./pages/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./app/**/*.{ts,tsx}",
    "./src/**/*.{ts,tsx}",
  ],
  prefix: "",
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        // Side columns: a step darker than the chat in light mode, same in dark.
        sidebar: "hsl(var(--sidebar))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        success: {
          DEFAULT: "hsl(var(--success))",
          foreground: "hsl(var(--success-foreground))",
        },
        warning: {
          DEFAULT: "hsl(var(--warning))",
          foreground: "hsl(var(--warning-foreground))",
        },
        mention: "hsl(var(--mention))",
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        highlight: {
          DEFAULT: "#ffffcd",
          // Soft gold; deeper in light mode for contrast on white.
          icon: "hsl(var(--highlight-icon) / <alpha-value>)",
        },
      },
      boxShadow: {
        glow: "0 0 1px white, inset 0 0 1px white, 0 0 2px #9333ea, 0 0 5px #9333ea, 0 0 10px #9333ea",
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      width: {
        "sidebar-nav": "240px",
        "sidebar-nav-lg": "300px",
        "sidebar-detail": "300px",
        "sidebar-detail-lg": "340px",
      },
      minWidth: {
        "sidebar-nav": "240px",
        "sidebar-nav-lg": "300px",
      },
      maxWidth: {
        "sidebar-nav": "240px",
        "sidebar-nav-lg": "300px",
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
        typing: {
          "0%": {
            transform: "scale(0.9)",
            opacity: "0.9",
          },

          "50%": {
            transform: "scale(1)",
            opacity: "1",
          },

          "100%": {
            transform: "scale(0.9)",
            opacity: "0.9",
          },
        },
        // A hand's total reaching 21: dropped in large, slammed down a little past size, settling.
        "total-slam": {
          "0%": { transform: "scale(1.9)", opacity: "0" },
          "55%": { transform: "scale(0.9)", opacity: "1" },
          "78%": { transform: "scale(1.06)" },
          "100%": { transform: "scale(1)", opacity: "1" },
        },
        // A player's action bubble: rises out of the avatar, holds, then fades.
        // A new player dropping into their seat: in from a little large, past it, then settling.
        "seat-snap": {
          "0%": { transform: "scale(1.35)", opacity: "0" },
          "55%": { transform: "scale(0.92)", opacity: "1" },
          "78%": { transform: "scale(1.04)" },
          "100%": { transform: "scale(1)" },
        },
        "action-bubble": {
          "0%": { transform: "translateY(14px) scale(0.6)", opacity: "0" },
          "12%": { transform: "translateY(-2px) scale(1.06)", opacity: "1" },
          "20%": { transform: "translateY(0) scale(1)", opacity: "1" },
          "80%": { transform: "translateY(0) scale(1)", opacity: "1" },
          "100%": { transform: "translateY(-2px) scale(1)", opacity: "0" },
        },
        // action-bubble's pop-in and fade-out at its 1.5s pace, split so a longer bubble only holds longer.
        "bubble-in": {
          "0%": { transform: "translateY(14px) scale(0.6)", opacity: "0" },
          "60%": { transform: "translateY(-2px) scale(1.06)", opacity: "1" },
          "100%": { transform: "translateY(0) scale(1)", opacity: "1" },
        },
        "bubble-out": {
          "0%": { transform: "translateY(0) scale(1)", opacity: "1" },
          "100%": { transform: "translateY(-2px) scale(1)", opacity: "0" },
        },
        // A won amount landing: up from small, a little past full size, then settling.
        "result-pop": {
          "0%": { transform: "scale(0.8)", opacity: "0" },
          "60%": { transform: "scale(1.08)", opacity: "1" },
          "100%": { transform: "scale(1)", opacity: "1" },
        },
        // The typing pulse, grown and shrunk less: for a casino seat whose turn it is.
        "turn-pulse": {
          "0%, 100%": { transform: "scale(0.92)" },
          "50%": { transform: "scale(1)" },
        },
        // Ease-in falling, ease-out rising, so each hop reads as gravity.
        "die-bounce": {
          "0%": {
            transform: "translateY(-16px)",
            animationTimingFunction: "ease-in",
          },
          "28%": {
            transform: "translateY(0)",
            animationTimingFunction: "ease-out",
          },
          "44%": {
            transform: "translateY(-8px)",
            animationTimingFunction: "ease-in",
          },
          "60%": {
            transform: "translateY(0)",
            animationTimingFunction: "ease-out",
          },
          "72%": {
            transform: "translateY(-3px)",
            animationTimingFunction: "ease-in",
          },
          "84%": {
            transform: "translateY(0)",
            animationTimingFunction: "ease-out",
          },
          "92%": {
            transform: "translateY(-1px)",
            animationTimingFunction: "ease-in",
          },
          "100%": { transform: "translateY(0)" },
        },
        // A single segment so the easing decelerates the whole spin smoothly.
        "die-spin": {
          "0%": { transform: "rotateX(-540deg) rotateY(-360deg)" },
          "100%": { transform: "rotateX(0deg) rotateY(0deg)" },
        },
        "eight-ball-shake": {
          "0%, 100%": { transform: "translate(0, 0) rotate(0)" },
          "15%": { transform: "translate(-5px, 2px) rotate(-6deg)" },
          "30%": { transform: "translate(5px, -2px) rotate(5deg)" },
          "45%": { transform: "translate(-4px, 1px) rotate(-4deg)" },
          "60%": { transform: "translate(3px, -1px) rotate(3deg)" },
          "80%": { transform: "translate(-1px, 0) rotate(-1deg)" },
        },
        "highlight-pop": {
          "0%": { transform: "scale(1) rotate(0)" },
          "35%": { transform: "scale(1.7) rotate(-18deg)" },
          "65%": { transform: "scale(0.9) rotate(6deg)" },
          "100%": { transform: "scale(1) rotate(0)" },
        },
        "highlight-sweep": {
          "0%": { transform: "rotate(0deg)", opacity: "1" },
          "70%": { opacity: "1" },
          "100%": { transform: "rotate(360deg)", opacity: "0" },
        },
        "highlight-flash": {
          "0%": { boxShadow: "inset 0 0 0 0 hsl(var(--highlight-icon) / 0)" },
          "25%": {
            boxShadow: "inset 0 0 10px 0 hsl(var(--highlight-icon) / 0.45)",
          },
          "100%": { boxShadow: "inset 0 0 0 0 hsl(var(--highlight-icon) / 0)" },
        },
        // `top`, not translate: the glint's height is a % of the row, not of itself.
        "highlight-edge": {
          "0%": { top: "-40%", opacity: "0" },
          "15%": { opacity: "1" },
          "100%": { top: "100%", opacity: "0" },
        },
        "highlight-spark": {
          "0%": { transform: "translate(0, 0) scale(1)", opacity: "1" },
          "100%": {
            transform: "translate(var(--spark-x), var(--spark-y)) scale(0.2)",
            opacity: "0",
          },
        },
        "eight-ball-reveal": {
          "0%": {
            opacity: "0",
            filter: "blur(6px)",
            transform: "translateY(10px) scale(0.6) rotate(-25deg)",
          },
          "60%": {
            opacity: "0.85",
            filter: "blur(1px)",
            transform: "translateY(-1px) scale(1.02) rotate(4deg)",
          },
          "100%": {
            opacity: "1",
            filter: "blur(0)",
            transform: "translateY(0) scale(1) rotate(0)",
          },
        },
        // Wordsmith tiles, after Wordle: a typed letter pops, a scored tile flips, a solved row bounces.
        "tile-pop": {
          "0%": { transform: "scale(0.8)", opacity: "0" },
          "40%": { transform: "scale(1.1)", opacity: "1" },
          "100%": { transform: "scale(1)", opacity: "1" },
        },
        "tile-flip": {
          "0%": { transform: "rotateX(0)", animationTimingFunction: "ease-in" },
          "50%": {
            transform: "rotateX(-90deg)",
            animationTimingFunction: "ease-out",
          },
          "100%": { transform: "rotateX(0)" },
        },
        "tile-bounce": {
          "0%, 20%": { transform: "translateY(0)" },
          "40%": { transform: "translateY(-30px)" },
          "50%": { transform: "translateY(5px)" },
          "60%": { transform: "translateY(-15px)" },
          "80%": { transform: "translateY(2px)" },
          "100%": { transform: "translateY(0)" },
        },
        "row-shake": {
          "10%, 90%": { transform: "translateX(-1px)" },
          "20%, 80%": { transform: "translateX(2px)" },
          "30%, 50%, 70%": { transform: "translateX(-4px)" },
          "40%, 60%": { transform: "translateX(4px)" },
        },
        // Casino chips landing in a bet circle.
        "chip-drop": {
          "0%": { opacity: "0", transform: "translateY(-14px)" },
          "60%": { opacity: "1", transform: "translateY(2px)" },
          "80%": { transform: "translateY(-1px)" },
          "100%": { transform: "translateY(0)" },
        },
        // The bright pass over a bet circle's ring as it locks: traces, then fades.
        "bet-lock-flare": {
          "0%": { strokeDashoffset: "100", opacity: "1" },
          "40%": { strokeDashoffset: "0", opacity: "1" },
          "100%": { strokeDashoffset: "0", opacity: "0" },
        },
        // A bet circle's ring tracing itself clockwise.
        "bet-lock": {
          "0%": { strokeDashoffset: "100" },
          "100%": { strokeDashoffset: "0" },
        },
      },
      animation: {
        // Durations match the constants in games/wordsmith/components/tiles.tsx.
        "tile-pop": "tile-pop 0.1s ease-in-out",
        "tile-flip": "tile-flip 0.5s both",
        "tile-bounce": "tile-bounce 1s both",
        "row-shake": "row-shake 0.6s",
        "chip-drop": "chip-drop 0.35s ease-out both",
        "bet-lock": "bet-lock 0.45s ease-out both",
        "bet-lock-flare": "bet-lock-flare 1.1s ease-out both",
        // Light travelling around the score badge's border.
        "badge-edge": "spin 2.8s linear infinite",
        // Both match ROLL_DURATION_MS in roll-result.tsx.
        "die-bounce": "die-bounce 1.5s",
        "die-spin": "die-spin 1.5s cubic-bezier(0.2, 0.7, 0.3, 1)",
        "eight-ball-shake": "eight-ball-shake 0.7s ease-in-out",
        // One-shot burst when a message gets highlighted; see message-highlights.tsx.
        "highlight-pop": "highlight-pop 0.55s ease-out",
        "highlight-sweep": "highlight-sweep 0.9s ease-out forwards",
        "highlight-flash": "highlight-flash 0.9s ease-out",
        "highlight-spark": "highlight-spark 0.6s ease-out forwards",
        "highlight-edge": "highlight-edge 0.6s ease-out forwards",
        // Delayed until the shake ends; `both` keeps it hidden during the delay.
        "eight-ball-reveal":
          "eight-ball-reveal 2.2s cubic-bezier(0.22, 1, 0.36, 1) 0.8s both",
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        typing: "typing 1s ease-in-out infinite",
        "turn-pulse": "turn-pulse 1s ease-in-out infinite",
        "result-pop": "result-pop 0.5s cubic-bezier(0.2, 0.7, 0.3, 1) both",
        "action-bubble": "action-bubble 1.5s ease-out both",
        // Fades out after --bubble-hold; forwards only, so it doesn't override the pop-in while waiting.
        "chat-bubble":
          "bubble-in 0.3s ease-out both, bubble-out 0.3s ease-out var(--bubble-hold, 0s) forwards",
        "seat-snap": "seat-snap 0.45s cubic-bezier(0.3, 0.7, 0.4, 1) both",
        "total-slam": "total-slam 0.42s cubic-bezier(0.3, 0.7, 0.4, 1) both",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};
