import { useState } from "react";

// ─── DADOS ────────────────────────────────────────────────────────────────────
const DB_EMPREGADOS = [
  { matricula: "324308", nome: "CASSIO DUARTE OLIVEIRA", cpf: "635.491.585-72", endereco: "Rua João Gustavo da Silva 82, Suzana, Cruz das Almas - BA", banco: "756 - 41987 - 00000048950", unidade: "CNPMF", tipo: "Empregado" },
  { matricula: "302856", nome: "FRANCISCO FERRAZ LARANJEIRA BARBOSA", cpf: "123.456.789-00", endereco: "Rua das Flores 10, Cruz das Almas - BA", banco: "001 - 12345 - 00000012345", unidade: "CNPMF", tipo: "Empregado" },
  { matricula: "315422", nome: "ANA PAULA SOUZA FERREIRA", cpf: "987.654.321-00", endereco: "Av. Central 500, Campina Grande - PB", banco: "033 - 98765 - 00000098765", unidade: "CNPA", tipo: "Empregado" },
  { matricula: "298771", nome: "MARCOS ANTONIO LIMA NETO", cpf: "111.222.333-44", endereco: "Rua do Campo 22, Recife - PE", banco: "237 - 55555 - 00000055555", unidade: "CPATSA", tipo: "Colaborador" },
  { matricula: "COL001", nome: "ROBERTO ALVES TEIXEIRA", cpf: "222.333.444-55", endereco: "Av. das Palmeiras 100, Feira de Santana - BA", banco: "—", unidade: "CNPMF", tipo: "Colaborador" },
  { matricula: "COL002", nome: "JULIANA MOTA PEREIRA", cpf: "333.444.555-66", endereco: "Rua Nova 45, Salvador - BA", banco: "—", unidade: "CNPMF", tipo: "Colaborador" },
];

const DB_VEICULOS = [
  { id: "V001", tipo: "Van", modelo: "Sprinter 415 CDI", placa: "QRS-4521", capacidade: 12, status: "Disponível" },
  { id: "V002", tipo: "Micro-ônibus", modelo: "Volare W8", placa: "PQR-7832", capacidade: 28, status: "Disponível" },
  { id: "V003", tipo: "SUV", modelo: "Toyota Hilux SW4", placa: "MNO-2210", capacidade: 7, status: "Em uso" },
  { id: "V004", tipo: "Sedan", modelo: "Toyota Corolla", placa: "JKL-5547", capacidade: 4, status: "Disponível" },
  { id: "V005", tipo: "Van", modelo: "Ducato Multijet", placa: "GHI-9901", capacidade: 15, status: "Disponível" },
];

const DB_MOTORISTAS = [
  { id: "M001", nome: "ANTÔNIO CARLOS SILVA", matricula: "400123", cnh: "12345678901" },
  { id: "M002", nome: "JOSÉ BEZERRA DOS SANTOS", matricula: "400456", cnh: "98765432100" },
  { id: "M003", nome: "LUIZ HENRIQUE MOURA", matricula: "400789", cnh: "11122233344" },
];

const UNIDADE_GESTORA = "CNPMF";
const UNIDADE_COMPLETA = "Centro Nacional de Pesquisa de Mandioca e Fruticultura Tropical";
const CHEFE = "Francisco Ferraz Laranjeira Barbosa";

const OPCOES_ONUS = [
  "Ônus Embrapa",
  "Sem Ônus Embrapa / Projetos Externos",
  "Sem Ônus Embrapa / Patrocinador",
];

// Capitais = R$ 160,00 | Interior = R$ 128,00
const DB_LOCALIDADES = [
  // Capitais estaduais
  {nome:"Aracaju / SE",      diaria:160.00, tipo:"Capital"},
  {nome:"Belém / PA",        diaria:160.00, tipo:"Capital"},
  {nome:"Belo Horizonte / MG",diaria:160.00,tipo:"Capital"},
  {nome:"Boa Vista / RR",    diaria:160.00, tipo:"Capital"},
  {nome:"Brasília / DF",     diaria:160.00, tipo:"Capital"},
  {nome:"Campo Grande / MS", diaria:160.00, tipo:"Capital"},
  {nome:"Cuiabá / MT",       diaria:160.00, tipo:"Capital"},
  {nome:"Curitiba / PR",     diaria:160.00, tipo:"Capital"},
  {nome:"Florianópolis / SC",diaria:160.00, tipo:"Capital"},
  {nome:"Fortaleza / CE",    diaria:160.00, tipo:"Capital"},
  {nome:"Goiânia / GO",      diaria:160.00, tipo:"Capital"},
  {nome:"João Pessoa / PB",  diaria:160.00, tipo:"Capital"},
  {nome:"Macapá / AP",       diaria:160.00, tipo:"Capital"},
  {nome:"Maceió / AL",       diaria:160.00, tipo:"Capital"},
  {nome:"Manaus / AM",       diaria:160.00, tipo:"Capital"},
  {nome:"Natal / RN",        diaria:160.00, tipo:"Capital"},
  {nome:"Palmas / TO",       diaria:160.00, tipo:"Capital"},
  {nome:"Porto Alegre / RS", diaria:160.00, tipo:"Capital"},
  {nome:"Porto Velho / RO",  diaria:160.00, tipo:"Capital"},
  {nome:"Recife / PE",       diaria:160.00, tipo:"Capital"},
  {nome:"Rio Branco / AC",   diaria:160.00, tipo:"Capital"},
  {nome:"Rio de Janeiro / RJ",diaria:160.00,tipo:"Capital"},
  {nome:"Salvador / BA",     diaria:160.00, tipo:"Capital"},
  {nome:"São Luís / MA",     diaria:160.00, tipo:"Capital"},
  {nome:"São Paulo / SP",    diaria:160.00, tipo:"Capital"},
  {nome:"Teresina / PI",     diaria:160.00, tipo:"Capital"},
  {nome:"Vitória / ES",      diaria:160.00, tipo:"Capital"},
  // Interior
  {nome:"Campinas / SP",       diaria:128.00, tipo:"Interior"},
  {nome:"Campina Grande / PB", diaria:128.00, tipo:"Interior"},
  {nome:"Cruz das Almas / BA", diaria:128.00, tipo:"Interior"},
  {nome:"Feira de Santana / BA",diaria:128.00,tipo:"Interior"},
  {nome:"Ilhéus / BA",         diaria:128.00, tipo:"Interior"},
  {nome:"Imperatriz / MA",     diaria:128.00, tipo:"Interior"},
  {nome:"Juazeiro / BA",       diaria:128.00, tipo:"Interior"},
  {nome:"Juiz de Fora / MG",   diaria:128.00, tipo:"Interior"},
  {nome:"Londrina / PR",       diaria:128.00, tipo:"Interior"},
  {nome:"Pelotas / RS",        diaria:128.00, tipo:"Interior"},
  {nome:"Petrolina / PE",      diaria:128.00, tipo:"Interior"},
  {nome:"Ribeirão Preto / SP", diaria:128.00, tipo:"Interior"},
  {nome:"Santo Antônio de Goiás / GO",diaria:128.00,tipo:"Interior"},
  {nome:"Sete Lagoas / MG",    diaria:128.00, tipo:"Interior"},
  {nome:"Sobral / CE",         diaria:128.00, tipo:"Interior"},
  {nome:"Uberlândia / MG",     diaria:128.00, tipo:"Interior"},
];

const DB_ATIVIDADES = [
  {codigo:"02.16.01.012.00.00",nome:"Pesquisa em Fruticultura Tropical"},
  {codigo:"02.16.02.005.00.00",nome:"Melhoramento Genético de Mandioca"},
  {codigo:"02.16.03.018.00.00",nome:"Manejo de Pragas e Doenças"},
  {codigo:"03.11.01.033.00.00",nome:"Transferência de Tecnologia"},
  {codigo:"03.11.02.007.00.00",nome:"Capacitação de Produtores Rurais"},
  {codigo:"04.02.01.008.00.00",nome:"Gestão Administrativa"},
  {codigo:"05.01.03.011.00.00",nome:"Cooperação Internacional"},
];


const MEIOS = ["Aéreo","Aero/Rodoviário","Fluvial","Fluvial/Rodoviário","Rodoviário","Veículo da Empresa","Veículo Próprio"];
const OBJETIVOS = ["Apresentar trabalho científico","Atividade de cooperação internacional","Missão técnica no exterior","Participar de congresso/evento científico","Participar de reunião técnica","Participar de treinamento/capacitação","Reunião de gestores","Visita técnica a unidade Embrapa","Outro"];
const NATUREZAS = ["Hospedagem","Aluguel de veículo","Combustível","Inscrição em evento","Táxi/Transporte","Outros"];
const AEROPORTOS = [
  {c:"BEL",n:"Belém – Val de Cans"},{c:"BSB",n:"Brasília – Pres. JK"},{c:"CGH",n:"São Paulo – Congonhas"},
  {c:"CWB",n:"Curitiba – Afonso Pena"},{c:"FOR",n:"Fortaleza – Pinto Martins"},{c:"GIG",n:"Rio – Galeão"},
  {c:"GRU",n:"São Paulo – Guarulhos"},{c:"MAO",n:"Manaus – Eduardo Gomes"},{c:"REC",n:"Recife – Guararapes"},
  {c:"SDU",n:"Rio – Santos Dumont"},{c:"SSA",n:"Salvador – Dep. L. E. Magalhães"},{c:"VCP",n:"Campinas – Viracopos"},
];
const CIAS = ["AZUL","GOL","LATAM","AIR FRANCE","AMERICAN","TAP"];

const SVS_INICIAIS = [
  {numero:"SAV-2025-00255",favorecido:"Francisco Ferraz Laranjeira Barbosa",tipo:"Nacional",vinculo:"Empregado",onus:"Ônus Embrapa",destino:"Brasília / DF",periodo:"06/05/2025 → 10/05/2025",inicio:"2025-05-06",fim:"2025-05-10",dias:4,diarias:640.00,situacao:"Aprovado",missaoId:null},
  {numero:"SAV-2025-00312",favorecido:"Ana Paula Souza Ferreira",tipo:"Nacional",vinculo:"Empregado",onus:"Ônus Embrapa",destino:"São Paulo / SP",periodo:"10/06/2025 → 14/06/2025",inicio:"2025-06-10",fim:"2025-06-14",dias:4,diarias:640.00,situacao:"Aguardando",missaoId:null},
  {numero:"SAV-2025-00298",favorecido:"Marcos Antonio Lima Neto",tipo:"Nacional",vinculo:"Colaborador",onus:"Sem Ônus Embrapa / Projetos Externos",destino:"Recife / PE",periodo:"25/05/2025 → 27/05/2025",inicio:"2025-05-25",fim:"2025-05-27",dias:2,diarias:320.00,situacao:"Rascunho",missaoId:null},
  {numero:"SAV-2025-00187",favorecido:"Carla Mendes Rodrigues",tipo:"Nacional",vinculo:"Empregado",onus:"Ônus Embrapa",destino:"Salvador / BA",periodo:"01/07/2025 → 07/07/2025",inicio:"2025-07-01",fim:"2025-07-07",dias:6,diarias:960.00,situacao:"Em Análise",missaoId:null},
  {numero:"SAV-2026-00041",favorecido:"CASSIO DUARTE OLIVEIRA",tipo:"Nacional",vinculo:"Empregado",onus:"Ônus Embrapa",destino:"Brasília / DF",periodo:"15/03/2026 → 18/03/2026",inicio:"2026-03-15",fim:"2026-03-18",dias:3,diarias:480.00,situacao:"Aprovado",missaoId:"MSS-2026-00001"},
  {numero:"SAV-2026-00042",favorecido:"FRANCISCO FERRAZ LARANJEIRA BARBOSA",tipo:"Nacional",vinculo:"Empregado",onus:"Ônus Embrapa",destino:"Brasília / DF",periodo:"15/03/2026 → 18/03/2026",inicio:"2026-03-15",fim:"2026-03-18",dias:3,diarias:480.00,situacao:"Aprovado",missaoId:"MSS-2026-00001"},
  {numero:"SAV-2026-00043",favorecido:"ANA PAULA SOUZA FERREIRA",tipo:"Nacional",vinculo:"Empregado",onus:"Ônus Embrapa",destino:"Brasília / DF",periodo:"15/03/2026 → 18/03/2026",inicio:"2026-03-15",fim:"2026-03-18",dias:3,diarias:480.00,situacao:"Aguardando",missaoId:"MSS-2026-00001"},
];

const MISSOES_INICIAIS = [
  {
    id:"MSS-2026-00001",
    nome:"Reunião de Gestores — Brasília",
    destino:"Brasília / DF",
    inicio:"2026-03-15",
    fim:"2026-03-18",
    veiculo:"V001",
    motorista:"M001",
    savIds:["SAV-2026-00041","SAV-2026-00042","SAV-2026-00043"],
    situacao:"Em andamento",
    obs:"Reunião anual de gestores das unidades descentralizadas.",
  },
];

// ─── CSS GLOBAL ───────────────────────────────────────────────────────────────
const globalCSS = `
  @import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@300;400;500;600;700&family=IBM+Plex+Mono:wght@400;500&display=swap');
  *{box-sizing:border-box;margin:0;padding:0;}
  body{font-family:'IBM Plex Sans',sans-serif;background:#f4f6f9;color:#1a2332;}
  input,select,textarea,button{font-family:'IBM Plex Sans',sans-serif;}
  ::-webkit-scrollbar{width:6px;height:6px;}
  ::-webkit-scrollbar-track{background:#f0f0f0;}
  ::-webkit-scrollbar-thumb{background:#b0bec5;border-radius:3px;}

  .inp{width:100%;border:1.5px solid #dce3eb;border-radius:6px;padding:7px 10px;font-size:13px;color:#1a2332;background:#fff;transition:border-color .2s;outline:none;}
  .inp:focus{border-color:#1a6b3a;box-shadow:0 0 0 3px rgba(26,107,58,.08);}
  .sel{width:100%;border:1.5px solid #dce3eb;border-radius:6px;padding:7px 10px;font-size:13px;color:#1a2332;background:#fff;outline:none;cursor:pointer;}
  .sel:focus{border-color:#1a6b3a;box-shadow:0 0 0 3px rgba(26,107,58,.08);}
  .ta{width:100%;border:1.5px solid #dce3eb;border-radius:6px;padding:7px 10px;font-size:13px;color:#1a2332;background:#fff;outline:none;resize:vertical;min-height:64px;}
  .ta:focus{border-color:#1a6b3a;}

  .pill-group{display:flex;flex-wrap:wrap;gap:8px;}
  .pill{display:inline-flex;align-items:center;gap:6px;padding:7px 16px;border:1.5px solid #dce3eb;border-radius:20px;font-size:13px;cursor:pointer;background:#fff;color:#4a5568;transition:all .15s;user-select:none;}
  .pill:hover{border-color:#1a6b3a;color:#1a6b3a;background:#f0faf4;}
  .pill.active{border-color:#1a6b3a;background:#1a6b3a;color:#fff;font-weight:600;}

  .card-section{background:#fff;border-radius:12px;box-shadow:0 1px 4px rgba(0,0,0,.06);margin-bottom:20px;overflow:hidden;}
  .section-head{display:flex;align-items:center;gap:10px;padding:14px 20px;border-bottom:1px solid #eef1f5;}
  .section-icon{width:32px;height:32px;border-radius:8px;display:flex;align-items:center;justify-content:center;font-size:15px;flex-shrink:0;}
  .section-title{font-size:14px;font-weight:600;color:#1a2332;}
  .section-body{padding:20px;}

  .field-grid{display:grid;gap:16px;}
  .fg2{grid-template-columns:1fr 1fr;}
  .fg3{grid-template-columns:1fr 1fr 1fr;}
  .fg4{grid-template-columns:1fr 1fr 1fr 1fr;}

  .field-label{font-size:11px;font-weight:700;color:#6b7a8d;text-transform:uppercase;letter-spacing:.05em;margin-bottom:6px;}
  .req{color:#e53935;}
  .field-value{font-size:13px;color:#1a2332;padding:8px 12px;background:#f8fafc;border-radius:6px;border:1.5px solid #eef1f5;min-height:36px;display:flex;align-items:center;}

  .badge{display:inline-flex;align-items:center;padding:3px 10px;border-radius:12px;font-size:11px;font-weight:600;letter-spacing:.03em;white-space:nowrap;}
  .bg{background:#e8f5e9;color:#2e7d32;}
  .by{background:#fff8e1;color:#f57f17;}
  .bb{background:#e3f2fd;color:#1565c0;}
  .bgr{background:#f5f5f5;color:#616161;}
  .bo{background:#fff3e0;color:#e65100;}
  .bp{background:#f3e5f5;color:#6a1b9a;}
  .br{background:#fce4ec;color:#c62828;}

  .table-modern{width:100%;border-collapse:collapse;font-size:13px;color:#1a2332;}
  .table-modern th{background:#f0f4f8;padding:10px 14px;text-align:left;font-size:11px;font-weight:800;color:#1a2332;text-transform:uppercase;letter-spacing:.06em;border-bottom:2px solid #dce3eb;white-space:nowrap;}
  .table-modern td{padding:10px 14px;border-bottom:1px solid #f0f2f5;vertical-align:middle;color:#1a2332;}
  .table-modern tr:hover td{background:#fafbfc;}
  .table-modern input{border:1.5px solid #dce3eb;border-radius:6px;padding:6px 9px;font-size:13px;color:#1a2332;width:100%;background:#fff;outline:none;}
  .table-modern input:focus{border-color:#1a6b3a;box-shadow:0 0 0 3px rgba(26,107,58,.08);}
  .table-modern select{border:1.5px solid #dce3eb;border-radius:6px;padding:6px 9px;font-size:13px;color:#1a2332;width:100%;background:#fff;outline:none;cursor:pointer;}
  .table-modern select:focus{border-color:#1a6b3a;box-shadow:0 0 0 3px rgba(26,107,58,.08);}
  .table-modern textarea{border:1.5px solid #dce3eb;border-radius:6px;padding:6px 9px;font-size:13px;color:#1a2332;width:100%;background:#fff;resize:vertical;min-height:38px;outline:none;}
  .table-modern textarea:focus{border-color:#1a6b3a;}

  .btn-primary{background:#1a6b3a;color:#fff;border:none;border-radius:8px;padding:10px 24px;font-size:13px;font-weight:600;cursor:pointer;transition:all .2s;display:inline-flex;align-items:center;gap:8px;}
  .btn-primary:hover{background:#155c30;box-shadow:0 4px 12px rgba(26,107,58,.3);transform:translateY(-1px);}
  .btn-secondary{background:#fff;color:#1a2332;border:1.5px solid #dce3eb;border-radius:8px;padding:10px 20px;font-size:13px;font-weight:500;cursor:pointer;transition:all .2s;}
  .btn-outline{background:#fff;color:#1a6b3a;border:1.5px solid #1a6b3a;border-radius:8px;padding:10px 20px;font-size:13px;font-weight:600;cursor:pointer;transition:all .2s;}
  .btn-outline:hover{background:#f0faf4;}
  .btn-secondary:hover{border-color:#1a6b3a;color:#1a6b3a;}
  .btn-outline{background:transparent;color:#1a6b3a;border:1.5px solid #1a6b3a;border-radius:8px;padding:8px 18px;font-size:13px;font-weight:500;cursor:pointer;transition:all .2s;}
  .btn-outline:hover{background:#f0faf4;}
  .btn-danger{background:#fff;color:#c62828;border:1.5px solid #ef9a9a;border-radius:8px;padding:8px 16px;font-size:13px;font-weight:500;cursor:pointer;transition:all .2s;}
  .btn-danger:hover{background:#fce4ec;border-color:#c62828;}

  .total-box{background:linear-gradient(135deg,#1a6b3a,#2d9e58);color:#fff;border-radius:10px;padding:16px 22px;display:flex;justify-content:space-between;align-items:center;}
  .sv-link{color:#1a6b3a;font-weight:600;cursor:pointer;font-family:'IBM Plex Mono',monospace;font-size:12px;}
  .mss-link{color:#5c35b5;font-weight:600;cursor:pointer;font-family:'IBM Plex Mono',monospace;font-size:12px;}

  .modal-overlay{position:fixed;inset:0;background:rgba(0,0,0,.45);z-index:999;display:flex;align-items:center;justify-content:center;}
  .modal-box{background:#fff;border-radius:14px;width:580px;max-width:95vw;max-height:85vh;display:flex;flex-direction:column;box-shadow:0 20px 60px rgba(0,0,0,.2);}
  .modal-box-lg{background:#fff;border-radius:14px;width:820px;max-width:97vw;max-height:90vh;display:flex;flex-direction:column;box-shadow:0 20px 60px rgba(0,0,0,.2);}
  .modal-head{padding:18px 22px;border-bottom:1px solid #eef1f5;display:flex;align-items:center;justify-content:space-between;flex-shrink:0;}
  .modal-body{padding:18px 22px;overflow-y:auto;flex:1;}
  .modal-foot{padding:14px 22px;border-top:1px solid #eef1f5;display:flex;gap:10px;justify-content:flex-end;flex-shrink:0;}
  .modal-close{background:none;border:none;font-size:20px;cursor:pointer;color:#8d9db0;line-height:1;padding:4px;border-radius:6px;}
  .modal-close:hover{background:#f5f5f5;color:#1a2332;}

  .result-item{padding:12px 14px;border-radius:8px;cursor:pointer;border:1.5px solid transparent;transition:all .15s;margin-bottom:6px;}
  .result-item:hover{background:#f0faf4;border-color:#1a6b3a;}
  .result-name{font-size:13px;font-weight:600;color:#1a2332;}
  .result-meta{font-size:12px;color:#8d9db0;margin-top:2px;}

  .favorecido-chip{display:flex;align-items:center;gap:12px;padding:10px 14px;background:#f0faf4;border:1.5px solid #1a6b3a;border-radius:10px;}

  /* Missão card */
  .missao-card{background:#fff;border-radius:12px;border:1.5px solid #eef1f5;padding:20px;margin-bottom:14px;transition:all .2s;cursor:pointer;}
  .missao-card:hover{border-color:#1a6b3a;box-shadow:0 4px 16px rgba(26,107,58,.1);}
  .missao-header{display:flex;align-items:flex-start;justify-content:space-between;margin-bottom:14px;}
  .missao-id{font-family:'IBM Plex Mono',monospace;font-size:11px;color:#8d9db0;margin-bottom:4px;}
  .missao-nome{font-size:15px;font-weight:700;color:#1a2332;}

  /* Passageiro row na missão */
  .passageiro-row{display:flex;align-items:center;gap:12px;padding:10px 12px;border-radius:8px;border:1px solid #eef1f5;margin-bottom:6px;background:#fafbfc;}
  .pass-avatar{width:32px;height:32px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-weight:700;font-size:11px;flex-shrink:0;color:#fff;}

  /* Progress bar */
  .progress-bar{height:6px;background:#eef1f5;border-radius:3px;overflow:hidden;margin-top:10px;}
  .progress-fill{height:100%;border-radius:3px;transition:width .4s;}

  /* Veiculo card */
  .veiculo-card{border:1.5px solid #dce3eb;border-radius:10px;padding:14px 16px;cursor:pointer;transition:all .15s;}
  .veiculo-card:hover{border-color:#1a6b3a;background:#f0faf4;}
  .veiculo-card.selected{border-color:#1a6b3a;background:#f0faf4;box-shadow:0 0 0 3px rgba(26,107,58,.1);}
  .veiculo-card.unavailable{opacity:.5;cursor:not-allowed;border-color:#e0e0e0;}

  /* SAV checkbox na seleção */
  .sav-select-item{display:flex;align-items:center;gap:12px;padding:12px 14px;border-radius:8px;border:1.5px solid #dce3eb;margin-bottom:8px;cursor:pointer;transition:all .15s;}
  .sav-select-item:hover{border-color:#5c35b5;background:#f5f0ff;}
  .sav-select-item.checked{border-color:#5c35b5;background:#f5f0ff;}
  .sav-select-item.already-grouped{opacity:.5;cursor:not-allowed;background:#f5f5f5;}
`;

// ─── HELPERS ──────────────────────────────────────────────────────────────────
const iniciais = nome => (nome||"").split(" ").filter(Boolean).slice(0,2).map(n=>n[0]).join("");
const avatarColor = (nome) => {
  const colors = ["#1a6b3a","#1565c0","#6a1b9a","#e65100","#c62828","#00695c","#f57c00"];
  let h = 0; for(let c of (nome||"")) h = c.charCodeAt(0) + ((h<<5)-h);
  return colors[Math.abs(h) % colors.length];
};

const getSavBadge = s => {
  if(s==="Aprovado") return <span className="badge bg">● Aprovado</span>;
  if(s==="Aguardando") return <span className="badge by">● Aguardando</span>;
  if(s==="Rascunho") return <span className="badge bgr">● Rascunho</span>;
  if(s==="Em Análise") return <span className="badge bb">● Em Análise</span>;
  if(s==="Encaminhado") return <span className="badge bo">● Encaminhado</span>;
  return <span className="badge bgr">● {s}</span>;
};

const getMissaoBadge = s => {
  if(s==="Concluída") return <span className="badge bg">✓ Concluída</span>;
  if(s==="Em andamento") return <span className="badge bb">● Em andamento</span>;
  if(s==="Aguardando aprovações") return <span className="badge by">⏳ Aguardando aprovações</span>;
  if(s==="Planejada") return <span className="badge bgr">◌ Planejada</span>;
  return <span className="badge bgr">{s}</span>;
};

// ─── MODAL BUSCA FAVORECIDO ───────────────────────────────────────────────────
function ModalBusca({ tipoFavorecido, onSelecionar, onFechar }) {
  const [busca, setBusca] = useState("");
  const resultados = DB_EMPREGADOS.filter(e => {
    const q = busca.toLowerCase();
    const matchTipo = tipoFavorecido==="Colaborador Brasileiro"||tipoFavorecido==="Colaborador Estrangeiro"
      ? e.tipo==="Colaborador" : e.tipo==="Empregado";
    if(!busca) return matchTipo;
    return matchTipo && (e.nome.toLowerCase().includes(q)||e.cpf.includes(q)||e.matricula.includes(q));
  });
  return (
    <div className="modal-overlay" onClick={onFechar}>
      <div className="modal-box" onClick={e=>e.stopPropagation()}>
        <div className="modal-head">
          <div>
            <div style={{fontSize:15,fontWeight:700,color:"#1a2332"}}>Buscar Favorecido</div>
            <div style={{fontSize:12,color:"#8d9db0",marginTop:2}}>{tipoFavorecido}</div>
          </div>
          <button className="modal-close" onClick={onFechar}>✕</button>
        </div>
        <div className="modal-body">
          <input className="inp" style={{marginBottom:14}} placeholder="Buscar por nome, CPF ou matrícula..." value={busca} onChange={e=>setBusca(e.target.value)} autoFocus />
          {resultados.length===0
            ? <div style={{textAlign:"center",padding:"20px 0",color:"#8d9db0",fontSize:13}}>Nenhum resultado encontrado.</div>
            : resultados.map(emp=>(
              <div key={emp.matricula} className="result-item" onClick={()=>onSelecionar(emp)}>
                <div style={{display:"flex",alignItems:"center",gap:12}}>
                  <div style={{width:36,height:36,borderRadius:50,background:avatarColor(emp.nome),color:"#fff",display:"flex",alignItems:"center",justifyContent:"center",fontWeight:700,fontSize:12,flexShrink:0}}>{iniciais(emp.nome)}</div>
                  <div>
                    <div className="result-name">{emp.nome}</div>
                    <div className="result-meta"><span className={`badge ${emp.tipo==="Empregado"?"bb":"bo"}`} style={{marginRight:6}}>{emp.tipo}</span>Matrícula: {emp.matricula} · CPF: {emp.cpf}</div>
                  </div>
                </div>
              </div>
            ))
          }
        </div>
      </div>
    </div>
  );
}

// ─── LAYOUT ───────────────────────────────────────────────────────────────────
function Layout({ children, pagina, onNavegar }) {
  const nav = [
    {id:"dashboard",icon:"⊞",label:"Painel"},
    {id:"solicitacoes",icon:"✈",label:"Solicitações"},
    {id:"nova",icon:"+",label:"Nova Solicitação"},
    {id:"missoes",icon:"🚐",label:"Missões"},
    {id:"aprovacoes",icon:"✓",label:"Aprovações"},
    {id:"prestacao",icon:"₿",label:"Prestação de Contas"},
    {id:"relatorios",icon:"≡",label:"Relatórios"},
  ];
  return (
    <div style={{display:"flex",minHeight:"100vh"}}>
      <style>{globalCSS}</style>
      <div style={{width:224,background:"#0d1b2a",color:"#fff",display:"flex",flexDirection:"column",position:"fixed",top:0,left:0,height:"100vh",zIndex:100}}>
        <div style={{padding:"24px 20px",borderBottom:"1px solid rgba(255,255,255,.08)"}}>
          <div style={{display:"flex",alignItems:"center",gap:10}}>
            <div style={{width:34,height:34,background:"#1a6b3a",borderRadius:8,display:"flex",alignItems:"center",justifyContent:"center",fontWeight:800,fontSize:14,color:"#fff"}}>E</div>
            <div>
              <div style={{fontWeight:700,fontSize:14}}>SAV</div>
              <div style={{fontSize:10,color:"rgba(255,255,255,.4)",textTransform:"uppercase",letterSpacing:".05em"}}>Embrapa · Viagens</div>
            </div>
          </div>
        </div>
        <nav style={{flex:1,padding:"16px 12px",display:"flex",flexDirection:"column",gap:2}}>
          {nav.map(n=>(
            <button key={n.id} onClick={()=>onNavegar(n.id)} style={{display:"flex",alignItems:"center",gap:12,padding:"10px 12px",borderRadius:8,border:"none",background:pagina===n.id?"#1a6b3a":"transparent",color:pagina===n.id?"#fff":"rgba(255,255,255,.55)",cursor:"pointer",fontSize:13,fontWeight:pagina===n.id?600:400,transition:"all .15s",textAlign:"left",width:"100%"}}>
              <span style={{width:20,textAlign:"center",fontSize:14}}>{n.icon}</span>
              {n.label}
              {n.id==="aprovacoes"&&<span style={{marginLeft:"auto",background:"#e53935",color:"#fff",borderRadius:10,padding:"1px 7px",fontSize:10,fontWeight:700}}>2</span>}
            </button>
          ))}
        </nav>
        <div style={{padding:"16px 20px",borderTop:"1px solid rgba(255,255,255,.08)"}}>
          <div style={{display:"flex",alignItems:"center",gap:10}}>
            <div style={{width:32,height:32,background:"#1a6b3a",borderRadius:50,display:"flex",alignItems:"center",justifyContent:"center",fontWeight:700,fontSize:12,color:"#fff",flexShrink:0}}>CD</div>
            <div style={{overflow:"hidden"}}>
              <div style={{fontSize:12,fontWeight:600,color:"rgba(255,255,255,.9)",whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>Cassio Duarte</div>
              <div style={{fontSize:10,color:"rgba(255,255,255,.4)"}}>Empregado · CNPMF</div>
            </div>
          </div>
        </div>
      </div>
      <div style={{marginLeft:224,flex:1,background:"#f4f6f9",minHeight:"100vh"}}>{children}</div>
    </div>
  );
}

// ─── DASHBOARD ────────────────────────────────────────────────────────────────
function Dashboard({ svs, missoes, onNavegar }) {
  const hoje = new Date().toLocaleDateString("pt-BR",{weekday:"long",year:"numeric",month:"long",day:"numeric"});
  const cards = [
    {label:"Total de Solicitações",valor:svs.length,icon:"✈",cor:"#1a6b3a",sub:"Todas as viagens"},
    {label:"Aguardando Aprovação",valor:svs.filter(s=>s.situacao==="Aguardando"||s.situacao==="Em Análise").length,icon:"⏳",cor:"#f57c00",sub:"Requerem atenção"},
    {label:"Missões Ativas",valor:missoes.filter(m=>m.situacao==="Em andamento"||m.situacao==="Planejada").length,icon:"🚐",cor:"#5c35b5",sub:"Viagens agrupadas"},
    {label:"Total Diárias",valor:"R$ "+svs.reduce((s,v)=>s+(v.diarias||0),0).toLocaleString("pt-BR",{minimumFractionDigits:2}),icon:"₿",cor:"#1565c0",sub:"Valor total"},
  ];
  return (
    <div style={{padding:"32px 36px"}}>
      <div style={{marginBottom:28}}>
        <h1 style={{fontSize:26,fontWeight:700,color:"#1a2332",marginBottom:4}}>Painel</h1>
        <p style={{color:"#8d9db0",fontSize:14}}>Visão geral — {hoje}</p>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:18,marginBottom:28}}>
        {cards.map((c,i)=>(
          <div key={i} style={{background:"#fff",borderRadius:12,padding:"20px 22px",boxShadow:"0 1px 4px rgba(0,0,0,.06)",borderTop:`3px solid ${c.cor}`}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
              <div>
                <div style={{fontSize:12,color:"#8d9db0",marginBottom:8,fontWeight:500}}>{c.label}</div>
                <div style={{fontSize:26,fontWeight:700,color:"#1a2332"}}>{c.valor}</div>
                <div style={{fontSize:11,color:"#aab5c0",marginTop:4}}>{c.sub}</div>
              </div>
              <div style={{width:42,height:42,background:`${c.cor}18`,borderRadius:10,display:"flex",alignItems:"center",justifyContent:"center",fontSize:18}}>{c.icon}</div>
            </div>
          </div>
        ))}
      </div>
      {/* Missões recentes */}
      <div className="card-section" style={{marginBottom:20}}>
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"16px 24px",borderBottom:"1px solid #eef1f5"}}>
          <h2 style={{fontSize:15,fontWeight:600,color:"#1a2332"}}>🚐 Missões em Andamento</h2>
          <button className="btn-outline" onClick={()=>onNavegar("missoes")}>Ver todas →</button>
        </div>
        <div style={{padding:"16px 24px"}}>
          {missoes.filter(m=>m.situacao==="Em andamento").slice(0,2).map(m=>{
            const veiculo = DB_VEICULOS.find(v=>v.id===m.veiculo);
            const aprovados = m.savIds.filter(id=>svs.find(s=>s.numero===id&&s.situacao==="Aprovado")).length;
            const pct = m.savIds.length ? Math.round((aprovados/m.savIds.length)*100) : 0;
            return (
              <div key={m.id} style={{padding:"14px 0",borderBottom:"1px solid #eef1f5"}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
                  <div>
                    <div style={{fontSize:11,color:"#8d9db0",fontFamily:"IBM Plex Mono,monospace",marginBottom:2}}>{m.id}</div>
                    <div style={{fontWeight:600,fontSize:14,color:"#1a2332"}}>{m.nome}</div>
                    <div style={{fontSize:12,color:"#6b7a8d",marginTop:3}}>📍 {m.destino} · 📅 {m.inicio} → {m.fim}</div>
                    {veiculo && <div style={{fontSize:12,color:"#6b7a8d",marginTop:2}}>🚐 {veiculo.modelo} · {veiculo.placa}</div>}
                  </div>
                  <div style={{textAlign:"right"}}>
                    {getMissaoBadge(m.situacao)}
                    <div style={{fontSize:12,color:"#6b7a8d",marginTop:6}}>{aprovados}/{m.savIds.length} aprovados</div>
                  </div>
                </div>
                <div className="progress-bar" style={{marginTop:10}}>
                  <div className="progress-fill" style={{width:`${pct}%`,background:pct===100?"#1a6b3a":"#f57c00"}} />
                </div>
              </div>
            );
          })}
          {missoes.filter(m=>m.situacao==="Em andamento").length===0 && (
            <div style={{textAlign:"center",padding:"20px 0",color:"#8d9db0",fontSize:13}}>Nenhuma missão em andamento.</div>
          )}
        </div>
      </div>
      {/* SAVs recentes */}
      <div className="card-section">
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"16px 24px",borderBottom:"1px solid #eef1f5"}}>
          <h2 style={{fontSize:15,fontWeight:600,color:"#1a2332"}}>Solicitações Recentes</h2>
          <button className="btn-outline" onClick={()=>onNavegar("solicitacoes")}>Ver todas →</button>
        </div>
        <div style={{overflowX:"auto"}}>
          <table className="table-modern">
            <thead><tr><th>Nº SV</th><th>Solicitante</th><th>Destino</th><th>Período</th><th>Vínculo</th><th>Diárias</th><th>Missão</th><th>Status</th></tr></thead>
            <tbody>
              {svs.slice(0,6).map((s,i)=>(
                <tr key={i}>
                  <td><span className="sv-link">{s.numero}</span></td>
                  <td style={{fontWeight:500,fontSize:12}}>{s.favorecido}</td>
                  <td style={{color:"#4a5568",fontSize:12}}>{s.destino}</td>
                  <td style={{color:"#4a5568",fontSize:12}}>{s.periodo}</td>
                  <td><span className={`badge ${s.vinculo==="Empregado"?"bb":"bo"}`}>{s.vinculo}</span></td>
                  <td style={{fontWeight:600,color:"#1a6b3a"}}>R$ {(s.diarias||0).toLocaleString("pt-BR",{minimumFractionDigits:2})}</td>
                  <td>{s.missaoId?<span className="mss-link">{s.missaoId}</span>:<span style={{color:"#c0c0c0",fontSize:12}}>—</span>}</td>
                  <td>{getSavBadge(s.situacao)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ─── MÓDULO MISSÕES ───────────────────────────────────────────────────────────
function MissoesPage({ missoes, svs, onCriarMissao, onVerMissao }) {
  return (
    <div style={{padding:"32px 36px"}}>
      <div style={{marginBottom:24,display:"flex",alignItems:"center",justifyContent:"space-between"}}>
        <div>
          <h1 style={{fontSize:22,fontWeight:700,color:"#1a2332",marginBottom:4}}>Missões</h1>
          <p style={{color:"#8d9db0",fontSize:14}}>Agrupamento de viagens com mesmo destino e período</p>
        </div>
        <button className="btn-primary" onClick={onCriarMissao}>+ Nova Missão</button>
      </div>

      {missoes.length === 0 ? (
        <div style={{textAlign:"center",padding:"60px 20px",background:"#fff",borderRadius:12,border:"1.5px dashed #dce3eb"}}>
          <div style={{fontSize:48,marginBottom:12}}>🚐</div>
          <div style={{fontWeight:600,fontSize:16,color:"#1a2332",marginBottom:8}}>Nenhuma missão cadastrada</div>
          <div style={{color:"#8d9db0",fontSize:13,marginBottom:20}}>Crie uma missão para agrupar solicitações de viagem com mesmo destino.</div>
          <button className="btn-primary" onClick={onCriarMissao}>+ Criar primeira missão</button>
        </div>
      ) : (
        <div>
          {missoes.map(m => {
            const veiculo = DB_VEICULOS.find(v=>v.id===m.veiculo);
            const motorista = DB_MOTORISTAS.find(mo=>mo.id===m.motorista);
            const savsDaMissao = m.savIds.map(id=>svs.find(s=>s.numero===id)).filter(Boolean);
            const aprovados = savsDaMissao.filter(s=>s.situacao==="Aprovado").length;
            const total = savsDaMissao.length;
            const pct = total ? Math.round((aprovados/total)*100) : 0;
            const bloqueado = pct < 100;
            return (
              <div key={m.id} className="missao-card" onClick={()=>onVerMissao(m)}>
                <div className="missao-header">
                  <div>
                    <div className="missao-id">{m.id}</div>
                    <div className="missao-nome">{m.nome}</div>
                    <div style={{fontSize:13,color:"#6b7a8d",marginTop:4,display:"flex",gap:16,flexWrap:"wrap"}}>
                      <span>📍 {m.destino}</span>
                      <span>📅 {m.inicio} → {m.fim}</span>
                      {veiculo && <span>🚐 {veiculo.modelo} · {veiculo.placa}</span>}
                      {motorista && <span>👤 {motorista.nome.split(" ").slice(0,2).join(" ")}</span>}
                    </div>
                  </div>
                  <div style={{textAlign:"right",flexShrink:0,marginLeft:20}}>
                    {getMissaoBadge(m.situacao)}
                    <div style={{marginTop:8}}>
                      {bloqueado
                        ? <span style={{fontSize:11,color:"#e65100",fontWeight:600,background:"#fff3e0",padding:"3px 8px",borderRadius:6}}>🔒 Veículo bloqueado</span>
                        : <span style={{fontSize:11,color:"#2e7d32",fontWeight:600,background:"#e8f5e9",padding:"3px 8px",borderRadius:6}}>🔓 Veículo liberado</span>
                      }
                    </div>
                  </div>
                </div>
                {/* Passageiros resumidos */}
                <div style={{display:"flex",gap:6,marginBottom:12,flexWrap:"wrap"}}>
                  {savsDaMissao.map((s,i)=>(
                    <div key={i} style={{display:"flex",alignItems:"center",gap:6,padding:"4px 10px",borderRadius:20,background:s.situacao==="Aprovado"?"#e8f5e9":"#fff8e1",border:`1px solid ${s.situacao==="Aprovado"?"#a5d6a7":"#ffe082"}`}}>
                      <div style={{width:20,height:20,borderRadius:50,background:avatarColor(s.favorecido),color:"#fff",display:"flex",alignItems:"center",justifyContent:"center",fontSize:9,fontWeight:700,flexShrink:0}}>{iniciais(s.favorecido)}</div>
                      <span style={{fontSize:11,fontWeight:500,color:"#1a2332"}}>{s.favorecido.split(" ").slice(0,2).join(" ")}</span>
                      <span style={{fontSize:10}}>{s.situacao==="Aprovado"?"✓":"⏳"}</span>
                    </div>
                  ))}
                </div>
                {/* Progress */}
                <div style={{display:"flex",alignItems:"center",gap:12}}>
                  <div className="progress-bar" style={{flex:1,margin:0}}>
                    <div className="progress-fill" style={{width:`${pct}%`,background:pct===100?"#1a6b3a":"#f57c00"}} />
                  </div>
                  <span style={{fontSize:12,color:"#6b7a8d",whiteSpace:"nowrap"}}>{aprovados}/{total} aprovados ({pct}%)</span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── DETALHE DA MISSÃO ────────────────────────────────────────────────────────
function ModalDetalheMissao({ missao, svs, onFechar, onAdicionarSav }) {
  const veiculo = DB_VEICULOS.find(v=>v.id===missao.veiculo);
  const motorista = DB_MOTORISTAS.find(m=>m.id===missao.motorista);
  const savsDaMissao = missao.savIds.map(id=>svs.find(s=>s.numero===id)).filter(Boolean);
  const aprovados = savsDaMissao.filter(s=>s.situacao==="Aprovado").length;
  const total = savsDaMissao.length;
  const pct = total ? Math.round((aprovados/total)*100) : 0;
  const bloqueado = pct < 100;
  const totalDiarias = savsDaMissao.reduce((s,sv)=>s+(sv.diarias||0),0);

  return (
    <div className="modal-overlay" onClick={onFechar}>
      <div className="modal-box-lg" onClick={e=>e.stopPropagation()}>
        <div className="modal-head">
          <div>
            <div style={{fontSize:11,color:"#8d9db0",fontFamily:"IBM Plex Mono,monospace",marginBottom:2}}>{missao.id}</div>
            <div style={{fontSize:16,fontWeight:700,color:"#1a2332"}}>{missao.nome}</div>
          </div>
          <div style={{display:"flex",gap:8,alignItems:"center"}}>
            {getMissaoBadge(missao.situacao)}
            <button className="modal-close" onClick={onFechar}>✕</button>
          </div>
        </div>
        <div className="modal-body">
          {/* Info geral */}
          <div className="field-grid fg4" style={{gap:14,marginBottom:20}}>
            <div><div className="field-label">Destino</div><div className="field-value">📍 {missao.destino}</div></div>
            <div><div className="field-label">Período</div><div className="field-value">📅 {missao.inicio} → {missao.fim}</div></div>
            <div><div className="field-label">Veículo</div><div className="field-value">{veiculo?`🚐 ${veiculo.modelo}`:"—"}</div></div>
            <div><div className="field-label">Motorista</div><div className="field-value">{motorista?`👤 ${motorista.nome.split(" ").slice(0,2).join(" ")}`:"—"}</div></div>
          </div>

          {/* Status do veículo */}
          <div style={{padding:"14px 16px",borderRadius:10,background:bloqueado?"#fff3e0":"#e8f5e9",border:`1.5px solid ${bloqueado?"#ffcc02":"#a5d6a7"}`,marginBottom:20,display:"flex",alignItems:"center",justifyContent:"space-between"}}>
            <div>
              <div style={{fontWeight:700,fontSize:14,color:bloqueado?"#e65100":"#2e7d32"}}>
                {bloqueado?"🔒 Veículo bloqueado":"🔓 Veículo liberado para uso"}
              </div>
              <div style={{fontSize:12,color:"#6b7a8d",marginTop:3}}>
                {bloqueado
                  ? `Aguardando aprovação de ${total-aprovados} solicitação(ões) para liberar o veículo.`
                  : "Todas as solicitações foram aprovadas. Veículo disponível para uso."}
              </div>
            </div>
            <div style={{textAlign:"right"}}>
              <div style={{fontSize:22,fontWeight:700,color:bloqueado?"#e65100":"#2e7d32"}}>{pct}%</div>
              <div style={{fontSize:11,color:"#8d9db0"}}>{aprovados}/{total} aprovados</div>
            </div>
          </div>
          <div className="progress-bar" style={{marginBottom:20,height:8}}>
            <div className="progress-fill" style={{width:`${pct}%`,background:pct===100?"#1a6b3a":"#f57c00"}} />
          </div>

          {/* Lista de passageiros */}
          <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:12}}>
            <div style={{fontWeight:600,fontSize:14,color:"#1a2332"}}>Passageiros ({total})</div>
            <button className="btn-outline" style={{padding:"6px 14px",fontSize:12}} onClick={onAdicionarSav}>+ Adicionar SAV</button>
          </div>
          {savsDaMissao.map((s,i)=>(
            <div key={i} className="passageiro-row">
              <div className="pass-avatar" style={{background:avatarColor(s.favorecido)}}>{iniciais(s.favorecido)}</div>
              <div style={{flex:1}}>
                <div style={{fontWeight:600,fontSize:13,color:"#1a2332"}}>{s.favorecido}</div>
                <div style={{fontSize:11,color:"#8d9db0",marginTop:1}}>
                  <span className="sv-link">{s.numero}</span>
                  <span style={{margin:"0 8px"}}>·</span>
                  <span className={`badge ${s.vinculo==="Empregado"?"bb":"bo"}`}>{s.vinculo}</span>
                  <span style={{margin:"0 8px"}}>·</span>
                  R$ {(s.diarias||0).toLocaleString("pt-BR",{minimumFractionDigits:2})}
                </div>
              </div>
              {getSavBadge(s.situacao)}
            </div>
          ))}

          {/* Total */}
          <div className="total-box" style={{marginTop:16}}>
            <div>
              <div style={{fontSize:11,opacity:.7,textTransform:"uppercase",letterSpacing:".05em",marginBottom:4}}>Total de Diárias da Missão</div>
              <div style={{fontSize:22,fontWeight:700,fontFamily:"IBM Plex Mono,monospace"}}>R$ {totalDiarias.toLocaleString("pt-BR",{minimumFractionDigits:2})}</div>
            </div>
            <div style={{textAlign:"right",opacity:.8,fontSize:12}}>
              <div>{total} solicitações agrupadas</div>
              <div style={{marginTop:4}}>{veiculo && `Capacidade: ${veiculo.capacidade} passageiros`}</div>
            </div>
          </div>

          {missao.obs && (
            <div style={{marginTop:14,padding:"12px 14px",background:"#f8fafc",borderRadius:8,border:"1px solid #eef1f5",fontSize:13,color:"#4a5568"}}>
              <span style={{fontWeight:600,color:"#6b7a8d",fontSize:11,textTransform:"uppercase",letterSpacing:".05em"}}>Observações: </span>
              {missao.obs}
            </div>
          )}
        </div>
        <div className="modal-foot">
          <button className="btn-secondary" onClick={onFechar}>Fechar</button>
        </div>
      </div>
    </div>
  );
}

// ─── CRIAR MISSÃO ─────────────────────────────────────────────────────────────
function CriarMissao({ svs, onSalvar, onVoltar }) {
  const [etapa, setEtapa] = useState(1);
  const [form, setForm] = useState({nome:"",destino:"",inicio:"",fim:"",veiculo:"",motorista:"",obs:""});
  const [savsSelecionados, setSavsSelecionados] = useState([]);
  const f = k => e => setForm(p=>({...p,[k]:e.target.value}));

  // filtra SAVs compatíveis com o período/destino selecionado
  const savCompatíveis = svs.filter(s =>
    !s.missaoId &&
    s.situacao !== "Rascunho" &&
    (!form.destino || s.destino === form.destino) &&
    (!form.inicio || s.inicio <= form.fim) &&
    (!form.fim || s.fim >= form.inicio)
  );

  const toggleSav = (numero) => {
    setSavsSelecionados(prev =>
      prev.includes(numero) ? prev.filter(n=>n!==numero) : [...prev, numero]
    );
  };

  const veiculoSel = DB_VEICULOS.find(v=>v.id===form.veiculo);

  const salvar = () => {
    if (!form.nome || !form.destino || !form.inicio || !form.fim) {
      alert("Preencha os campos obrigatórios."); return;
    }
    if (savsSelecionados.length === 0) {
      alert("Selecione ao menos uma solicitação para agrupar."); return;
    }
    const id = `MSS-${new Date().getFullYear()}-${String(Math.floor(Math.random()*90000)+10000)}`;
    const aprovados = savsSelecionados.filter(n=>svs.find(s=>s.numero===n&&s.situacao==="Aprovado")).length;
    const situacao = aprovados === savsSelecionados.length ? "Em andamento" : "Aguardando aprovações";
    onSalvar({id, ...form, savIds: savsSelecionados, situacao});
  };

  return (
    <div style={{padding:"28px 36px"}}>
      <div style={{marginBottom:24,display:"flex",alignItems:"center",gap:16}}>
        <button className="btn-secondary" onClick={onVoltar} style={{padding:"8px 16px"}}>← Voltar</button>
        <div>
          <h1 style={{fontSize:22,fontWeight:700,color:"#1a2332",marginBottom:2}}>Nova Missão</h1>
          <p style={{color:"#8d9db0",fontSize:13}}>Agrupe solicitações de viagem com mesmo destino e período</p>
        </div>
      </div>

      {/* Abas */}
      <div style={{display:"flex",gap:0,marginBottom:24,background:"#fff",borderRadius:10,padding:4,boxShadow:"0 1px 4px rgba(0,0,0,.06)",width:"fit-content"}}>
        {[{n:1,label:"1 · Dados da missão"},{n:2,label:"2 · Veículo e motorista"},{n:3,label:"3 · Selecionar SAVs"}].map(a=>(
          <button key={a.n} onClick={()=>setEtapa(a.n)} style={{padding:"8px 20px",borderRadius:8,border:"none",background:etapa===a.n?"#1a6b3a":"transparent",color:etapa===a.n?"#fff":"#6b7a8d",fontWeight:etapa===a.n?600:400,fontSize:13,cursor:"pointer",transition:"all .15s"}}>
            {a.label}
          </button>
        ))}
      </div>

      {/* ABA 1 — Dados */}
      {etapa===1 && (
        <div className="card-section">
          <div className="section-head">
            <div className="section-icon" style={{background:"#f3e5f5"}}>🗂</div>
            <div className="section-title">Dados da Missão</div>
          </div>
          <div className="section-body">
            <div className="field-grid" style={{gap:18}}>
              <div>
                <div className="field-label">Nome da missão <span className="req">*</span></div>
                <input className="inp" value={form.nome} onChange={f("nome")} placeholder='Ex: Workshop Mandioca — Brasília Março 2026' />
              </div>
              <div className="field-grid fg2" style={{gap:16}}>
                <div>
                  <div className="field-label">Destino <span className="req">*</span></div>
                  <select className="sel" value={form.destino} onChange={f("destino")}>
                    <option value="">-- Selecione --</option>
                    {DB_LOCALIDADES.map(l=><option key={l.nome}>{l.nome}</option>)}
                  </select>
                </div>
                <div>
                  <div className="field-label">Período <span className="req">*</span></div>
                  <div style={{display:"flex",gap:8,alignItems:"center"}}>
                    <input type="date" className="inp" value={form.inicio} onChange={f("inicio")} />
                    <span style={{color:"#8d9db0",flexShrink:0}}>→</span>
                    <input type="date" className="inp" value={form.fim} onChange={f("fim")} />
                  </div>
                </div>
              </div>
              <div>
                <div className="field-label">Observações</div>
                <textarea className="ta" value={form.obs} onChange={f("obs")} placeholder="Descreva o objetivo da missão..." style={{minHeight:60}} />
              </div>
            </div>
            <div style={{display:"flex",justifyContent:"flex-end",marginTop:20}}>
              <button className="btn-primary" onClick={()=>setEtapa(2)}>Próximo →</button>
            </div>
          </div>
        </div>
      )}

      {/* ABA 2 — Veículo */}
      {etapa===2 && (
        <div>
          <div className="card-section">
            <div className="section-head">
              <div className="section-icon" style={{background:"#e3f2fd"}}>🚐</div>
              <div className="section-title">Selecione o Veículo</div>
            </div>
            <div className="section-body">
              <div className="field-grid fg3" style={{gap:14}}>
                {DB_VEICULOS.map(v=>(
                  <div key={v.id} className={`veiculo-card${form.veiculo===v.id?" selected":""}${v.status==="Em uso"?" unavailable":""}`}
                    onClick={()=>v.status!=="Em uso"&&setForm(p=>({...p,veiculo:v.id}))}>
                    <div style={{fontSize:24,marginBottom:8}}>🚐</div>
                    <div style={{fontWeight:600,fontSize:13,color:"#1a2332"}}>{v.modelo}</div>
                    <div style={{fontSize:12,color:"#6b7a8d",marginTop:2}}>{v.tipo} · {v.placa}</div>
                    <div style={{fontSize:12,color:"#6b7a8d"}}>👥 Capacidade: {v.capacidade}</div>
                    <div style={{marginTop:8}}>
                      <span className={`badge ${v.status==="Disponível"?"bg":"br"}`}>{v.status}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <div className="card-section">
            <div className="section-head">
              <div className="section-icon" style={{background:"#e8f5e9"}}>👤</div>
              <div className="section-title">Selecione o Motorista</div>
            </div>
            <div className="section-body">
              <div className="field-grid fg3" style={{gap:14}}>
                {DB_MOTORISTAS.map(m=>(
                  <div key={m.id} className={`veiculo-card${form.motorista===m.id?" selected":""}`}
                    onClick={()=>setForm(p=>({...p,motorista:m.id}))}>
                    <div style={{width:44,height:44,borderRadius:50,background:avatarColor(m.nome),color:"#fff",display:"flex",alignItems:"center",justifyContent:"center",fontWeight:700,fontSize:16,marginBottom:8}}>{iniciais(m.nome)}</div>
                    <div style={{fontWeight:600,fontSize:13,color:"#1a2332"}}>{m.nome.split(" ").slice(0,3).join(" ")}</div>
                    <div style={{fontSize:12,color:"#6b7a8d",marginTop:2}}>Mat: {m.matricula}</div>
                    <div style={{fontSize:12,color:"#6b7a8d"}}>CNH: {m.cnh}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <div style={{display:"flex",gap:12,justifyContent:"flex-end"}}>
            <button className="btn-secondary" onClick={()=>setEtapa(1)}>← Voltar</button>
            <button className="btn-primary" onClick={()=>setEtapa(3)}>Próximo →</button>
          </div>
        </div>
      )}

      {/* ABA 3 — SAVs */}
      {etapa===3 && (
        <div>
          <div className="card-section">
            <div className="section-head">
              <div className="section-icon" style={{background:"#e8f5e9"}}>✈</div>
              <div className="section-title">Selecionar Solicitações</div>
            </div>
            <div className="section-body">
              {form.destino && (
                <div style={{padding:"10px 14px",background:"#f0faf4",border:"1px solid #a5d6a7",borderRadius:8,marginBottom:16,fontSize:13,color:"#2e7d32"}}>
                  ✓ Exibindo SAVs compatíveis com <strong>{form.destino}</strong> no período <strong>{form.inicio} → {form.fim}</strong>
                </div>
              )}
              {savCompatíveis.length === 0 ? (
                <div style={{textAlign:"center",padding:"30px 0",color:"#8d9db0",fontSize:13}}>
                  Nenhuma solicitação compatível encontrada para o destino e período selecionados.
                </div>
              ) : (
                savCompatíveis.map(s=>(
                  <div key={s.numero} className={`sav-select-item${savsSelecionados.includes(s.numero)?" checked":""}`}
                    onClick={()=>toggleSav(s.numero)}>
                    <input type="checkbox" checked={savsSelecionados.includes(s.numero)} onChange={()=>toggleSav(s.numero)} style={{width:16,height:16,accentColor:"#5c35b5",flexShrink:0}} />
                    <div style={{width:36,height:36,borderRadius:50,background:avatarColor(s.favorecido),color:"#fff",display:"flex",alignItems:"center",justifyContent:"center",fontWeight:700,fontSize:12,flexShrink:0}}>{iniciais(s.favorecido)}</div>
                    <div style={{flex:1}}>
                      <div style={{display:"flex",alignItems:"center",gap:8}}>
                        <span style={{fontWeight:600,fontSize:13,color:"#1a2332"}}>{s.favorecido}</span>
                        <span className={`badge ${s.vinculo==="Empregado"?"bb":"bo"}`}>{s.vinculo}</span>
                      </div>
                      <div style={{fontSize:12,color:"#8d9db0",marginTop:2}}>
                        <span className="sv-link">{s.numero}</span>
                        <span style={{margin:"0 6px"}}>·</span>
                        {s.destino}
                        <span style={{margin:"0 6px"}}>·</span>
                        {s.periodo}
                      </div>
                    </div>
                    <div style={{textAlign:"right",flexShrink:0}}>
                      {getSavBadge(s.situacao)}
                      <div style={{fontSize:12,fontWeight:600,color:"#1a6b3a",marginTop:4}}>R$ {(s.diarias||0).toLocaleString("pt-BR",{minimumFractionDigits:2})}</div>
                    </div>
                  </div>
                ))
              )}
              {savsSelecionados.length > 0 && (
                <div style={{marginTop:16,padding:"12px 16px",background:"#f5f0ff",border:"1px solid #ce93d8",borderRadius:8,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                  <span style={{fontSize:13,fontWeight:600,color:"#6a1b9a"}}>{savsSelecionados.length} solicitação(ões) selecionada(s)</span>
                  <span style={{fontSize:13,fontWeight:700,color:"#6a1b9a"}}>
                    Total: R$ {svs.filter(s=>savsSelecionados.includes(s.numero)).reduce((t,s)=>t+(s.diarias||0),0).toLocaleString("pt-BR",{minimumFractionDigits:2})}
                  </span>
                </div>
              )}
            </div>
          </div>
          <div style={{display:"flex",gap:12,justifyContent:"flex-end",paddingBottom:36}}>
            <button className="btn-secondary" onClick={()=>setEtapa(2)}>← Voltar</button>
            <button className="btn-primary" onClick={salvar}>✓ Criar Missão</button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── NOVA SOLICITAÇÃO — PASSO 1 ───────────────────────────────────────────────
function Passo1({ onConfirmar }) {
  const [onus, setOnus] = useState("");
  const [tipoFavorecido, setTipoFavorecido] = useState("");
  const [emp, setEmp] = useState(null);
  const [modalAberto, setModalAberto] = useState(false);
  const [erro, setErro] = useState("");

  const abrirModal = (tipo) => { setTipoFavorecido(tipo); setEmp(null); setModalAberto(true); };

  const confirmar = () => {
    if (!onus) { setErro("Selecione o tipo de ônus."); return; }
    if (!tipoFavorecido) { setErro("Selecione o tipo de favorecido."); return; }
    if (!emp) { setErro("Busque e selecione o favorecido."); return; }
    setErro(""); onConfirmar({onus,tipoFavorecido,emp});
  };

  return (
    <div style={{padding:"32px 36px",maxWidth:720}}>
      {modalAberto && <ModalBusca tipoFavorecido={tipoFavorecido} onSelecionar={e=>{setEmp(e);setModalAberto(false);}} onFechar={()=>setModalAberto(false)} />}
      <div style={{marginBottom:24}}>
        <h1 style={{fontSize:22,fontWeight:700,color:"#1a2332",marginBottom:4}}>Nova Solicitação</h1>
        <p style={{color:"#8d9db0",fontSize:14}}>Passo 1 de 2 — Viagem Nacional · Unidade: {UNIDADE_GESTORA}</p>
      </div>
      <div className="card-section">
        <div className="section-head"><div className="section-icon" style={{background:"#e8f5e9"}}>💰</div><div className="section-title">Ônus da Viagem</div></div>
        <div className="section-body">
          <div className="field-label">Tipo de ônus <span className="req">*</span></div>
          <div className="pill-group" style={{marginTop:8}}>
            {OPCOES_ONUS.map(o=>(
              <div key={o} className={`pill${onus===o?" active":""}`} onClick={()=>setOnus(o)}>{o}</div>
            ))}
          </div>
        </div>
      </div>
      <div className="card-section">
        <div className="section-head"><div className="section-icon" style={{background:"#e3f2fd"}}>👤</div><div className="section-title">Favorecido</div></div>
        <div className="section-body">
          <div className="field-label" style={{marginBottom:10}}>Tipo de favorecido <span className="req">*</span></div>
          <div className="pill-group" style={{marginBottom:20}}>
            {["Empregado","Colaborador Brasileiro","Colaborador Estrangeiro"].map(t=>(
              <div key={t} className={`pill${tipoFavorecido===t?" active":""}`} onClick={()=>abrirModal(t)}>🔍 {t}</div>
            ))}
          </div>
          {emp ? (
            <div className="favorecido-chip">
              <div style={{width:38,height:38,borderRadius:50,background:avatarColor(emp.nome),color:"#fff",display:"flex",alignItems:"center",justifyContent:"center",fontWeight:700,fontSize:13,flexShrink:0}}>{iniciais(emp.nome)}</div>
              <div style={{flex:1}}>
                <div style={{fontWeight:600,fontSize:13,color:"#1a2332"}}>{emp.nome}</div>
                <div style={{fontSize:12,color:"#6b7a8d",marginTop:2}}>Matrícula: {emp.matricula} · CPF: {emp.cpf}</div>
              </div>
              <span className={`badge ${emp.tipo==="Empregado"?"bb":"bo"}`}>{emp.tipo}</span>
              <button onClick={()=>abrirModal(tipoFavorecido)} style={{background:"none",border:"none",cursor:"pointer",color:"#1a6b3a",fontSize:12,fontWeight:600,padding:"4px 8px",borderRadius:6}}>Trocar</button>
            </div>
          ) : tipoFavorecido ? (
            <div style={{padding:"16px",background:"#f8fafc",border:"1.5px dashed #dce3eb",borderRadius:10,textAlign:"center",cursor:"pointer",color:"#8d9db0",fontSize:13}} onClick={()=>setModalAberto(true)}>
              🔍 Clique aqui para buscar o favorecido
            </div>
          ) : (
            <div style={{padding:"14px",background:"#f8fafc",border:"1.5px dashed #dce3eb",borderRadius:10,textAlign:"center",color:"#b0bec5",fontSize:13}}>
              Selecione o tipo de favorecido acima para abrir a busca
            </div>
          )}
        </div>
      </div>
      {erro && <div style={{color:"#e53935",fontSize:13,padding:"10px 14px",background:"#fef2f2",borderRadius:8,border:"1px solid #fecaca",marginBottom:16}}>⚠ {erro}</div>}
      <div style={{display:"flex",justifyContent:"flex-end"}}>
        <button className="btn-primary" onClick={confirmar}>Continuar →</button>
      </div>
    </div>
  );
}

// ─── NOVA SOLICITAÇÃO — PASSO 2 ───────────────────────────────────────────────
function Passo2({ selecao, onSalvar, onVoltar }) {
  const {emp,onus,tipoFavorecido} = selecao;
  const [form,setForm] = useState({meio:"Aéreo",inicio:"",fim:"",roteiro:"",descricao:"",obs:"",motoristaSlt:false,objetivo:"",unid_exec:UNIDADE_GESTORA,atividade_cod:"",atividade_nome:"",diarias:[{localidade:"",di:"",df:"",qtd:"",vb:"",fator:"1",total:"",just:"",tipo:""},{localidade:"",di:"",df:"",qtd:"",vb:"",fator:"1",total:"",just:"",tipo:""}],adiant:[{natureza:"",valor:"",just:""},{natureza:"",valor:"",just:""}],passagens:[{orig:"",dest:"",data:"",cia:"",voo:"",obs:""},{orig:"",dest:"",data:"",cia:"",voo:"",obs:""}],vl_rt:""});
  const f=k=>e=>setForm(p=>({...p,[k]:e.target.value}));
  const upD=(i,k,v)=>{
    const d=form.diarias.map((row,ri)=>ri===i?{...row,[k]:v}:row);
    if(k==="localidade"){const l=DB_LOCALIDADES.find(x=>x.nome===v);if(l){d[i].vb=l.diaria.toFixed(2);d[i].tipo=l.tipo;}}
    const di=k==="di"?v:d[i].di;
    const df=k==="df"?v:d[i].df;
    if((k==="di"||k==="df")&&di&&df){
      const dtI=new Date(di+"T00:00:00");
      const dtF=new Date(df+"T00:00:00");
      if(!isNaN(dtI)&&!isNaN(dtF)&&dtF>dtI){
        const dias=Math.round((dtF-dtI)/(1000*60*60*24));
        d[i]={...d[i],qtd:String(dias+0.5),qtdAuto:true};
      }
    }
    if(k==="qtd") d[i]={...d[i],qtdAuto:false};
    const qtd=parseFloat(d[i].qtd||"0")||0;
    const vb=parseFloat(d[i].vb||"0")||0;
    const fat=parseFloat(d[i].fator)||1;
    d[i]={...d[i],total:(qtd*vb*fat).toFixed(2)};
    setForm(p=>({...p,diarias:d}));
  };
  const upA=(i,k,v)=>{const a=form.adiant.map((row,ri)=>ri===i?{...row,[k]:v}:row);setForm(p=>({...p,adiant:a}));};
  const upP=(i,k,v)=>{const p=[...form.passagens];p[i][k]=v;setForm(p2=>({...p2,passagens:p}));};
  const selAtiv=e=>{const at=DB_ATIVIDADES.find(a=>a.codigo===e.target.value);setForm(p=>({...p,atividade_cod:e.target.value,atividade_nome:at?at.nome:""}));};
  const totD=form.diarias.reduce((s,d)=>s+(parseFloat(d.total)||0),0);
  const totA=form.adiant.reduce((s,a)=>s+(parseFloat(String(a.valor).replace(/\./g,"").replace(",","."))||0),0);
  const totRT=parseFloat(form.vl_rt||0)||0;
  const totG=totD+totA+totRT;
  const mostraPassagens=form.meio==="Aéreo"||form.meio==="Aero/Rodoviário";
  const gravar=situacao=>{if(situacao==="Encaminhado"&&(!form.inicio||!form.fim||!form.roteiro||!form.descricao)){alert("Preencha os campos obrigatórios.");return;}const n=`SAV-${new Date().getFullYear()}-${String(Math.floor(Math.random()*90000)+10000)}`;onSalvar({...form,numero:n,situacao,emp,selecao,diariasTotal:totG,destino:form.diarias[0]?.localidade||"—",inicio:form.inicio,fim:form.fim,periodo:`${form.inicio} → ${form.fim}`,vinculo:emp.tipo,onus,missaoId:null});};
  const SH=({icon,title,cor})=>(<div className="section-head"><div className="section-icon" style={{background:cor+"20"}}>{icon}</div><div className="section-title">{title}</div></div>);
  return (
    <div style={{padding:"28px 36px"}}>
      <div style={{marginBottom:20,display:"flex",alignItems:"center",gap:16}}>
        <button className="btn-secondary" onClick={onVoltar} style={{padding:"8px 16px"}}>← Voltar</button>
        <div><h1 style={{fontSize:22,fontWeight:700,color:"#1a2332",marginBottom:2}}>Nova Solicitação</h1><p style={{color:"#8d9db0",fontSize:13}}>Passo 2 de 2 · Viagem Nacional · {onus}</p></div>
      </div>
      <div className="card-section"><SH icon="👤" title="Favorecido" cor="#1a6b3a" /><div className="section-body"><div style={{display:"flex",alignItems:"center",gap:16,marginBottom:14}}><div style={{width:44,height:44,borderRadius:50,background:avatarColor(emp.nome),color:"#fff",display:"flex",alignItems:"center",justifyContent:"center",fontWeight:700,fontSize:15,flexShrink:0}}>{iniciais(emp.nome)}</div><div style={{flex:1}}><div style={{fontWeight:600,fontSize:14,color:"#1a2332"}}>{emp.nome}</div><div style={{fontSize:12,color:"#6b7a8d",marginTop:2}}>Matrícula: {emp.matricula} · CPF: {emp.cpf}</div></div><span className={`badge ${emp.tipo==="Empregado"?"bb":"bo"}`} style={{fontSize:12,padding:"5px 14px"}}>{emp.tipo}</span></div><div className="field-grid fg3" style={{gap:14}}><div><div className="field-label">Endereço</div><div className="field-value" style={{fontSize:12}}>{emp.endereco}</div></div><div><div className="field-label">Dados Bancários</div><div className="field-value" style={{fontSize:12}}>{emp.banco}</div></div><div><div className="field-label">Tipo de Favorecido</div><div className="field-value">{tipoFavorecido}</div></div></div></div></div>
      <div className="card-section"><SH icon="🏛" title="Ordenador da Despesa" cor="#1565c0" /><div className="section-body"><div className="field-grid fg2" style={{gap:14}}><div><div className="field-label">Unidade</div><div className="field-value">{UNIDADE_COMPLETA}</div></div><div><div className="field-label">Chefe</div><div className="field-value">{CHEFE}</div></div></div></div></div>
      <div className="card-section"><SH icon="✈" title="Dados da Viagem" cor="#e65100" /><div className="section-body"><div className="field-grid" style={{gap:18}}><div className="field-grid fg2" style={{gap:16}}><div><div className="field-label">Meio de Transporte</div><select className="sel" value={form.meio} onChange={f("meio")}>{MEIOS.map(m=><option key={m}>{m}</option>)}</select></div><div><div className="field-label">Período <span className="req">*</span></div><div style={{display:"flex",gap:8,alignItems:"center"}}><input type="date" className="inp" autoComplete="new-password" name={`per_ini_${Date.now()}`} value={form.inicio} onChange={f("inicio")} /><span style={{color:"#8d9db0",flexShrink:0}}>→</span><input type="date" className="inp" autoComplete="new-password" name={`per_fim_${Date.now()}`} value={form.fim} onChange={f("fim")} /></div></div></div><div><div className="field-label">Roteiro <span className="req">*</span></div><textarea className="ta" autoComplete="off" value={form.roteiro} onChange={f("roteiro")} placeholder="Ex: Cruz das Almas/BA → Brasília/DF → Cruz das Almas/BA" style={{minHeight:48}} /></div><div><div className="field-label">Descrição <span className="req">*</span></div><textarea className="ta" autoComplete="off" value={form.descricao} onChange={f("descricao")} placeholder="Descreva o objetivo da viagem..." /></div><div><div className="field-label">Observações</div><textarea className="ta" autoComplete="off" value={form.obs} onChange={f("obs")} style={{minHeight:48}} /></div>
      {/* Motorista SLT */}
      <div><div onClick={()=>setForm(p=>({...p,motoristaSlt:!p.motoristaSlt}))} style={{display:"inline-flex",alignItems:"center",gap:10,cursor:"pointer",padding:"10px 18px",borderRadius:8,border:`2px solid ${form.motoristaSlt?"#1a6b3a":"#dce3eb"}`,background:form.motoristaSlt?"#f0faf4":"#fff",transition:"all .2s",userSelect:"none"}}><div style={{width:22,height:22,borderRadius:4,border:`2px solid ${form.motoristaSlt?"#1a6b3a":"#b0bec5"}`,background:form.motoristaSlt?"#1a6b3a":"#fff",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,transition:"all .2s"}}>{form.motoristaSlt&&<span style={{color:"#fff",fontSize:13,fontWeight:700}}>✓</span>}</div><div><div style={{fontWeight:600,fontSize:13,color:form.motoristaSlt?"#1a6b3a":"#1a2332"}}>🚗 Motorista SLT</div><div style={{fontSize:11,color:"#8d9db0",marginTop:1}}>Solicitar motorista para esta viagem</div></div>{form.motoristaSlt&&<span className="badge bg" style={{marginLeft:8}}>Solicitado</span>}</div></div>
      </div></div></div>
      <div className="card-section"><SH icon="🎯" title="Objetivo da Viagem" cor="#6a1b9a" /><div className="section-body"><div className="field-label" style={{marginBottom:8}}>Descrição do objetivo</div><select className="sel" value={form.objetivo} onChange={f("objetivo")}><option value="">-- Selecione --</option>{OBJETIVOS.map(o=><option key={o}>{o}</option>)}</select></div></div>
      <div className="card-section"><SH icon="💰" title="Dados de Custo" cor="#00695c" /><div className="section-body"><div className="field-grid fg2" style={{gap:16}}><div><div className="field-label">Unidade Executora</div><div className="field-value">{UNIDADE_GESTORA}</div></div><div><div className="field-label">Atividade</div><select className="sel" value={form.atividade_cod} onChange={selAtiv}><option value="">-- Selecione --</option>{DB_ATIVIDADES.map(a=><option key={a.codigo} value={a.codigo}>{a.codigo}</option>)}</select></div><div style={{gridColumn:"1 / -1"}}><div className="field-label">Nome da Atividade</div><input className="inp" value={form.atividade_nome} readOnly style={{background:"#f8fafc",color:"#6b7a8d"}} placeholder="Preenchido automaticamente ao selecionar a atividade" /></div></div></div></div>
      {/* ── DIÁRIAS (grid de divs — imune a autocomplete do browser) ── */}
      <div className="card-section">
        <SH icon="🗓" title="Diárias" cor="#1565c0" />
        <div style={{padding:"0 0 4px 0"}}>
          {/* Cabeçalho */}
          <div style={{display:"grid",gridTemplateColumns:"36px 180px 1fr 1fr 90px 120px 70px 120px 1fr",gap:0,background:"#f0f4f8",borderBottom:"2px solid #dce3eb",position:"sticky",top:0,zIndex:50,padding:"0"}}>
            {[
              {label:"#",ci:0},{label:"Localidade",ci:1},{label:"Data Inicial",ci:2},{label:"Data Final",ci:3},
              {label:"Quantidade de Diárias",ci:4},{label:"Valor Base (R$)",ci:5},{label:"Fator",ci:6},
              {label:"Total (R$)",ci:7},{label:"Justificativa",ci:8}
            ].map(({label,ci})=>(
              <div key={ci} style={{
                padding:"11px 12px",fontSize:11,fontWeight:800,color:"#1a2332",
                textTransform:"uppercase",letterSpacing:".04em",
                background:ci===2||ci===3?"#d6e8ff":"#f0f4f8",
                borderLeft:ci===2?"2px solid #90b8e0":"none",
                borderRight:ci===3?"2px solid #90b8e0":"none",
                textAlign:ci===0||ci===4||ci===5||ci===6||ci===7?"center":"left",
                userSelect:"none",pointerEvents:"none",
              }}>{label}</div>
            ))}
          </div>
          {/* Linhas */}
          {form.diarias.map((d,i)=>(
            <div key={i} style={{display:"grid",gridTemplateColumns:"36px 180px 1fr 1fr 90px 120px 70px 120px 1fr",gap:0,borderBottom:"1px solid #f0f2f5",alignItems:"center",minHeight:72}}>
              {/* # checkbox */}
              <div style={{display:"flex",justifyContent:"center",alignItems:"center",padding:"8px 4px"}}>
                <input type="checkbox" style={{width:15,height:15,accentColor:"#1a6b3a",cursor:"pointer"}} />
              </div>
              {/* Localidade */}
              <div style={{padding:"8px 10px"}}>
                <select
                  value={d.localidade}
                  onChange={e=>upD(i,"localidade",e.target.value)}
                  style={{width:"100%",border:"1.5px solid #dce3eb",borderRadius:6,padding:"6px 8px",fontSize:12,color:"#1a2332",background:"#fff",outline:"none",cursor:"pointer"}}
                >
                  <option value="">-- Selecione --</option>
                  <optgroup label="Capitais — R$ 160,00">
                    {DB_LOCALIDADES.filter(l=>l.tipo==="Capital").map(l=><option key={l.nome} value={l.nome}>{l.nome}</option>)}
                  </optgroup>
                  <optgroup label="Interior — R$ 128,00">
                    {DB_LOCALIDADES.filter(l=>l.tipo==="Interior").map(l=><option key={l.nome} value={l.nome}>{l.nome}</option>)}
                  </optgroup>
                </select>
                {d.tipo && <div style={{marginTop:4}}><span className={`badge ${d.tipo==="Capital"?"bb":"bg"}`} style={{fontSize:10}}>{d.tipo}</span></div>}
              </div>
              {/* Data Inicial */}
              <div style={{padding:"8px 10px",background:"#f5f8ff",borderLeft:"2px solid #90b8e0"}}>
                <input
                  type="date"
                  value={d.di}
                  onChange={e=>upD(i,"di",e.target.value)}
                  style={{width:"100%",border:"1.5px solid #90b8e0",borderRadius:6,padding:"6px 8px",fontSize:12,color:"#1a2332",background:"#fff",outline:"none",cursor:"pointer"}}
                />
              </div>
              {/* Data Final */}
              <div style={{padding:"8px 10px",background:"#f5f8ff",borderRight:"2px solid #90b8e0"}}>
                <input
                  type="date"
                  value={d.df}
                  onChange={e=>upD(i,"df",e.target.value)}
                  style={{width:"100%",border:"1.5px solid #90b8e0",borderRadius:6,padding:"6px 8px",fontSize:12,color:"#1a2332",background:"#fff",outline:"none",cursor:"pointer"}}
                />
              </div>
              {/* Qtd */}
              <div style={{padding:"8px 10px",display:"flex",flexDirection:"column",alignItems:"center",gap:2}}>
                <input
                  type="text" placeholder="0"
                  value={d.qtd}
                  onChange={e=>upD(i,"qtd",e.target.value)}
                  style={{width:64,border:`1.5px solid ${d.qtdAuto?"#1a6b3a":"#dce3eb"}`,borderRadius:6,padding:"6px 8px",fontSize:14,fontWeight:700,color:"#1a2332",background:d.qtdAuto?"#f0faf4":"#fff",outline:"none",textAlign:"center"}}
                />
                {d.qtdAuto&&<span style={{fontSize:9,color:"#1a6b3a",fontWeight:600}}>auto</span>}
              </div>
              {/* Valor Base */}
              <div style={{padding:"8px 10px",textAlign:"center"}}>
                {d.vb
                  ? <span style={{fontWeight:700,color:"#1565c0",fontSize:14}}>R$ {parseFloat(d.vb).toLocaleString("pt-BR",{minimumFractionDigits:2})}</span>
                  : <span style={{color:"#c0c0c0",fontSize:12}}>—</span>}
              </div>
              {/* Fator */}
              <div style={{padding:"8px 6px",display:"flex",justifyContent:"center"}}>
                <select
                  value={d.fator}
                  onChange={e=>upD(i,"fator",e.target.value)}
                  style={{width:56,border:"1.5px solid #dce3eb",borderRadius:6,padding:"5px 4px",fontSize:13,color:"#1a2332",background:"#fff",outline:"none",cursor:"pointer"}}
                >
                  <option value="1">1</option>
                  <option value="0.5">0,5</option>
                </select>
              </div>
              {/* Total */}
              <div style={{padding:"8px 10px",textAlign:"right"}}>
                {d.total&&parseFloat(d.total)>0
                  ? <span style={{fontWeight:800,color:"#1a2332",fontSize:14}}>R$ {parseFloat(d.total).toLocaleString("pt-BR",{minimumFractionDigits:2})}</span>
                  : <span style={{color:"#c0c0c0"}}>—</span>}
              </div>
              {/* Justificativa */}
              <div style={{padding:"8px 10px"}}>
                <textarea
                  placeholder="Justificativa..."
                  value={d.just}
                  onChange={e=>upD(i,"just",e.target.value)}
                  style={{width:"100%",border:"1.5px solid #dce3eb",borderRadius:6,padding:"6px 8px",fontSize:12,color:"#1a2332",background:"#fff",resize:"vertical",minHeight:54,outline:"none"}}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
      {/* OUTROS ADIANTAMENTOS */}
      <div className="card-section">
        <SH icon="📋" title="Outros Adiantamentos" cor="#f57c00" />
        <div style={{overflowX:"auto"}}>
          <table className="table-modern">
            <thead><tr><th style={{width:40}}>#</th><th>Natureza</th><th style={{width:160}}>Valor (R$)</th><th>Justificativa</th></tr></thead>
            <tbody>{form.adiant.map((a,i)=>(
              <tr key={i}>
                <td style={{textAlign:"center",fontWeight:700,color:"#8d9db0"}}>{i+1}</td>
                <td><select tabIndex={0} value={a.natureza} onChange={e=>upA(i,"natureza",e.target.value)} style={{color:"#1a2332"}}><option value="">-- Selecione --</option>{NATUREZAS.map(n=><option key={n} style={{color:"#1a2332"}}>{n}</option>)}</select></td>
                <td><input tabIndex={0} value={a.valor} onChange={e=>{const v=e.target.value.replace(/[^\d,\.]/g,"");upA(i,"valor",v);}} onBlur={e=>{const n=parseFloat(e.target.value.replace(/\./g,"").replace(",","."));if(!isNaN(n))upA(i,"valor",n.toLocaleString("pt-BR",{minimumFractionDigits:2,maximumFractionDigits:2}));}} placeholder="0,00" style={{color:"#1a2332",textAlign:"right"}} /></td>
                <td><textarea tabIndex={0} value={a.just} onChange={e=>upA(i,"just",e.target.value)} style={{color:"#1a2332"}} placeholder="Justificativa..." /></td>
              </tr>
            ))}</tbody>
          </table>
        </div>
      </div>

      {/* TOTAL */}
      <div style={{display:"flex",justifyContent:"flex-end",marginBottom:20}}>
        <div className="total-box" style={{minWidth:360}}>
          <div>
            <div style={{fontSize:11,opacity:.8,textTransform:"uppercase",letterSpacing:".07em",marginBottom:6}}>Valor Total da AV</div>
            <div style={{fontSize:30,fontWeight:800,fontFamily:"IBM Plex Mono,monospace",letterSpacing:"-.5px"}}>
              R$ {totG.toLocaleString("pt-BR",{minimumFractionDigits:2})}
            </div>
          </div>
          <div style={{textAlign:"right",fontSize:13,lineHeight:1.8}}>
            <div style={{opacity:.9}}>Diárias: <strong>R$ {totD.toLocaleString("pt-BR",{minimumFractionDigits:2})}</strong></div>
            <div style={{opacity:.9}}>Adiantamentos: <strong>R$ {totA.toLocaleString("pt-BR",{minimumFractionDigits:2})}</strong></div>
            {parseFloat(form.vl_rt)>0&&<div style={{opacity:.9}}>Passagens RT: <strong>R$ {parseFloat(form.vl_rt||0).toLocaleString("pt-BR",{minimumFractionDigits:2})}</strong></div>}
          </div>
        </div>
      </div>

      {/* PASSAGENS AÉREAS */}
      {mostraPassagens&&(
        <div className="card-section">
          <SH icon="🛫" title="Passagens Aéreas" cor="#1a6b3a" />
          <div style={{overflowX:"auto"}}>
            <table className="table-modern" style={{minWidth:860}}>
              <thead><tr><th style={{width:40}}>#</th><th>Origem</th><th>Destino</th><th>Data de Embarque</th><th>CIA</th><th>Vôo</th><th>Observação</th></tr></thead>
              <tbody>{form.passagens.map((p,i)=>(
                <tr key={i}>
                  <td style={{textAlign:"center",fontWeight:700,color:"#8d9db0"}}>{i+1}</td>
                  <td><select tabIndex={0} value={p.orig} onChange={e=>upP(i,"orig",e.target.value)} style={{color:"#1a2332"}}><option value="">--</option>{AEROPORTOS.map(a=><option key={a.c} value={a.c} style={{color:"#1a2332"}}>{a.c} – {a.n}</option>)}</select></td>
                  <td><select tabIndex={0} value={p.dest} onChange={e=>upP(i,"dest",e.target.value)} style={{color:"#1a2332"}}><option value="">--</option>{AEROPORTOS.map(a=><option key={a.c} value={a.c} style={{color:"#1a2332"}}>{a.c} – {a.n}</option>)}</select></td>
                  <td><input tabIndex={0} type="date" value={p.data} onChange={e=>upP(i,"data",e.target.value)} style={{color:"#1a2332"}} /></td>
                  <td><select tabIndex={0} value={p.cia} onChange={e=>upP(i,"cia",e.target.value)} style={{color:"#1a2332"}}><option value="">--</option>{CIAS.map(c=><option key={c} style={{color:"#1a2332"}}>{c}</option>)}</select></td>
                  <td><input tabIndex={0} value={p.voo} onChange={e=>upP(i,"voo",e.target.value)} placeholder="Nº voo" style={{color:"#1a2332"}} /></td>
                  <td><textarea tabIndex={0} value={p.obs} onChange={e=>upP(i,"obs",e.target.value)} style={{color:"#1a2332",minHeight:38}} placeholder="Obs..." /></td>
                </tr>
              ))}</tbody>
            </table>
          </div>
          <div style={{padding:"14px 20px",borderTop:"1px solid #eef1f5",display:"flex",alignItems:"center",gap:14}}>
            <span style={{fontSize:13,color:"#1a2332",fontWeight:600}}>Valor estimado da RT (R$):</span>
            <input tabIndex={0} className="inp" style={{width:160,color:"#1a2332",textAlign:"right"}} value={form.vl_rt}
              onChange={e=>setForm(p=>({...p,vl_rt:e.target.value.replace(/[^\d,\.]/g,"")}))}
              onBlur={e=>{const n=parseFloat(e.target.value.replace(",","."));if(!isNaN(n))setForm(p=>({...p,vl_rt:n.toLocaleString("pt-BR",{minimumFractionDigits:2,maximumFractionDigits:2})}));}}
              placeholder="0,00" />
          </div>
        </div>
      )}
      <div style={{display:"flex",gap:12,justifyContent:"flex-end",paddingBottom:36}}>
        <button className="btn-secondary" onClick={onVoltar}>← Voltar</button>
        <button className="btn-secondary" onClick={()=>gravar("Rascunho")}>💾 Salvar Rascunho</button>
        <button className="btn-primary" onClick={()=>gravar("Encaminhado")}>✓ Encaminhar para Aprovação</button>
      </div>
    </div>
  );
}

// ─── PRESTAÇÃO DE CONTAS ──────────────────────────────────────────────────────
const TIPOS_DESPESA = ["Hospedagem","Alimentação","Transporte local","Táxi/Uber","Inscrição em evento","Material","Outros"];

function PrestacaoContas({ svs, onVoltar }) {
  const [etapa, setEtapa] = useState(1); // 1=busca, 2=formulário
  const [busca, setBusca] = useState("");
  const [savSel, setSavSel] = useState(null);

  // ── estado do formulário de PC ──
  const emptyPC = (sv) => ({
    relatorio_num: "",
    relatorio_entregue: "nao",
    diariasEfetivas: (sv?.diariasDetalhe||[]).map(d=>({...d,confirmado:true})).length > 0
      ? sv.diariasDetalhe.map(d=>({...d}))
      : [{localidade:"",di:"",df:"",qtd:"",vb:"",fator:"1",total:"",tipo:"",just:""}],
    comprovacoes: [
      {tipo:"",valor:"",desc:"",arquivos:[]},
      {tipo:"",valor:"",desc:"",arquivos:[]},
    ],
    trechos: (sv?.passagensDetalhe||[{orig:"",dest:"",data:"",cia:"",voo:"",bilhete:"",obs:"",utilizado:"sim"}]).map(t=>({...t,utilizado:t.utilizado||"sim"})),
    novos_bilhetes:[{utilizado:"sim",bilhete:"",cia:"",trecho:"",rt:""}],
  });
  const [pc, setPc] = useState(null);

  const selecionarSAV = sv => {
    setSavSel(sv);
    setPc(emptyPC(sv));
    setEtapa(2);
  };

  const fmtBRL = v => {const n=parseFloat(String(v||"0").replace(",","."));return isNaN(n)?"0,00":n.toLocaleString("pt-BR",{minimumFractionDigits:2,maximumFractionDigits:2});};
  const parseBRL = v => parseFloat(String(v||"0").replace(".","").replace(",","."))||0;

  // ── cálculos do acerto ──
  const totEfetivas = pc ? pc.diariasEfetivas.reduce((s,d)=>s+(parseFloat(d.total)||0),0) : 0;
  const totComprov = pc ? pc.comprovacoes.reduce((s,c)=>s+parseBRL(c.valor),0) : 0;
  const totViagem = totEfetivas + totComprov;
  const adiantamento = savSel ? (savSel.diarias||0) : 0;
  const devolver = Math.max(0, adiantamento - totViagem);
  const receber = Math.max(0, totViagem - adiantamento);

  const upDE = (i,k,v) => {
    const d = pc.diariasEfetivas.map((row,ri)=>ri===i?{...row,[k]:v}:row);
    if(k==="localidade"){const l=DB_LOCALIDADES.find(x=>x.nome===v);if(l){d[i]={...d[i],vb:l.diaria.toFixed(2),tipo:l.tipo};}}
    if(k==="di"||k==="df"){
      const di=k==="di"?v:d[i].di; const df=k==="df"?v:d[i].df;
      if(di&&df){const dtI=new Date(di+"T00:00:00");const dtF=new Date(df+"T00:00:00");
        if(!isNaN(dtI)&&!isNaN(dtF)&&dtF>dtI){const dias=Math.round((dtF-dtI)/(1000*60*60*24));d[i]={...d[i],qtd:String(dias+0.5),qtdAuto:true};}}}
    if(k==="qtd") d[i]={...d[i],qtdAuto:false};
    const qtd=parseFloat(d[i].qtd||"0")||0;
    const vb=parseFloat(d[i].vb||"0")||0;
    const fat=parseFloat(d[i].fator)||1;
    d[i]={...d[i],total:(qtd*vb*fat).toFixed(2)};
    setPc(p=>({...p,diariasEfetivas:d}));
  };
  const upC=(i,k,v)=>setPc(p=>({...p,comprovacoes:p.comprovacoes.map((row,ri)=>ri===i?{...row,[k]:v}:row)}));
  const addArquivo=(i,files)=>{
    const novos=Array.from(files).filter(f=>f.type==="application/pdf"||f.name.endsWith(".pdf")).map(f=>({
      nome:f.name, tamanho:(f.size/1024).toFixed(0)+"KB", url:URL.createObjectURL(f), adicionadoEm:new Date().toLocaleString("pt-BR")
    }));
    if(novos.length===0){alert("Selecione apenas arquivos PDF.");return;}
    setPc(p=>({...p,comprovacoes:p.comprovacoes.map((row,ri)=>ri===i?{...row,arquivos:[...(row.arquivos||[]),...novos]}:row)}));
  };
  const remArquivo=(ci,ai)=>setPc(p=>({...p,comprovacoes:p.comprovacoes.map((row,ri)=>ri===ci?{...row,arquivos:row.arquivos.filter((_,fi)=>fi!==ai)}:row)}));
  const upT=(i,k,v)=>setPc(p=>({...p,trechos:p.trechos.map((row,ri)=>ri===i?{...row,[k]:v}:row)}));
  const upNB=(i,k,v)=>setPc(p=>({...p,novos_bilhetes:p.novos_bilhetes.map((row,ri)=>ri===i?{...row,[k]:v}:row)}));

  const svsFiltrados = svs.filter(s=>
    s.situacao==="Aprovado"&&
    (s.numero?.toLowerCase().includes(busca.toLowerCase())||
     s.favorecido?.toLowerCase().includes(busca.toLowerCase()))
  );

  const SH2 = ({icon,title,cor})=>(
    <div style={{display:"flex",alignItems:"center",gap:10,padding:"14px 20px",borderBottom:"1px solid #eef1f5"}}>
      <div style={{width:32,height:32,borderRadius:8,background:(cor||"#1a6b3a")+"18",display:"flex",alignItems:"center",justifyContent:"center",fontSize:16}}>{icon}</div>
      <div style={{fontSize:14,fontWeight:700,color:"#1a2332"}}>{title}</div>
    </div>
  );

  // ── ETAPA 1: BUSCA ──
  if(etapa===1) return (
    <div style={{padding:"32px 36px",maxWidth:860}}>
      <div style={{marginBottom:24}}>
        <h1 style={{fontSize:22,fontWeight:700,color:"#1a2332",marginBottom:4}}>Prestação de Contas</h1>
        <p style={{color:"#8d9db0",fontSize:14}}>Selecione a solicitação de viagem aprovada para iniciar a prestação de contas.</p>
      </div>
      <div className="card-section" style={{padding:20}}>
        <input className="inp" value={busca} onChange={e=>setBusca(e.target.value)}
          placeholder="🔍  Buscar por número (SAV-2026-...) ou nome do solicitante..."
          style={{fontSize:14,padding:"10px 14px",marginBottom:16}} />
        {svsFiltrados.length===0 && (
          <div style={{textAlign:"center",padding:"40px 0",color:"#8d9db0"}}>
            <div style={{fontSize:36,marginBottom:8}}>📋</div>
            <div>{busca?"Nenhuma solicitação aprovada encontrada.":"Nenhuma solicitação com status Aprovado."}</div>
          </div>
        )}
        {svsFiltrados.map((s,i)=>(
          <div key={i} onClick={()=>selecionarSAV(s)}
            style={{display:"flex",alignItems:"center",gap:16,padding:"14px 16px",borderRadius:10,border:"1.5px solid #eef1f5",marginBottom:8,cursor:"pointer",background:"#fff",transition:"all .15s"}}
            onMouseEnter={e=>e.currentTarget.style.borderColor="#1a6b3a"}
            onMouseLeave={e=>e.currentTarget.style.borderColor="#eef1f5"}>
            <div style={{width:42,height:42,borderRadius:10,background:avatarColor(s.favorecido||""),color:"#fff",display:"flex",alignItems:"center",justifyContent:"center",fontWeight:700,fontSize:13,flexShrink:0}}>{iniciais(s.favorecido||"")}</div>
            <div style={{flex:1}}>
              <div style={{fontWeight:700,fontSize:13,color:"#1a2332"}}>{s.favorecido}</div>
              <div style={{fontSize:12,color:"#6b7a8d",marginTop:2}}>
                <span className="sv-link">{s.numero}</span>
                <span style={{margin:"0 8px"}}>·</span>{s.destino}
                <span style={{margin:"0 8px"}}>·</span>{s.periodo}
              </div>
            </div>
            <div style={{textAlign:"right"}}>
              {getSavBadge(s.situacao)}
              <div style={{fontSize:12,fontWeight:600,color:"#1a6b3a",marginTop:4}}>R$ {(s.diarias||0).toLocaleString("pt-BR",{minimumFractionDigits:2})}</div>
            </div>
            <div style={{color:"#1a6b3a",fontSize:18,fontWeight:700}}>→</div>
          </div>
        ))}
      </div>
    </div>
  );

  // ── ETAPA 2: FORMULÁRIO ──
  return (
    <div style={{padding:"28px 36px"}}>
      {/* Header */}
      <div style={{marginBottom:20,display:"flex",alignItems:"center",gap:16}}>
        <button className="btn-secondary" onClick={()=>setEtapa(1)} style={{padding:"8px 16px"}}>← Voltar</button>
        <div>
          <h1 style={{fontSize:22,fontWeight:700,color:"#1a2332",marginBottom:2}}>Prestação de Contas</h1>
          <p style={{color:"#8d9db0",fontSize:13}}>Viagem Nacional com Ônus · {savSel?.numero}</p>
        </div>
      </div>

      {/* SOLICITAÇÃO DE VIAGEM */}
      <div className="card-section">
        <SH2 icon="📄" title="Solicitação de Viagem" cor="#1565c0" />
        <div className="section-body">
          <div className="field-grid fg3" style={{gap:16}}>
            <div><div className="field-label">Número</div><div className="field-value" style={{color:"#1565c0",fontWeight:700}}>{savSel?.numero}</div></div>
            <div><div className="field-label">Data de Aprovação</div><div className="field-value">{savSel?.fim||"—"}</div></div>
            <div><div className="field-label">Status</div><div style={{marginTop:4}}>{getSavBadge(savSel?.situacao)}</div></div>
          </div>
        </div>
      </div>

      {/* FAVORECIDO */}
      <div className="card-section">
        <SH2 icon="👤" title="Favorecido" cor="#1a6b3a" />
        <div className="section-body">
          <div className="field-grid fg3" style={{gap:14}}>
            <div style={{gridColumn:"1/3"}}><div className="field-label">Nome / Matrícula / CPF</div><div className="field-value" style={{fontWeight:600}}>{savSel?.favorecido} / {DB_EMPREGADOS.find(e=>e.nome===savSel?.favorecido)?.matricula||"—"} / {DB_EMPREGADOS.find(e=>e.nome===savSel?.favorecido)?.cpf||"—"}</div></div>
            <div><div className="field-label">Vínculo</div><div style={{marginTop:4}}><span className={`badge ${savSel?.vinculo==="Empregado"?"bb":"bo"}`}>{savSel?.vinculo}</span></div></div>
            <div><div className="field-label">Endereço</div><div className="field-value" style={{fontSize:12}}>{DB_EMPREGADOS.find(e=>e.nome===savSel?.favorecido)?.endereco||"—"}</div></div>
            <div><div className="field-label">Dados Bancários</div><div className="field-value" style={{fontSize:12}}>{DB_EMPREGADOS.find(e=>e.nome===savSel?.favorecido)?.banco||"—"}</div></div>
          </div>
        </div>
      </div>

      {/* ORDENADOR */}
      <div className="card-section">
        <SH2 icon="🏛" title="Ordenador da Despesa" cor="#1565c0" />
        <div className="section-body">
          <div className="field-grid fg2" style={{gap:14}}>
            <div><div className="field-label">Unidade</div><div className="field-value">{UNIDADE_COMPLETA}</div></div>
            <div><div className="field-label">Chefe</div><div className="field-value">{CHEFE}</div></div>
          </div>
        </div>
      </div>

      {/* DADOS DA VIAGEM (somente leitura) */}
      <div className="card-section">
        <SH2 icon="✈" title="Dados da Viagem" cor="#e65100" />
        <div className="section-body">
          <div className="field-grid fg3" style={{gap:14}}>
            <div><div className="field-label">Destino</div><div className="field-value" style={{fontWeight:600}}>{savSel?.destino}</div></div>
            <div><div className="field-label">Período</div><div className="field-value">{savSel?.inicio} → {savSel?.fim}</div></div>
            <div><div className="field-label">Ônus</div><div className="field-value">{savSel?.onus}</div></div>
          </div>
        </div>
      </div>

      {/* RELATÓRIO DE VIAGEM */}
      <div className="card-section">
        <SH2 icon="📝" title="Relatório de Viagem" cor="#6a1b9a" />
        <div className="section-body">
          <div className="field-grid fg3" style={{gap:16,alignItems:"center"}}>
            <div><div className="field-label">Número do Relatório</div>
              <input className="inp" value={pc.relatorio_num} onChange={e=>setPc(p=>({...p,relatorio_num:e.target.value}))} placeholder="Ex: REL-2026-001" />
            </div>
            <div><div className="field-label">Relatório Entregue?</div>
              <div style={{display:"flex",gap:16,marginTop:8}}>
                {["sim","nao"].map(op=>(
                  <label key={op} style={{display:"flex",alignItems:"center",gap:6,cursor:"pointer",fontSize:13,fontWeight:pc.relatorio_entregue===op?700:400,color:pc.relatorio_entregue===op?"#1a6b3a":"#4a5568"}}>
                    <input type="radio" name="rel_entregue" value={op} checked={pc.relatorio_entregue===op} onChange={()=>setPc(p=>({...p,relatorio_entregue:op}))} style={{accentColor:"#1a6b3a"}} />
                    {op==="sim"?"✅ Sim":"❌ Não"}
                  </label>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* DIÁRIAS EFETIVAS */}
      <div className="card-section">
        <SH2 icon="🗓" title="Diárias Efetivas" cor="#1565c0" />
        {/* Header */}
        <div style={{display:"grid",gridTemplateColumns:"36px 200px 130px 130px 110px 120px 70px 130px 1fr",background:"#f0f4f8",borderBottom:"2px solid #dce3eb"}}>
          {["#","Localidade","Data Inicial","Data Final","Qtd. Diárias","Valor Diária (R$)","Fator","Total (R$)","Justificativa"].map((h,ci)=>(
            <div key={ci} style={{padding:"10px 12px",fontSize:11,fontWeight:800,color:"#1a2332",textTransform:"uppercase",
              background:ci===2||ci===3?"#d6e8ff":"#f0f4f8",
              borderLeft:ci===2?"2px solid #90b8e0":"none",
              borderRight:ci===3?"2px solid #90b8e0":"none",
              textAlign:ci===0||ci===4||ci===5||ci===6||ci===7?"center":"left",
              userSelect:"none"}}>{h}</div>
          ))}
        </div>
        {pc.diariasEfetivas.map((d,i)=>(
          <div key={i} style={{display:"grid",gridTemplateColumns:"36px 200px 130px 130px 110px 120px 70px 130px 1fr",borderBottom:"1px solid #f0f2f5",alignItems:"center",background:i%2===0?"#fff":"#fafbfc"}}>
            <div style={{display:"flex",justifyContent:"center",padding:"10px 4px"}}><input type="checkbox" checked={d.confirmado!==false} onChange={e=>upDE(i,"confirmado",e.target.checked)} style={{width:15,height:15,accentColor:"#1a6b3a",cursor:"pointer"}} /></div>
            <div style={{padding:"8px 10px"}}>
              <select value={d.localidade} onChange={e=>upDE(i,"localidade",e.target.value)} style={{width:"100%",border:"1.5px solid #dce3eb",borderRadius:6,padding:"6px 8px",fontSize:12,color:"#1a2332",background:"#fff",outline:"none",cursor:"pointer"}}>
                <option value="">-- Selecione --</option>
                <optgroup label="Capitais — R$ 160,00">{DB_LOCALIDADES.filter(l=>l.tipo==="Capital").map(l=><option key={l.nome} value={l.nome} style={{color:"#1a2332"}}>{l.nome}</option>)}</optgroup>
                <optgroup label="Interior — R$ 128,00">{DB_LOCALIDADES.filter(l=>l.tipo==="Interior").map(l=><option key={l.nome} value={l.nome} style={{color:"#1a2332"}}>{l.nome}</option>)}</optgroup>
              </select>
              {d.tipo&&<div style={{marginTop:3}}><span className={`badge ${d.tipo==="Capital"?"bb":"bg"}`} style={{fontSize:10}}>{d.tipo}</span></div>}
            </div>
            <div style={{padding:"8px 10px",background:"#f5f8ff",borderLeft:"2px solid #90b8e0"}}>
              <input type="date" value={d.di} onChange={e=>upDE(i,"di",e.target.value)} style={{width:"100%",border:"1.5px solid #90b8e0",borderRadius:6,padding:"6px 8px",fontSize:12,color:"#1a2332",background:"#fff",outline:"none",cursor:"pointer"}} />
            </div>
            <div style={{padding:"8px 10px",background:"#f5f8ff",borderRight:"2px solid #90b8e0"}}>
              <input type="date" value={d.df} onChange={e=>upDE(i,"df",e.target.value)} style={{width:"100%",border:"1.5px solid #90b8e0",borderRadius:6,padding:"6px 8px",fontSize:12,color:"#1a2332",background:"#fff",outline:"none",cursor:"pointer"}} />
            </div>
            <div style={{padding:"8px 10px",display:"flex",flexDirection:"column",alignItems:"center",gap:2}}>
              <input type="text" value={d.qtd} onChange={e=>upDE(i,"qtd",e.target.value)} placeholder="0" style={{width:70,border:`1.5px solid ${d.qtdAuto?"#1a6b3a":"#dce3eb"}`,borderRadius:6,padding:"6px 8px",fontSize:14,fontWeight:700,color:"#1a2332",background:d.qtdAuto?"#f0faf4":"#fff",outline:"none",textAlign:"center"}} />
              {d.qtdAuto&&<span style={{fontSize:9,color:"#1a6b3a",fontWeight:600}}>auto</span>}
            </div>
            <div style={{padding:"8px 10px",textAlign:"center"}}>
              {d.vb?<span style={{fontWeight:700,color:"#1565c0",fontSize:13}}>R$ {parseFloat(d.vb).toLocaleString("pt-BR",{minimumFractionDigits:2})}</span>:<span style={{color:"#c0c0c0"}}>—</span>}
            </div>
            <div style={{padding:"8px 6px",display:"flex",justifyContent:"center"}}>
              <select value={d.fator} onChange={e=>upDE(i,"fator",e.target.value)} style={{width:56,border:"1.5px solid #dce3eb",borderRadius:6,padding:"5px 4px",fontSize:13,color:"#1a2332",background:"#fff",outline:"none",cursor:"pointer"}}>
                <option value="1">1</option><option value="0.5">0,5</option>
              </select>
            </div>
            <div style={{padding:"8px 10px",textAlign:"right"}}>
              {d.total&&parseFloat(d.total)>0?<span style={{fontWeight:800,color:"#1a2332",fontSize:14}}>R$ {parseFloat(d.total).toLocaleString("pt-BR",{minimumFractionDigits:2})}</span>:<span style={{color:"#c0c0c0"}}>—</span>}
            </div>
            <div style={{padding:"8px 10px"}}>
              <textarea value={d.just} onChange={e=>upDE(i,"just",e.target.value)} placeholder="Justificativa..." style={{width:"100%",border:"1.5px solid #dce3eb",borderRadius:6,padding:"6px 8px",fontSize:12,color:"#1a2332",background:"#fff",resize:"vertical",minHeight:50,outline:"none"}} />
            </div>
          </div>
        ))}
        <div style={{padding:"10px 14px",display:"flex",gap:8}}>
          <button className="btn-outline" style={{fontSize:12,padding:"6px 14px"}} onClick={()=>setPc(p=>({...p,diariasEfetivas:[...p.diariasEfetivas,{localidade:"",di:"",df:"",qtd:"",vb:"",fator:"1",total:"",tipo:"",just:""}]}))}>+ Adicionar linha</button>
        </div>
      </div>

      {/* DOCUMENTOS COMPROBATÓRIOS DE VIAGEM */}
      <div className="card-section">
        <SH2 icon="📂" title="Documentos Comprobatórios de Viagem" cor="#f57c00" />
        <div style={{padding:"10px 20px",background:"#fff8e1",borderBottom:"1px solid #ffe082",fontSize:12,color:"#e65100",display:"flex",alignItems:"center",gap:8}}>
          <span>⚠</span>
          <span>Valor limite para comprovação de despesas com hospedagem: <strong>R$ 1.680,00</strong> · Somente arquivos <strong>PDF</strong> são aceitos.</span>
        </div>

        {/* Linhas de despesa */}
        {pc.comprovacoes.map((c,i)=>(
          <div key={i} style={{borderBottom:"1px solid #f0f2f5",padding:"14px 18px",background:i%2===0?"#fff":"#fafbfc"}}>
            {/* Linha principal */}
            <div style={{display:"grid",gridTemplateColumns:"36px 180px 160px 1fr",gap:12,alignItems:"center",marginBottom: c.arquivos?.length>0?10:0}}>
              <div style={{textAlign:"center",fontWeight:700,color:"#8d9db0",fontSize:13}}>{i+1}</div>
              <select value={c.tipo} onChange={e=>upC(i,"tipo",e.target.value)}
                style={{border:"1.5px solid #dce3eb",borderRadius:6,padding:"7px 10px",fontSize:13,color:"#1a2332",background:"#fff",outline:"none",cursor:"pointer"}}>
                <option value="">-- Tipo de despesa --</option>
                {TIPOS_DESPESA.map(t=><option key={t} style={{color:"#1a2332"}}>{t}</option>)}
              </select>
              <input value={c.valor}
                onChange={e=>upC(i,"valor",e.target.value.replace(/[^\d,\.]/g,""))}
                onBlur={e=>{const n=parseFloat(e.target.value.replace(",","."));if(!isNaN(n)&&n>0)upC(i,"valor",n.toLocaleString("pt-BR",{minimumFractionDigits:2,maximumFractionDigits:2}));}}
                placeholder="0,00"
                style={{border:"1.5px solid #dce3eb",borderRadius:6,padding:"7px 10px",fontSize:13,color:"#1a2332",background:"#fff",outline:"none",textAlign:"right",fontWeight:600}} />
              <input value={c.desc} onChange={e=>upC(i,"desc",e.target.value)} placeholder="Descrição da despesa..."
                style={{border:"1.5px solid #dce3eb",borderRadius:6,padding:"7px 10px",fontSize:13,color:"#1a2332",background:"#fff",outline:"none"}} />
            </div>

            {/* Área de PDFs */}
            <div style={{marginLeft:48,marginTop:8}}>
              {/* Arquivos já adicionados */}
              {c.arquivos?.length>0&&(
                <div style={{display:"flex",flexWrap:"wrap",gap:8,marginBottom:8}}>
                  {c.arquivos.map((arq,ai)=>(
                    <div key={ai} style={{display:"inline-flex",alignItems:"center",gap:8,padding:"6px 12px",borderRadius:8,background:"#fff3e0",border:"1.5px solid #ffcc80",fontSize:12}}>
                      <span style={{color:"#e65100",fontSize:16}}>📄</span>
                      <div>
                        <div style={{fontWeight:600,color:"#bf360c",maxWidth:200,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{arq.nome}</div>
                        <div style={{fontSize:10,color:"#8d9db0"}}>{arq.tamanho} · {arq.adicionadoEm}</div>
                      </div>
                      <a href={arq.url} target="_blank" rel="noopener noreferrer"
                        style={{color:"#1565c0",fontSize:11,fontWeight:600,textDecoration:"none",padding:"2px 6px",borderRadius:4,border:"1px solid #90caf9",background:"#e3f2fd"}}>
                        👁 Ver
                      </a>
                      <button onClick={()=>remArquivo(i,ai)}
                        style={{border:"none",background:"none",cursor:"pointer",color:"#c62828",fontSize:16,lineHeight:1,padding:"0 2px"}}
                        title="Remover arquivo">×</button>
                    </div>
                  ))}
                </div>
              )}

              {/* Botão de upload */}
              <label style={{display:"inline-flex",alignItems:"center",gap:8,padding:"7px 14px",borderRadius:8,border:"1.5px dashed #f57c00",background:"#fffde7",cursor:"pointer",fontSize:12,fontWeight:600,color:"#e65100",userSelect:"none",transition:"all .15s"}}
                onMouseEnter={e=>{e.currentTarget.style.background="#fff8e1";e.currentTarget.style.borderColor="#e65100";}}
                onMouseLeave={e=>{e.currentTarget.style.background="#fffde7";e.currentTarget.style.borderColor="#f57c00";}}>
                <input type="file" accept=".pdf,application/pdf" multiple style={{display:"none"}}
                  onChange={e=>{addArquivo(i,e.target.files);e.target.value="";}} />
                📎 {c.arquivos?.length>0?"Adicionar mais PDFs":"Anexar PDF"}
                {c.arquivos?.length>0&&<span style={{background:"#e65100",color:"#fff",borderRadius:10,padding:"1px 7px",fontSize:10,fontWeight:700}}>{c.arquivos.length}</span>}
              </label>
            </div>
          </div>
        ))}

        <div style={{padding:"12px 18px",display:"flex",alignItems:"center",justifyContent:"space-between"}}>
          <button className="btn-outline" style={{fontSize:12,padding:"7px 16px"}}
            onClick={()=>setPc(p=>({...p,comprovacoes:[...p.comprovacoes,{tipo:"",valor:"",desc:"",arquivos:[]}]}))}>
            + Adicionar despesa
          </button>
          <div style={{fontSize:12,color:"#8d9db0"}}>
            {pc.comprovacoes.reduce((t,c)=>t+(c.arquivos?.length||0),0)} arquivo(s) anexado(s) ·
            Total: <strong style={{color:"#1a2332"}}>R$ {fmtBRL(totComprov)}</strong>
          </div>
        </div>
      </div>

      {/* ACERTO DE DIÁRIAS */}
      <div className="card-section">
        <SH2 icon="⚖" title="Acerto de Diárias" cor="#00695c" />
        <div style={{padding:"20px",display:"grid",gridTemplateColumns:"1fr 1fr",gap:16}}>
          {[
            {label:"Valor de Diárias Efetivas (R$)",val:totEfetivas,hl:false},
            {label:"CPMF a Receber (R$)",val:0,hl:false},
            {label:"Valor das Despesas Comprovadas (R$)",val:totComprov,hl:false},
            {label:"Valor a devolver à Embrapa (R$)",val:devolver,hl:devolver>0,cor:"#c62828"},
            {label:"Valor Total da Viagem (R$)",val:totViagem,hl:true,cor:"#1a2332"},
            {label:"Valor a receber da Embrapa (R$)",val:receber,hl:receber>0,cor:"#1a6b3a"},
            {label:"Adiantamento Realizado (R$)",val:adiantamento,hl:false},
            {label:"",val:null},
          ].map((item,i)=>item.val===null?<div key={i}/>:(
            <div key={i} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"12px 16px",borderRadius:8,background:item.hl?"#f0faf4":"#f8fafc",border:`1.5px solid ${item.hl?(item.cor==="#c62828"?"#ef9a9a":"#a5d6a7"):"#eef1f5"}`}}>
              <span style={{fontSize:13,color:"#4a5568",fontWeight:500}}>{item.label}</span>
              <span style={{fontSize:15,fontWeight:800,color:item.cor||"#1a2332",fontFamily:"IBM Plex Mono,monospace"}}>
                {fmtBRL(item.val)}
              </span>
            </div>
          ))}
        </div>
        {/* Resultado final */}
        {(devolver>0||receber>0)&&(
          <div style={{margin:"0 20px 20px",padding:"16px 20px",borderRadius:10,background:devolver>0?"#ffebee":"#e8f5e9",border:`2px solid ${devolver>0?"#ef9a9a":"#a5d6a7"}`,display:"flex",alignItems:"center",gap:14}}>
            <span style={{fontSize:28}}>{devolver>0?"💸":"🎉"}</span>
            <div>
              <div style={{fontWeight:700,fontSize:15,color:devolver>0?"#c62828":"#1a6b3a"}}>
                {devolver>0?"Valor a devolver à Embrapa":"Valor a receber da Embrapa"}
              </div>
              <div style={{fontSize:22,fontWeight:800,fontFamily:"IBM Plex Mono,monospace",color:devolver>0?"#c62828":"#1a6b3a",marginTop:2}}>
                R$ {fmtBRL(devolver>0?devolver:receber)}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* TRECHOS/BILHETES NÃO UTILIZADOS */}
      <div className="card-section">
        <SH2 icon="🎫" title="Trechos / Bilhetes Não Utilizados" cor="#1565c0" />
        <table className="table-modern" style={{minWidth:860}}>
          <thead>
            <tr>
              <th style={{width:90,textAlign:"center"}}>Utilizado</th>
              <th colSpan={2} style={{textAlign:"center"}}>Aeroporto</th>
              <th>Data Embarque</th><th>CIA</th><th>Vôo</th><th>Bilhete</th><th>Observação</th>
            </tr>
            <tr style={{background:"#f8fafc"}}>
              <th></th>
              <th style={{fontWeight:600,color:"#6b7a8d",fontSize:11,padding:"5px 14px"}}>Origem</th>
              <th style={{fontWeight:600,color:"#6b7a8d",fontSize:11,padding:"5px 14px"}}>Destino</th>
              <th></th><th></th><th></th><th></th><th></th>
            </tr>
          </thead>
          <tbody>{pc.trechos.map((t,i)=>(
            <tr key={i}>
              <td style={{textAlign:"center"}}>
                <select value={t.utilizado} onChange={e=>upT(i,"utilizado",e.target.value)} style={{color:"#1a2332",width:72,textAlign:"center"}}>
                  <option value="sim">Sim</option><option value="nao">Não</option>
                </select>
              </td>
              <td><select value={t.orig} onChange={e=>upT(i,"orig",e.target.value)} style={{color:"#1a2332"}}><option value="">--</option>{AEROPORTOS.map(a=><option key={a.c} value={a.c} style={{color:"#1a2332"}}>{a.c} – {a.n}</option>)}</select></td>
              <td><select value={t.dest} onChange={e=>upT(i,"dest",e.target.value)} style={{color:"#1a2332"}}><option value="">--</option>{AEROPORTOS.map(a=><option key={a.c} value={a.c} style={{color:"#1a2332"}}>{a.c} – {a.n}</option>)}</select></td>
              <td><input type="date" value={t.data} onChange={e=>upT(i,"data",e.target.value)} style={{color:"#1a2332"}} /></td>
              <td><select value={t.cia} onChange={e=>upT(i,"cia",e.target.value)} style={{color:"#1a2332"}}><option value="">--</option>{CIAS.map(c=><option key={c} style={{color:"#1a2332"}}>{c}</option>)}</select></td>
              <td><input value={t.voo} onChange={e=>upT(i,"voo",e.target.value)} placeholder="Nº voo" style={{color:"#1a2332"}} /></td>
              <td><input value={t.bilhete} onChange={e=>upT(i,"bilhete",e.target.value)} placeholder="Nº bilhete" style={{color:"#1a2332"}} /></td>
              <td><textarea value={t.obs} onChange={e=>upT(i,"obs",e.target.value)} style={{color:"#1a2332",minHeight:36}} placeholder="Obs..." /></td>
            </tr>
          ))}</tbody>
        </table>
        <div style={{padding:"10px 14px"}}>
          <button className="btn-outline" style={{fontSize:12,padding:"6px 14px"}} onClick={()=>setPc(p=>({...p,trechos:[...p.trechos,{utilizado:"sim",orig:"",dest:"",data:"",cia:"",voo:"",bilhete:"",obs:""}]}))}>+ Adicionar trecho</button>
        </div>
      </div>

      {/* NOVOS BILHETES NÃO UTILIZADOS */}
      <div className="card-section">
        <SH2 icon="🎟" title="Novos Bilhetes Não Utilizados" cor="#6a1b9a" />
        <table className="table-modern">
          <thead><tr><th style={{width:40}}>#</th><th style={{width:90,textAlign:"center"}}>Utilizado</th><th>Bilhete</th><th>CIA</th><th>Trecho(s)</th><th>RT</th></tr></thead>
          <tbody>{pc.novos_bilhetes.map((nb,i)=>(
            <tr key={i}>
              <td style={{textAlign:"center",fontWeight:700,color:"#8d9db0"}}>{i+1}</td>
              <td style={{textAlign:"center"}}>
                <select value={nb.utilizado} onChange={e=>upNB(i,"utilizado",e.target.value)} style={{color:"#1a2332",width:72,textAlign:"center"}}>
                  <option value="sim">Sim</option><option value="nao">Não</option>
                </select>
              </td>
              <td><input value={nb.bilhete} onChange={e=>upNB(i,"bilhete",e.target.value)} placeholder="Nº bilhete" style={{color:"#1a2332"}} /></td>
              <td><select value={nb.cia} onChange={e=>upNB(i,"cia",e.target.value)} style={{color:"#1a2332"}}><option value="">--</option>{CIAS.map(c=><option key={c} style={{color:"#1a2332"}}>{c}</option>)}</select></td>
              <td><input value={nb.trecho} onChange={e=>upNB(i,"trecho",e.target.value)} placeholder="Ex: SSA → CGH" style={{color:"#1a2332"}} /></td>
              <td><input value={nb.rt} onChange={e=>upNB(i,"rt",e.target.value)} placeholder="RT" style={{color:"#1a2332"}} /></td>
            </tr>
          ))}</tbody>
        </table>
        <div style={{padding:"10px 14px"}}>
          <button className="btn-outline" style={{fontSize:12,padding:"6px 14px"}} onClick={()=>setPc(p=>({...p,novos_bilhetes:[...p.novos_bilhetes,{utilizado:"sim",bilhete:"",cia:"",trecho:"",rt:""}]}))}>+ Adicionar bilhete</button>
        </div>
      </div>

      {/* AÇÕES */}
      <div style={{display:"flex",gap:12,justifyContent:"flex-end",paddingBottom:36}}>
        <button className="btn-secondary" onClick={()=>setEtapa(1)}>← Voltar</button>
        <button className="btn-secondary" onClick={()=>alert("Rascunho salvo!")}>💾 Salvar Rascunho</button>
        <button className="btn-primary" onClick={()=>alert("Prestação de Contas encaminhada com sucesso!")}>✓ Encaminhar Prestação</button>
      </div>
    </div>
  );
}

// ─── APP ──────────────────────────────────────────────────────────────────────
export default function App() {
  const [pagina, setPagina] = useState("dashboard");
  const [etapaSAV, setEtapaSAV] = useState(1);
  const [selecao, setSelecao] = useState(null);
  const [svAtual, setSvAtual] = useState(null);
  const [svs, setSvs] = useState(SVS_INICIAIS);
  const [missoes, setMissoes] = useState(MISSOES_INICIAIS);
  const [missaoDetalhada, setMissaoDetalhada] = useState(null);
  const [criandoMissao, setCriandoMissao] = useState(false);
  const [adicionandoSav, setAdicionandoSav] = useState(false);

  const navegar = p => {
    setPagina(p);
    if(p==="nova"){ setEtapaSAV(1); setSelecao(null); }
    if(p==="missoes"){ setCriandoMissao(false); }
  };

  const handleSalvarSAV = dados => {
    setSvs(prev => [{
      numero:dados.numero, favorecido:dados.emp?.nome,
      tipo:"Nacional", vinculo:dados.emp?.tipo, onus:dados.selecao?.onus,
      destino:dados.destino, periodo:dados.periodo,
      inicio:dados.inicio, fim:dados.fim,
      dias:0, diarias:dados.diariasTotal||0,
      situacao:dados.situacao, missaoId:null,
    }, ...prev]);
    setSvAtual(dados);
    setPagina("confirmacao");
  };

  const handleSalvarMissao = missao => {
    setMissoes(prev => [missao, ...prev]);
    setSvs(prev => prev.map(s => missao.savIds.includes(s.numero) ? {...s, missaoId:missao.id} : s));
    setCriandoMissao(false);
    setPagina("missoes");
  };

  const renderConteudo = () => {
    if(pagina==="dashboard") return <Dashboard svs={svs} missoes={missoes} onNavegar={navegar} />;

    if(pagina==="missoes") {
      if(criandoMissao) return <CriarMissao svs={svs} onSalvar={handleSalvarMissao} onVoltar={()=>setCriandoMissao(false)} />;
      return (
        <>
          <MissoesPage missoes={missoes} svs={svs} onCriarMissao={()=>setCriandoMissao(true)} onVerMissao={m=>setMissaoDetalhada(m)} />
          {missaoDetalhada && (
            <ModalDetalheMissao
              missao={missaoDetalhada}
              svs={svs}
              onFechar={()=>setMissaoDetalhada(null)}
              onAdicionarSav={()=>setAdicionandoSav(true)}
            />
          )}
        </>
      );
    }

    if(pagina==="nova"){
      if(etapaSAV===1) return <Passo1 onConfirmar={s=>{setSelecao(s);setEtapaSAV(2);}} />;
      return <Passo2 selecao={selecao} onSalvar={handleSalvarSAV} onVoltar={()=>setEtapaSAV(1)} />;
    }

    if(pagina==="prestacao") return <PrestacaoContas svs={svs} onVoltar={()=>navegar("dashboard")} />;

    if(pagina==="solicitacoes") return (
      <div style={{padding:"32px 36px"}}>
        <div style={{marginBottom:24}}><h1 style={{fontSize:22,fontWeight:700,color:"#1a2332",marginBottom:4}}>Solicitações</h1><p style={{color:"#8d9db0",fontSize:14}}>{svs.length} solicitações encontradas</p></div>
        <div className="card-section"><div style={{overflowX:"auto"}}><table className="table-modern"><thead><tr><th>Nº SV</th><th>Solicitante</th><th>Destino</th><th>Período</th><th>Vínculo</th><th>Ônus</th><th>Diárias</th><th>Missão</th><th>Status</th></tr></thead><tbody>{svs.map((s,i)=>(<tr key={i}><td><span className="sv-link">{s.numero}</span></td><td style={{fontWeight:500,fontSize:12}}>{s.favorecido}</td><td style={{color:"#4a5568",fontSize:12}}>{s.destino}</td><td style={{color:"#4a5568",fontSize:12}}>{s.periodo}</td><td><span className={`badge ${s.vinculo==="Empregado"?"bb":"bo"}`}>{s.vinculo}</span></td><td style={{fontSize:12,color:"#4a5568"}}>{s.onus}</td><td style={{fontWeight:600,color:"#1a6b3a"}}>R$ {(s.diarias||0).toLocaleString("pt-BR",{minimumFractionDigits:2})}</td><td>{s.missaoId?<span className="mss-link">{s.missaoId}</span>:<span style={{color:"#c0c0c0",fontSize:12}}>—</span>}</td><td>{getSavBadge(s.situacao)}</td></tr>))}</tbody></table></div></div>
      </div>
    );

    if(pagina==="confirmacao") return (
      <div style={{padding:"60px 36px",maxWidth:620,margin:"0 auto",textAlign:"center"}}>
        <div style={{width:72,height:72,background:svAtual?.situacao==="Encaminhado"?"#e8f5e9":"#fff8e1",borderRadius:50,display:"flex",alignItems:"center",justifyContent:"center",fontSize:32,margin:"0 auto 20px"}}>{svAtual?.situacao==="Encaminhado"?"✅":"💾"}</div>
        <h1 style={{fontSize:22,fontWeight:700,color:"#1a2332",marginBottom:8}}>{svAtual?.situacao==="Encaminhado"?"Solicitação Encaminhada!":"Rascunho Salvo!"}</h1>
        <p style={{color:"#8d9db0",marginBottom:24,fontSize:14}}>Número: <strong style={{color:"#1a2332"}}>{svAtual?.numero}</strong></p>
        <div style={{padding:"16px 20px",background:"#f0faf4",border:"1px solid #a5d6a7",borderRadius:10,marginBottom:16,fontSize:13,color:"#2e7d32",display:"flex",alignItems:"center",gap:10}}>
          <span style={{fontSize:20}}>🚐</span>
          <span>Dica: depois de criar solicitações para todos os viajantes, agrupe-as em uma <strong>Missão</strong> para coordenar o veículo!</span>
        </div>
        <div style={{display:"flex",gap:12,justifyContent:"center"}}>
          <button className="btn-secondary" onClick={()=>navegar("dashboard")}>← Voltar ao Painel</button>
          <button className="btn-outline" onClick={()=>navegar("missoes")}>🚐 Criar Missão</button>
          <button className="btn-primary" onClick={()=>navegar("nova")}>+ Nova Solicitação</button>
        </div>
      </div>
    );

    return (
      <div style={{padding:"60px 36px",textAlign:"center",color:"#8d9db0"}}>
        <div style={{fontSize:48,marginBottom:16}}>🔧</div>
        <h2 style={{fontSize:18,fontWeight:600,color:"#1a2332",marginBottom:8}}>Módulo em desenvolvimento</h2>
        <p style={{fontSize:14}}>Esta funcionalidade estará disponível em breve.</p>
      </div>
    );
  };

  return (
    <Layout pagina={criandoMissao?"missoes":pagina} onNavegar={navegar}>
      {renderConteudo()}
    </Layout>
  );
}
