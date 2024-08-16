const fs = require('fs');
const path = require('path');
const markdownit = require('markdown-it');
const semver = require('semver');

const md = markdownit({
    html: true
});

const versionsDir = path.join(__dirname, 'resources', 'changelog', 'versions');
const templateFilePath = path.join(__dirname, 'resources', 'changelog', 'template.html');
const outputFilePath = path.join(__dirname, 'resources', 'changelog', 'changelog.html');

function buildHtmlBlock(idx, verName, content) {
    return `
<input type="checkbox" class="collapsible" id="collapsible${idx}">
<label class="label" for="collapsible${idx}">${verName}</label>
<div class="content">
${content}
</div>
<div style="padding:5px"></div>
`;
}
function insertIntoTemplate(releaseContents) {
    let data = fs.readFileSync(templateFilePath, { encoding: 'utf-8' });
    const outputHtml = data + releaseContents;
    fs.writeFileSync(outputFilePath, outputHtml);
    console.log('changelog html file generated:', outputFilePath);
};

let files = fs.readdirSync(versionsDir);
let markdownFiles = files.filter(file => file.endsWith('.md'));
markdownFiles.sort((a, b) => {
    if (a === 'beta.md') {
        return 1;
    } else if (b === 'beta.md') {
        return -1;
    } else {
        return semver.compare(a.replace(".md", ""), b.replace(".md", ""));
    }
});
markdownFiles = markdownFiles.reverse();
console.log(markdownFiles);
let releaseContents = '';
markdownFiles.forEach((filename, idx) => {
    const filePath = path.join(versionsDir, filename);
    const data = fs.readFileSync(filePath, { encoding: 'utf-8' });
    const result = md.render(data);
    if (filename === 'beta.md') {
        releaseContents += buildHtmlBlock(idx, 'Unreleased Beta version', result);
    } else if (filename.match(/^0\.\d+\.\d+\.md$/)) {
        releaseContents += buildHtmlBlock(idx, `Released ${filename.replace('.md', '')}`, result);
    }
});
insertIntoTemplate(releaseContents);

