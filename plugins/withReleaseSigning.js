// Plugin de configuration Expo : signe la version « release » Android avec notre propre clé.
//
// La clé et ses mots de passe sont dans credentials/ (exclu de Git) :
//   credentials/signing.properties  (storeFile, storePassword, keyAlias, keyPassword)
//   credentials/reveille-toi-upload.jks
// Si ce fichier est absent (autre machine, CI…), la version release reste signée avec la clé
// de développement d'Expo, comme avant.
const { withAppBuildGradle } = require("expo/config-plugins");

const MARKER = "// [withReleaseSigning]";

const SIGNING_CONFIG = `
        ${MARKER} clé de signature de l'appli (credentials/signing.properties, hors Git)
        release {
            def signingFile = rootProject.file("../credentials/signing.properties")
            if (signingFile.exists()) {
                def props = new Properties()
                signingFile.withInputStream { props.load(it) }
                storeFile new File(signingFile.parentFile, props.getProperty("storeFile"))
                storePassword props.getProperty("storePassword")
                keyAlias props.getProperty("keyAlias")
                keyPassword props.getProperty("keyPassword")
            }
        }`;

module.exports = function withReleaseSigning(config) {
  return withAppBuildGradle(config, (cfg) => {
    let gradle = cfg.modResults.contents;
    if (gradle.includes(MARKER)) return cfg;

    // 1. Déclare la configuration de signature « release » à côté de « debug ».
    gradle = gradle.replace(/signingConfigs\s*\{/, (m) => `${m}${SIGNING_CONFIG}`);

    // 2. La version release l'utilise si la clé est présente.
    gradle = gradle.replace(
      /(release\s*\{[^}]*?)signingConfig signingConfigs\.debug/,
      `$1signingConfig rootProject.file("../credentials/signing.properties").exists() ? signingConfigs.release : signingConfigs.debug`,
    );

    if (!gradle.includes("signingConfigs.release : signingConfigs.debug")) {
      throw new Error("withReleaseSigning : impossible de modifier android/app/build.gradle (format inattendu).");
    }
    cfg.modResults.contents = gradle;
    return cfg;
  });
};
