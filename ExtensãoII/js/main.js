/* =========================================================
   Projeto de Extensão – Diagramas de Blocos Táteis
   Script principal (JavaScript puro)

   Conteúdo:
   1. Menu responsivo
   2. Barra de acessibilidade (fonte, contraste, espaçamento)
   3. Leitura em voz alta ("Ouvir a página")
   4. VLibras (integração com teclado)
   5. Atalhos de teclado (Alt + número) e links internos
   6. Teclado: ENTER e ESPAÇO em elementos role="button"
   7. Ano no rodapé
   ========================================================= */

(function () {
  "use strict";

  var raiz = document.documentElement;

  /* ---------------------------------------------------------
     Utilitário: avisa leitores de tela (região aria-live)
     --------------------------------------------------------- */
  var regiaoAvisos = document.getElementById("anuncios");

  function anunciar(mensagem) {
    if (!regiaoAvisos) return;
    regiaoAvisos.textContent = "";
    window.setTimeout(function () { regiaoAvisos.textContent = mensagem; }, 60);
  }

  /* ---------------------------------------------------------
     1. MENU RESPONSIVO
     - aria-expanded / aria-controls para leitores de tela
     - ESC fecha o menu e devolve o foco ao botão
     --------------------------------------------------------- */
  var botaoMenu = document.querySelector(".nav-toggle");
  var menu = document.getElementById("menu-principal");
  var consultaMobile = window.matchMedia("(max-width: 48rem)");

  function abrirMenu() {
    if (!menu || !botaoMenu) return;
    menu.hidden = false;
    botaoMenu.setAttribute("aria-expanded", "true");
  }

  function fecharMenu() {
    if (!menu || !botaoMenu) return;
    menu.hidden = true;
    botaoMenu.setAttribute("aria-expanded", "false");
  }

  function ajustarMenu() {
    if (!botaoMenu || !menu) return;
    if (consultaMobile.matches) {
      fecharMenu();
    } else {
      menu.hidden = false;
      botaoMenu.setAttribute("aria-expanded", "false");
    }
  }

  if (botaoMenu && menu) {
    botaoMenu.addEventListener("click", function () {
      if (botaoMenu.getAttribute("aria-expanded") === "true") { fecharMenu(); } else { abrirMenu(); }
    });

    if (consultaMobile.addEventListener) {
      consultaMobile.addEventListener("change", ajustarMenu);
    } else {
      consultaMobile.addListener(ajustarMenu); // navegadores antigos
    }
    ajustarMenu();
  }

  /* ---------------------------------------------------------
     2. BARRA DE ACESSIBILIDADE
     - Preferências salvas em localStorage (chave "acc-prefs")
     - O <head> aplica as preferências antes de desenhar a página
     --------------------------------------------------------- */
  var CHAVE = "acc-prefs";
  var TAMANHOS = [100, 112.5, 125, 150, 175, 200]; // porcentagem do tamanho da fonte
  var prefs = { fonte: 100, contraste: false, espacamento: false };

  function carregarPrefs() {
    try {
      var salvo = JSON.parse(localStorage.getItem(CHAVE) || "{}");
      if (typeof salvo.fonte === "number" && TAMANHOS.indexOf(salvo.fonte) !== -1) prefs.fonte = salvo.fonte;
      prefs.contraste = !!salvo.contraste;
      prefs.espacamento = !!salvo.espacamento;
    } catch (e) { /* armazenamento indisponível: segue com o padrão */ }
  }

  function salvarPrefs() {
    try { localStorage.setItem(CHAVE, JSON.stringify(prefs)); } catch (e) { /* ignora */ }
  }

  function atualizarBotoes() {
    var botaoContraste = document.querySelector('[data-acao="contraste"]');
    var botaoEspacamento = document.querySelector('[data-acao="espacamento"]');
    if (botaoContraste) botaoContraste.setAttribute("aria-pressed", String(prefs.contraste));
    if (botaoEspacamento) botaoEspacamento.setAttribute("aria-pressed", String(prefs.espacamento));
  }

  function aplicarPrefs() {
    if (prefs.fonte === 100) { raiz.style.fontSize = ""; } else { raiz.style.fontSize = prefs.fonte + "%"; }
    raiz.classList.toggle("alto-contraste", prefs.contraste);
    raiz.classList.toggle("espacamento-ampliado", prefs.espacamento);
    atualizarBotoes();
  }

  function mudarFonte(passo) {
    var indice = TAMANHOS.indexOf(prefs.fonte);
    var novo = indice + passo;
    if (novo < 0) { anunciar("O texto já está no tamanho mínimo."); return; }
    if (novo >= TAMANHOS.length) { anunciar("O texto já está no tamanho máximo."); return; }
    prefs.fonte = TAMANHOS[novo];
    aplicarPrefs();
    salvarPrefs();
    anunciar("Tamanho do texto: " + prefs.fonte + " por cento.");
  }

  function restaurarPrefs() {
    prefs = { fonte: 100, contraste: false, espacamento: false };
    pararLeitura();
    aplicarPrefs();
    salvarPrefs();
    anunciar("Configurações de acessibilidade restauradas para o padrão.");
  }

  /* ---------------------------------------------------------
     3. LEITURA EM VOZ ALTA (Web Speech API)
     Complementa – e não substitui – os leitores de tela.
     --------------------------------------------------------- */
  var sintese = window.speechSynthesis;
  var suporteVoz = !!(sintese && window.SpeechSynthesisUtterance);
  var botaoOuvir = document.querySelector('[data-acao="ouvir"]');
  var lendo = false;
  var idLeitura = 0;

  if (botaoOuvir && suporteVoz) botaoOuvir.hidden = false;

  function dividirTexto(texto) {
    var pedacos = [];
    texto.split(/\n+/).forEach(function (linha) {
      linha = linha.trim();
      if (!linha) return;
      var frases = linha.match(/[^.!?;:]+[.!?;:]*\s*/g) || [linha];
      frases.forEach(function (frase) {
        frase = frase.trim();
        if (frase) pedacos.push(frase);
      });
    });
    return pedacos;
  }

  function pararLeitura() {
    if (!suporteVoz) return;
    idLeitura++;
    sintese.cancel();
    if (lendo) anunciar("Leitura interrompida.");
    lendo = false;
    if (botaoOuvir) botaoOuvir.textContent = "Ouvir a página";
  }

  function iniciarLeitura() {
    var conteudo = document.getElementById("conteudo");
    if (!suporteVoz || !conteudo) return;
    var pedacos = dividirTexto(conteudo.innerText);
    if (!pedacos.length) return;

    sintese.cancel();
    idLeitura++;
    var minhaLeitura = idLeitura;
    lendo = true;
    botaoOuvir.textContent = "Parar leitura";

    pedacos.forEach(function (frase, i) {
      var fala = new SpeechSynthesisUtterance(frase);
      fala.lang = "pt-BR";
      fala.onend = function () {
        if (minhaLeitura === idLeitura && i === pedacos.length - 1) {
          lendo = false;
          botaoOuvir.textContent = "Ouvir a página";
        }
      };
      sintese.speak(fala);
    });
  }

  window.addEventListener("pagehide", function () { if (suporteVoz) sintese.cancel(); });

  /* ---------------------------------------------------------
     4. VLIBRAS
     O widget é carregado pelo script oficial no final do HTML.
     Aqui apenas garantimos o acesso pelo teclado.
     --------------------------------------------------------- */
  function abrirVLibras() {
    var botaoVw = document.querySelector("[vw-access-button]");
    if (botaoVw && window.VLibras) {
      botaoVw.click();
    } else {
      anunciar("O VLibras não está disponível. Verifique sua conexão com a internet.");
    }
  }

  function prepararVLibras() {
    var botaoVw = document.querySelector("[vw-access-button]");
    if (!botaoVw) return;
    botaoVw.setAttribute("role", "button");
    botaoVw.setAttribute("tabindex", "0");
    botaoVw.setAttribute("aria-label", "Abrir o VLibras, tradutor para Libras");
  }

  /* ---------------------------------------------------------
     Barra: um único ouvinte de clique para todos os botões.
     Como são <button> nativos, ENTER e ESPAÇO geram "click".
     --------------------------------------------------------- */
  var barra = document.getElementById("barra-acessibilidade");

  if (barra) {
    barra.addEventListener("click", function (evento) {
      var botao = evento.target.closest("[data-acao]");
      if (!botao) return;

      switch (botao.getAttribute("data-acao")) {
        case "fonte-menos": mudarFonte(-1); break;
        case "fonte-mais": mudarFonte(1); break;
        case "fonte-padrao":
          prefs.fonte = 100; aplicarPrefs(); salvarPrefs();
          anunciar("Tamanho do texto: padrão.");
          break;
        case "contraste":
          prefs.contraste = !prefs.contraste; aplicarPrefs(); salvarPrefs();
          anunciar(prefs.contraste ? "Alto contraste ativado." : "Alto contraste desativado.");
          break;
        case "espacamento":
          prefs.espacamento = !prefs.espacamento; aplicarPrefs(); salvarPrefs();
          anunciar(prefs.espacamento ? "Espaçamento do texto ampliado." : "Espaçamento do texto padrão.");
          break;
        case "ouvir":
          if (lendo) { pararLeitura(); } else { iniciarLeitura(); }
          break;
        case "vlibras": abrirVLibras(); break;
        case "restaurar": restaurarPrefs(); break;
      }
    });
  }

  carregarPrefs();
  aplicarPrefs();
  prepararVLibras();

  /* ---------------------------------------------------------
     5. ATALHOS DE TECLADO E LINKS INTERNOS
     Alt+1 conteúdo | Alt+2 menu | Alt+3 acessibilidade
     Alt+4 rodapé   | Alt+0 página de acessibilidade
     (usa event.code para funcionar também no macOS)
     --------------------------------------------------------- */
  var ATALHOS = {
    Digit1: "conteudo",
    Digit2: "menu-principal",
    Digit3: "barra-acessibilidade",
    Digit4: "rodape"
  };

  function irPara(id) {
    var alvo = document.getElementById(id);
    if (!alvo) return;

    // Em telas pequenas o menu fica recolhido: abre antes de focar
    if (id === "menu-principal" && menu.hidden) abrirMenu();

    var focavel = null;
    if (id === "menu-principal" || id === "barra-acessibilidade") {
      focavel = alvo.querySelector("a[href], button:not([hidden])");
    }
    if (!focavel) {
      if (!alvo.hasAttribute("tabindex")) alvo.setAttribute("tabindex", "-1");
      focavel = alvo;
    }
    focavel.focus();
    alvo.scrollIntoView({ block: "start" });
  }

  document.addEventListener("keydown", function (evento) {
    if (evento.key === "Escape") {
      if (lendo) pararLeitura();
      if (botaoMenu && consultaMobile.matches && botaoMenu.getAttribute("aria-expanded") === "true") {
        fecharMenu();
        botaoMenu.focus();
      }
      return;
    }

    if (evento.altKey && !evento.ctrlKey && !evento.metaKey) {
      if (evento.code === "Digit0") {
        evento.preventDefault();
        window.location.href = "acessibilidade.html";
      } else if (ATALHOS[evento.code]) {
        evento.preventDefault();
        irPara(ATALHOS[evento.code]);
      }
    }
  });

  // Links internos (#id): move o foco para o destino
  document.querySelectorAll('a[href^="#"]').forEach(function (link) {
    link.addEventListener("click", function (evento) {
      var id = link.getAttribute("href").slice(1);
      if (!id || !document.getElementById(id)) return;
      evento.preventDefault();
      irPara(id);
      if (window.history && history.replaceState) history.replaceState(null, "", "#" + id);
    });
  });

  /* ---------------------------------------------------------
     6. ENTER e ESPAÇO em elementos que não são <button>
     Qualquer elemento com role="button" passa a responder
     às duas teclas, como um botão nativo.
     --------------------------------------------------------- */
  document.addEventListener("keydown", function (evento) {
    var el = evento.target;
    if (!el || el.tagName === "BUTTON" || el.tagName === "A" || el.getAttribute("role") !== "button") return;
    if (evento.key === "Enter" || evento.key === " " || evento.key === "Spacebar") {
      evento.preventDefault();
      el.click();
    }
  });

  /* ---------------------------------------------------------
     7. ANO ATUAL NO RODAPÉ
     --------------------------------------------------------- */
  var ano = document.getElementById("ano-atual");
  if (ano) ano.textContent = new Date().getFullYear();
})();
