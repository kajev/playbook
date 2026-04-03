// PostCSS processes our CSS through Tailwind and Autoprefixer.
// - tailwindcss: generates all the utility classes from our config
// - autoprefixer: adds vendor prefixes (-webkit-, -moz-) for browser compatibility
export default {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
}
