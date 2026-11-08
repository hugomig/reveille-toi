// Configuration dynamique : complète app.json selon la variante de l'appli.
//
// - Par défaut : « Réveille toi » (com.reveil.app), la version de tous les jours.
// - APP_VARIANT=development : « Réveille toi (dev) » (com.reveil.app.dev), pour développer
//   avec le rechargement en direct. Identifiant différent : les deux applis s'installent côte
//   à côte, chacune avec ses propres séries de réveils.
const IS_DEV = process.env.APP_VARIANT === "development";

module.exports = ({ config }) => {
  if (!IS_DEV) return config;
  return {
    ...config,
    name: `${config.name} (dev)`,
    // Le slug donne le lien du QR code du serveur de développement (exp+<slug>://) :
    // il doit être différent pour que seule l'appli dev l'ouvre.
    slug: `${config.slug}-dev`,
    scheme: `${config.scheme}-dev`,
    android: { ...config.android, package: `${config.android.package}.dev` },
    ios: { ...config.ios, bundleIdentifier: `${config.ios.bundleIdentifier}.dev` },
  };
};
