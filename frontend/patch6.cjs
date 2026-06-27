const fs = require('fs');
let content = fs.readFileSync('src/pages/ProfessorPage.jsx', 'utf8');

// 1. Add calcularDataSabado function before export function ProfessorPage()
const funcString = `
function calcularDataSabado(ano, semana) {
  const data = new Date(ano, 0, 1, 12, 0, 0);
  const diaSemana = data.getDay();
  const diasParaPrimeiroSabado = (6 - diaSemana + 7) % 7;
  data.setDate(data.getDate() + diasParaPrimeiroSabado + (semana - 1) * 7);
  
  const d = String(data.getDate()).padStart(2, '0');
  const m = String(data.getMonth() + 1).padStart(2, '0');
  const y = data.getFullYear();
  return \`\${d}/\${m}/\${y}\`;
}

export function`;

content = content.replace('export function', funcString);

// 2. Replace the Observação table header
const obsHeaderRegex = /<th className="px-3 py-3 text-left text-muted text-xs border-b border-borda font-semibold">Observação<\/th>/;
const newObsHeader = `<th className="px-3 py-3 text-left text-muted text-xs border-b border-borda font-semibold">
                      <div className="flex flex-col items-start gap-1">
                        <span>Observação ({calcularDataSabado(ano, semana)})</span>
                        <input type="checkbox" className="invisible" />
                      </div>
                    </th>`;

// Wait, the file might have encoded characters like Observaǜo if not read perfectly or if we replaced with literal 'Observação' earlier. 
// Let's use a regex that matches any 'Observa' to be safe.
const safeObsRegex = /<th className="px-3 py-3 text-left text-muted text-xs border-b border-borda font-semibold">Observa[^<]*<\/th>/;
content = content.replace(safeObsRegex, newObsHeader);

fs.writeFileSync('src/pages/ProfessorPage.jsx', content);
