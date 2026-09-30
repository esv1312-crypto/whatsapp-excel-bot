function analyzeProjectContext(context = {}) {
  if (!context.project || !context.project.id) throw new Error('Project context is required');
  const capabilities = context.capabilities || [];
  const findings = [];
  const priorities = [];
  if (!context.importantFiles || !context.importantFiles.length) { findings.push('No important project files were inspected'); priorities.push('inspect_project_files'); }
  if (!context.ciWorkflows || !context.ciWorkflows.length) { findings.push('No CI workflows were discovered'); priorities.push('establish_ci'); }
  if (capabilities.includes('android') && !(context.entrypoints || []).length) { findings.push('Android project has no discovered entrypoint'); priorities.push('identify_android_entrypoint'); }
  return { projectId: context.project.id, summary: buildSummary(context), findings, priorities, evidence: { importantFiles: context.importantFiles || [], entrypoints: context.entrypoints || [], ciWorkflows: context.ciWorkflows || [], capabilities } };
}
function buildSummary(context) {
  const parts = [context.project.name || context.project.id, context.project.type || 'unknown', (context.importantFiles || []).length + ' important files inspected'];
  if ((context.capabilities || []).length) parts.push('capabilities: ' + context.capabilities.join(', '));
  if ((context.ciWorkflows || []).length) parts.push(context.ciWorkflows.length + ' CI workflow(s)');
  return parts.join('; ');
}
function planFromContext(context, options = {}) {
  const analysis = analyzeProjectContext(context);
  const goal = options.goal || 'Bring project ' + context.project.id + ' to a verified working state';
  const tasks = [
    { id:'project_state', objective:'Establish the current verified state of ' + (context.project.name || context.project.id), requiredSkills:['research'], dependencies:[] },
    { id:'implementation', objective:'Implement the next approved changes for ' + (context.project.name || context.project.id), requiredSkills:['software_development'], dependencies:['project_state'] },
    { id:'verification', objective:'Run tests/build/QA and collect evidence for ' + (context.project.name || context.project.id), requiredSkills:['testing'], dependencies:['implementation'] }
  ];
  if (analysis.priorities.includes('establish_ci')) tasks[2].objective += '; establish or repair CI before claiming completion';
  return { analysis, goal, tasks };
}
module.exports = { analyzeProjectContext, planFromContext };
