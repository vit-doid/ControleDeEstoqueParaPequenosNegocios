# Controle de Estoque

API em **Express 5** para controle de estoque de pequenos negócios, com tela web incluída.

## Como rodar

```bash
npm install
cp .env.example .env
npm run dev
```

A aplicação sobe em `http://localhost:3000` (a tela fica na raiz e a API em `/api`).

Os dados são salvos em `data/estoque.json`, criado automaticamente.

## Endpoints

| Verbo  | Rota                              | Descrição                                   |
|--------|-----------------------------------|---------------------------------------------|
| GET    | /ok                               | Verificação: `{ "status": "ok" }`           |
| GET    | /api/produtos                     | Lista os produtos                           |
| POST   | /api/produtos                     | Cadastra um produto                         |
| PUT    | /api/produtos/:id                 | Edita um produto                            |
| DELETE | /api/produtos/:id                 | Exclui um produto                           |
| POST   | /api/produtos/:id/movimentacoes   | Registra entrada ou saída de estoque        |
| GET    | /api/movimentacoes                | Histórico das últimas movimentações         |
| GET    | /api/resumo                       | Totais e quantidade de itens com estoque baixo |

### Exemplo: cadastrar produto

```json
POST /api/produtos
{
  "nome": "Café 500g",
  "codigo": "CAF-001",
  "categoria": "Mercearia",
  "quantidade": 10,
  "minimo": 3,
  "custo": 12.5,
  "preco": 20
}
```

### Exemplo: registrar saída

```json
POST /api/produtos/1/movimentacoes
{ "tipo": "saida", "quantidade": 2, "observacao": "venda balcão" }
```

`tipo` aceita `entrada` ou `saida`. Não é possível dar saída maior que o estoque disponível.
