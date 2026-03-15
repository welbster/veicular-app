<h1 align="center">
  <br>
  <img src="https://img.icons8.com/color/120/map-pin.png" alt="Logo Veicular App" width="80">
  <br>
  Sistema de Gerenciamento de Rotas e Atividades Veiculares
  <br>
</h1>

<h4 align="center">Uma aplicação Progressive Web App (PWA) de controle operacional logístico offline-first focada em operações sanitárias e de campo.</h4>

<p align="center">
  <a href="#-sobre-o-projeto">Sobre</a> •
  <a href="#-funcionalidades-chave">Funcionalidades</a> •
  <a href="#-tecnologias-utilizadas">Tecnologias</a> •
  <a href="#-demonstração">Demonstração</a> •
  <a href="#-arquitetura-e-padroes">Arquitetura</a> •
  <a href="#-como-rodar-localmente">Rodar Local</a>
</p>

![Screenshot do Sistema](https://dummyimage.com/1200x600/1e293b/ffffff.png&text=Insira+um+Print+bonito+do+seu+sistema+aqui)

## 🎯 Sobre o Projeto 

O **Veicular App** é um sistema completo de gestão de rotas para veículos especializados em áreas mapeadas geograficamente. Ele foi projetado do zero para atuar em ambientes com **baixa ou nenhuma conectividade com a internet**, utilizando conceitos avançados de PWA e Bancos de Dados locais (IndexedDB) para garantir que operadores logísticos e motoristas de frota nunca sejam interrompidos no campo.

A aplicação separa as responsabilidades entre dois perfis principais:
- **Gestores:** Podem desenhar rotas em mapas dinâmicos, definir status de cobertura e coordenar centenas de setores em tempo real através de dashboards e modais interativos.
- **Operadores de Campo:** Trabalham diretamente com a viatura utilizando uma interface mobile-first offline. O sistema registra a geolocalização exata, o trajeto percorrido e o volume de consumo dos recursos associados a cada área cadastrada.

---

## ✨ Funcionalidades Chave

- **🗺️ Mapeamento Interativo Dinâmico:** Integração avançada com o _Leaflet_ e dados GeoJSON, permitindo seleção interativa visual de polígonos correspondentes a quarteirões da cidade.
- **📶 Offline-First com Filas de Sincronia:** Uso em conjunto do `Service Worker` e `IndexedDB`. As operações realizadas na rua sem sinal de internet entram numa fila invisível e assim que a conexão retorna aos dispositivos, todas as ações sobem automaticamente sem interferência do usuário.
- **🚦 Autenticação Baseada em Perfis (RBAC):** Login com verificação baseada em tokens (JWT) controlados pelo Front-End e Hashes de acesso para garantir controle estrito sobre quem pode criar atividades vs quem as executa.
- **📱 PWA & Mobile Responsivo:** Construído para parecer um app nativo nos celulares dos operadores, ocultando a barra do navegador, instalando diretamente na área de trabalho e servindo as fontes e CSS via caches instantâneos.
- **📦 Relatórios e Dashboards Dinâmicos:** As páginas renderizam dezenas de métricas e status baseados na conclusão dos ciclos logísticos e atividades usando o processamento local no navegador.

---

## 🛠 Tecnologias Utilizadas

O sistema adota uma arquitetura Serverless baseada primordialmente em Frontend moderno:

* **HTML5, CSS3, e Vanilla JavaScript (ES6+):** Sem a dependências pesadas de frameworks tradicionais como React ou Angular, garantindo velocidade brutal, tempo minúsculo de carregamento (<1s) e total domínio sobre o DOM.
* **[Leaflet.js](https://leafletjs.com/):** A principal biblioteca open-source do mercado para renderização de mapas vetoriais interativos no browser.
* **[Turf.js](http://turfjs.org/):** Análises geoespaciais e geofencing diretos em JavaScript client-side (como cálculo de extensão e áreas em metros quadrados a partir de polígonos na tela).
* **[IndexedDB API](https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API):** Banco de dados relacional embarcado no navegador que permite salvar dados no disco local da máquina se o usuário estiver na rua.
* **[SweetAlert2](https://sweetalert2.github.io/):** Biblioteca que substitui os alertas feios padronizados pelo navegador utilizando belos modais customizáveis, orgânicos e animados.
* **PWA / Service Workers (SW):** Arquitetura para cachê agressivo de todos os arquivos estáticos para que o App funcione como Native Apps.

---

## 🚀 Demonstração (Modo Portfólio)

> **Nota para os Recrutadores:** Os repositórios atípicos geralmente estão ligados à uma REST API real, Banco de Dados Relacional e etc, que morrem depois. **Para efeitos práticos no meu portfólio**, adaptei este projeto com arquitetura de _Mocking_. 
> As requisições que iriam para o servidor REST batem numa Controller customizada direto no front-end provendo dados fictícios randômicos ou em estado contínuo, para não precisar subir servidores caros e propiciar os testes das telas integralmente para vocês. O arquivo `backend.gs` neste repositório representa como as Queries eram manipuladas no backend original e autenticações antes do tratamento _"offline test"_.

Visite o sistema rodando live aqui no GitHub Pages:
**[👉 Acessar Veicular App Online](https://welbster.github.io/veicular-app/)**

_Testes de Login:*_
* **Conta de Gestão:** E-mail: `gestor@portfolio.com` / Senha: (qualquer senha fictícia ex: `123`)
* **Conta de Rua:** E-mail: `operador@portfolio.com` / Senha: (qualquer senha fictícia ex: `123`)

---

## ⚙️ Como Rodar Localmente

Se você quiser rodar na sua própria máquina, devido a segurança severa do modo Offline nativo, os PWAs requerem rodar num servidor HTTP (não abre mais clicando no arquivo index.html no Windows). 

1. Faça o clone do projeto:
```bash
git clone https://github.com/welbster/veicular-app.git
```

2. Entre no diretório gerado:
```bash
cd veicular-app
```

3. Suba um Servidor Estático Rápido (Exemplo usando Python Nativo, NodeJS Vercel, PHP etc):
```bash
python -m http.server 3000
# Ou: npx serve -p 3000
```
4. Navegue até seu localhost rodando na porta respectiva no browser `http://localhost:3000/`.

---
<p align="center">
  Desenvolvido com carinho e bastante café por <strong>Welbster</strong> ☕
</p>
