const fs = require('fs');
let content = fs.readFileSync('src/pages/ProfessorPage.jsx', 'utf8');

// Add useParams
content = content.replace(
  'import { Link } from "react-router-dom";',
  'import { Link, useParams } from "react-router-dom";'
);

// Add const { aba } = useParams();
content = content.replace(
  'export function ProfessorPage() {\n',
  'export function ProfessorPage() {\n  const { aba } = useParams();\n'
);

// Wrap METAS SEMANAIS
content = content.replace(
  '{/* METAS SEMANAIS */}',
  '{(!aba || aba === "semanais") && (\n<>\n{/* METAS SEMANAIS */}'
);

content = content.replace(
  '{/* METAS TRIMESTRAIS */}',
  '</>\n)}\n\n{(aba === "trimestrais") && (\n<>\n{/* METAS TRIMESTRAIS */}'
);

// Close METAS TRIMESTRAIS at the end before modals
const modalAcaoAlunoRegex = /\{modalAcaoAluno &&/g;
content = content.replace(
  modalAcaoAlunoRegex,
  '</>\n)}\n\n        {modalAcaoAluno &&'
);

fs.writeFileSync('src/pages/ProfessorPage.jsx', content);
