/**
 * Conventional Commits + gitmoji.
 * Formato del proyecto: `<emoji> <type>(<scope>): <subject>`  (ej. `✨ feat(admin): ...`).
 *
 * Para activar el enforcement local:
 *   npm i -D @commitlint/cli @commitlint/config-conventional husky
 *   npx husky init && echo 'npx --no -- commitlint --edit $1' > .husky/commit-msg
 * (ver CONTRIBUTING.md). Sin esas deps el archivo es solo la especificación de la convención.
 */
module.exports = {
    extends: ["@commitlint/config-conventional"],
    // Acepta el gitmoji opcional al inicio sin romper el parseo de type/scope/subject.
    parserPreset: {
        parserOpts: {
            headerPattern:
                /^(?:[\u{1F000}-\u{1FAFF}☀-➿⬀-⯿←-⇿️‍]+\s+)?(\w+)(?:\(([^)]+)\))?!?: (.+)$/u,
            headerCorrespondence: ["type", "scope", "subject"],
        },
    },
    rules: {
        "type-enum": [
            2,
            "always",
            [
                "feat",
                "fix",
                "docs",
                "style",
                "refactor",
                "perf",
                "test",
                "build",
                "ci",
                "chore",
                "revert",
            ],
        ],
        // El proyecto escribe subjects en español (con mayúsculas/acentos) → no forzar lower-case.
        "subject-case": [0],
        "header-max-length": [2, "always", 100],
    },
};

