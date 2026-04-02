import fs from 'fs';
import path from 'path';

const dirs = [
    'src',
    'server',
    'tests',
    'client/src',
    'client/public',
    'DIELBS_CLOUD_SERVER',
    './' // root files
];

const exts = ['.ts', '.tsx', '.js', '.jsx', '.json', '.html', '.css', '.md', '.txt'];
// Do not touch massive generated files or modules
const skipDirs = ['node_modules', '.git', '.cache', 'dist', 'build', '.gemini', 'attached_assets', 'replit_frontend'];
// Skip package-lock.json to avoid corrupting npm installation trees
const skipFiles = ['package-lock.json', 'rebrand.mjs'];

const replacements = [
    [/WebDollar 2\.0/g, 'DIELBS Engine'],
    [/WebDollar 2 - /g, 'DIELBS Engine - '],
    [/WebDollar 2/g, 'DIELBS Engine'],
    [/WebDollar2/g, 'DIELBS'],
    [/webdollar2_dielbs/g, 'dielbs_state'], // the indexeddb name
    [/webdollar2/g, 'dielbs'], // package name
    [/WebDollar/g, 'DIELBS'],
    [/WEBD2-/g, 'DIELBS-'],
    [/WEBD2/g, 'DIELBS'],
    [/WEBD/g, 'DIEL']
];

function processDir(dir) {
    if (!fs.existsSync(dir)) return;

    // Read only files if we are in root './' to avoid recursion into folders already listed
    let items;
    if (dir === './') {
        items = fs.readdirSync(dir).filter(f => !fs.statSync(path.join(dir, f)).isDirectory());
    } else {
        items = fs.readdirSync(dir);
    }

    for (const item of items) {
        if (skipFiles.includes(item)) continue;

        const fullPath = path.join(dir === './' ? '.' : dir, item);
        let stat;
        try { stat = fs.statSync(fullPath); } catch (e) { continue; }

        if (stat.isDirectory()) {
            if (!skipDirs.includes(item)) {
                processDir(fullPath);
            }
        } else {
            if (exts.includes(path.extname(fullPath)) || fullPath === 'package.json') {
                let content = fs.readFileSync(fullPath, 'utf8');
                let original = content;
                for (const [regex, replacement] of replacements) {
                    content = content.replace(regex, replacement);
                }
                if (content !== original) {
                    fs.writeFileSync(fullPath, content);
                    console.log(`Updated ${fullPath}`);
                }
            }
        }
    }
}

for (const dir of dirs) {
    if (dir !== './') {
        processDir(dir);
    }
}
processDir('./'); // do root last

console.log("Sanitization complete.");
