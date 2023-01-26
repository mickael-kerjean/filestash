// https://inlang.com/documentation

export async function defineConfig(env) {
  const plugin = await env.$import(
    "https://cdn.jsdelivr.net/gh/samuelstroschein/inlang-plugin-json@1/dist/index.js"
  );

  const pluginConfig = {
    pathPattern: "./client/locales/{language}.json",
  };

  return {
    referenceLanguage: "en",
    languages: [
      "az",
      "be",
      "bg",
      "ca",
      "cs",
      "da",
      "de",
      "el",
      "es",
      "et",
      "fi",
      "fr",
      "gl",
      "hr",
      "hu",
      "id",
      "is",
      "it",
      "ja",
      "ka",
      "ko",
      "lt",
      "lv",
      "mn",
      "nb",
      "nl",
      "pl",
      "pt",
      "ro",
      "ru",
      "sk",
      "sl",
      "sr",
      "sv",
      "th",
      "uk",
      "vi",
      "zh",
      "zh_tw"
    ],
    readResources: (args) =>
      plugin.readResources({ ...args, ...env, pluginConfig }),
    writeResources: (args) =>
      plugin.writeResources({ ...args, ...env, pluginConfig }),
  };
}
