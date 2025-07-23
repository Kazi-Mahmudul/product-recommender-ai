/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ["class"],
  content: ["./src/**/*.{ts,tsx}"],
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
        // New color palette based on the provided colors
        brand: {
          // Main brand colors
          green: "#377D5B", // Main brand color - EpickGreen
          darkGreen: "#80EF80", // Deeper brand accent - EpickDarkGreen
          DEFAULT: "#377D5B", // Default brand color is green
        },
        // Hover text colors for better readability
        hover: {
          light: "#000000", // Black text for light background hover states
          dark: "#FFFFFF", // White text for dark background hover states
        },
        // Neutral/structural colors
        epick: {
          white: "#FFFFFF", // Clean white - EpickWhite
          offWhite: "#F9FAF9", // Slightly tinted white - EpickOffWhite
          lightGray: "#EAEAEA", // Light gray - EpickLightGray
          mediumGray: "#B0B0B0", // Medium gray - EpickMediumGray
          darkGray: "#444444", // Dark gray - EpickDarkGray
          black: "#1A1A1A", // Black - EpickBlack
        },
        // Accent colors
        accent: {
          purple: "#C1BFFF", // Soft purple - EpickSoftPurple
          blue: "#A9DBF9", // Sky blue - EpickSkyBlue
          peach: "#FFD6B0", // Peach - EpickPeach
          neonGreen: "#33FF99", // Neon green - EpickNeonGreen
          DEFAULT: "#33FF99", // Default accent color is neon green
        },
        // Semantic colors
        semantic: {
          success: "#4CAF50", // Success - EpickSuccess
          warning: "#FFC107", // Warning - EpickWarning
          danger: "#F44336", // Danger - EpickDanger
        },
        // System colors for Tailwind compatibility
        neutral: {
          50: "#F9FAF9", // EpickOffWhite
          100: "#F9FAF9", // EpickOffWhite
          200: "#EAEAEA", // EpickLightGray
          300: "#EAEAEA", // EpickLightGray
          400: "#B0B0B0", // EpickMediumGray
          500: "#B0B0B0", // EpickMediumGray
          600: "#444444", // EpickDarkGray
          700: "#444444", // EpickDarkGray
          800: "#1A1A1A", // EpickBlack
          900: "#1A1A1A", // EpickBlack
        },
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
      },
      borderRadius: {
        "4xl": "2rem",
        "5xl": "2.5rem",
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      boxShadow: {
        soft: "0 4px 20px rgba(0, 0, 0, 0.05)",
        "soft-lg": "0 10px 30px rgba(0, 0, 0, 0.07)",
        "soft-xl": "0 20px 50px rgba(0, 0, 0, 0.1)",
        "inner-soft": "inset 0 2px 4px 0 rgba(0, 0, 0, 0.05)",
      },
      keyframes: {
        "accordion-down": {
          from: { height: 0 },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: 0 },
        },
        float: {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-10px)" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        float: "float 6s ease-in-out infinite",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};
