const { Auth } = require("msmc");

const authManager = new Auth("select_account");

/**
 * Lance le processus de connexion Microsoft
 * @returns {Promise<object>} La session Minecraft
 */
async function loginMicrosoft() {
    console.log("[AUTH] Démarrage du processus de connexion Microsoft...");
    try {
        console.log("[AUTH] Tentative d'ouverture de la fenêtre Microsoft...");
        const xbox = await authManager.launch("electron");
        console.log("[AUTH] Connexion Microsoft/Xbox réussie !");

        console.log("[AUTH] Échange du jeton pour une session Minecraft...");
        const mcSession = await xbox.getMinecraft();

        console.log("[AUTH] Conversion vers format MCLC...");
        const profile = mcSession.mclc();
        console.log("[AUTH] Session obtenue pour :", profile.name);

        return {
            username: profile.name,
            uuid: profile.uuid,
            accessToken: profile.access_token,
            userType: 'msa',
            profile: profile
        };
    } catch (error) {
        console.error("[AUTH] Erreur critique lors de la connexion Microsoft :", error);
        throw error;
    }
}

module.exports = { loginMicrosoft };
