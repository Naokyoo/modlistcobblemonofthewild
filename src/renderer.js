import './index.css';

document.addEventListener('DOMContentLoaded', async () => {
  const elements = {
    btnMinimize: document.getElementById('btn-minimize'),
    btnMaximize: document.getElementById('btn-maximize'),
    btnClose: document.getElementById('btn-close'),
    btnPlay: document.getElementById('btn-play'),
    serverName: document.getElementById('server-name'),
    statusIndicator: document.getElementById('status-indicator'),
    playerCount: document.getElementById('player-count'),
    progressContainer: document.getElementById('progress-container'),
    progressFill: document.getElementById('progress-fill'),
    progressText: document.getElementById('progress-text'),
    progressPercent: document.getElementById('progress-percent'),
    mcVersion: document.getElementById('mc-version'),
    linkDiscord: document.getElementById('link-discord'),
    linkWebsite: document.getElementById('link-website'),
    particles: document.getElementById('particles'),
    btnLoginMs: document.getElementById('btn-login-ms'),
    btnLogout: document.getElementById('btn-logout'),
    username: document.getElementById('username'),
    userAvatar: document.getElementById('user-avatar'),
    logConsole: document.getElementById('log-console'),
    logContainer: document.getElementById('log-container'),
    btnClearLogs: document.getElementById('btn-clear-logs'),
    versionInfo: document.querySelector('.version-info'),
    launcherLoader: document.getElementById('launcher-loader'),
    mainContent: document.querySelector('.main-content'),
    updateIndicator: document.getElementById('update-indicator'),
    updateMsg: document.getElementById('update-msg'),
    updateBanner: document.getElementById('update-banner'),
    updateBannerMsg: document.getElementById('update-banner-msg')
  };

  let isDownloading = false;
  let config = null;
  let session = null;

  async function init() {
    config = await window.launcher.getConfig();

    elements.serverName.textContent = config.serverName;
    elements.mcVersion.textContent = `Minecraft ${config.minecraftVersion}`;

    elements.linkDiscord.onclick = (e) => {
      e.preventDefault();
      window.launcher.openExternal(config.discordLink);
    };
    elements.linkWebsite.onclick = (e) => {
      e.preventDefault();
      window.launcher.openExternal(config.websiteLink);
    };

    createParticles();
    updateServerStatus();
    loadSession();
    setInterval(updateServerStatus, 30000);
    window.launcher.onProgress(handleProgress);
    // Lancer en arrière-plan sans bloquer l'UI
    applyDynamicUI().catch(err => console.warn('[UI] Erreur thème dynamique:', err));

    // Injecter le CSS dynamique si présent
    await injectDynamicCSS();

    // Listener pour les mises à jour automatiques
    if (window.launcher.onUpdateStatus) {
      window.launcher.onUpdateStatus((data) => {
        const { status, message } = data;
        console.log('[UPDATE]', status, message);

        if (status === 'checking' || status === 'available') {
          // Footer indicator
          elements.updateIndicator.classList.remove('hidden');
          elements.updateIndicator.classList.remove('success');
          elements.updateMsg.textContent = message;

          // Banner
          elements.updateBanner.classList.remove('hidden');
          elements.updateBannerMsg.textContent = message;
        } else if (status === 'up-to-date') {
          // Footer indicator
          elements.updateIndicator.classList.add('success');
          elements.updateMsg.textContent = message;

          // Masquer tout après 5 secondes
          setTimeout(() => {
            elements.updateIndicator.classList.add('hidden');
            elements.updateBanner.classList.add('hidden');
          }, 5000);
        } else if (status === 'error') {
          elements.updateBanner.classList.add('hidden');
          elements.updateIndicator.classList.add('hidden');
        }
      });
    }

    // Masquer le loader une fois l'init terminée
    setTimeout(hideLoader, 500);
  }

  /**
   * Injecte un fichier CSS externe depuis le dossier de données du launcher
   */
  async function injectDynamicCSS() {
    try {
      const launcherPath = await window.launcher.getLauncherDataPath();
      const cssPath = `${launcherPath}/launcher/custom.css`.replace(/\\/g, '/');

      // Vérifier si le fichier existe (via fetch sur file:// ou via une vérification IPC si nécessaire)
      // Ici, on injecte simplement le lien, s'il n'existe pas, le navigateur l'ignorera
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = `file:///${cssPath}?t=${Date.now()}`;
      document.head.appendChild(link);
      console.log('[UI] CSS dynamique injecté:', cssPath);
    } catch (e) {
      console.warn('[UI] Impossible d\'injecter le CSS dynamique:', e);
    }
  }

  function hideLoader() {
    if (elements.launcherLoader) {
      elements.launcherLoader.classList.add('hidden');
    }
    if (elements.mainContent) {
      elements.mainContent.classList.add('visible');
    }
  }

  async function applyDynamicUI() {
    try {
      // Timeout de 3 secondes pour ne pas bloquer l'UI
      const uiConfig = await Promise.race([
        window.launcher.readUIConfig(),
        new Promise((resolve) => setTimeout(() => resolve(null), 3000))
      ]);

      if (!uiConfig) {
        console.log('[UI] Aucun thème dynamique trouvé ou configuré.');
        return;
      }

      console.log('[UI] Application du thème dynamique...', uiConfig);

      if (uiConfig.theme) {
        const root = document.documentElement;
        if (uiConfig.theme.primary) root.style.setProperty('--primary', uiConfig.theme.primary);
        if (uiConfig.theme.secondary) root.style.setProperty('--secondary', uiConfig.theme.secondary);
        if (uiConfig.theme.accent) root.style.setProperty('--accent', uiConfig.theme.accent);
        if (uiConfig.theme.background) {
          document.querySelector('.main-content').style.background = uiConfig.theme.background;
        }
        if (uiConfig.theme.serverName) {
          elements.serverName.textContent = uiConfig.theme.serverName;
        }
      }


      if (uiConfig.images && uiConfig.images.background) {
        const launcherPath = await window.launcher.getLauncherDataPath();
        const bgPath = `${launcherPath}/launcher/${uiConfig.images.background}`.replace(/\\/g, '/');
        document.querySelector('.main-content').style.backgroundImage = `url('file:///${bgPath}')`;
        document.querySelector('.main-content').style.backgroundSize = 'cover';
      }
    } catch (error) {
      console.warn('[UI] Erreur lors de l\'application du thème:', error);
    }
  }

  // Auth controls
  elements.btnLoginMs.addEventListener('click', async () => {
    elements.btnLoginMs.disabled = true;
    elements.btnLoginMs.textContent = '...';
    try {
      const result = await window.launcher.loginMicrosoft();
      if (result.success) {
        session = result.session;
        saveSession(session);
        updateUserUI();
      } else {
        showError(result.error);
      }
    } catch (error) {
      showError(error.message);
    } finally {
      elements.btnLoginMs.disabled = false;
      elements.btnLoginMs.textContent = 'Connexion';
    }
  });

  elements.btnLogout.addEventListener('click', () => {
    session = null;
    localStorage.removeItem('mc_session');
    updateUserUI();
  });

  function loadSession() {
    const stored = localStorage.getItem('mc_session');
    if (stored) {
      try {
        session = JSON.parse(stored);
        updateUserUI();
      } catch (e) {
        localStorage.removeItem('mc_session');
      }
    }
  }

  function saveSession(data) {
    localStorage.setItem('mc_session', JSON.stringify(data));
  }

  function updateUserUI() {
    if (session) {
      elements.username.textContent = session.username;
      elements.userAvatar.src = `https://mc-heads.net/avatar/${session.uuid}`;
      elements.btnLoginMs.classList.add('hidden');
      elements.btnLogout.classList.remove('hidden');
    } else {
      elements.username.textContent = 'Hors-ligne';
      elements.userAvatar.src = 'https://mc-heads.net/avatar/steve';
      elements.btnLoginMs.classList.remove('hidden');
      elements.btnLogout.classList.add('hidden');
    }

    // Gestion de l'état du bouton JOUER
    if (session) {
      elements.btnPlay.classList.remove('not-logged-in');
      elements.btnPlay.title = 'Lancer le jeu';
    } else {
      elements.btnPlay.classList.add('not-logged-in');
      elements.btnPlay.title = 'Veuillez vous connecter pour jouer';
    }
  }

  // Window controls
  elements.btnMinimize.addEventListener('click', () => window.launcher.minimize());
  elements.btnMaximize.addEventListener('click', () => window.launcher.maximize());
  elements.btnClose.addEventListener('click', () => window.launcher.close());

  // Log handlers
  window.launcher.onLog((data) => {
    const entry = document.createElement('div');
    entry.className = `log-entry ${data.type}`;
    entry.textContent = `[${new Date().toLocaleTimeString()}] ${data.msg}`;
    elements.logContainer.appendChild(entry);
    elements.logContainer.scrollTop = elements.logContainer.scrollHeight;
  });

  elements.versionInfo.addEventListener('click', () => {
    elements.logConsole.classList.toggle('hidden');
  });

  elements.btnClearLogs.addEventListener('click', (e) => {
    e.stopPropagation();
    elements.logContainer.innerHTML = '';
  });

  // Play button
  elements.btnPlay.addEventListener('click', async () => {
    if (isDownloading) return;
    if (!session) {
      showError('Vous devez être connecté pour jouer !');
      return;
    }

    isDownloading = true;
    elements.btnPlay.classList.add('downloading');
    elements.progressContainer.classList.remove('hidden');

    try {
      const result = await window.launcher.launchGame(session);
      if (!result.success) {
        showError(result.error);
      }
    } catch (error) {
      showError(error.message);
    } finally {
      isDownloading = false;
      elements.btnPlay.classList.remove('downloading');
      setTimeout(() => {
        elements.progressContainer.classList.add('hidden');
        resetProgress();
      }, 2000);
    }
  });

  function handleProgress(progress) {
    elements.progressText.textContent = progress.status || 'Téléchargement...';
    elements.progressPercent.textContent = `${Math.round(progress.percent || 0)}%`;
    elements.progressFill.style.width = `${progress.percent || 0}%`;
  }

  function resetProgress() {
    elements.progressFill.style.width = '0%';
    elements.progressText.textContent = 'Préparation...';
    elements.progressPercent.textContent = '0%';
  }

  async function updateServerStatus() {
    try {
      const status = await window.launcher.getServerStatus();
      if (status.online) {
        elements.statusIndicator.classList.add('online');
        elements.statusIndicator.classList.remove('offline');
        elements.statusIndicator.querySelector('.status-text').textContent = 'En ligne';
        elements.playerCount.querySelector('span').textContent =
          `${status.players.online} / ${status.players.max}`;
      } else {
        elements.statusIndicator.classList.add('offline');
        elements.statusIndicator.classList.remove('online');
        elements.statusIndicator.querySelector('.status-text').textContent = 'Hors ligne';
        elements.playerCount.querySelector('span').textContent = '0 / 0';
      }
    } catch (error) {
      console.error('Erreur statut serveur:', error);
    }
  }

  function createParticles() {
    const colors = ['#6366f1', '#f472b6', '#34d399', '#818cf8'];
    for (let i = 0; i < 30; i++) {
      const particle = document.createElement('div');
      particle.className = 'particle';
      particle.style.left = `${Math.random() * 100}%`;
      particle.style.animationDelay = `${Math.random() * 15}s`;
      particle.style.animationDuration = `${15 + Math.random() * 10}s`;
      particle.style.background = colors[Math.floor(Math.random() * colors.length)];
      elements.particles.appendChild(particle);
    }
  }

  function showError(message) {
    console.error('Erreur:', message);
    elements.progressContainer.classList.remove('hidden');
    elements.progressText.textContent = `Erreur: ${message}`;
    elements.progressText.style.color = '#ef4444';
    setTimeout(() => {
      elements.progressText.style.color = '';
      elements.progressContainer.classList.add('hidden');
    }, 5000);
  }

  init();
});
