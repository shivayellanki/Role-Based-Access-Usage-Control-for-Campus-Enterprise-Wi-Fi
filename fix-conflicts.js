const fs = require('fs');

const filesToFix = [
    'frontend/index.html',
    'frontend/eslint.config.js',
    'frontend/package.json',
    'frontend/postcss.config.js',
    'frontend/tailwind.config.js',
    'frontend/src/index.css',
    'backend/package.json'
];

for (const file of filesToFix) {
    try {
        let content = fs.readFileSync(file, 'utf8');
        const lines = content.split(/\r?\n/);
        const newLines = [];

        let inKeepBlock = false;
        let inDiscardBlock = false;

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            if (line.startsWith('<<<<<<< HEAD')) {
                inKeepBlock = true;
                continue;
            } else if (line.startsWith('=======')) {
                inKeepBlock = false;
                inDiscardBlock = true;
                continue;
            } else if (line.startsWith('>>>>>>>')) {
                inDiscardBlock = false;
                continue;
            }

            if (!inDiscardBlock) {
                newLines.push(line);
            }
        }

        fs.writeFileSync(file, newLines.join('\n'), 'utf8');
        console.log(`Fixed ${file}`);
    } catch (err) {
        console.error(`Error fixing ${file}: ${err.message}`);
    }
}
