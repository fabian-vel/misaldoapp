const { colores, fuentes, radios } = require('./src/ui/theme/tokens');

/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{ts,tsx}'],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: colores,
      borderRadius: radios,
      fontFamily: {
        display: [fuentes.display],
        body: [fuentes.cuerpo],
        'body-medium': [fuentes.cuerpoMedio],
        'body-semibold': [fuentes.cuerpoSemibold],
      },
    },
  },
  plugins: [],
};
