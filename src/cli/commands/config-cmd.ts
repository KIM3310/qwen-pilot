import { loadConfig, validateConfig, getProjectConfigPath, getUserConfigPath } from "../../config/index.js";
import { logger, fileExists, readTextFile } from "../../utils/index.js";

export async function configShowCommand(): Promise<void> {
  try {
    const config = await loadConfig();
    logger.banner("Current Configuration");
    console.log(JSON.stringify(config, null, 2));
  } catch (e) {
    logger.error(`Failed to load configuration: ${e}`);
    process.exit(1);
  }
}

export async function configValidateCommand(): Promise<void> {
  try {
    // First, check if any config files have syntax errors
    const configPaths = [getUserConfigPath(), getProjectConfigPath()];
    for (const cfgPath of configPaths) {
      if (await fileExists(cfgPath)) {
        try {
          const raw = await readTextFile(cfgPath);
          JSON.parse(raw);
        } catch (e) {
          logger.error(`Invalid JSON in config file: ${cfgPath}`);
          logger.error(`  ${e instanceof Error ? e.message : String(e)}`);
          process.exit(1);
        }
      }
    }

    const config = await loadConfig();
    const result = validateConfig(config);

    if (result.valid) {
      logger.success("Configuration is valid");
      console.log(JSON.stringify(config, null, 2));
    } else {
      logger.error("Configuration has errors:");
      for (const err of result.errors) {
        logger.error(`  ${err}`);
      }
      process.exit(1);
    }
  } catch (e) {
    logger.error(`Failed to load configuration: ${e}`);
    process.exit(1);
  }
}
