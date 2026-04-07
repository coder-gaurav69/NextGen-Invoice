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
        bookman: ['"Bookman Old Style"', { fontWeight: '400', fontStyle: 'normal' }, 'serif'],
        'bookman-regular': ['"Bookman Old Style"', { fontWeight: '400', fontStyle: 'normal' }, 'serif'],
        'bookman-italic': ['"Bookman Old Style"', { fontWeight: '400', fontStyle: 'italic' }, 'serif'],
        'bookman-bold': ['"Bookman Old Style"', { fontWeight: '700', fontStyle: 'normal' }, 'serif'],
        'bookman-bold-italic': ['"Bookman Old Style"', { fontWeight: '700', fontStyle: 'italic' }, 'serif'],
        calibri: ['Calibri', { fontWeight: '400', fontStyle: 'normal' }, 'sans-serif'],
        'calibri-light': ['Calibri', { fontWeight: '300', fontStyle: 'normal' }, 'sans-serif'],
        'calibri-light-italic': ['Calibri', { fontWeight: '300', fontStyle: 'italic' }, 'sans-serif'],
        'calibri-regular': ['Calibri', { fontWeight: '400', fontStyle: 'normal' }, 'sans-serif'],
        'calibri-italic': ['Calibri', { fontWeight: '400', fontStyle: 'italic' }, 'sans-serif'],
        'calibri-bold': ['Calibri', { fontWeight: '700', fontStyle: 'normal' }, 'sans-serif'],
        'calibri-bold-italic': ['Calibri', { fontWeight: '700', fontStyle: 'italic' }, 'sans-serif']
      }
    }
  },
  plugins: []
};

