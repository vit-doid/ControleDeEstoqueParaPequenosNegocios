import express from 'express';
import fs from 'node:fs';
import path from 'node:path';

const app = express();
const PORT = process.env.PORT || 3000;

const DATA_DIR = path.join(import.meta.dirname, 'data');
const DB_FILE = path.join(DATA_DIR, 'estoque.json');

app.use(express.json());
app.use(express.static(path.join(import.meta.dirname, 'public')));


// "Banco de dados"
function carregar() {
  try {
    return JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
  } catch {
    return { proximoId: 1, produtos: [], movimentacoes: [] };
  }
}

function salvar(db) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  const tmp = DB_FILE + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify(db, null, 2));
  fs.renameSync(tmp, DB_FILE);
}

function lerProduto(body) {
  const nome = String(body.nome ?? '').trim();
  const num = (v) => Number(v);
  const p = {
    nome,
    codigo: String(body.codigo ?? '').trim(),
    categoria: String(body.categoria ?? '').trim(),
    quantidade: num(body.quantidade ?? 0),
    minimo: num(body.minimo ?? 0),
    custo: num(body.custo ?? 0),
    preco: num(body.preco ?? 0),
  };
  if (!nome) return { erro: 'O nome do produto é obrigatório.' };
  if (!Number.isInteger(p.quantidade) || p.quantidade < 0) return { erro: 'Quantidade inválida.' };
  if (!Number.isInteger(p.minimo) || p.minimo < 0) return { erro: 'Estoque mínimo inválido.' };
  if (!(p.custo >= 0) || !(p.preco >= 0)) return { erro: 'Preços inválidos.' };
  return { p };
}


//Rota de verificação (a sua original)
app.get('/ok', (req, res) => {
  res.json({ status: 'ok' });
});


//Produtos 
app.get('/api/produtos', (req, res) => {
  res.json(carregar().produtos);
});


app.post('/api/produtos', (req, res) => {
  const { p, erro } = lerProduto(req.body);
  if (erro) return res.status(400).json({ erro });
  const db = carregar();
  if (p.codigo && db.produtos.some((x) => x.codigo === p.codigo))
    return res.status(409).json({ erro: 'Já existe um produto com esse código.' });
  const produto = { id: db.proximoId++, ...p, criadoEm: new Date().toISOString() };
  db.produtos.push(produto);
  if (produto.quantidade > 0)
    db.movimentacoes.push({
      id: Date.now(), produtoId: produto.id, produto: produto.nome,
      tipo: 'entrada', quantidade: produto.quantidade,
      observacao: 'Estoque inicial', data: new Date().toISOString(),
    });
  salvar(db);
  res.status(201).json(produto);
});

app.put('/api/produtos/:id', (req, res) => {
  const { p, erro } = lerProduto(req.body);
  if (erro) return res.status(400).json({ erro });
  const db = carregar();
  const produto = db.produtos.find((x) => x.id === Number(req.params.id));
  if (!produto) return res.status(404).json({ erro: 'Produto não encontrado.' });
  if (p.codigo && db.produtos.some((x) => x.codigo === p.codigo && x.id !== produto.id))
    return res.status(409).json({ erro: 'Já existe um produto com esse código.' });
  

  Object.assign(produto, { ...p, quantidade: produto.quantidade });
  salvar(db);
  res.json(produto);
});

app.delete('/api/produtos/:id', (req, res) => {
  const db = carregar();
  const antes = db.produtos.length;
  db.produtos = db.produtos.filter((x) => x.id !== Number(req.params.id));
  if (db.produtos.length === antes) return res.status(404).json({ erro: 'Produto não encontrado.' });
  salvar(db);
  res.status(204).end();
});

// Movimentações (entrada / saída)
app.post('/api/produtos/:id/movimentacoes', (req, res) => {
  const { tipo, observacao } = req.body;
  const qtd = Number(req.body.quantidade);
  if (!['entrada', 'saida'].includes(tipo)) return res.status(400).json({ erro: 'Tipo inválido.' });
  if (!Number.isInteger(qtd) || qtd <= 0) return res.status(400).json({ erro: 'Informe uma quantidade maior que zero.' });
  const db = carregar();
  const produto = db.produtos.find((x) => x.id === Number(req.params.id));
  if (!produto) return res.status(404).json({ erro: 'Produto não encontrado.' });
  if (tipo === 'saida' && qtd > produto.quantidade)
    return res.status(400).json({ erro: `Estoque insuficiente (disponível: ${produto.quantidade}).` });
  produto.quantidade += tipo === 'entrada' ? qtd : -qtd;
  db.movimentacoes.push({
    id: Date.now(), produtoId: produto.id, produto: produto.nome, tipo, quantidade: qtd,
    observacao: String(observacao ?? '').trim(), data: new Date().toISOString(),
  });
  salvar(db);
  res.status(201).json(produto);
});

app.get('/api/movimentacoes', (req, res) => {
  res.json(carregar().movimentacoes.slice().reverse().slice(0, 200));
});


app.get('/api/resumo', (req, res) => {
  const { produtos } = carregar();
  res.json({
    totalProdutos: produtos.length,
    totalUnidades: produtos.reduce((s, p) => s + p.quantidade, 0),
    valorCusto: produtos.reduce((s, p) => s + p.quantidade * p.custo, 0),
    valorVenda: produtos.reduce((s, p) => s + p.quantidade * p.preco, 0),
    baixoEstoque: produtos.filter((p) => p.quantidade <= p.minimo).length,
  });
});

app.listen(PORT, () => {
  console.log(`Servidor rodando em http://localhost:${PORT}`);
});
