# Gupy Pipeline Stages

A manually started userscript replacement for the reachable production path in `etapas-de-vagas-gupy.automa.json`. It runs only on a Gupy job's **Steps** page and does nothing when installed or mounted.

## Prerequisites

- Open the target job's steps page, with no stage editor already open.
- The account must be allowed to add and save stages.
- The email templates `MAPEAMENTO COMPORTAMENTAL` and `QUESTIONÁRIO INTEGRIDADE & COMPLIANCE` must already exist and be selectable.
- The online assessments `Mapeamento Comportamental` and `QUESTIONÁRIO DE INTEGRIDADE & COMPLIANCE` must already exist and be selectable. The latter must be available under `Avaliações customizadas`.
- Review the six-stage confirmation dialog before accepting. The script does not deduplicate existing stages.

## Manual operation

Install the `.user.js` file in a userscript manager, then open the intended Gupy job steps page. The floating panel appears automatically. Click **Create configured stages** and accept the browser confirmation. The userscript-manager menu also includes **Open Gupy jobs** and **Show Gupy Pipeline Stages**. The panel reports cancellation, a stopped stage/error, or confirmed completion.

The script has a single-run guard. It scopes the name, configuration fields, and `#btn-save-step` to the active stage form; it waits for a saved stage to appear and the editor to close before it creates the next one. A page/form error or missing/ambiguous control stops the remaining stages and does not claim success.

## Workflow parity

The stages are created in this source-graph order. “Funnel option” means the original recorded menu position; the source records positional selectors rather than stable Gupy IDs or labels.

| Order | Stage | Funnel option | Other source-derived configuration |
| --- | --- | --- | --- |
| 1 | `MAPEAMENTO COMPORTAMENTAL` | 2 | Set justification to the stage name; select email template `MAPEAMENTO COMPORTAMENTAL`; enable online resources; add `Mapeamento Comportamental`. |
| 2 | `TRIAGEM` | 1 | Set the internal/hidden-stage switch. |
| 3 | `ENTREVISTA COM RH` | 3 | Set justification to the stage name. |
| 4 | `QUESTIONÁRIO DE INTEGRIDADE E COMPLIANCE` | 2 | Set justification to the stage name; select email template `QUESTIONÁRIO INTEGRIDADE & COMPLIANCE`; enable online resources; open `Avaliações customizadas`; add `QUESTIONÁRIO DE INTEGRIDADE & COMPLIANCE`. |
| 5 | `ENTREVISTA COM GESTÃO` | 3 | Set justification to the stage name. |
| 6 | `CARTA OFERTA` | 4 | Set justification to the stage name. |

The source recording clicked the same phase option twice for the questionnaire and offer stages. This userscript selects the required option once and waits for its visible selected state; a second identical click would only toggle/reopen UI and is not a separate persisted payload.

The `DEBUG: ETAPA ADICIONADA: QUESTIONÁRIO DE INTEGRIDADE E COMPLIANCE` group is intentionally excluded: it has no incoming or outgoing edge in the Automa graph, so it is not reachable from the manual trigger.

## Safety boundary

The script changes stages only after an explicit browser confirmation. It does not publish the job, alter candidates, or use a global generic save button. Review all saved stages and their tenant-specific Gupy behavior before publishing the job.

## Source workflow

`etapas-de-vagas-gupy.automa.json` remains as the original Automa export and as the source of the six reachable groups. It is not run by the userscript.
