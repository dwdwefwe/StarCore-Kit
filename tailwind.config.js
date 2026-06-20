export default {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        // 浅色模式下的微调
        light: {
          bg: "#F5F5F7",
          surface: "rgba(255,255,255,0.7)",
          border: "rgba(0,0,0,0.08)",
          text: "#1D1D1F",
          subtext: "#6E6E73",
        },
      },
    },
  },
  plugins: [require("@tailwindcss/forms")],
};
