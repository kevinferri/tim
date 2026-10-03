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
          icon: "#dfa0a1",
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
        "sidebar-nav": "220px",
        "sidebar-nav-lg": "280px",
        "sidebar-detail": "280px",
        "sidebar-detail-lg": "320px",
      },
      minWidth: {
        "sidebar-nav": "220px",
        "sidebar-nav-lg": "280px",
      },
      maxWidth: {
        "sidebar-nav": "220px",
        "sidebar-nav-lg": "280px",
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
        // Ease-in falling, ease-out rising, so each hop reads as gravity.
        // Flames licking up from the bottom of the score badge; irregular steps so it never looks like a loop.
        "badge-flame": {
          "0%, 100%": { opacity: "0.75", transform: "scaleY(0.85)" },
          "20%": { opacity: "1", transform: "scaleY(1.1)" },
          "35%": { opacity: "0.8", transform: "scaleY(0.95)" },
          "55%": { opacity: "1", transform: "scaleY(1.2)" },
          "70%": { opacity: "0.7", transform: "scaleY(0.9)" },
          "85%": { opacity: "0.95", transform: "scaleY(1.05)" },
        },
        // Firelight around the plate, on a different period than the flames.
        "badge-firelight": {
          "0%, 100%": { boxShadow: "0 0 6px 0 rgba(251,146,60,0.45)" },
          "30%": { boxShadow: "0 0 12px 1px rgba(251,146,60,0.7)" },
          "50%": { boxShadow: "0 0 8px 0 rgba(249,115,22,0.5)" },
          "75%": { boxShadow: "0 0 14px 2px rgba(251,191,36,0.65)" },
        },
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
      },
      animation: {
        // Both match ROLL_DURATION_MS in roll-result.tsx.
        "badge-flame": "badge-flame 1.3s ease-in-out infinite",
        "badge-firelight": "badge-firelight 1.9s ease-in-out infinite",
        "die-bounce": "die-bounce 1.5s",
        "die-spin": "die-spin 1.5s cubic-bezier(0.2, 0.7, 0.3, 1)",
        "eight-ball-shake": "eight-ball-shake 0.7s ease-in-out",
        // Delayed until the shake ends; `both` keeps it hidden during the delay.
        "eight-ball-reveal":
          "eight-ball-reveal 2.2s cubic-bezier(0.22, 1, 0.36, 1) 0.8s both",
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        typing: "typing 1s ease-in-out infinite",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};
