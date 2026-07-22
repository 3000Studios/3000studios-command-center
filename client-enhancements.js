// Owner-intent and visible-command enhancements. This runs after the base UI.
(() => {
  const originalAsk = window.ask;
  const originalLaunch = window.launch;
  window.ask = async () => {
    const mission = document.getElementById('m').value || '';
    if (/\bbazinga\b/i.test(mission)) {
      window.log?.('Bazinga owner marker detected', 'Scoped intent recorded; safety and live-verification rules still apply.');
    }
    return originalAsk();
  };
  window.launch = async () => {
    const mission = document.getElementById('m').value || '';
    if (!mission.trim()) return originalLaunch();
    const project = document.getElementById('p').value;
    const agent = document.getElementById('a').value;
    window.state?.('DISPATCHING', 'Opening the selected worker and showing its exact terminal command.');
    window.log?.(`Dispatching ${agent}`, `Opening ${project}.`);
    try {
      const response = await fetch('/launch', {method:'POST', headers:{'content-type':'application/json'}, body:JSON.stringify({project,agent,task:mission})});
      const result = await response.json();
      document.getElementById('o').textContent = result.command ? `${result.text}\n\nRunning terminal command:\n${result.command}` : (result.text || result.error);
      window.state?.('WORKER OPEN', result.command ? 'The exact terminal command is displayed below.' : 'Worker dispatch could not start.');
      window.log?.('Worker dispatch result', result.command || result.error || 'Worker opened.');
    } catch {
      window.log?.('Dispatch failed', 'Boss service is not reachable.', true);
    }
  };
})();
