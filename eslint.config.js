// `npm run lint`: catches React hook mistakes that build fine but blank the page in the browser
// (a hook called after an early return, or inside a condition). Run it before every deploy.
import hooks from "eslint-plugin-react-hooks";

export default [
  { ignores: ["dist/**", "node_modules/**"] },
  {
    files: ["src/**/*.{js,jsx}"],
    languageOptions: { ecmaVersion: "latest", sourceType: "module", parserOptions: { ecmaFeatures: { jsx: true } } },
    linterOptions: { reportUnusedDisableDirectives: "off" },
    plugins: { "react-hooks": hooks },
    rules: { "react-hooks/rules-of-hooks": "error" },
  },
];
