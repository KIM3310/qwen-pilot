import { loadConfig, validateConfig } from "../../config/index.js";
import { logger } from "../../utils/index.js";

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
