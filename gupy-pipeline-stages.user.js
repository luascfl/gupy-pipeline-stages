// ==UserScript==
// @name         Gupy Pipeline Stages
// @namespace    https://github.com/luascfl/gupy-pipeline-stages
// @version      2.0.1
// @description  Create all six configured pipeline stages after manual confirmation.
// @author       luascfl
// @license      MIT
// @match        https://*.gupy.io/companies/jobs/edit/*/steps*
// @downloadURL  https://raw.githubusercontent.com/luascfl/gupy-pipeline-stages/main/gupy-pipeline-stages.user.js
// @updateURL    https://raw.githubusercontent.com/luascfl/gupy-pipeline-stages/main/gupy-pipeline-stages.user.js
// @grant        GM_registerMenuCommand
// @run-at       document-idle
// ==/UserScript==

(() => {
  'use strict';
  const PANEL_ID = 'gupy-pipeline-stages';
  const TIMEOUT = 20000;
  const PHASE_TRIGGER = '.form-group > .dropdownSync .css-hlgwow';
  const JUSTIFICATION = '[data-testid="job-external-step-form"] > *:nth-child(2) > * > * > *:nth-child(1)';
  // Positions, payloads and selectors come from the reachable Automa groups.
  // Repeated phase clicks in the recording are normalized to one selected value.
  const STAGES = Object.freeze([
    { name: 'MAPEAMENTO COMPORTAMENTAL', phase: 2, phaseSelector: '*:nth-child(4) > * > *:nth-child(2)', justification: JUSTIFICATION, email: 'MAPEAMENTO COMPORTAMENTAL', assessment: 'Mapeamento Comportamental', assessmentSelector: '[data-testid="Mapeamento\\ Comportamental"] > *:nth-child(1)' },
    { name: 'TRIAGEM', phase: 1, phaseSelector: '* > * > *:nth-child(2) > *:nth-child(4) > * > *:nth-child(1)', internal: true },
    { name: 'ENTREVISTA COM RH', phase: 3, phaseSelector: '*:nth-child(4) > * > *:nth-child(3)', justification: 'textarea#objectivesDescription' },
    { name: 'QUESTIONÁRIO DE INTEGRIDADE E COMPLIANCE', phase: 2, phaseSelector: '*:nth-child(4) > * > *:nth-child(2)', justification: JUSTIFICATION, email: 'QUESTIONÁRIO INTEGRIDADE & COMPLIANCE', assessment: 'QUESTIONÁRIO DE INTEGRIDADE & COMPLIANCE', assessmentSelector: '[data-testid="QUESTIONÁRIO\\ DE\\ INTEGRIDADE\\ \\&\\ COMPLIANCE"] > *:nth-child(1)', custom: true },
    { name: 'ENTREVISTA COM GESTÃO', phase: 3, phaseTrigger: '*:nth-child(2) > * > *:nth-child(2) > *:nth-child(3) > *:nth-child(1) > *:nth-child(1)', phaseSelector: '*:nth-child(4) > * > *:nth-child(3)', justification: JUSTIFICATION },
    { name: 'CARTA OFERTA', phase: 4, phaseSelector: '*:nth-child(4) > * > *:nth-child(4)', justification: JUSTIFICATION },
  ]);
  let running = false;
  let activeForm = null;

  const text = (element) => (element?.textContent || '').replace(/\s+/g, ' ').trim();
  const visible = (element) => !!element?.isConnected && !element.closest('[hidden], [aria-hidden="true"]') && element.getClientRects().length > 0 && getComputedStyle(element).visibility !== 'hidden';
  const elements = (root, selector) => [...root.querySelectorAll(selector)].filter(visible);
  function one(root, selector, description) {
    const matches = elements(root, selector);
    if (matches.length > 1) throw new Error(`Ambiguous ${description}: ${matches.length} matching controls.`);
    return matches[0];
  }
  function status(message, state = 'idle') {
    const panel = document.getElementById(PANEL_ID);
    if (!panel) return;
    panel.dataset.state = state;
    panel.querySelector('.status').textContent = message;
    panel.querySelector('button').disabled = running;
  }
  function pageError() {
    const invalid = activeForm && elements(activeForm, '[aria-invalid="true"]')[0];
    if (invalid) return 'The stage form reports an invalid field.';
    const error = elements(document, '[role="alert"], .alert-danger, [data-testid*="error"]').find((element) => !element.closest(`#${PANEL_ID}`) && /error|erro|falh|failed|invalid|inválid|não foi|unable/i.test(text(element)));
    return error ? 'The page reports an error. Review the stage form before retrying.' : null;
  }
  function waitFor(predicate, description) {
    return new Promise((resolve, reject) => {
      let observer;
      let timer;
      let poll;
      const finish = (error, result) => {
        observer?.disconnect();
        clearTimeout(timer);
        clearInterval(poll);
        error ? reject(error) : resolve(result);
      };
      const check = () => {
        try {
          const error = pageError();
          if (error) throw new Error(error);
          const result = predicate();
          if (result) { finish(null, result); return true; }
        } catch (error) { finish(error); return true; }
        return false;
      };
      observer = new MutationObserver(check);
      observer.observe(document.body, { subtree: true, childList: true, attributes: true, characterData: true });
      // Poll properties as well as DOM mutations; elapsed time never proves success.
      poll = setInterval(check, 100);
      timer = setTimeout(() => finish(new Error(`Timed out waiting for ${description}.`)), TIMEOUT);
      check();
    });
  }
  function click(element) {
    const control = typeof element?.click === 'function' ? element : element?.closest?.('button, [role="button"], input, label');
    if (!control || control.disabled || control.getAttribute('aria-disabled') === 'true') throw new Error('The required control is unavailable or disabled.');
    control.click();
  }
  function setValue(input, value) {
    if (!(input instanceof HTMLInputElement || input instanceof HTMLTextAreaElement)) throw new Error('The source field is not an editable input.');
    const prototype = input instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
    Object.getOwnPropertyDescriptor(prototype, 'value').set.call(input, value);
    input.dispatchEvent(new Event('input', { bubbles: true }));
    input.dispatchEvent(new Event('change', { bubbles: true }));
  }
  function findForm() {
    const input = one(document, 'input#name', 'stage name field');
    if (!input) return null;
    for (let root = input.parentElement; root && root !== document.body; root = root.parentElement) {
      if (root.querySelector('button#btn-save-step')) return root;
    }
    throw new Error('Cannot identify a stage form containing both its name and save controls.');
  }
  function form() {
    const current = findForm();
    if (!current) throw new Error('The active stage form disappeared before saving.');
    activeForm = current;
    return current;
  }
  function addButton() {
    const matches = elements(document, 'button, input[type="button"], input[type="submit"]').filter((element) => !element.closest(`#${PANEL_ID}`) && /^(adicionar etapa|add stage)$/i.test(element.value || text(element)));
    if (matches.length > 1) throw new Error('More than one Add stage control is visible.');
    return matches[0];
  }
  function menuFor(control, root) {
    const owner = control.matches('[aria-controls]') ? control : control.querySelector('[aria-controls]');
    const ids = (owner?.getAttribute('aria-controls') || '').split(/\s+/).filter(Boolean);
    const owned = ids.map((id) => document.getElementById(id)).filter(visible);
    if (owned.length > 1) throw new Error('The control owns multiple visible menus.');
    if (owned[0]) return owned[0];
    return one(root, '[role="listbox"], [class$="-menu"]', 'open selection menu');
  }
  async function choosePhase(stage) {
    const root = form();
    // The management-stage recording uses a different source trigger; all
    // other groups use the common source trigger.
    const trigger = (stage.phaseTrigger && one(root, stage.phaseTrigger, 'funnel phase')) || one(root, PHASE_TRIGGER, 'funnel phase');
    if (!trigger) throw new Error('The source funnel phase control is missing.');
    const control = trigger.closest('.dropdownSync') || trigger.parentElement;
    click(trigger);
    const option = await waitFor(() => {
      const menu = menuFor(control, form());
      if (menu) {
        const options = elements(menu, '[role="option"]');
        if (options.length) return options[stage.phase - 1];
      }
      // Legacy Gupy menus use only structural selectors from the recording.
      return one(menu || form(), stage.phaseSelector, 'recorded funnel phase option');
    }, `funnel phase position ${stage.phase}`);
    const label = text(option);
    if (!label) throw new Error('The funnel phase option has no observable label.');
    click(option);
    await waitFor(() => {
      const current = one(form(), PHASE_TRIGGER, 'funnel phase');
      const selectedControl = current?.closest('.dropdownSync') || control;
      return text(selectedControl).includes(label) && !menuFor(selectedControl, form());
    }, 'the selected funnel phase');
  }
  async function chooseEmail(stage) {
    const input = await waitFor(() => one(form(), 'input#emailTemplateId', 'email template input'), 'the email template input');
    const control = input.closest('.dropdownSync, [class*="-container"]') || input.parentElement.parentElement;
    const trigger = one(control, 'div.css-19bb58m', 'email template opener');
    click(trigger || input);
    input.focus();
    setValue(input, stage.email);
    const option = await waitFor(() => {
      const menu = menuFor(input, form());
      if (!menu) return null;
      const options = elements(menu, '[role="option"]');
      const matches = options.filter((element) => text(element) === stage.email);
      if (matches.length > 1) throw new Error('The email template name is ambiguous.');
      return matches[0];
    }, `the exact email template ${stage.email}`);
    click(option);
    // Preserve the recording's Tab/blur commit without relying on a synthetic
    // key event to perform the browser's default focus traversal.
    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', code: 'Tab', bubbles: true }));
    input.dispatchEvent(new KeyboardEvent('keyup', { key: 'Tab', code: 'Tab', bubbles: true }));
    input.blur();
    await waitFor(() => !menuFor(input, form()) && elements(control, 'span, div').some((element) => text(element) === stage.email && !element.contains(input)), 'the committed email template');
  }
  function selected(element) {
    return !!element && (element.checked === true || element.getAttribute('aria-checked') === 'true' || element.getAttribute('aria-selected') === 'true' || element.getAttribute('data-state') === 'checked');
  }
  async function chooseAssessment(stage) {
    const root = form();
    const online = one(root, '#step-type-online', 'online resources control');
    if (!online) throw new Error('The online resources control is missing.');
    if (!selected(online)) click(one(online, 'path', 'online resources icon') || online);
    const addTest = await waitFor(() => {
      const current = form();
      const source = elements(current, 'div:nth-child(2) > div > button').filter((button) => /adicionar teste|add test/i.test(text(button)));
      const matches = source.length ? source : elements(current, 'button').filter((button) => /^(adicionar teste|add test)$/i.test(text(button)));
      if (matches.length > 1) throw new Error('The Add test control is ambiguous.');
      return matches[0];
    }, 'online resources and Add test');
    const existingDialogs = new Set(elements(document, '[role="dialog"]'));
    click(addTest);
    const picker = await waitFor(() => {
      const dialogs = elements(document, '[role="dialog"]').filter((dialog) => !existingDialogs.has(dialog));
      if (dialogs.length > 1) throw new Error('Multiple assessment dialogs opened.');
      return dialogs[0] || (one(form(), stage.assessmentSelector, 'assessment choice') ? form() : null);
    }, 'the assessment picker');
    if (stage.custom) {
      const matches = elements(picker, 'button, [role="tab"], a, label').filter((element) => text(element) === 'Avaliações customizadas');
      if (matches.length > 1) throw new Error('The custom assessments tab is ambiguous.');
      const tab = matches[0] || one(picker, '*:nth-child(2) > *:nth-child(2) > *:nth-child(1) > *:nth-child(2) > * > *', 'recorded custom assessments tab');
      if (!tab) throw new Error('The custom assessments tab is missing.');
      click(tab);
    }
    const choice = await waitFor(() => one(picker, stage.assessmentSelector, 'assessment choice'), 'the requested assessment');
    click(choice);
    await waitFor(() => {
      const current = form();
      const cards = elements(current, '[data-testid]').filter((element) => element.getAttribute('data-testid') === stage.assessment);
      return cards.some((card) => (!picker.contains(card) || picker === current) && (selected(card) || selected(card.querySelector('input, [aria-checked], [aria-selected]')) || !visible(choice)));
    }, 'the assessment attached to the stage');
  }
  function stageCount(name) {
    return elements(document, 'span, h1, h2, h3, h4, p, a, td, li, div, strong').filter((element) => !element.closest(`#${PANEL_ID}`) && !(activeForm?.contains(element)) && text(element) === name && ![...element.children].some((child) => visible(child) && text(child) === name)).length;
  }
  async function createStage(stage) {
    activeForm = null;
    if (findForm()) throw new Error('Close the existing stage editor before starting.');
    const before = stageCount(stage.name);
    const add = await waitFor(addButton, 'Add stage');
    click(add);
    activeForm = await waitFor(findForm, 'the stage form');
    setValue(one(form(), 'input#name', 'stage name field'), stage.name);
    await choosePhase(stage);
    if (stage.justification) {
      const field = await waitFor(() => one(form(), stage.justification, 'justification field'), 'the justification field');
      setValue(field, stage.name);
    }
    if (stage.internal) {
      const toggle = one(form(), 'input#internal-step-switch', 'internal stage switch');
      if (!toggle) throw new Error('The internal stage switch is missing.');
      if (!toggle.checked) click(toggle);
      await waitFor(() => one(form(), 'input#internal-step-switch', 'internal stage switch')?.checked, 'the hidden/internal stage state');
    }
    if (stage.email) await chooseEmail(stage);
    if (stage.assessment) await chooseAssessment(stage);
    const save = one(form(), 'button#btn-save-step', 'stage save button');
    click(save);
    await waitFor(() => !findForm() && stageCount(stage.name) > before, 'the saved stage in the pipeline and the closed editor');
    activeForm = null;
  }
  async function run() {
    if (running) return;
    running = true;
    let completed = 0;
    let current = null;
    try {
      const details = STAGES.map((stage, index) => `${index + 1}. ${stage.name}\n   Funnel position: ${stage.phase}; visibility: ${stage.internal ? 'internal/hidden' : 'site default'}; justification: ${stage.justification ? stage.name : 'unchanged'}${stage.email ? `; email: ${stage.email}; online assessment: ${stage.assessment}${stage.custom ? ' (custom)' : ''}` : ''}`).join('\n');
      if (!window.confirm(`Create these six configured stages in the current job?\n\n${details}\n\nExisting stages are not deduplicated. No job will be published.`)) {
        status('Cancelled. No site changes were made.', 'cancelled');
        return;
      }
      status('Starting the confirmed workflow.', 'running');
      for (const stage of STAGES) {
        current = stage;
        status(`Saving stage ${completed + 1}/6: ${stage.name}`, 'running');
        await createStage(stage);
        completed += 1;
      }
      status('All 6 stages were saved and found in the pipeline. Review the job before publishing.', 'success');
    } catch (error) {
      const message = `Stopped${current ? ` at ${current.name}` : ''}. ${completed}/6 stages confirmed saved. ${error.message}`;
      status(message, 'error');
      console.error('[Gupy Pipeline Stages]', message);
    } finally {
      running = false;
      const button = document.querySelector(`#${PANEL_ID} button`);
      if (button) button.disabled = false;
    }
  }
  function mount() {
    if (document.getElementById(PANEL_ID)) return;
    const panel = document.createElement('aside');
    panel.id = PANEL_ID;
    panel.dataset.state = 'idle';
    panel.innerHTML = '<strong>Gupy Pipeline Stages</strong><button type="button">Create configured stages</button><span class="status" role="status">Ready. No site changes until confirmation.</span>';
    Object.assign(panel.style, { background: '#fff', color: '#172b4d', border: '1px solid #d0d7de', borderRadius: '8px', bottom: '18px', boxShadow: '0 4px 20px #0002', font: '14px system-ui,sans-serif', maxWidth: '380px', padding: '10px', position: 'fixed', right: '18px', zIndex: 2147483647 });
    const button = panel.querySelector('button');
    Object.assign(button.style, { background: '#1455b8', border: '0', borderRadius: '5px', color: '#fff', cursor: 'pointer', display: 'block', margin: '8px 0', padding: '7px 10px' });
    button.addEventListener('click', run);
    document.body.append(panel);
  }
  if (typeof GM_registerMenuCommand === 'function') GM_registerMenuCommand('Show Gupy Pipeline Stages', mount);
  mount();
})();
