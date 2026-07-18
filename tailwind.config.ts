import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
        primary: {
          50: '#FFF5EB',
          100: '#FFE6D1',
          200: '#FFC9A3',
          300: '#FFA675',
          400: '#FF8547',
          500: '#F26B1D',  /* Main Orange */
          600: '#D95A14',
          700: '#B34A11',
          800: '#8C3A0E',
          900: '#662A0A',
        },
        dark: {
          50: '#F2F2F2',
          100: '#D9D9D9',
          200: '#BFBFBF',
          300: '#A6A6A6',
          400: '#8C8C8C',
          500: '#737373',
          600: '#595959',
          700: '#404040',
          800: '#262626',
          900: '#1A1A1A',  /* Primary Text */
          950: '#0D0D0D',
        },
        cream: {
          50: '#FAF8F5',
          100: '#F5F0EB',  /* Background */
          200: '#EBE5DD',
        }
      },
      fontFamily: {
        sans: ["var(--font-inter)", "system-ui", "sans-serif"],
        arabic: ["var(--font-noto-sans-arabic)", "sans-serif"],
      }
    },
  },
  plugins: [],
};
export default config;

