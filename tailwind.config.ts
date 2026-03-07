import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
        // Theme-aware colors — change by editing globals.css variables
        "theme-primary": "var(--theme-primary)",
        "theme-primary-hover": "var(--theme-primary-hover)",
        "theme-primary-light": "var(--theme-primary-light)",
        "theme-primary-subtle": "var(--theme-primary-subtle)",
        "theme-primary-muted": "var(--theme-primary-muted)",
        "theme-mesh-base": "var(--theme-mesh-base)",
        "theme-sidebar-bg": "var(--theme-sidebar-bg)",
        "theme-sidebar-border": "var(--theme-sidebar-border)",
        "theme-sidebar-text": "var(--theme-sidebar-text)",
        "theme-sidebar-hover-bg": "var(--theme-sidebar-hover-bg)",
        "theme-sidebar-active-bg": "var(--theme-sidebar-active-bg)",
        "theme-sidebar-active-text": "var(--theme-sidebar-active-text)",
        "theme-sidebar-divider": "var(--theme-sidebar-divider)",
      },
    },
  },
  plugins: [],
};
export default config;
