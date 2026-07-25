/**
 * repo-wide rules layered on top of the shared @mgz-dev/codestyle config. these are
 * the proving ground for rules that graduate into a codestyle release once settled
 * (the API audit records that decision); every package config appends this array.
 */

/** true when a comment is machinery, not prose (directives, references, shebangs) */
function isDirective(comment) {
  const v = comment.value.trim();
  return (
    v.startsWith("eslint") ||
    v.startsWith("@ts-") ||
    v.startsWith("/ <reference") ||
    v.startsWith("!") ||
    v.startsWith("#")
  );
}

/** the house comment rules: ascii only, no em-dashes, no decorative separators */
const commentStyle = {
  meta: {
    type: "suggestion",
    docs: { description: "comments are ascii prose: no em-dashes, no decorative separator lines" },
    schema: []
  },
  create(context) {
    const source = context.sourceCode;
    return {
      Program() {
        for (const comment of source.getAllComments()) {
          if (isDirective(comment)) {
            continue;
          }
          const text = comment.value;
          const dash = text.match(/[\u2014\u2013]/);
          if (dash) {
            context.report({
              loc: comment.loc,
              message: "no em-dashes in comments; use a period, a comma, or parentheses."
            });
            continue;
          }
          const nonAscii = text.match(/[^\x00-\x7f]/);
          if (nonAscii) {
            context.report({
              loc: comment.loc,
              message: `non-ascii character "${nonAscii[0]}" in comment; comments are ascii prose.`
            });
            continue;
          }
          const prose = text.replace(/`[^`]*`/g, "");
          if (/(^|\s)--(\s|$)/.test(prose)) {
            context.report({
              loc: comment.loc,
              message: 'no "--" as an em-dash stand-in; use a period, a comma, or parentheses.'
            });
            continue;
          }
          const lines = text.split("\n");
          for (const raw of lines) {
            const line = raw.replace(/^[\s*]+/, "").trim();
            if (line.length >= 4 && /^[-=~_#+*]+$/.test(line)) {
              context.report({
                loc: comment.loc,
                message: "no decorative separator lines in comments; comments are prose."
              });
              break;
            }
          }
        }
      }
    };
  }
};

/** every exported declaration and every class method carries a doc comment */
const requireDoc = {
  meta: {
    type: "suggestion",
    docs: { description: "exported declarations and class methods carry doc comments" },
    schema: []
  },
  create(context) {
    const source = context.sourceCode;

    function hasDoc(node) {
      const comments = source.getCommentsBefore(node);
      const last = comments[comments.length - 1];
      return last !== undefined && last.type === "Block" && last.value.startsWith("*");
    }

    function report(node, what) {
      context.report({ node, message: `${what} needs a doc comment (the house standard is 100% documented code).` });
    }

    return {
      MethodDefinition(node) {
        if (node.kind === "constructor" || node.computed) {
          return;
        }
        // typescript overloads: the doc lives on the first signature of the group
        const body = node.parent.body;
        const index = body.indexOf(node);
        const prev = body[index - 1];
        if (
          prev !== undefined &&
          prev.type === "MethodDefinition" &&
          prev.key.type === "Identifier" &&
          node.key.type === "Identifier" &&
          prev.key.name === node.key.name
        ) {
          return;
        }
        if (!hasDoc(node)) {
          report(node.key, `method ${node.key.name ?? "(computed)"}`);
        }
      },
      ExportNamedDeclaration(node) {
        const decl = node.declaration;
        if (decl === null || decl === undefined) {
          return;
        }
        if (
          decl.type === "TSInterfaceDeclaration" ||
          decl.type === "TSTypeAliasDeclaration" ||
          decl.type === "ClassDeclaration" ||
          decl.type === "FunctionDeclaration" ||
          decl.type === "TSEnumDeclaration" ||
          decl.type === "VariableDeclaration"
        ) {
          if (!hasDoc(node)) {
            const name =
              decl.id?.name ?? decl.declarations?.[0]?.id?.name ?? "declaration";
            report(node, `exported ${name}`);
          }
        }
      }
    };
  }
};

export const repoRules = [
  {
    files: ["**/*.ts", "**/*.tsx"],
    plugins: {
      aether: { rules: { "comment-style": commentStyle, "require-doc": requireDoc } }
    },
    rules: {
      // every class member says what it is; implicit-public reads as an omission.
      // constructors are exempt: `public constructor` is noise by convention.
      "@typescript-eslint/explicit-member-accessibility": [
        "error",
        {
          accessibility: "explicit",
          overrides: { constructors: "no-public" }
        }
      ],
      "aether/comment-style": "error"
    }
  },
  {
    // the documentation standard is a gate over shipping source, not over tests
    files: ["**/src/**/*.ts"],
    ignores: ["**/*.d.ts"],
    rules: {
      "aether/require-doc": "error"
    }
  }
];
