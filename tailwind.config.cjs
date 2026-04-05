/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './views/**/*.ejs',
    './public/**/*.js'
  ],
  safelist: [
    'font-bookman-regular',
    'font-bookman-italic',
    'font-bookman-bold',
    'font-bookman-bold-italic',
    'font-calibri-light',
    'font-calibri-light-italic',
    'font-calibri-regular',
    'font-calibri-italic',
    'font-calibri-bold',
    'font-calibri-bold-italic'
  ],
  theme: {
    extend: {
      fontFamily: {
        bookman: ['"Bookman Old Style"', 'serif'],
        'bookman-regular': ['"Bookman Old Style"', 'serif'],
        'bookman-italic': ['"Bookman Old Style"', 'serif'],
        'bookman-bold': ['"Bookman Old Style"', 'serif'],
        'bookman-bold-italic': ['"Bookman Old Style"', 'serif'],
        calibri: ['Calibri', 'sans-serif'],
        'calibri-light': ['Calibri', 'sans-serif'],
        'calibri-light-italic': ['Calibri', 'sans-serif'],
        'calibri-regular': ['Calibri', 'sans-serif'],
        'calibri-italic': ['Calibri', 'sans-serif'],
        'calibri-bold': ['Calibri', 'sans-serif'],
        'calibri-bold-italic': ['Calibri', 'sans-serif']
      }
    }
  },
  plugins: []
};
