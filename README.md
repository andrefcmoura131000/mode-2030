# MODE 2030

App pessoal (PWA) para acompanhar treino de hipertrofia, alimentação, água, peso e suplementos.
Funciona sem rede, instala-se no ecrã principal e guarda tudo **só no telemóvel**.

- Sem servidor e sem dependências: HTML, CSS e JavaScript simples.
- Dados em IndexedDB. Backup manual em JSON (Definições → Backup), com lembrete semanal no ecrã Hoje.
- Fotos dos exercícios: [free-exercise-db](https://github.com/yuhonas/free-exercise-db), domínio público (Unlicense).

---

## 1. Publicar no GitHub Pages (uma vez)

### Opção A — pelo site do GitHub (sem instalar nada)

1. Entrar em <https://github.com> com a conta.
2. Canto superior direito: **+** → **New repository**.
3. Nome: `mode-2030`. Visibilidade: **Public** (o GitHub Pages gratuito exige repositório público; os dados pessoais não vão para lá, ficam no telemóvel). Não marcar "Add a README". **Create repository**.
4. Na página do repositório vazio: **uploading an existing file**.
5. Abrir a pasta `mode-2030` no Explorador do Windows, selecionar **tudo o que está lá dentro** (Ctrl+A) e arrastar para a página. Esperar que acabe de carregar (são cerca de 100 ficheiros, ~3 MB).
6. Em baixo: **Commit changes**.
7. No repositório: **Settings** → **Pages** (menu à esquerda).
8. Em *Build and deployment*: Source **Deploy from a branch**, Branch **main**, pasta **/ (root)** → **Save**.
9. Esperar 1–2 minutos e atualizar a página. Aparece o endereço, do género
   `https://NOME-DE-UTILIZADOR.github.io/mode-2030/`.

### Opção B — pela linha de comandos (com o GitHub CLI)

```bash
winget install GitHub.cli
```

```bash
gh auth login --web
```

```bash
git init -b main && git add . && git commit -m "MODE 2030"
```

```bash
gh repo create mode-2030 --public --source . --push
```

Depois ativar o Pages como nos passos 7–9 da opção A.

## 2. Instalar no telemóvel

### Android (Chrome)

1. Abrir o endereço `https://NOME-DE-UTILIZADOR.github.io/mode-2030/` no **Chrome**.
2. Esperar uns segundos (a app guarda-se para funcionar sem rede).
3. Menu **⋮** → **Adicionar ao ecrã principal** → **Instalar**.
   (Em algumas versões aparece logo um aviso "Instalar app" em baixo.)
4. Abrir pelo ícone **MODE 2030**. Abre em ecrã inteiro, sem barra do browser.

### iPhone (Safari)

1. Abrir o endereço no **Safari** (tem de ser o Safari).
2. Botão **Partilhar** (quadrado com seta) → **Adicionar ao ecrã principal** → **Adicionar**.
3. Abrir pelo ícone. Nota: no iPhone o fim do descanso só dá som e aviso no ecrã (o iOS não deixa web apps vibrar).

### Primeira utilização

1. **Definições → Plano e descanso**: confirmar a **data de início** (por defeito é o dia em que a app foi aberta pela primeira vez).
2. **Definições → Exercícios**: ajustar o incremento de cada exercício ao material do ginásio (barra 2,5 kg; halteres 2 kg; polias/máquinas 5 kg por defeito).
3. **Definições → Base de alimentos**: confirmar os valores com os rótulos.
4. Exportar o primeiro backup em **Definições → Backup → Exportar e guardar no Drive**.

## 3. Atualizar a app depois de alterações

1. Correr `node tools/build-sw.mjs` (gera uma nova versão do `sw.js`; sem isto o telemóvel continua com a versão antiga em cache).
2. Enviar os ficheiros para o GitHub (opção A: *Add file → Upload files*; opção B: `git add . && git commit -m "…" && git push`).
3. No telemóvel, ao abrir a app aparece **"Nova versão disponível → Atualizar"**. Os dados não se perdem.

## 4. Backups

- Os dados vivem só no telemóvel. Se a app for desinstalada, ou se os dados do Chrome forem limpos, perdem-se.
- **Definições → Backup**: "Exportar e guardar no Drive…" abre o menu de partilha do Android (Drive, Gmail, etc.).
- Para restaurar (ou passar para outro telemóvel): **Importar** e escolher o ficheiro `.json`. Substitui todos os dados.

## Para programadores

```bash
npm test
```

```bash
npm run serve
```

- `js/logic.js` — regras (semanas, readaptação, progressão dupla, macros, regra do peso), testadas em `tests/`.
- `js/store.js` — IndexedDB (chave → valor: `config`, `active`, `day:AAAA-MM-DD`, `session:<id>`, `photo:<id>`).
- `js/seed.js` — plano de treino, alimentos, refeições e suplementos iniciais.
- `js/views/` — um ficheiro por separador; `sessao.js` é o modo treino.
- `tools/build-sw.mjs` — gera o service worker com a lista de ficheiros e a versão.
