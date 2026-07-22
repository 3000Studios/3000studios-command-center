// One-click tracked jobs and owner-intent logging. This runs after the base UI.
(() => {
  const originalLaunch = window.launch;
  const poll = async (id, button) => {
    try {
      const job = await fetch(`/jobs/${id}`).then(r => r.json());
      const last = (job.output || []).slice(-8).join('\n') || 'Worker is running…';
      document.getElementById('o').textContent = `Job ${job.status.toUpperCase()}\n\nCommand:\n${job.command}\n\nLatest terminal output:\n${last}`;
      if (job.status === 'running') {
        window.state?.('WORKING', 'Worker is running. Nova is collecting terminal output.');
        window.log?.('Job running', `Tracking ${job.project} in the background.`);
        setTimeout(() => poll(id, button), 1800);
        return;
      }
      button.disabled = false;
      button.textContent = 'Start mission';
      if (job.status === 'completed') {
        window.state?.('JOB FINISHED', 'Worker ended. Read its final output for visual production verification evidence.');
        window.log?.('Job finished', 'Worker completed; this is not a live claim without visual proof.');
      } else if (job.status === 'needs-commit') {
        window.state?.('COMMIT REQUIRED', 'Worker changed files but did not create a clean pushed release. The terminal output names the blocker.');
        window.log?.('Deployment blocked', 'Uncommitted work remains, so Cloudflare has nothing new to deploy.', true);
      } else {
        window.state?.('JOB FAILED', 'The worker stopped with an error; the terminal output is shown below.');
        window.log?.('Job failed', 'Review the terminal output below.', true);
      }
    } catch {
      button.disabled = false;
      button.textContent = 'Start mission';
      window.log?.('Job monitor issue', 'Could not read the current job status.', true);
    }
  };
  window.ask = async () => {
    const task = document.getElementById('m').value.trim();
    if (!task) return document.getElementById('m').focus();
    const button = document.getElementById('missionBtn');
    button.disabled = true;
    button.textContent = 'Starting job…';
    document.getElementById('o').textContent = 'Nova is starting one tracked job. You do not need to click again.';
    if (/\bbazinga\b/i.test(task)) window.log?.('Bazinga owner marker detected', 'Scoped intent recorded; safety and live-verification rules still apply.');
    window.state?.('STARTING JOB', 'Launching the selected worker and opening the terminal monitor.');
    try {
      const response = await fetch('/mission', {method:'POST', headers:{'content-type':'application/json'}, body:JSON.stringify({project:document.getElementById('p').value,agent:document.getElementById('a').value,task})});
      const result = await response.json();
      if (!response.ok) throw Error(result.error || 'Could not start the job.');
      window.log?.('One-click job started', result.job.command);
      poll(result.job.id, button);
    } catch (error) {
      button.disabled = false;
      button.textContent = 'Start mission';
      document.getElementById('o').textContent = error.message;
      window.state?.('JOB BLOCKED', 'Nova could not start this job.');
      window.log?.('Job blocked', error.message, true);
    }
  };
  window.launch = originalLaunch;
})();
