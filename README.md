# Gupy Pipeline Stages

Substitui o fluxo Automa `Etapas de vagas Gupy` por um userscript da página de etapas de uma vaga Gupy.

O botão **Criar etapas padrão** exige confirmação e adiciona, sequencialmente:

1. TRIAGEM
2. ENTREVISTA COM RH
3. QUESTIONÁRIO DE INTEGRIDADE E COMPLIANCE
4. ENTREVISTA COM GESTÃO
5. CARTA OFERTA

Revise a ordem, os formulários e as regras de cada etapa antes de publicar a vaga. O userscript não publica a vaga nem altera candidaturas.


## Fluxo Automa original

`etapas-de-vagas-gupy.automa.json` e o workflow Automa que este userscript substitui (13 blocos, roda em `/companies/jobs/edit/*/steps`). Fica aqui como referencia e para importar no Automa se precisar.
