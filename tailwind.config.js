/** @type {import('tailwindcss').Config} */
export default {
  content: ["./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          // Palet wajib sesuai PRD: putih, biru muda, navy.
          white: "#FFFFFF",
          blue: "#61A5F8",
          navy: "#1E3A5F",
        },
      },
    },
  },
  plugins: [],
};
