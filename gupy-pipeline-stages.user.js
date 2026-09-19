// ==UserScript==
// @name         Gupy Pipeline Stages
// @namespace    https://github.com/luascfl/gupy-pipeline-stages
// @version      1.0.0
// @description  Cria sob confirmação as etapas padrão de um processo seletivo Gupy.
// @author       luascfl
// @license      MIT
// @match        https://*.gupy.io/companies/jobs/edit/*/steps*
// @grant        GM_registerMenuCommand
// @run-at        document-idle
// ==/UserScript==

(() => {
  'use strict';
  const PANEL_ID = 'gupy-pipeline-stages';
  const DEFAULT_STAGES = Object.freeze([
    'TRIAGEM',
    'ENTREVISTA COM RH',
    'QUESTIONÁRIO DE INTEGRIDADE E COMPLIANCE',
    'ENTREVISTA COM GESTÃO',
    'CARTA OFERTA',
  ]);
  const pause = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));

  function setStatus(message) {
    const target = document.querySelector(`#${PANEL_ID} .status`);
    if (target) target.textContent = message;
  }

  function addStageButton() {
    return [...document.querySelectorAll('button')].find((button) => /adicionar etapa|add stage/i.test(button.textContent.trim()));
  }

  function setValue(input, value) {
    const setter = Object.getOwnPropertyDescriptor(Object.getPrototypeOf(input), 'value')?.set;
    setter ? setter.call(input, value) : (input.value = value);
    input.dispatchEvent(new Event('input', { bubbles: true }));
    input.dispatchEvent(new Event('change', { bubbles: true }));
  }

  function confirmButton() {
    return [...document.querySelectorAll('button')].find((button) => /^(adicionar|salvar|confirmar|criar)$/i.test(button.textContent.trim()) && !button.disabled);
  }

  async function addDefaultStages() {
    if (!confirm(`Criar estas ${DEFAULT_STAGES.length} etapas nesta vaga?\n\n${DEFAULT_STAGES.join('\n')}`)) return;
    for (const stage of DEFAULT_STAGES) {
      const add = addStageButton();
      if (!add) throw new Error('Não encontrei o botão “Adicionar etapa”.');
      add.click();
      await pause(250);
      const input = document.querySelector('input#name');
      if (!input) throw new Error(`O formulário da etapa “${stage}” não abriu.`);
      setValue(input, stage);
      const submit = confirmButton();
      if (!submit) throw new Error(`Não encontrei como confirmar a etapa “${stage}”.`);
      submit.click();
      await pause(700);
    }
    setStatus(`${DEFAULT_STAGES.length} etapas enviadas. Revise a ordem e os detalhes antes de publicar a vaga.`);
  }

  function mount() {
    document.getElementById(PANEL_ID)?.remove();
    const panel = document.createElement('aside');
    panel.id = PANEL_ID;
    panel.innerHTML = '<strong>Gupy, etapas da vaga</strong><button type="button">Criar etapas padrão</button><span class="status"></span>';
    Object.assign(panel.style, { background: '#fff', border: '1px solid #d0d7de', borderRadius: '8px', bottom: '18px', boxShadow: '0 4px 20px #0002', font: '14px system-ui,sans-serif', padding: '10px', position: 'fixed', right: '18px', zIndex: 2147483647 });
    const button = panel.querySelector('button');
    Object.assign(button.style, { background: '#1455b8', border: '0', borderRadius: '5px', color: '#fff', cursor: 'pointer', display: 'block', margin: '8px 0', padding: '7px 10px' });
    button.addEventListener('click', () => addDefaultStages().catch((error) => setStatus(error.message)));
    document.body.append(panel);
  }

  GM_registerMenuCommand('Reabrir Gupy Pipeline Stages', mount);
  mount();
})();
