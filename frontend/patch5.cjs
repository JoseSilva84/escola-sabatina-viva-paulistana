const fs = require('fs');
let content = fs.readFileSync('src/pages/ProfessorPage.jsx', 'utf8');

// 1. Move the header and the select card inside the Semanais block
const headerAndCardRegex = /<div className="mb-\[2px\]">[\s\S]*?<Card animated delay=\{0\.12\} className="grid grid-cols-1 md:grid-cols-4 gap-3">[\s\S]*?<\/Card>/;
const match = content.match(headerAndCardRegex);

if (match) {
  const headerAndCardCode = match[0];
  content = content.replace(headerAndCardCode, '');
  
  // Insert it after {(!aba || aba === "semanais") && ( \n <> \n
  content = content.replace(
    /\{\(!aba \|\| aba === "semanais"\) && \(\n<>/,
    `{(!aba || aba === "semanais") && (\n<>\n${headerAndCardCode}`
  );
}

// 2. Change "Estudo" to "Estudo Bíblico" in the table header
content = content.replace(
  /<div className="flex flex-col items-center gap-1">\s*Estudo\s*<input/g,
  '<div className="flex flex-col items-center gap-1">\n                        Estudo Bíblico\n                        <input'
);

// 3. Change "Estudo:" to "Estudo Bíblico:" in the legend
content = content.replace(
  /<li><strong>Estudo:<\/strong>/g,
  '<li><strong>Estudo Bíblico:</strong>'
);

fs.writeFileSync('src/pages/ProfessorPage.jsx', content);
