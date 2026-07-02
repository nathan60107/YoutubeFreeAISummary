import { DataStore, compress, decompress } from "@sv443-network/userutils";
import { compressionFormat } from "./constants";
import type { ScriptConfig } from "./types";

let canCompress: boolean | undefined;

/** Default prompt template - also used by the settings panel's "reset" action. */
export const defaultPromptTemplate = [
  "請依據以下 YouTube 影片字幕（含時間軸）做重點摘要，並在每個重點標註對應的時間戳記。",
  "",
  "影片標題：{{title}}",
  "影片連結：{{url}}",
  "",
  "{{transcript}}",
].join("\n");

/** Factory so the defaults object isn't shared by reference. */
export const getDefaultConfig = (): ScriptConfig => ({
  promptTemplate: defaultPromptTemplate,
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
