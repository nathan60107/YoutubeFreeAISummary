import { DataStore, compress, decompress } from "@sv443-network/userutils";
import { compressionFormat } from "./constants";
import { AUTO_LANG } from "./i18n";
import { defaultProvider } from "./providers";
import type { ScriptConfig } from "./types";

let canCompress: boolean | undefined;

/** Factory so the defaults object isn't shared by reference. */
export const getDefaultConfig = (): ScriptConfig => ({
  language: AUTO_LANG,
  provider: defaultProvider.id,
  // Empty = follow the interface language; the locale's default prompt is resolved at use time.
  promptTemplate: "",
  includeTimestamps: true,
  autoSubmit: true,
  preferredLangs: "",
});

export const config = new DataStore({
  id: "script-config",
  defaultData: getDefaultConfig() satisfies ScriptConfig,
  // increment this value if the data format changes:
  formatVersion: 1,
  // functions that migrate data from older versions to newer ones:
  migrations: {
    // migrate from v1 to v2:
    // 2: (oldData) => {
    //   return { ...oldData, newProp: "foo" };
    // },
  },
  encodeData: (data) => canCompress ? compress(data, compressionFormat, "string") : data,
  decodeData: (data) => canCompress ? decompress(data, compressionFormat, "string") : data,
});

export async function initConfig() {
  canCompress = await compressionSupported();
  await config.loadData();
}

async function compressionSupported() {
  if(typeof canCompress === "boolean")
    return canCompress;
  try {
    await compress(".", compressionFormat, "string");
    return canCompress = true;
  }
  catch(e) {
    return canCompress = false;
  }
}
