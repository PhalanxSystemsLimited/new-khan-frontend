// `npm run lint`: catches mistakes that build fine but blank the page in the browser: a React hook called after an
// early return or inside a condition, and a name or component used without being imported or defined. Run it before every deploy.
import globals from "globals";
import hooks from "eslint-plugin-react-hooks";
import react from "eslint-plugin-react";

export default [
  { ignores: ["dist/**", "node_modules/**"] },
  {
    files: ["src/**/*.{js,jsx}"],
    languageOptions: { ecmaVersion: "latest", sourceType: "module", globals: globals.browser, parserOptions: { ecmaFeatures: { jsx: true } } },
    linterOptions: { reportUnusedDisableDirectives: "off" },
    plugins: { "react-hooks": hooks, react },
    // jsx-no-undef: a component used without being imported. jsx-uses-vars only tells no-undef that JSX uses a name.
    rules: { "react-hooks/rules-of-hooks": "error", "no-undef": "error", "react/jsx-no-undef": "error", "react/jsx-uses-vars": "error" },
  },
];
