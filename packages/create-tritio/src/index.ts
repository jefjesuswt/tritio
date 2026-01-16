#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineCommand, runMain } from 'citty';
import { consola } from 'consola';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const VERSION = process.env.CLI_VERSION || '0.0.0';
const NAME = process.env.CLI_NAME || 'create-tritio';

const main = defineCommand({
  meta: {
    name: NAME,
    version: VERSION,
    description: "Scaffold a new Tritio application",
  },
  args: {
    dir: {
      type: "positional",
      description: "Project directory",
      required: false,
    },
    template: {
      type: "string",
      alias: "t",
      description: "Template to use (basic, api, auth)",
    },
    force: {
      type: "boolean",
      alias: "f",
      description: "Overwrite existing directory",
    },
  },
  async run({ args }) {
    consola.box("🚀 Welcome to Tritio");

    let targetDir = args.dir;
    if (!targetDir) {
      targetDir = await consola.prompt("Where should we create your project?", {
        type: "text",
        placeholder: "./my-tritio-app",
        initial: "my-tritio-app",
      });
    }

    const root = path.join(process.cwd(), targetDir);

    if (fs.existsSync(root)) {
      if (fs.readdirSync(root).length > 0 && !args.force) {
        const shouldOverwrite = await consola.prompt(
          `Directory "${targetDir}" is not empty. Overwrite?`,
          { type: "confirm" }
        );

        if (!shouldOverwrite) {
          consola.info("Aborting operation.");
          process.exit(0);
        }
        
        consola.info(`Emptying ${targetDir}...`);
        fs.rmSync(root, { recursive: true, force: true });
        fs.mkdirSync(root, { recursive: true });
      }
    } else {
      fs.mkdirSync(root, { recursive: true });
    }

    let template = args.template;
    if (!template) {
      template = await consola.prompt("Select a template:", {
        type: "select",
        options: [
          { label: "Basic (Recommended)", value: "basic" },
          // { label: "API Rest (Coming soon)", value: "api", hint: "Includes DB setup" },
        ],
      }) as string;
    }

    const templateDir = path.resolve(__dirname, '../templates', template);
    
    if (!fs.existsSync(templateDir)) {
      consola.error(`Template "${template}" not found!`);
      process.exit(1);
    }

    consola.start(`Scaffolding project in ${root}...`);

    const copy = (src: string, dest: string) => {
      const stat = fs.statSync(src);
      if (stat.isDirectory()) {
        fs.mkdirSync(dest, { recursive: true });
        for (const file of fs.readdirSync(src)) {
          copy(path.join(src, file), path.join(dest, file));
        }
      } else {
        fs.copyFileSync(src, dest);
      }
    };

    try {
      copy(templateDir, root);
      
      const gitignorePath = path.join(root, '_gitignore');
      if (fs.existsSync(gitignorePath)) {
        fs.renameSync(gitignorePath, path.join(root, '.gitignore'));
      }
      const pkgPath = path.join(root, 'package.json');
      const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'));
      pkg.name = path.basename(root);
      fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2));

      consola.success("Project created successfully!");
      
      consola.box(`
Next steps:

  cd ${targetDir}
  bun install
  bun dev
      `);

    } catch (error) {
      consola.error("Failed to scaffold project:", error);
      process.exit(1);
    }
  },
});

runMain(main);