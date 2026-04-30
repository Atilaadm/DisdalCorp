/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // Paleta DiSDAL
        brand: {
          blue:   '#1A3A8A',   // azul principal (texto logo)
          blue2:  '#1E4DB7',   // azul médio
          green:  '#4DB848',   // verde do swoosh
          lime:   '#C8D42A',   // amarelo-limão do swoosh
          teal:   '#009B94',   // teal do swoosh
          dark:   '#060D2C',   // fundo banner
          navy:   '#0D1E45',   // azul escuro secundário
        },
        primary: {
          50:  '#EEF2FF',
          100: '#DBE7FF',
          200: '#BCCFFE',
          300: '#8FAFFC',
          400: '#5E87F7',
          500: '#3663F0',
          600: '#1A3A8A',   // cor principal
          700: '#152E73',
          800: '#11235C',
          900: '#0C1A47',
          950: '#060D2C',
        },
      },
    },
  },
  plugins: [],
}
